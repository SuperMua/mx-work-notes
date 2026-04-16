import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Template } from '@shared';

import { toTemplateEntity } from '../../common/entity-mappers';
import { toPrismaJson } from '../../common/prisma-json';
import { PrismaService } from '../../common/prisma.service';
import type { RequestUser } from '../../common/request-user';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser, workspaceId?: string) {
    const targetWorkspaceId = await this.assertWorkspaceAccess(user, workspaceId);
    const records = await this.prisma.templateRecord.findMany({
      where: { workspaceId: targetWorkspaceId },
      orderBy: { updatedAt: 'desc' },
    });

    return records.map(toTemplateEntity);
  }

  async upsert(user: RequestUser, template: Template, workspaceId?: string) {
    const targetWorkspaceId = await this.assertWorkspaceAccess(user, workspaceId);
    const version = 1;
    const persisted = await this.prisma.templateRecord.upsert({
      where: { id: template.id },
      create: this.serializeTemplate(targetWorkspaceId, template, version),
      update: this.serializeTemplate(targetWorkspaceId, template, version),
    });

    return toTemplateEntity(persisted);
  }

  async applySyncItem(user: RequestUser, item: { entityId: string; payload: Template; operation: 'create' | 'update' | 'delete' }) {
    if (item.operation === 'delete') {
      await this.prisma.templateRecord.deleteMany({
        where: {
          id: item.entityId,
          workspaceId: user.workspaceId,
        },
      });
      return { removed: item.entityId };
    }

    return this.upsert(user, item.payload, user.workspaceId);
  }

  private serializeTemplate(workspaceId: string, template: Template, version: number) {
    return {
      id: template.id,
      workspaceId,
      key: template.key,
      name: template.name,
      description: template.description,
      payload: toPrismaJson(template),
      version,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt),
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
