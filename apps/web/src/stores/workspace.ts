import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import type {
  AppSettings,
  ExportFormat,
  ImportPreview,
  Note,
  NoteDraft,
  NoteView,
  Priority,
  SearchHistoryItem,
  SyncPullResponse,
  TagMeta,
  Template,
  ThemeKey,
} from '@shared'
import { DEFAULT_SETTINGS, NOTE_VIEWS, PRIORITY_LABELS, WEB_THEME_STORAGE_KEY } from '@shared'

import {
  buildDraftFromTemplate,
  buildImportPreview,
  buildNote,
  downloadBlob,
  emptyDraft,
  exportNotes,
  isDueThisWeek,
  isDueToday,
  isOverdue,
  matchesQuery,
  matchesTags,
  matchesView,
  sortNotes,
} from '@/lib/note-utils'
import {
  ensureDefaultTemplates,
  getWorkspaceContext,
  hasLegacyAnonymousData,
  importLegacyAnonymousDataIntoWorkspace,
  legacyMigrationRepository,
  notesRepository,
  searchHistoryRepository,
  setWorkspaceContext,
  settingsRepository,
  syncQueueRepository,
  tagRepository,
  templatesRepository,
} from '@/lib/repositories'

type ImportStrategy = 'newer' | 'prefer-import' | 'prefer-local' | 'keep-both'

interface Toast {
  id: string
  message: string
  tone: 'success' | 'info' | 'warning'
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

const notifiedReminders = new Set<string>()

function persistThemePreference(theme: ThemeKey) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(WEB_THEME_STORAGE_KEY, theme)
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const ready = ref(false)
  const loading = ref(false)
  const workspaceId = ref<string | null>(null)
  const notes = ref<Note[]>([])
  const templates = ref<Template[]>([])
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const tagMeta = ref<TagMeta[]>([])
  const searchHistory = ref<SearchHistoryItem[]>([])
  const activeTags = ref<string[]>([])
  const searchQuery = ref('')
  const selectedNoteIds = ref<string[]>([])
  const lastSelectionIndex = ref<number | null>(null)
  const editorOpen = ref(false)
  const editingNoteId = ref<string | null>(null)
  const editorDraft = reactive<NoteDraft>(emptyDraft())
  const importDialogOpen = ref(false)
  const importText = ref('')
  const importPreview = ref<ImportPreview | null>(null)
  const importStrategy = ref<ImportStrategy>('newer')
  const commandPaletteOpen = ref(false)
  const installAvailable = ref(false)
  const deferredInstallPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const toasts = ref<Toast[]>([])
  const legacyImportPromptOpen = ref(false)

  const liveNotes = computed(() => notes.value.filter((note) => !note.deletedAt))
  const visibleNotes = computed(() =>
    sortNotes(
      notes.value.filter((note) => matchesView(note, settings.value.selectedView) && matchesQuery(note, searchQuery.value) && matchesTags(note, activeTags.value)),
      settings.value.defaultSort,
    ),
  )

  const stats = computed(() => ({
    total: liveNotes.value.filter((note) => !note.archivedAt).length,
    completed: liveNotes.value.filter((note) => note.completed && !note.archivedAt).length,
    overdue: liveNotes.value.filter((note) => isOverdue(note)).length,
    dueToday: liveNotes.value.filter((note) => isDueToday(note)).length,
  }))

  const activeReminders = computed(() =>
    notes.value.filter((note) => note.remindAt && !note.completed && !note.deletedAt && new Date(note.remindAt).getTime() <= Date.now()),
  )

  const tagInsights = computed(() => tagMeta.value.filter((tag) => tag.usageCount > 0))

  const dashboardNotes = computed(() => ({
    overdue: sortNotes(notes.value.filter((note) => isOverdue(note) && !note.deletedAt), 'smart').slice(0, 4),
    today: sortNotes(notes.value.filter((note) => isDueToday(note) && !note.deletedAt), 'smart').slice(0, 4),
    week: sortNotes(notes.value.filter((note) => isDueThisWeek(note) && !note.deletedAt), 'smart').slice(0, 6),
    focus: sortNotes(notes.value.filter((note) => note.priority === 'high' && !note.completed && !note.deletedAt), 'smart').slice(0, 4),
  }))

