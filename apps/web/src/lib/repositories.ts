import Dexie, { type Table } from 'dexie'

import type {
  AppSettings,
  AuthSession,
  AuthSessionRecord,
  Note,
  SearchHistoryItem,
  SyncQueueItem,
  TagMeta,
  Template,
  ThemeKey,
} from '@shared'
import { DEFAULT_SETTINGS, IMPORTANT_TAG_NAME } from '@shared'

import { createId, normalizeImportedNote, tagUsage } from './note-utils'
import { createDefaultTemplates } from './sample-data'

interface SettingRecord {
  id: 'app'
  value: AppSettings
}

interface LegacyMigrationRecord {
  id: string
  status: 'imported' | 'discarded'
  handledAt: string
}

function cloneForStorage<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

class WorkspaceDatabase extends Dexie {
  notes!: Table<Note, string>
  templates!: Table<Template, string>
  settings!: Table<SettingRecord, 'app'>
  tagMeta!: Table<TagMeta, string>
  searchHistory!: Table<SearchHistoryItem, string>
  syncQueue!: Table<SyncQueueItem, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      notes: '&id, updatedAt, dueDate, deletedAt, archivedAt, priority, pinned, status',
      templates: '&id, key, updatedAt',
      settings: '&id',
      tagMeta: '&name, pinned, lastUsedAt',
      searchHistory: '&id, createdAt',
      syncQueue: '&id, entityType, entityId, createdAt',
    })
  }
}

class SessionDatabase extends Dexie {
  sessions!: Table<AuthSessionRecord, 'primary'>
  legacyMigrations!: Table<LegacyMigrationRecord, string>

  constructor() {
    super('smart-work-notes-session')
    this.version(1).stores({
      sessions: '&id',
      legacyMigrations: '&id, handledAt',
    })
  }
}

class LegacyAnonymousDatabase extends Dexie {
  notes!: Table<Note, string>
  templates!: Table<Template, string>
  settings!: Table<SettingRecord, 'app'>

  constructor() {
    super('smart-work-notes')
    this.version(1).stores({
      notes: '&id, updatedAt, dueDate, deletedAt, archivedAt, priority, pinned, status',
      templates: '&id, key, updatedAt',
      settings: '&id',
      tagMeta: '&name, pinned, lastUsedAt',
      searchHistory: '&id, createdAt',
      syncQueue: '&id, entityType, entityId, createdAt',
    })
    this.version(2).stores({
      notes: '&id, updatedAt, dueDate, deletedAt, archivedAt, priority, pinned, status',
      templates: '&id, key, updatedAt',
      settings: '&id',
      tagMeta: '&name, pinned, lastUsedAt',
      searchHistory: '&id, createdAt',
      syncQueue: '&id, entityType, entityId, createdAt',
      sessions: '&id',
    })
  }
}

const sessionDb = new SessionDatabase()
const legacyDb = new LegacyAnonymousDatabase()
const workspaceDbs = new Map<string, WorkspaceDatabase>()

const LEGACY_STORAGE_KEY = 'stickyNotesAppData'
const LEGACY_THEME_KEY = 'stickyNotesTheme'

const legacyThemeMap: Record<string, ThemeKey> = {
  'theme-purple': 'light-workbench',
  'theme-blue': 'light-workbench',
  'theme-green': 'light-workbench',
  'theme-pink': 'light-workbench',
  'theme-orange': 'light-workbench',
  'theme-dark': 'dark-workbench',
  'theme-red': 'light-workbench',
  'theme-cyan': 'light-workbench',
  'theme-amber': 'light-workbench',
  'theme-indigo': 'light-workbench',
  'theme-rose': 'light-workbench',
  'theme-teal': 'light-workbench',
  'theme-fuchsia': 'light-workbench',
  'theme-slate': 'dark-workbench',
  'theme-forest': 'light-workbench',
  'aurora-ink': 'light-workbench',
  'ocean-signal': 'light-workbench',
  'sage-command': 'light-workbench',
  'ember-focus': 'light-workbench',
  'rose-notes': 'light-workbench',
  'gold-brief': 'light-workbench',
  'night-shift': 'dark-workbench',
  'light-workbench': 'light-workbench',
  'dark-workbench': 'dark-workbench',
}

