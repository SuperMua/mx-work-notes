import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Note, NoteBatchItem, NoteBatchResponse } from '@shared';

import { toNoteEntity } from '../../common/entity-mappers';
import { toPrismaJson } from '../../common/prisma-json';
import { PrismaService } from '../../common/prisma.service';
import type { RequestUser } from '../../common/request-user';
import { syncWorkspaceTagRecords } from '../../common/tag-records';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser, workspaceId?: string) {
    const targetWorkspaceId = await this.assertWorkspaceAccess(user, workspaceId);
    const records = await this.prisma.noteRecord.findMany({
      where: { workspaceId: targetWorkspaceId },
      orderBy: { updatedAt: 'desc' },
    });

    return records.map(toNoteEntity);
  }

  async create(user: RequestUser, note: Note, workspaceId?: string) {
    const targetWorkspaceId = await this.assertWorkspaceAccess(user, workspaceId);
    const existing = await this.prisma.noteRecord.findUnique({ where: { id: note.id } });
    if (existing) {
      throw new ConflictException({
        applied: [],
        conflicts: [this.buildConflict(existing, note, note.version)],
      });
    }

    const created = await this.prisma.noteRecord.create({
      data: this.serializeNote(targetWorkspaceId, note, 1),
    });
    await syncWorkspaceTagRecords(this.prisma, targetWorkspaceId);

    return toNoteEntity(created);
  }

  async update(user: RequestUser, noteId: string, note: Note, expectedVersion?: number, workspaceId?: string) {
    const targetWorkspaceId = await this.assertWorkspaceAccess(user, workspaceId);
    const current = await this.prisma.noteRecord.findUnique({ where: { id: noteId } });
    if (!current || current.workspaceId !== targetWorkspaceId) {
      throw new NotFoundException('便签不存在');
    }

    if (typeof expectedVersion === 'number' && current.version !== expectedVersion) {
      throw new ConflictException({
        applied: [],
        conflicts: [this.buildConflict(current, note, expectedVersion)],
      });
    }

    const updated = await this.prisma.noteRecord.update({
      where: { id: noteId },
      data: this.serializeNote(targetWorkspaceId, { ...note, id: noteId }, current.version + 1),
    });
    await syncWorkspaceTagRecords(this.prisma, targetWorkspaceId);

    return toNoteEntity(updated);
  }

  async remove(user: RequestUser, noteId: string, workspaceId?: string) {
    const targetWorkspaceId = await this.assertWorkspaceAccess(user, workspaceId);
    const current = await this.prisma.noteRecord.findUnique({ where: { id: noteId } });
    if (!current || current.workspaceId !== targetWorkspaceId) {
      throw new NotFoundException('便签不存在');
    }

    await this.prisma.noteRecord.delete({ where: { id: noteId } });
    await syncWorkspaceTagRecords(this.prisma, targetWorkspaceId);
    return { removed: noteId };
  }

  async batch(user: RequestUser, items: NoteBatchItem[], workspaceId?: string): Promise<NoteBatchResponse> {
    const targetWorkspaceId = await this.assertWorkspaceAccess(user, workspaceId);
    const applied: NoteBatchResponse['applied'] = [];
    const conflicts: NoteBatchResponse['conflicts'] = [];
    let mutated = false;

    for (const item of items) {
      const current = await this.prisma.noteRecord.findUnique({ where: { id: item.entityId } });

      if (current && current.workspaceId !== targetWorkspaceId) {
        throw new ForbiddenException('便签不属于当前工作区');
      }

      if (typeof item.expectedVersion === 'number' && current && current.version !== item.expectedVersion) {
        conflicts.push(this.buildConflict(current, item.payload, item.expectedVersion));
        continue;
      }

      if (item.operation === 'delete') {
        if (current) {
          await this.prisma.noteRecord.delete({ where: { id: item.entityId } });
          applied.push({ entityId: item.entityId, operation: 'delete', version: current.version });
          mutated = true;
        }
        continue;
      }

      const payload = item.payload || this.applyNotePatch(current ? toNoteEntity(current) : null, item.operation);
      if (!payload) {
        continue;
      }

      const nextVersion = current ? current.version + 1 : 1;
      const persisted = current
        ? await this.prisma.noteRecord.update({
            where: { id: item.entityId },
            data: this.serializeNote(targetWorkspaceId, { ...payload, id: item.entityId }, nextVersion),
          })
        : await this.prisma.noteRecord.create({
            data: this.serializeNote(targetWorkspaceId, { ...payload, id: item.entityId }, nextVersion),
          });

      applied.push({ entityId: item.entityId, operation: item.operation, version: persisted.version });
      mutated = true;
    }

    if (mutated) {
      await syncWorkspaceTagRecords(this.prisma, targetWorkspaceId);
    }

    return { applied, conflicts };
  }

  async applySyncItem(user: RequestUser, item: { entityId: string; payload: Note; expectedVersion?: number; operation: 'create' | 'update' | 'delete' }) {
    const current = await this.prisma.noteRecord.findUnique({ where: { id: item.entityId } });

    if (item.operation === 'delete') {
      if (!current) {
        return { removed: item.entityId };
      }
      return this.remove(user, item.entityId);
    }

    if (!current) {
      return this.create(user, item.payload, user.workspaceId);
    }

    if (item.operation === 'create') {
      const incomingUpdatedAt = new Date(item.payload.updatedAt).getTime();
      if (!Number.isNaN(incomingUpdatedAt) && current.updatedAt.getTime() >= incomingUpdatedAt) {
        return toNoteEntity(current);
      }

      return this.update(user, item.entityId, item.payload, current.version, user.workspaceId);
    }

    return this.update(user, item.entityId, item.payload, item.expectedVersion, user.workspaceId);
  }

  private applyNotePatch(current: Note | null, operation: NoteBatchItem['operation']): Note | null {
    if (!current) {
      return null;
    }

    const timestamp = new Date().toISOString();
    switch (operation) {
      case 'restore':
        return { ...current, deletedAt: null, archivedAt: null, updatedAt: timestamp };
      case 'archive':
        return { ...current, archivedAt: timestamp, updatedAt: timestamp };
      case 'unarchive':
        return { ...current, archivedAt: null, updatedAt: timestamp };
      case 'update':
      case 'create':
      default:
        return current;
    }
  }

  private serializeNote(workspaceId: string, note: Note, version: number) {
    const payload: Note = {
      ...note,
      version,
      syncStatus: 'synced',
    };

    return {
      id: note.id,
      workspaceId,
      title: note.title,
      content: note.content,
      payload: toPrismaJson(payload),
      dueDate: note.dueDate ? new Date(note.dueDate) : null,
      remindAt: note.remindAt ? new Date(note.remindAt) : null,
      deletedAt: note.deletedAt ? new Date(note.deletedAt) : null,
      archivedAt: note.archivedAt ? new Date(note.archivedAt) : null,
      version,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
    };
  }

  private buildConflict(current: { id: string; payload: unknown; version: number }, incoming: unknown, expectedVersion?: number) {
    return {
      entityType: 'note' as const,
      entityId: current.id,
      code: 'version_conflict' as const,
      message: '检测到便签版本冲突',
      incomingRecord: incoming as Note,
      serverRecord: toNoteEntity(current as never),
      expectedVersion,
      actualVersion: current.version,
    };
  }

  private async assertWorkspaceAccess(user: RequestUser, workspaceId = user.workspaceId) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId: user.userId,
        workspaceId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('当前账号无权访问该工作区');
    }

    return workspaceId;
  }
}