  const boardColumns = computed(() => {
    const filtered = notes.value.filter((note) => !note.deletedAt && !note.archivedAt && matchesQuery(note, searchQuery.value) && matchesTags(note, activeTags.value))
    return {
      todo: [...filtered.filter((note) => note.status === 'todo')].sort((left, right) => left.order - right.order),
      doing: [...filtered.filter((note) => note.status === 'doing')].sort((left, right) => left.order - right.order),
      done: [...filtered.filter((note) => note.status === 'done')].sort((left, right) => left.order - right.order),
    }
  })

  const calendarNotes = computed(() =>
    notes.value.filter((note) => note.dueDate && !note.deletedAt && !note.archivedAt && matchesQuery(note, searchQuery.value) && matchesTags(note, activeTags.value)),
  )

  function resetDraft(priority = settings.value.defaultPriority) {
    Object.assign(editorDraft, emptyDraft(priority))
  }

  function resetWorkspaceState() {
    ready.value = false
    loading.value = false
    workspaceId.value = null
    notes.value = []
    templates.value = []
    settings.value = { ...DEFAULT_SETTINGS }
    tagMeta.value = []
    searchHistory.value = []
    activeTags.value = []
    searchQuery.value = ''
    selectedNoteIds.value = []
    lastSelectionIndex.value = null
    editorOpen.value = false
    editingNoteId.value = null
    importDialogOpen.value = false
    importText.value = ''
    importPreview.value = null
    importStrategy.value = 'newer'
    commandPaletteOpen.value = false
    legacyImportPromptOpen.value = false
    deferredInstallPrompt.value = null
    setWorkspaceContext(null)
    notifiedReminders.clear()
    resetDraft()
  }

  function normalizePatchedNote(current: Note, patch: Partial<Note>) {
    const merged: Note = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
      syncStatus: 'dirty',
    }

    if (merged.type === 'checklist') {
      merged.completed = merged.checklist.length > 0 && merged.checklist.every((item) => item.completed)
      merged.content = ''
    }

    if (!merged.completed) {
      merged.completedAt = null
    } else if (!merged.completedAt) {
      merged.completedAt = merged.updatedAt
    }

    if (merged.completed && merged.status !== 'done') {
      merged.status = 'done'
    }

