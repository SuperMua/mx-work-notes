import { ForbiddenException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import type { WorkspaceRole } from '@shared';

import { toWorkspaceEntity, toWorkspaceMemberEntity } from '../../common/entity-mappers';
import { PrismaService } from '../../common/prisma.service';
import type { RequestUser } from '../../common/request-user';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser) {
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: user.userId,
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return workspaces.map(toWorkspaceEntity);
  }

  async create(user: RequestUser, input: { name: string; description?: string }) {
    const result = await this.prisma.$transaction(async (tx: any) => {
      const workspace = await tx.workspace.create({
        data: {
          name: input.name,
          description: input.description || '',
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId: user.userId,
          workspaceId: workspace.id,
          role: 'owner',
          status: 'active',
        },
      });

      return tx.workspace.findUniqueOrThrow({
        where: { id: workspace.id },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });
    });

    return toWorkspaceEntity(result);
  }

  async listMembers(user: RequestUser, workspaceId?: string) {
    const targetWorkspaceId = await this.assertWorkspaceAccess(user, workspaceId);
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: targetWorkspaceId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map(toWorkspaceMemberEntity);
  }

  async invite(user: RequestUser, input: { email: string; role: WorkspaceRole; workspaceId?: string }) {
    const targetWorkspaceId = await this.assertWorkspaceAccess(user, input.workspaceId);

    let invitedUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!invitedUser) {
      invitedUser = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.email.split('@')[0],
          passwordHash: await bcrypt.hash(randomBytes(16).toString('hex'), 10),
        },
      });
    }

    const membership = await this.prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: targetWorkspaceId,
          userId: invitedUser.id,
        },
      },
      create: {
        workspaceId: targetWorkspaceId,
        userId: invitedUser.id,
        role: input.role,
        status: 'invited',
      },
      update: {
        role: input.role,
        status: 'invited',
      },
      include: {
        user: true,
      },
    });

    return toWorkspaceMemberEntity(membership);
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
