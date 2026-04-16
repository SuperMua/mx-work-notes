import type { Note, TagMeta, Template, Workspace, WorkspaceMember } from '@shared';

type NoteRecordShape = {
  id: string
  title: string
  content: string
  payload: unknown
  dueDate: Date | null
  remindAt: Date | null
  deletedAt: Date | null
  archivedAt: Date | null
  version: number
  createdAt: Date
  updatedAt: Date
}

type TemplateRecordShape = {
  id: string
  key: string
  name: string
  description: string
  payload: unknown
  createdAt: Date
  updatedAt: Date
}

type WorkspaceShape = {
  id: string
  name: string
  description: string
  updatedAt?: Date
  createdAt: Date
  _count?: {
    members?: number
  }
}

type TagRecordShape = {
  name: string
  color: string
  usageCount: number
  pinned: boolean
  lastUsedAt: Date | null
}

export function toNoteEntity(record: NoteRecordShape): Note {
  const payload = record.payload as Partial<Note>;
  return {
    ...payload,
    id: record.id,
    title: record.title,
    content: record.content,
    dueDate: record.dueDate?.toISOString() || null,
    remindAt: record.remindAt?.toISOString() || null,
    deletedAt: record.deletedAt?.toISOString() || null,
    archivedAt: record.archivedAt?.toISOString() || null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    version: record.version,
  } as Note;
}

export function toTemplateEntity(record: TemplateRecordShape): Template {
  const payload = record.payload as Partial<Template>;
  return {
    ...payload,
    id: record.id,
    key: record.key,
    name: record.name,
    description: record.description,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  } as Template;
}

export function toWorkspaceEntity(workspace: WorkspaceShape): Workspace {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    members: workspace._count?.members || 0,
    createdAt: workspace.createdAt.toISOString(),
  };
}

export function toTagMetaEntity(record: TagRecordShape): TagMeta {
  return {
    name: record.name,
    color: record.color,
    usageCount: record.usageCount,
    pinned: record.pinned,
    lastUsedAt: record.lastUsedAt?.toISOString() || null,
  };
}

export function toWorkspaceMemberEntity(record: {
  id: string
  workspaceId: string
  userId: string
  role: string
  status: string
  createdAt: Date
  user: { id: string; email: string; name: string } | null
}): WorkspaceMember {
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    userId: record.userId,
    role: record.role as WorkspaceMember['role'],
    status: record.status as WorkspaceMember['status'],
    createdAt: record.createdAt.toISOString(),
    user: record.user
      ? {
          id: record.user.id,
          email: record.user.email,
          name: record.user.name,
          role: record.role as WorkspaceMember['role'],
        }
      : null,
  };
}