    return merged
  }

  function toast(message: string, tone: Toast['tone'] = 'success') {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message,
      tone,
    }

    toasts.value = [entry, ...toasts.value].slice(0, 3)
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((item) => item.id !== entry.id)
    }, 2800)
  }

  async function refresh() {
    if (!getWorkspaceContext()) {
      return
    }

    const [allNotes, allTemplates, appSettings, allTags, searches] = await Promise.all([
      notesRepository.list(),
      templatesRepository.list(),
      settingsRepository.getAppSettings(),
      tagRepository.list(),
      searchHistoryRepository.list(),
    ])

    notes.value = allNotes
    templates.value = allTemplates
    settings.value = appSettings
    tagMeta.value = allTags
    searchHistory.value = searches
    persistThemePreference(appSettings.theme)
  }

  async function initialize(nextWorkspaceId: string, force = false) {
    if (ready.value && workspaceId.value === nextWorkspaceId && !force) {
      return
    }

    loading.value = true
    workspaceId.value = nextWorkspaceId
    setWorkspaceContext(nextWorkspaceId)
    await ensureDefaultTemplates()
    await refresh()
    await detectLegacyImportPrompt()
    ready.value = true
    loading.value = false
  }

  async function detectLegacyImportPrompt() {
    if (!workspaceId.value) {
      legacyImportPromptOpen.value = false
      return
    }

    const [handled, legacyExists] = await Promise.all([
      legacyMigrationRepository.isHandled(workspaceId.value),
      hasLegacyAnonymousData(),
    ])
    legacyImportPromptOpen.value = !handled && legacyExists
  }

  async function importLegacyAnonymousData() {
    if (!workspaceId.value) {
      return
    }

    const importedCount = await importLegacyAnonymousDataIntoWorkspace()
    await legacyMigrationRepository.markImported(workspaceId.value)
    legacyImportPromptOpen.value = false
    await refresh()

    const currentNotes = await notesRepository.list()
    await Promise.all(
      currentNotes
        .filter((note) => note.syncStatus === 'local')
        .map((note) => queueNoteOperation({ ...note, syncStatus: 'dirty' }, 'create')),
    )
    await refresh()
    toast(importedCount ? `已导入 ${importedCount} 条旧本地便签，登录后即可继续使用。` : '没有检测到可导入的旧本地便签。')
  }

  async function discardLegacyAnonymousData() {
    if (!workspaceId.value) {
      return
    }

    await legacyMigrationRepository.markDiscarded(workspaceId.value)
    legacyImportPromptOpen.value = false
    toast('已跳过旧本地便签导入。')
  }

  async function queueNoteOperation(note: Note, operation: 'create' | 'update' | 'delete', expectedVersion?: number) {
    await syncQueueRepository.enqueue({
      entityType: 'note',
      entityId: note.id,
      operation,
      payload: note,
      expectedVersion,
      workspaceId: workspaceId.value,
    })
  }

  function openEditor(note?: Note, templateId?: string) {
    resetDraft()
    editingNoteId.value = null

    if (note) {
      editingNoteId.value = note.id
      Object.assign(editorDraft, {
        title: note.title,
        content: note.content,
        tags: [...note.tags],
        color: note.color,
        completed: note.completed,
        type: note.type,
        checklist: note.checklist.map((item) => ({ ...item })),
        pinned: note.pinned,
        priority: note.priority,
        status: note.status,
        order: note.order,
        dueDate: note.dueDate,
        remindAt: note.remindAt,
        deletedAt: note.deletedAt,
        archivedAt: note.archivedAt,
      })
    } else if (templateId) {
      const template = templates.value.find((item) => item.id === templateId)
      if (template) {
        Object.assign(editorDraft, buildDraftFromTemplate(template))
      }
    }

    editorOpen.value = true
  }

  function closeEditor() {
    editorOpen.value = false
    editingNoteId.value = null
    resetDraft()
  }

  function addChecklistItem() {
    editorDraft.type = 'checklist'
    editorDraft.checklist.push({
      id: `draft-${Date.now()}`,
      text: '',
      completed: false,
      order: editorDraft.checklist.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  function removeChecklistItem(itemId: string) {
    editorDraft.checklist = editorDraft.checklist.filter((item) => item.id !== itemId)
  }

  async function saveNote() {
    const existing = editingNoteId.value ? notes.value.find((note) => note.id === editingNoteId.value) : undefined
    const next = buildNote({ ...editorDraft }, existing)
    await notesRepository.put(next)
    await queueNoteOperation(next, existing ? 'update' : 'create', existing?.version)
    await tagRepository.syncUsage(await notesRepository.list())
    await refresh()
    closeEditor()
    toast(existing ? '便签已更新。' : '便签已创建。')
  }

  async function patchNote(noteId: string, patch: Partial<Note>) {
    const current = notes.value.find((note) => note.id === noteId)
    if (!current) {
      return
    }

    const next = normalizePatchedNote(current, patch)
    await notesRepository.put(next)
    await queueNoteOperation(next, 'update', current.version)
    await tagRepository.syncUsage(await notesRepository.list())
    await refresh()
  }

  async function toggleNoteComplete(noteId: string) {
    const note = notes.value.find((item) => item.id === noteId)
    if (!note) {
      return
    }

    if (note.type === 'checklist') {
      const targetCompleted = !note.completed
      const checklist = note.checklist.map((item) => ({ ...item, completed: targetCompleted, updatedAt: new Date().toISOString() }))
      await patchNote(noteId, { checklist, completed: targetCompleted, status: targetCompleted ? 'done' : 'todo' })
      return
    }

    await patchNote(noteId, {
      completed: !note.completed,
      completedAt: !note.completed ? new Date().toISOString() : null,
      status: !note.completed ? 'done' : 'todo',
    })
  }

  async function updateChecklistItem(noteId: string, itemId: string, text: string, completed?: boolean) {
    const note = notes.value.find((item) => item.id === noteId)
    if (!note || note.type !== 'checklist') {
      return
    }

    const checklist = note.checklist.map((item) =>
      item.id === itemId
        ? {
            ...item,
            text,
            completed: typeof completed === 'boolean' ? completed : item.completed,
            updatedAt: new Date().toISOString(),
          }
        : item,
    )
    await patchNote(noteId, { checklist })
  }

  const trashNote = (noteId: string) => patchNote(noteId, { deletedAt: new Date().toISOString() }).then(() => toast('已移入回收站。', 'warning'))
  const restoreNote = (noteId: string) => patchNote(noteId, { deletedAt: null }).then(() => toast('便签已恢复。'))
  const archiveNote = (noteId: string) => patchNote(noteId, { archivedAt: new Date().toISOString() }).then(() => toast('已归档。'))
  const unarchiveNote = (noteId: string) => patchNote(noteId, { archivedAt: null }).then(() => toast('已取消归档。'))

  async function purgeNote(noteId: string) {
    const current = notes.value.find((note) => note.id === noteId)
    if (!current) {
      return
    }

    await notesRepository.delete(noteId)
    await queueNoteOperation(current, 'delete', current.version)
    await tagRepository.syncUsage(await notesRepository.list())
    await refresh()
    toast('已永久删除。', 'warning')
  }

  function setSearchQuery(value: string) {
    searchQuery.value = value
  }

  async function rememberSearch() {
    await searchHistoryRepository.push(searchQuery.value)
    await refresh()
  }

  function toggleTag(tag: string) {
    activeTags.value = activeTags.value.includes(tag) ? activeTags.value.filter((item) => item !== tag) : [...activeTags.value, tag]
  }

  function clearTags() {
    activeTags.value = []
  }

  async function setSelectedView(view: NoteView) {
    if (!NOTE_VIEWS.includes(view)) {
      return
    }

    settings.value = await settingsRepository.patch({ selectedView: view })
  }

  const setSortMode = (mode: AppSettings['defaultSort']) => settingsRepository.patch({ defaultSort: mode }).then((next) => (settings.value = next))
  const setTheme = (theme: ThemeKey) =>
    settingsRepository.patch({ theme }).then((next) => {
      settings.value = next
      persistThemePreference(next.theme)
      return next
    })
  const saveSettings = (patch: Partial<AppSettings>) =>
    settingsRepository.patch(patch).then((next) => {
      settings.value = next
      persistThemePreference(next.theme)
      return next
    })

  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      settings.value = await settingsRepository.patch({ notificationPermission: 'unsupported' })
      return
    }

    settings.value = await settingsRepository.patch({ notificationPermission: await Notification.requestPermission() })
  }

  function toggleSelection(noteId: string, orderedIds: string[], index: number, shiftKey = false) {
    if (shiftKey && lastSelectionIndex.value !== null) {
      const start = Math.min(lastSelectionIndex.value, index)
      const end = Math.max(lastSelectionIndex.value, index)
      selectedNoteIds.value = [...new Set([...selectedNoteIds.value, ...orderedIds.slice(start, end + 1)])]
      return
    }

    lastSelectionIndex.value = index
    selectedNoteIds.value = selectedNoteIds.value.includes(noteId)
      ? selectedNoteIds.value.filter((item) => item !== noteId)
      : [...selectedNoteIds.value, noteId]
  }

  function clearSelection() {
    selectedNoteIds.value = []
    lastSelectionIndex.value = null
  }

  async function batchUpdate(operation: (note: Note) => Note) {
    const selected = notes.value.filter((note) => selectedNoteIds.value.includes(note.id))
    if (!selected.length) {
      return
    }

    const updatedNotes = selected.map(operation)
    await notesRepository.bulkPut(updatedNotes)
    await Promise.all(updatedNotes.map((note) => queueNoteOperation(note, 'update', note.version - 1)))
    await tagRepository.syncUsage(await notesRepository.list())
    clearSelection()
    await refresh()
  }

  const batchComplete = (target: boolean) =>
    batchUpdate((note) =>
      normalizePatchedNote(note, {
        completed: target,
        completedAt: target ? new Date().toISOString() : null,
        status: target ? 'done' : 'todo',
        checklist: note.type === 'checklist'
          ? note.checklist.map((item) => ({ ...item, completed: target, updatedAt: new Date().toISOString() }))
          : note.checklist,
      }),
    ).then(() => toast(target ? '已批量标记完成。' : '已批量取消完成。'))

  const batchPinned = (target: boolean) => batchUpdate((note) => normalizePatchedNote(note, { pinned: target })).then(() => toast(target ? '已批量置顶。' : '已批量取消置顶。'))
  const batchPriority = (priority: Priority) => batchUpdate((note) => normalizePatchedNote(note, { priority })).then(() => toast(`已批量改为${PRIORITY_LABELS[priority]}。`))
  const batchArchive = () => batchUpdate((note) => normalizePatchedNote(note, { archivedAt: new Date().toISOString() })).then(() => toast('已批量归档。'))
  const batchTrash = () => batchUpdate((note) => normalizePatchedNote(note, { deletedAt: new Date().toISOString() })).then(() => toast('已批量移入回收站。', 'warning'))
  const batchRestore = () => batchUpdate((note) => normalizePatchedNote(note, { deletedAt: null, archivedAt: null })).then(() => toast('已批量恢复。'))

  const batchTags = (input: string) => {
    const tags = input.split(',').map((tag) => tag.trim()).filter(Boolean)
    if (!tags.length) {
      return Promise.resolve()
    }

    return batchUpdate((note) => normalizePatchedNote(note, { tags: [...new Set([...note.tags, ...tags])] })).then(() => toast('已批量追加标签。'))
  }

  function openImportDialog() {
    importDialogOpen.value = true
  }

  function closeImportDialog() {
    importDialogOpen.value = false
    importText.value = ''
    importPreview.value = null
    importStrategy.value = 'newer'
  }

  function previewImport() {
    importPreview.value = buildImportPreview(importText.value, notes.value)
  }

  async function confirmImport() {
    if (!importPreview.value) {
      return
    }

    const existingMap = new Map(notes.value.map((note) => [note.id, note]))
    const toPersist: Note[] = []

    importPreview.value.notes.forEach((incoming) => {
      const existing = existingMap.get(incoming.id)
      if (!existing) {
        toPersist.push(incoming)
      } else if (importStrategy.value === 'prefer-import') {
        toPersist.push({ ...incoming, syncStatus: 'dirty' })
      } else if (importStrategy.value === 'prefer-local') {
        toPersist.push(existing)
      } else if (importStrategy.value === 'keep-both') {
        toPersist.push(existing, { ...incoming, id: `${incoming.id}-copy`, title: `${incoming.title}（导入副本）` })
      } else {
        toPersist.push(new Date(incoming.updatedAt).getTime() >= new Date(existing.updatedAt).getTime() ? incoming : existing)
      }
    })

    await notesRepository.bulkPut(toPersist)
    await Promise.all(
      toPersist.map((note) => queueNoteOperation(note, existingMap.has(note.id) ? 'update' : 'create', existingMap.get(note.id)?.version)),
    )
    await tagRepository.syncUsage(await notesRepository.list())
    await refresh()
    closeImportDialog()
    toast(`已导入 ${toPersist.length} 条记录。`)
  }

  function exportCurrent(format: ExportFormat = settings.value.exportFormat) {
    const payload = exportNotes(format, notes.value, templates.value)
    downloadBlob(payload.filename, payload.mime, payload.content)
  }

  function createFromTemplate(templateId: string) {
    openEditor(undefined, templateId)
    commandPaletteOpen.value = false
  }

  function toggleCommandPalette(force?: boolean) {
    commandPaletteOpen.value = typeof force === 'boolean' ? force : !commandPaletteOpen.value
  }

  function registerInstallPrompt(event: BeforeInstallPromptEvent) {
    deferredInstallPrompt.value = event
    installAvailable.value = true
  }

  async function promptInstall() {
    if (!deferredInstallPrompt.value) {
      return
    }

    await deferredInstallPrompt.value.prompt()
    installAvailable.value = false
    deferredInstallPrompt.value = null
  }

  async function dismissInstall() {
    installAvailable.value = false
    settings.value = await settingsRepository.patch({ installPromptDismissed: true })
  }

  async function updateTagColor(name: string, color: string) {
    const current = tagMeta.value.find((tag) => tag.name === name)
    await tagRepository.put({
      name,
      color,
      usageCount: current?.usageCount || 0,
      pinned: current?.pinned || false,
      lastUsedAt: current?.lastUsedAt || new Date().toISOString(),
    })
    await refresh()
  }

  async function togglePinnedTag(name: string) {
    const current = tagMeta.value.find((tag) => tag.name === name)
    await tagRepository.put({
      name,
      color: current?.color || '#2563eb',
      usageCount: current?.usageCount || 0,
      pinned: !current?.pinned,
      lastUsedAt: current?.lastUsedAt || new Date().toISOString(),
    })
    await refresh()
  }

  const moveBoardNote = (noteId: string, status: Note['status'], order: number) => patchNote(noteId, { status, order, completed: status === 'done' })
  const updateDueDate = (noteId: string, dueDate: string | null) => patchNote(noteId, { dueDate })

  async function applyRemoteSnapshot(snapshot: SyncPullResponse) {
    if (snapshot.notes.length) {
      await notesRepository.bulkPut(snapshot.notes.map((note) => ({ ...note, syncStatus: 'synced' })))
    }

    if (snapshot.templates.length) {
      await templatesRepository.bulkPut(snapshot.templates)
    }

    await tagRepository.syncUsage(await notesRepository.list())
    settings.value = await settingsRepository.patch({ lastSyncCursor: snapshot.nextCursor })
    await refresh()
  }

  function checkReminders() {
    activeReminders.value.forEach((note) => {
      if (notifiedReminders.has(note.id)) {
        return
      }

      notifiedReminders.add(note.id)
      toast(`提醒：${note.title}`, 'info')
      if ('Notification' in window && settings.value.notificationPermission === 'granted') {
        new Notification('MX工作便签提醒', { body: note.title, tag: note.id })
      }
    })
  }

  return {
    ready,
    loading,
    workspaceId,
    notes,
    templates,
    settings,
    tagMeta,
    tagInsights,
    searchHistory,
    activeTags,
    searchQuery,
    selectedNoteIds,
    editorOpen,
    editingNoteId,
    editorDraft,
    importDialogOpen,
    importText,
    importPreview,
    importStrategy,
    commandPaletteOpen,
    installAvailable,
    legacyImportPromptOpen,
    toasts,
    stats,
    activeReminders,
    dashboardNotes,
    visibleNotes,
    boardColumns,
    calendarNotes,
    initialize,
    refresh,
    resetWorkspaceState,
    detectLegacyImportPrompt,
    importLegacyAnonymousData,
    discardLegacyAnonymousData,
    openEditor,
    closeEditor,
    addChecklistItem,
    removeChecklistItem,
    saveNote,
    toggleNoteComplete,
    updateChecklistItem,
    trashNote,
    restoreNote,
    archiveNote,
    unarchiveNote,
    purgeNote,
    setSearchQuery,
    rememberSearch,
    toggleTag,
    clearTags,
    setSelectedView,
    setSortMode,
    setTheme,
    saveSettings,
    requestNotificationPermission,
    toggleSelection,
    clearSelection,
    batchComplete,
    batchPinned,
    batchPriority,
    batchArchive,
    batchTrash,
    batchRestore,
    batchTags,
    openImportDialog,
    closeImportDialog,
    previewImport,
    confirmImport,
    exportCurrent,
    createFromTemplate,
    toggleCommandPalette,
    registerInstallPrompt,
    promptInstall,
    dismissInstall,
    updateTagColor,
    togglePinnedTag,
    moveBoardNote,
    updateDueDate,
    applyRemoteSnapshot,
    checkReminders,
    toast,
  }
})
