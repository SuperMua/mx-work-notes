import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import isBetween from 'dayjs/plugin/isBetween'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'

import type {
  ExportFormat,
  ImportPreview,
  Note,
  NoteDraft,
  NoteView,
  Priority,
  TagMeta,
  Template,
} from '@shared'
import { APP_SHORT_NAME, IMPORTANT_TAG_NAME } from '@shared'

dayjs.extend(relativeTime)
dayjs.extend(isBetween)
dayjs.extend(localizedFormat)
dayjs.locale('zh-cn')

const priorityWeight: Record<Priority, number> = {
  high: 0,
  normal: 1,
  low: 2,
}

const priorityText: Record<Priority, string> = {
  high: '高优先级',
  normal: '普通优先级',
  low: '低优先级',
}

const statusText: Record<Note['status'], string> = {
  todo: '待处理',
  doing: '进行中',
  done: '已完成',
}

export function createId(prefix = 'note') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function dedupeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function highlightText(value: string, query: string) {
  if (!query.trim()) {
    return escapeHtml(value).replaceAll('\n', '<br />')
  }

  const safe = escapeHtml(value)
  const pattern = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return safe.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>').replaceAll('\n', '<br />')
}

export function isOverdue(note: Note) {
  return Boolean(note.dueDate && !note.completed && dayjs(note.dueDate).isBefore(dayjs()))
}

export function isDueToday(note: Note) {
  return Boolean(note.dueDate && dayjs(note.dueDate).isSame(dayjs(), 'day'))
}

export function isDueThisWeek(note: Note) {
  if (!note.dueDate) {
    return false
  }

  const due = dayjs(note.dueDate)
  return due.isBetween(dayjs().startOf('week'), dayjs().endOf('week'), 'day', '[]')
}

export function matchesView(note: Note, view: NoteView) {
  switch (view) {
    case 'active':
      return !note.completed && !note.deletedAt && !note.archivedAt
    case 'completed':
      return note.completed && !note.deletedAt && !note.archivedAt
    case 'important':
      return (note.priority === 'high' || note.pinned || note.tags.includes(IMPORTANT_TAG_NAME)) && !note.deletedAt && !note.archivedAt
    case 'today':
      return isDueToday(note) && !note.deletedAt && !note.archivedAt
    case 'week':
      return isDueThisWeek(note) && !note.deletedAt && !note.archivedAt
    case 'overdue':
      return isOverdue(note) && !note.deletedAt && !note.archivedAt
    case 'archived':
      return Boolean(note.archivedAt) && !note.deletedAt
    case 'trash':
      return Boolean(note.deletedAt)
    case 'all':
    default:
      return !note.deletedAt && !note.archivedAt
  }
}

export function matchesQuery(note: Note, query: string) {
  if (!query.trim()) {
    return true
  }

  const search = query.trim().toLowerCase()
  const checklistText = note.checklist.map((item) => item.text).join(' ')
  return [note.title, note.content, checklistText, ...note.tags].join(' ').toLowerCase().includes(search)
}

export function matchesTags(note: Note, activeTags: string[]) {
  if (!activeTags.length) {
    return true
  }

  return activeTags.every((tag) => note.tags.includes(tag))
}

export function sortNotes(notes: Note[], sortMode: 'smart' | 'updated' | 'due' | 'title') {
  return [...notes].sort((left, right) => {
    if (sortMode === 'title') {
      return left.title.localeCompare(right.title, 'zh-CN')
    }

    if (sortMode === 'updated') {
      return dayjs(right.updatedAt).valueOf() - dayjs(left.updatedAt).valueOf()
    }

    if (sortMode === 'due') {
      if (left.dueDate && right.dueDate) {
        return dayjs(left.dueDate).valueOf() - dayjs(right.dueDate).valueOf()
      }
      if (left.dueDate) return -1
      if (right.dueDate) return 1
      return dayjs(right.updatedAt).valueOf() - dayjs(left.updatedAt).valueOf()
    }

    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1
    }

    if (priorityWeight[left.priority] !== priorityWeight[right.priority]) {
      return priorityWeight[left.priority] - priorityWeight[right.priority]
    }

    if (left.dueDate && right.dueDate && dayjs(left.dueDate).valueOf() !== dayjs(right.dueDate).valueOf()) {
      return dayjs(left.dueDate).valueOf() - dayjs(right.dueDate).valueOf()
    }

    if (left.dueDate && !right.dueDate) return -1
    if (!left.dueDate && right.dueDate) return 1

    return dayjs(right.updatedAt).valueOf() - dayjs(left.updatedAt).valueOf()
  })
}