let activeWorkspaceId: string | null = null

function normalizeWorkspaceKey(workspaceId: string) {
  return workspaceId.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
}

function getWorkspaceDb() {
  if (!activeWorkspaceId) {
    throw new Error('当前未绑定工作区缓存')
  }

  const key = normalizeWorkspaceKey(activeWorkspaceId)
  if (!workspaceDbs.has(key)) {
    workspaceDbs.set(key, new WorkspaceDatabase(`smart-work-notes::${key}`))
  }

  return workspaceDbs.get(key)!
}

function resolveLegacyTheme(theme: string | null | undefined): ThemeKey | null {
  if (!theme) {
    return null
  }

  return legacyThemeMap[theme] || null
}

function normalizeLegacyNote(input: Record<string, unknown>): Note {
  const date = typeof input.date === 'string' ? input.date : new Date().toISOString()
  const tags = Array.isArray(input.tags) ? input.tags.map((tag) => String(tag)) : []
  const priority = tags.some((tag) => [IMPORTANT_TAG_NAME, 'priority'].includes(tag.toLowerCase())) ? 'high' : 'normal'

  return normalizeImportedNote({
    id: typeof input.id === 'string' ? input.id : createId('legacy'),
    title: typeof input.title === 'string' ? input.title : '旧版便签',
    content: typeof input.content === 'string' ? input.content : '',
    tags,
    color: typeof input.color === 'string' ? input.color : '#f7f9fc',
    completed: Boolean(input.completed),
    pinned: false,
    priority,
    status: Boolean(input.completed) ? 'done' : 'todo',
    createdAt: date,
    updatedAt: date,
    source: 'local',
  })
}

async function readLegacyIndexedDbNotes() {
  try {
    return await legacyDb.notes.toArray()
  } catch {
    return []
  }
}

async function readLegacyIndexedDbTheme() {
  try {
    const settings = await legacyDb.settings.get('app')
    return resolveLegacyTheme(settings?.value?.theme)
  } catch {
    return null
  }
}

async function readLegacyAnonymousNotes() {
  const indexedDbNotes = await readLegacyIndexedDbNotes()
  if (indexedDbNotes.length) {
    return indexedDbNotes.map((note) => normalizeImportedNote(note))
  }

  const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((item) => normalizeLegacyNote(item)) : []
  } catch {
    return []
  }
}

async function readLegacyAnonymousTheme() {
  const indexedTheme = await readLegacyIndexedDbTheme()
  if (indexedTheme) {
    return indexedTheme
  }

  return resolveLegacyTheme(localStorage.getItem(LEGACY_THEME_KEY))
}

export function setWorkspaceContext(workspaceId: string | null) {
  activeWorkspaceId = workspaceId
}

export function getWorkspaceContext() {
  return activeWorkspaceId
}

export const notesRepository = {
  list: () => getWorkspaceDb().notes.toArray(),
  get: (id: string) => getWorkspaceDb().notes.get(id),
  put: (note: Note) => getWorkspaceDb().notes.put(cloneForStorage(note)),
  bulkPut: (notes: Note[]) => getWorkspaceDb().notes.bulkPut(notes.map((note) => cloneForStorage(note))),
  delete: (id: string) => getWorkspaceDb().notes.delete(id),
  bulkDelete: (ids: string[]) => getWorkspaceDb().notes.bulkDelete(ids),
  clear: () => getWorkspaceDb().notes.clear(),
}

export const templatesRepository = {
  list: () => getWorkspaceDb().templates.toArray(),
  put: (template: Template) => getWorkspaceDb().templates.put(cloneForStorage(template)),
  bulkPut: (templates: Template[]) => getWorkspaceDb().templates.bulkPut(templates.map((template) => cloneForStorage(template))),
}

export const settingsRepository = {
  async getAppSettings() {
    const record = await getWorkspaceDb().settings.get('app')
    return record ? { ...DEFAULT_SETTINGS, ...record.value } : { ...DEFAULT_SETTINGS }
  },
  saveAppSettings(value: AppSettings) {
    return getWorkspaceDb().settings.put({ id: 'app', value: cloneForStorage(value) })
  },
  async patch(value: Partial<AppSettings>) {
    const current = await this.getAppSettings()
    const next = { ...current, ...value }
    await this.saveAppSettings(next)
    return next
  },
}

