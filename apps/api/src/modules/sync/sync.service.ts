import { ConflictException, Injectable } from '@nestjs/common';
import type { Note, SyncPullResponse, SyncPushItem, SyncPushResponse, Template } from '@shared';

import { toNoteEntity, toTemplateEntity } from '../../common/entity-mappers';
import { PrismaService } from '../../common/prisma.service';
import type { RequestUser } from '../../common/request-user';
import { NotesService } from '../notes/notes.service';
import { TemplatesService } from '../templates/templates.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notesService: NotesService,
    private readonly templatesService: TemplatesService,
  ) {}

  async pull(user: RequestUser, cursor: string | null, workspaceId?: string | null): Promise<SyncPullResponse> {
    const targetWorkspaceId = workspaceId || user.workspaceId;
    const where = cursor
      ? {
          workspaceId: targetWorkspaceId,
          updatedAt: { gt: new Date(cursor) },
        }
      : { workspaceId: targetWorkspaceId };

    const [notes, templates] = await Promise.all([
      this.prisma.noteRecord.findMany({ where, orderBy: { updatedAt: 'asc' } }),
      this.prisma.templateRecord.findMany({ where, orderBy: { updatedAt: 'asc' } }),
    ]);

    const timestamps = [
      ...notes.map((item: { updatedAt: Date }) => item.updatedAt.getTime()),
      ...templates.map((item: { updatedAt: Date }) => item.updatedAt.getTime()),
    ];
    const nextCursor = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : new Date().toISOString();

    return {
      nextCursor,
      notes: notes.map(toNoteEntity),
      templates: templates.map(toTemplateEntity),
      conflicts: [],
    };
  }

  async push(user: RequestUser, items: SyncPushItem[]): Promise<SyncPushResponse> {
    const applied: SyncPushResponse['applied'] = [];
    const conflicts: SyncPushResponse['conflicts'] = [];

    for (const item of items) {
      try {
        if (item.entityType === 'note') {
          const result = await this.notesService.applySyncItem(user, {
            entityId: item.entityId,
            payload: item.payload as Note,
            expectedVersion: item.expectedVersion,
            operation: item.operation,
          });

          applied.push({
            entityType: 'note',
            entityId: item.entityId,
            operation: item.operation,
            version: typeof (result as { version?: number }).version === 'number' ? (result as { version: number }).version : undefined,
          });
          continue;
        }

        if (item.entityType === 'template') {
          await this.templatesService.applySyncItem(user, {
            entityId: item.entityId,
            payload: item.payload as Template,
            operation: item.operation,
          });

          applied.push({
            entityType: 'template',
            entityId: item.entityId,
            operation: item.operation,
          });
        }
      } catch (error) {
        if (error instanceof ConflictException) {
          const response = error.getResponse() as { conflicts?: SyncPushResponse['conflicts'] };
          conflicts.push(...(response.conflicts || []));
          continue;
        }

        throw error;
      }
    }

    if (conflicts.length) {
      throw new ConflictException({
        applied,
        conflicts,
      });
    }

    return { applied, conflicts };
  }
}
