import type { ChecklistItem, Note, Template } from '@shared'

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function splitTags(value: string) {
  return [...new Set(value.split(/[,，]/).map((item) => item.trim()).filter(Boolean))]
}

export function joinTags(tags: string[]) {
  return tags.join('，')
}

export function checklistItemsToText(items: ChecklistItem[]) {
  return items.map((item) => `[${item.completed ? 'x' : ' '}] ${item.text}`).join('\n')
}

export function checklistTextToItems(value: string, now = new Date().toISOString()) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const completed = /^\[(x|X)\]\s*/.test(line)
      const text = line.replace(/^\[(x|X| )\]\s*/, '').trim()
      return {
        id: createId('check'),
        text,
        completed,
        order: index,
        createdAt: now,
        updatedAt: now,
      }
    })
}

export function createEmptyNote(): Note {
  const now = new Date().toISOString()
  return {
    id: createId('note'),
    title: '',
    content: '',
    tags: [],
    color: '#f8fafc',
    completed: false,
    type: 'note',
    checklist: [],
    pinned: false,
    priority: 'normal',
    status: 'todo',
    order: 0,
    dueDate: null,
    remindAt: null,
    deletedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    source: 'local',
    version: 1,
    syncStatus: 'local',
  }
}

export function createEmptyTemplate(): Template {
  const now = new Date().toISOString()
  const note = createEmptyNote()
  return {
    id: createId('template'),
    key: 'meeting',
    name: '',
    description: '',
    icon: 'NotebookPen',
    createdAt: now,
    updatedAt: now,
    note: {
      title: note.title,
      content: note.content,
      tags: note.tags,
      color: note.color,
      completed: false,
      type: note.type,
      checklist: [],
      pinned: false,
      priority: note.priority,
      status: note.status,
      order: 0,
      dueDate: note.dueDate,
      remindAt: note.remindAt,
    },
  }
}

export function cloneNote(note: Note) {
  return JSON.parse(JSON.stringify(note)) as Note
}

export function cloneTemplate(template: Template) {
  return JSON.parse(JSON.stringify(template)) as Template
}

export function prepareNoteForSave(note: Note, options: { tagsText: string; checklistText: string }) {
  const now = new Date().toISOString()
  const next = cloneNote(note)
  next.tags = splitTags(options.tagsText)
  next.updatedAt = now

  if (next.type === 'checklist') {
    next.checklist = checklistTextToItems(options.checklistText, now)
    next.completed = next.checklist.length > 0 && next.checklist.every((item) => item.completed)
    next.content = ''
  } else {
    next.checklist = []
  }

  if (next.completed) {
    next.status = 'done'
    next.completedAt = next.completedAt || now
  } else if (next.status === 'done') {
    next.status = 'todo'
    next.completedAt = null
  }

  return next
}

export function prepareTemplateForSave(template: Template, options: { tagsText: string; checklistText: string }) {
  const now = new Date().toISOString()
  const next = cloneTemplate(template)
  next.updatedAt = now
  next.note.tags = splitTags(options.tagsText)

  if (next.note.type === 'checklist') {
    next.note.checklist = checklistTextToItems(options.checklistText, now)
    next.note.content = ''
    next.note.completed = false
  } else {
    next.note.checklist = []
  }

  return next
}