export const sessionRepository = {
  async get() {
    const record = await sessionDb.sessions.get('primary')
    return record?.value || null
  },
  async save(session: AuthSession) {
    await sessionDb.sessions.put({ id: 'primary', value: cloneForStorage(session) })
    return session
  },
  clear() {
    return sessionDb.sessions.delete('primary')
  },
}

export const legacyMigrationRepository = {
  async isHandled(workspaceId: string) {
    return Boolean(await sessionDb.legacyMigrations.get(workspaceId))
  },
  markImported(workspaceId: string) {
    return sessionDb.legacyMigrations.put({
      id: workspaceId,
      status: 'imported',
      handledAt: new Date().toISOString(),
    })
  },
  markDiscarded(workspaceId: string) {
    return sessionDb.legacyMigrations.put({
      id: workspaceId,
      status: 'discarded',
      handledAt: new Date().toISOString(),
    })
  },
}

export const tagRepository = {
  list: () => getWorkspaceDb().tagMeta.toArray(),
  get: (name: string) => getWorkspaceDb().tagMeta.get(name),
  put: (tag: TagMeta) => getWorkspaceDb().tagMeta.put(cloneForStorage(tag)),
  bulkPut: (tags: TagMeta[]) => getWorkspaceDb().tagMeta.bulkPut(tags.map((tag) => cloneForStorage(tag))),
  async syncUsage(notes: Note[]) {
    const db = getWorkspaceDb()
    const current = await db.tagMeta.toArray()
    const next = tagUsage(notes, current)
    await db.tagMeta.clear()
    if (next.length) {
      await db.tagMeta.bulkPut(next)
    }
    return next
  },
}

export const searchHistoryRepository = {
  async list() {
    return getWorkspaceDb().searchHistory.orderBy('createdAt').reverse().limit(8).toArray()
  },
  async push(query: string) {
    const normalized = query.trim()
    if (!normalized) {
      return
    }

    const db = getWorkspaceDb()
    const existing = await db.searchHistory.filter((item) => item.query === normalized).toArray()
    if (existing.length) {
      await db.searchHistory.bulkDelete(existing.map((item) => item.id))
    }

    await db.searchHistory.put({
      id: createId('search'),
      query: normalized,
      createdAt: new Date().toISOString(),
    })

    const items = await db.searchHistory.orderBy('createdAt').reverse().toArray()
    if (items.length > 8) {
      await db.searchHistory.bulkDelete(items.slice(8).map((item) => item.id))
    }
  },
}

export const syncQueueRepository = {
  list: () => getWorkspaceDb().syncQueue.orderBy('createdAt').toArray(),
  enqueue(item: Omit<SyncQueueItem, 'id' | 'createdAt'>) {
    return getWorkspaceDb().syncQueue.put({
      ...item,
      payload: cloneForStorage(item.payload),
      id: createId('sync'),
      createdAt: new Date().toISOString(),
    })
  },
  clear: () => getWorkspaceDb().syncQueue.clear(),
  remove: (id: string) => getWorkspaceDb().syncQueue.delete(id),
}

export async function ensureDefaultTemplates() {
  const templates = await templatesRepository.list()
  if (templates.length === 0) {
    await templatesRepository.bulkPut(createDefaultTemplates())
  }
}

export async function hasLegacyAnonymousData() {
  const [legacyNotes, legacyTheme] = await Promise.all([readLegacyAnonymousNotes(), readLegacyAnonymousTheme()])
  return Boolean(legacyNotes.length || legacyTheme)
}

export async function importLegacyAnonymousDataIntoWorkspace() {
  const [legacyNotes, legacyTheme, currentSettings] = await Promise.all([
    readLegacyAnonymousNotes(),
    readLegacyAnonymousTheme(),
    settingsRepository.getAppSettings(),
  ])

  if (legacyNotes.length) {
    await notesRepository.bulkPut(legacyNotes)
    await tagRepository.syncUsage(await notesRepository.list())
  }

  if (legacyTheme && currentSettings.theme === DEFAULT_SETTINGS.theme) {
    await settingsRepository.patch({ theme: legacyTheme })
  }

  return legacyNotes.length
}