export function relativeTimestamp(value: string | null) {
  return value ? dayjs(value).fromNow() : '未设置'
}

export function formatTimestamp(value: string | null, template = 'YYYY-MM-DD HH:mm') {
  return value ? dayjs(value).format(template) : '未设置'
}

export function getDueBadge(note: Note) {
  if (!note.dueDate) {
    return { label: '未设置截止时间', tone: 'muted' as const }
  }

  if (isOverdue(note)) {
    return { label: `已逾期 ${dayjs(note.dueDate).fromNow(true)}`, tone: 'danger' as const }
  }

  if (isDueToday(note)) {
    return { label: '今天截止', tone: 'warning' as const }
  }

  if (isDueThisWeek(note)) {
    return { label: '本周内到期', tone: 'info' as const }
  }

  return { label: dayjs(note.dueDate).format('MM月DD日 HH:mm'), tone: 'muted' as const }
}

export function getChecklistProgress(note: Note) {
  if (note.type !== 'checklist') {
    return { total: 0, completed: note.completed ? 1 : 0, percent: note.completed ? 100 : 0 }
  }

  const total = note.checklist.length
  const completed = note.checklist.filter((item) => item.completed).length
  return {
    total,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
  }
}

export function noteToMarkdown(note: Note) {
  const lines = [
    `# ${note.title}`,
    '',
    `- 优先级：${priorityText[note.priority]}`,
    `- 状态：${statusText[note.status]}`,
    `- 置顶：${note.pinned ? '是' : '否'}`,
    `- 截止：${note.dueDate ? formatTimestamp(note.dueDate) : '未设置'}`,
    `- 标签：${note.tags.join('、') || '无'}`,
    '',
  ]

  if (note.type === 'checklist') {
    lines.push('## 清单', '')
    note.checklist.forEach((item) => {
      lines.push(`- [${item.completed ? 'x' : ' '}] ${item.text}`)
    })
  } else {
    lines.push(note.content)
  }

  return lines.join('\n')
}

export function exportNotes(format: ExportFormat, notes: Note[], templates: Template[]) {
  const stamp = dayjs().format('YYYYMMDD-HHmm')
  const prefix = `${APP_SHORT_NAME}-${stamp}`

  if (format === 'json') {
    return {
      filename: `${prefix}.json`,
      mime: 'application/json;charset=utf-8',
      content: JSON.stringify({ exportedAt: new Date().toISOString(), notes, templates }, null, 2),
    }
  }

  if (format === 'markdown') {
    return {
      filename: `${prefix}.md`,
      mime: 'text/markdown;charset=utf-8',
      content: notes.map((note) => noteToMarkdown(note)).join('\n\n---\n\n'),
    }
  }

  return {
    filename: `${prefix}.txt`,
    mime: 'text/plain;charset=utf-8',
    content: notes
      .map((note) =>
        [
          note.title,
          `标签：${note.tags.join('、') || '无'}`,
          `状态：${note.completed ? '已完成' : '未完成'}`,
          note.type === 'checklist'
            ? note.checklist.map((item) => `- [${item.completed ? 'x' : ' '}] ${item.text}`).join('\n')
            : note.content,
        ].join('\n'),
      )
      .join('\n\n==========\n\n'),
  }
}

export function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function buildImportPreview(input: string, existingNotes: Note[]): ImportPreview {
  const parsed = JSON.parse(input) as { notes?: Note[] } | Note[]
  const notes = Array.isArray(parsed) ? parsed : parsed.notes ?? []
  const map = new Map(existingNotes.map((note) => [note.id, note]))
  const normalized = notes.map((note) => normalizeImportedNote(note))
  return {
    notes: normalized,
    conflicts: normalized
      .filter((note) => map.has(note.id))
      .map((note) => ({
        incoming: note,
        existing: map.get(note.id)!,
      })),
  }
}

