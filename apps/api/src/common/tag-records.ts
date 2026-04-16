import type { TagMeta } from '@shared';

import { toNoteEntity, toTagMetaEntity } from './entity-mappers';
import { PrismaService } from './prisma.service';

const DEFAULT_TAG_COLOR = '#2563eb';

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

type TagRecordShape = {
  name: string
  color: string
  usageCount: number
  pinned: boolean
  lastUsedAt: Date | null
}

export async function syncWorkspaceTagRecords(prisma: PrismaService, workspaceId: string): Promise<TagMeta[]> {
  const [noteRecords, tagRecords] = (await Promise.all([
    prisma.noteRecord.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.tagRecord.findMany({
      where: { workspaceId },
    }),
  ])) as [NoteRecordShape[], TagRecordShape[]];

  const currentTags = new Map<string, TagRecordShape>(tagRecords.map((record) => [record.name, record]));
  const usageMap = new Map<string, { usageCount: number; lastUsedAt: string | null }>();

  noteRecords.forEach((record: NoteRecordShape) => {
    const note = toNoteEntity(record);
    if (note.deletedAt) {
      return;
    }

    note.tags.forEach((tag) => {
      const existing = usageMap.get(tag);
      const lastUsedAt = !existing || new Date(note.updatedAt).getTime() > new Date(existing.lastUsedAt || 0).getTime()
        ? note.updatedAt
        : existing.lastUsedAt;

      usageMap.set(tag, {
        usageCount: (existing?.usageCount || 0) + 1,
        lastUsedAt,
      });
    });
  });

  const activeNames = [...usageMap.keys()];
  const staleNames = [...currentTags.keys()].filter((name: string) => !usageMap.has(name));

  for (const [name, usage] of usageMap.entries()) {
    const current = currentTags.get(name) as {
      color?: string
      pinned?: boolean
    } | undefined;

    await prisma.tagRecord.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
      create: {
        workspaceId,
        name,
        color: current?.color || DEFAULT_TAG_COLOR,
        pinned: current?.pinned || false,
        usageCount: usage.usageCount,
        lastUsedAt: usage.lastUsedAt ? new Date(usage.lastUsedAt) : null,
      },
      update: {
        usageCount: usage.usageCount,
        lastUsedAt: usage.lastUsedAt ? new Date(usage.lastUsedAt) : null,
      },
    });
  }

  if (staleNames.length) {
    await prisma.tagRecord.deleteMany({
      where: {
        workspaceId,
        name: {
          in: staleNames,
        },
      },
    });
  }

  const tags = await prisma.tagRecord.findMany({
    where: {
      workspaceId,
      ...(activeNames.length
        ? {
            name: {
              in: activeNames,
            },
          }
        : {}),
    },
    orderBy: [{ pinned: 'desc' }, { usageCount: 'desc' }, { name: 'asc' }],
  });

  return tags.map(toTagMetaEntity);
}