export function normalizeImportedNote(note: Partial<Note>): Note {
  const createdAt = typeof note.createdAt === 'string' ? note.createdAt : new Date().toISOString()
  const updatedAt = typeof note.updatedAt === 'string' ? note.updatedAt : createdAt
  const checklist = Array.isArray(note.checklist)
    ? note.checklist.map((item, index) => ({
        id: item.id || createId('check'),
        text: item.text || '',
        completed: Boolean(item.completed),
        order: typeof item.order === 'number' ? item.order : index,
        createdAt: item.createdAt || createdAt,
        updatedAt: item.updatedAt || updatedAt,
      }))
    : []

  const completed = note.type === 'checklist'
    ? checklist.length > 0 && checklist.every((item) => item.completed)
    : Boolean(note.completed)

  return {
    id: note.id || createId('note'),
    title: note.title || '未命名便签',
    content: note.content || '',
    tags: dedupeTags(Array.isArray(note.tags) ? note.tags : []),
    color: note.color || '#f7f9fc',
    completed,
    type: note.type === 'checklist' ? 'checklist' : 'note',
    checklist,
    pinned: Boolean(note.pinned),
    priority: note.priority === 'high' || note.priority === 'low' ? note.priority : 'normal',
    status: note.status === 'doing' || note.status === 'done' ? note.status : completed ? 'done' : 'todo',
    order: typeof note.order === 'number' ? note.order : 0,
    dueDate: note.dueDate || null,
    remindAt: note.remindAt || null,
    deletedAt: note.deletedAt || null,
    archivedAt: note.archivedAt || null,
    createdAt,
    updatedAt,
    completedAt: note.completedAt || (completed ? updatedAt : null),
    source: note.source === 'template' || note.source === 'sync' || note.source === 'local' ? note.source : 'import',
    version: typeof note.version === 'number' ? note.version : 1,
    syncStatus: note.syncStatus === 'dirty' || note.syncStatus === 'synced' || note.syncStatus === 'conflict' ? note.syncStatus : 'local',
  }
}

export function buildDraftFromTemplate(template: Template): NoteDraft {
  return {
    title: template.note.title,
    content: template.note.content,
    tags: [...template.note.tags],
    color: template.note.color,
    completed: false,
    type: template.note.type,
    checklist: template.note.checklist.map((item, index) => ({
      ...item,
      id: createId('check'),
      order: index,
      completed: false,
    })),
    pinned: template.note.pinned,
    priority: template.note.priority,
    status: 'todo',
    order: 0,
    dueDate: template.note.dueDate,
    remindAt: template.note.remindAt,
    deletedAt: null,
    archivedAt: null,
  }
}

export function buildNote(input: NoteDraft, existing?: Note): Note {
  const timestamp = new Date().toISOString()
  const checklist = input.type === 'checklist'
    ? input.checklist.map((item, index) => ({
        ...item,
        id: item.id || createId('check'),
        order: index,
        updatedAt: timestamp,
      }))
    : []

  const completed = input.type === 'checklist'
    ? checklist.length > 0 && checklist.every((item) => item.completed)
    : input.completed

  return {
    id: existing?.id || createId('note'),
    title: input.title.trim() || '未命名便签',
    content: input.type === 'checklist' ? '' : input.content,
    tags: dedupeTags(input.tags),
    color: input.color,
    completed,
    type: input.type,
    checklist,
    pinned: input.pinned,
    priority: input.priority,
    status: completed ? 'done' : input.status,
    order: existing?.order || 0,
    dueDate: input.dueDate,
    remindAt: input.remindAt,
    deletedAt: existing?.deletedAt || null,
    archivedAt: existing?.archivedAt || null,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
    completedAt: completed ? (existing?.completedAt || timestamp) : null,
    source: existing?.source || 'local',
    version: (existing?.version || 0) + 1,
    syncStatus: 'dirty',
  }
}

export function emptyDraft(priority: Priority = 'normal'): NoteDraft {
  return {
    title: '',
    content: '',
    tags: [],
    color: '#f7f9fc',
    completed: false,
    type: 'note',
    checklist: [],
    pinned: false,
    priority,
    status: 'todo',
    order: 0,
    dueDate: null,
    remindAt: null,
    deletedAt: null,
    archivedAt: null,
  }
}

export function tagUsage(notes: Note[], tagMeta: TagMeta[]) {
  const counts = new Map<string, number>()
  notes
    .filter((note) => !note.deletedAt)
    .forEach((note) => {
      note.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1))
    })

  return [...counts.entries()]
    .map(([name, usageCount]) => ({
      name,
      usageCount,
      color: tagMeta.find((meta) => meta.name === name)?.color || '#2563eb',
      pinned: tagMeta.find((meta) => meta.name === name)?.pinned || false,
      lastUsedAt: tagMeta.find((meta) => meta.name === name)?.lastUsedAt || null,
    }))
    .sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1
      }
      return right.usageCount - left.usageCount
    })
}
