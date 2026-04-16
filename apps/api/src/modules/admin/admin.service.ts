import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type {
  AdminConflictListItem,
  AdminDashboardMetrics,
  AdminNoteDetail,
  AdminNoteListItem,
  AdminRiskWorkspaceItem,
  AdminTagDetail,
  AdminTagListItem,
  AdminTemplateDetail,
  AdminTemplateListItem,
  AdminTopTagItem,
  AdminUserDetail,
  AdminUserListItem,
  AdminUserRoleSummaryItem,
  AdminUserWorkspaceRef,
  AdminWorkspaceDetail,
  AdminWorkspaceListItem,
  AdminWorkspaceRecentMemberItem,
  AdminWorkspaceRecentNoteItem,
  AdminWorkspaceRecentTemplateItem,
  AdminWorkspaceRoleBreakdownItem,
  AdminWorkspaceSummary,
  Note,
  TagMeta,
  Template,
  WorkspaceMember,
  WorkspaceRole,
} from '@shared';

import {
  toNoteEntity,
  toTagMetaEntity,
  toTemplateEntity,
  toWorkspaceMemberEntity,
} from '../../common/entity-mappers';
import { toPrismaJson } from '../../common/prisma-json';
import { PrismaService } from '../../common/prisma.service';
import type { RequestUser } from '../../common/request-user';
import { syncWorkspaceTagRecords } from '../../common/tag-records';

type UserRecord = {
  id: string
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
  memberships: Array<{
    role: string
  }>
}

type UserDetailRecord = {
  id: string
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
  memberships: Array<{
    role: string
    workspaceId: string
    workspace: {
      id: string
      name: string
      _count: {
        members: number
        notes: number
        templates: number
        tags?: number
      }
    }
  }>
}

type WorkspaceOwnerRecord = {
  userId: string
  user: {
    name: string
    email: string
  } | null
}

type TagRecordWithWorkspace = {
  workspaceId: string
  name: string
  color: string
  usageCount: number
  pinned: boolean
  lastUsedAt: Date | null
  workspace: {
    name: string
  }
}

type WorkspaceAggregateRecord = {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  _count: {
    members: number
    notes: number
    templates: number
    tags?: number
  }
  members: Array<{
    userId: string
    role: string
    user: {
      name: string
      email: string
    } | null
  }>
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async health() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async dashboard(): Promise<AdminDashboardMetrics> {
    const [users, workspaces, members, templates, tags, noteRecords, recentUsers, recentWorkspaces, topTagRecords] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.workspace.count(),
      this.prisma.workspaceMember.count(),
      this.prisma.templateRecord.count(),
      this.prisma.tagRecord.count(),
      this.prisma.noteRecord.findMany({
        include: {
          workspace: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.workspace.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.tagRecord.findMany({
        include: { workspace: true },
        orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }, { name: 'asc' }],
        take: 6,
      }) as Promise<TagRecordWithWorkspace[]>,
    ]);

    const parsedNotes = noteRecords.map((record) => ({
      record,
      note: toNoteEntity(record),
    }));

    const completedNotes = parsedNotes.filter(({ note }) => note.completed && !note.deletedAt).length;
    const overdueNotes = parsedNotes.filter(({ note }) => note.dueDate && !note.completed && !note.deletedAt && new Date(note.dueDate).getTime() < Date.now()).length;
    const trashedNotes = parsedNotes.filter(({ note }) => Boolean(note.deletedAt)).length;
    const conflicts = parsedNotes.filter(({ note }) => note.syncStatus === 'conflict').length;

    const workspaceAggregates = await this.prisma.workspace.findMany({
      include: {
        _count: {
          select: {
            members: true,
            notes: true,
            templates: true,
            tags: true,
          },
        },
        members: {
          where: { role: 'owner' },
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const topTags: AdminTopTagItem[] = topTagRecords.map((tag) => ({
      workspaceId: tag.workspaceId,
      workspaceName: tag.workspace.name,
      name: tag.name,
      color: tag.color,
      usageCount: tag.usageCount,
      lastUsedAt: tag.lastUsedAt?.toISOString() || null,
    }));

    const riskWorkspaces: AdminRiskWorkspaceItem[] = workspaceAggregates
      .map((workspace) => {
        const workspaceNotes = parsedNotes.filter(({ record }) => record.workspaceId === workspace.id);
        const overdueCount = workspaceNotes.filter(({ note }) => note.dueDate && !note.completed && !note.deletedAt && new Date(note.dueDate).getTime() < Date.now()).length;
        const conflictCount = workspaceNotes.filter(({ note }) => note.syncStatus === 'conflict').length;

        return {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          noteCount: workspace._count.notes,
          memberCount: workspace._count.members,
          overdueCount,
          conflictCount,
        };
      })
      .sort((left, right) =>
        right.overdueCount - left.overdueCount ||
        right.conflictCount - left.conflictCount ||
        right.noteCount - left.noteCount,
      )
      .slice(0, 5);

    return {
      users,
      workspaces,
      members,
      notes: noteRecords.length,
      templates,
      tags,
      completedNotes,
      overdueNotes,
      trashedNotes,
      conflicts,
      statusDistribution: [
        { key: 'todo', label: '待处理', value: parsedNotes.filter(({ note }) => note.status === 'todo' && !note.deletedAt && !note.archivedAt).length },
        { key: 'doing', label: '进行中', value: parsedNotes.filter(({ note }) => note.status === 'doing' && !note.deletedAt && !note.archivedAt).length },
        { key: 'done', label: '已完成', value: parsedNotes.filter(({ note }) => note.status === 'done' && !note.deletedAt && !note.archivedAt).length },
        { key: 'archived', label: '已归档', value: parsedNotes.filter(({ note }) => Boolean(note.archivedAt) && !note.deletedAt).length },
        { key: 'trash', label: '回收站', value: trashedNotes },
      ],
      noteTrend7Days: this.buildTrend(parsedNotes.map(({ note }) => note.createdAt), 7),
      noteTrend30Days: this.buildTrend(parsedNotes.map(({ note }) => note.createdAt), 30),
      workspaceRanking: workspaceAggregates
        .map((workspace) => ({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          noteCount: workspace._count.notes,
          memberCount: workspace._count.members,
        }))
        .sort((left, right) => right.noteCount - left.noteCount)
        .slice(0, 5),
      topTags,
      riskWorkspaces,
      recentConflicts: parsedNotes
        .filter(({ note }) => note.syncStatus === 'conflict')
        .slice(0, 5)
        .map(({ note, record }) => ({
          id: note.id,
          title: note.title,
          subtitle: `${record.workspace.name} · 冲突便签`,
          createdAt: note.updatedAt,
          kind: 'conflict' as const,
          workspaceId: record.workspaceId,
        })),
      recentUsers: recentUsers.map((user) => ({
        id: user.id,
        title: user.name,
        subtitle: user.email,
        createdAt: user.createdAt.toISOString(),
        kind: 'user' as const,
      })),
      recentWorkspaces: recentWorkspaces.map((workspace) => ({
        id: workspace.id,
        title: workspace.name,
        subtitle: workspace.description || '未填写描述',
        createdAt: workspace.createdAt.toISOString(),
        kind: 'workspace' as const,
      })),
    };
  }

  async listUsers(query = ''): Promise<AdminUserListItem[]> {
    const normalizedQuery = query.trim().toLowerCase();
    const users = await this.prisma.user.findMany({
      include: {
        memberships: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users
      .filter((user) => this.matchesQuery([user.name, user.email], normalizedQuery))
      .map((user) => this.toAdminUser(user));
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: {
              include: {
                _count: {
                  select: {
                    members: true,
                    notes: true,
                    templates: true,
                    tags: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }) as UserDetailRecord | null;

    if (!user) {
      throw new NotFoundException('账号不存在');
    }

    const workspaceIds = [...new Set(user.memberships.map((membership) => membership.workspaceId))];
    const statsMap = await this.getWorkspaceNoteStats(workspaceIds);

    const toWorkspaceRef = (membership: UserDetailRecord['memberships'][number]): AdminUserWorkspaceRef => {
      const stats = statsMap.get(membership.workspaceId) || { overdueCount: 0, conflictCount: 0 };

      return {
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspace.name,
        role: membership.role as WorkspaceRole,
        memberCount: membership.workspace._count.members,
        noteCount: membership.workspace._count.notes,
        templateCount: membership.workspace._count.templates,
        tagCount: membership.workspace._count.tags || 0,
        overdueCount: stats.overdueCount,
        conflictCount: stats.conflictCount,
        risk: this.getWorkspaceRisk(stats.overdueCount, stats.conflictCount),
      };
    };

    const roleSummary = [...new Set(user.memberships.map((membership) => membership.role as WorkspaceRole))]
      .map((role) => ({
        role,
        count: user.memberships.filter((membership) => membership.role === role).length,
      }))
      .sort((left, right) => right.count - left.count) as AdminUserRoleSummaryItem[];

    const ownedWorkspaces = user.memberships
      .filter((membership) => membership.role === 'owner')
      .map(toWorkspaceRef);

    const joinedWorkspaces = user.memberships
      .filter((membership) => membership.role !== 'owner')
      .map(toWorkspaceRef);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      canDelete: ownedWorkspaces.length === 0,
      ownedWorkspaces,
      joinedWorkspaces,
      roleSummary,
    };
  }

  async createUser(input: { email: string; name: string; password: string }): Promise<AdminUserListItem> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('该邮箱已存在');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const result = await this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${input.name}的工作区`,
          description: '后台创建的默认工作区',
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'owner',
          status: 'active',
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { memberships: true },
      });
    });

    return this.toAdminUser(result);
  }

  async updateUser(userId: string, input: { email?: string; name?: string }): Promise<AdminUserListItem> {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    });

    if (!current) {
      throw new NotFoundException('账号不存在');
    }

    if (input.email && input.email !== current.email) {
      const duplicate = await this.prisma.user.findUnique({ where: { email: input.email } });
      if (duplicate) {
        throw new ConflictException('该邮箱已存在');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: input.email ?? current.email,
        name: input.name ?? current.name,
      },
      include: { memberships: true },
    });

    return this.toAdminUser(updated);
  }

  async resetUserPassword(userId: string, password: string) {
    await this.ensureUser(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
      },
    });

    return { message: '密码已重置' };
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    });

    if (!user) {
      throw new NotFoundException('账号不存在');
    }

    if (user.memberships.some((membership) => membership.role === 'owner')) {
      throw new ConflictException('该账号仍拥有工作区所有权，不能直接删除');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { removed: userId };
  }

  async listWorkspaces(query = '', ownerUserId?: string, risk?: string): Promise<AdminWorkspaceListItem[]> {
    const normalizedQuery = query.trim().toLowerCase();
    const workspaces = await this.prisma.workspace.findMany({
      where: ownerUserId
        ? {
            members: {
              some: {
                userId: ownerUserId,
                role: 'owner',
              },
            },
          }
        : undefined,
      include: {
        _count: {
          select: {
            members: true,
            notes: true,
            templates: true,
            tags: true,
          },
        },
        members: {
          where: { role: 'owner' },
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statsMap = await this.getWorkspaceNoteStats(workspaces.map((workspace) => workspace.id));

    return workspaces
      .filter((workspace) =>
        this.matchesQuery(
          [
            workspace.name,
            workspace.description,
            ...workspace.members.map((member) => member.user?.name || ''),
          ],
          normalizedQuery,
        ),
      )
      .filter((workspace) => {
        if (!risk || !['high', 'normal'].includes(risk)) {
          return true;
        }

        const stats = statsMap.get(workspace.id) || { overdueCount: 0, conflictCount: 0 };
        return this.getWorkspaceRisk(stats.overdueCount, stats.conflictCount) === risk;
      })
      .map((workspace) => this.toAdminWorkspaceList(workspace as WorkspaceAggregateRecord));
  }

  async getWorkspaceDetail(workspaceId: string): Promise<AdminWorkspaceDetail> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: {
            members: true,
            notes: true,
            templates: true,
            tags: true,
          },
        },
        members: {
          where: { role: 'owner' },
          include: { user: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }) as WorkspaceAggregateRecord | null;

    if (!workspace) {
      throw new NotFoundException('工作区不存在');
    }

    const [memberRecords, noteRecords, templateRecords, topTags] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.noteRecord.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.templateRecord.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.tagRecord.findMany({
        where: { workspaceId },
        include: { workspace: true },
        orderBy: [{ pinned: 'desc' }, { usageCount: 'desc' }, { lastUsedAt: 'desc' }, { name: 'asc' }],
        take: 5,
      }) as Promise<TagRecordWithWorkspace[]>,
    ]);

    const parsedNotes = noteRecords.map((record) => toNoteEntity(record));
    const overdueCount = parsedNotes.filter((note) => this.isNoteOverdue(note)).length;
    const conflictCount = parsedNotes.filter((note) => note.syncStatus === 'conflict').length;
    const roleBreakdown = (['owner', 'admin', 'editor', 'viewer'] as WorkspaceRole[])
      .map((role) => ({
        role,
        count: memberRecords.filter((member) => member.role === role).length,
      }))
      .filter((item) => item.count > 0) as AdminWorkspaceRoleBreakdownItem[];

    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      owners: workspace.members.map((member) => ({
        userId: member.userId,
        name: member.user?.name || member.user?.email || member.userId,
        email: member.user?.email || '',
      })),
      memberCount: workspace._count.members,
      noteCount: workspace._count.notes,
      templateCount: workspace._count.templates,
      tagCount: workspace._count.tags || 0,
      overdueCount,
      conflictCount,
      roleBreakdown,
      recentMembers: memberRecords.slice(0, 5).map((member) => ({
        id: member.id,
        userId: member.userId,
        name: member.user?.name || member.user?.email || member.userId,
        email: member.user?.email || '',
        role: member.role as WorkspaceRole,
        status: member.status as AdminWorkspaceRecentMemberItem['status'],
        createdAt: member.createdAt.toISOString(),
      })),
      recentNotes: noteRecords.slice(0, 5).map((record) => this.toAdminRecentNoteItem(toNoteEntity(record))),
      recentTemplates: templateRecords.slice(0, 5).map((record) => this.toAdminRecentTemplateItem(toTemplateEntity(record))),
      topTags: topTags.map((tag) => this.toAdminTagListItem(tag)),
      risk: this.getWorkspaceRisk(overdueCount, conflictCount),
    };
  }

  async createWorkspace(currentUser: RequestUser, input: { name: string; description?: string; ownerUserId?: string }) {
    const ownerUserId = input.ownerUserId || currentUser.userId;
    await this.ensureUser(ownerUserId);

    const workspace = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.workspace.create({
        data: {
          name: input.name,
          description: input.description || '',
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: created.id,
          userId: ownerUserId,
          role: 'owner',
          status: 'active',
        },
      });

      return tx.workspace.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          _count: {
            select: {
              members: true,
              notes: true,
              templates: true,
            },
          },
          members: {
            where: { role: 'owner' },
            include: { user: true },
          },
        },
      });
    });

    return this.toAdminWorkspaceList(workspace as WorkspaceAggregateRecord);
  }

  async updateWorkspace(workspaceId: string, input: { name?: string; description?: string }) {
    const current = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!current) {
      throw new NotFoundException('工作区不存在');
    }

    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: input.name ?? current.name,
        description: input.description ?? current.description,
      },
      include: {
        _count: {
          select: {
            members: true,
            notes: true,
            templates: true,
          },
        },
        members: {
          where: { role: 'owner' },
          include: { user: true },
        },
      },
    });

    return this.toAdminWorkspaceList(updated as WorkspaceAggregateRecord);
  }

  async deleteWorkspace(workspaceId: string) {
    await this.ensureWorkspace(workspaceId);
    await this.prisma.workspace.delete({ where: { id: workspaceId } });
    return { removed: workspaceId };
  }

  async listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    await this.ensureWorkspace(workspaceId);
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map(toWorkspaceMemberEntity);
  }

  async addWorkspaceMember(workspaceId: string, input: { userId?: string; email?: string; role: WorkspaceRole }): Promise<WorkspaceMember> {
    await this.ensureWorkspace(workspaceId);
    const user = input.userId ? await this.ensureUser(input.userId) : await this.ensureOrCreateUserByEmail(input.email);

    const member = await this.prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      create: {
        workspaceId,
        userId: user.id,
        role: input.role,
        status: 'active',
      },
      update: {
        role: input.role,
        status: 'active',
      },
      include: {
        user: true,
      },
    });

    return toWorkspaceMemberEntity(member);
  }

  async updateWorkspaceMember(workspaceId: string, memberId: string, role: WorkspaceRole): Promise<WorkspaceMember> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member || member.workspaceId !== workspaceId) {
      throw new NotFoundException('成员不存在');
    }

    await this.ensureOwnerMutationAllowed(workspaceId, member, 'role-change', role);

    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role, status: 'active' },
      include: { user: true },
    });

    return toWorkspaceMemberEntity(updated);
  }

  async removeWorkspaceMember(workspaceId: string, memberId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.workspaceId !== workspaceId) {
      throw new NotFoundException('成员不存在');
    }

    await this.ensureOwnerMutationAllowed(workspaceId, member, 'delete');
    await this.prisma.workspaceMember.delete({ where: { id: memberId } });
    return { removed: memberId };
  }

  async listNotes(
    query = '',
    workspaceId?: string,
    tag?: string,
    status?: string,
    priority?: string,
    state?: string,
  ): Promise<AdminNoteListItem[]> {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedTag = tag?.trim();
    const notes = await this.prisma.noteRecord.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      include: {
        workspace: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return notes
      .map((record) => ({ record, note: toNoteEntity(record) }))
      .filter(({ note, record }) => this.matchesQuery([note.title, note.content, record.workspace.name, ...note.tags], normalizedQuery))
      .filter(({ note }) => !normalizedTag || note.tags.includes(normalizedTag))
      .filter(({ note }) => !status || note.status === status)
      .filter(({ note }) => !priority || note.priority === priority)
      .filter(({ note }) => !state || this.matchesNoteState(note, state))
      .map(({ note, record }) => ({
        id: note.id,
        title: note.title,
        workspaceId: record.workspaceId,
        workspaceName: record.workspace.name,
        priority: note.priority,
        status: note.status,
        type: note.type,
        completed: note.completed,
        dueDate: note.dueDate,
        deletedAt: note.deletedAt,
        archivedAt: note.archivedAt,
        updatedAt: note.updatedAt,
        tags: note.tags,
      }));
  }

  async getNoteDetail(noteId: string): Promise<AdminNoteDetail> {
    const record = await this.prisma.noteRecord.findUnique({
      where: { id: noteId },
      include: { workspace: true },
    });

    if (!record) {
      throw new NotFoundException('便签不存在');
    }

    const note = toNoteEntity(record);
    const [workspaceSummary, relatedNoteRecords, relatedTagRecords] = await Promise.all([
      this.getWorkspaceSummary(record.workspaceId),
      this.prisma.noteRecord.findMany({
        where: { workspaceId: record.workspaceId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.tagRecord.findMany({
        where: {
          workspaceId: record.workspaceId,
          ...(note.tags.length ? { name: { in: note.tags } } : {}),
        },
        include: { workspace: true },
        orderBy: note.tags.length
          ? [{ pinned: 'desc' }, { usageCount: 'desc' }, { name: 'asc' }]
          : [{ pinned: 'desc' }, { usageCount: 'desc' }, { lastUsedAt: 'desc' }, { name: 'asc' }],
        take: 5,
      }) as Promise<TagRecordWithWorkspace[]>,
    ]);

    const relatedNotes = relatedNoteRecords
      .filter((item) => item.id !== note.id)
      .map((item) => {
        const related = toNoteEntity(item);
        const overlap = related.tags.filter((tagName) => note.tags.includes(tagName)).length;
        return {
          item: this.toAdminRecentNoteItem(related),
          overlap,
          updatedAt: new Date(related.updatedAt).getTime(),
        };
      })
      .sort((left, right) => right.overlap - left.overlap || right.updatedAt - left.updatedAt)
      .slice(0, 5)
      .map((item) => item.item);

    return {
      workspaceId: record.workspaceId,
      workspaceName: record.workspace.name,
      workspaceSummary,
      note,
      relatedNotes,
      relatedTags: relatedTagRecords.map((tag) => this.toAdminTagListItem(tag)),
    };
  }

  async createNote(workspaceId: string, note: Note): Promise<AdminNoteDetail> {
    await this.ensureWorkspace(workspaceId);
    const existing = await this.prisma.noteRecord.findUnique({ where: { id: note.id } });
    if (existing) {
      throw new ConflictException('便签 ID 已存在');
    }

    await this.prisma.noteRecord.create({
      data: this.serializeNote(workspaceId, note, 1),
    });
    await syncWorkspaceTagRecords(this.prisma, workspaceId);
    return this.getNoteDetail(note.id);
  }

  async updateNote(noteId: string, note: Note): Promise<AdminNoteDetail> {
    const current = await this.prisma.noteRecord.findUnique({ where: { id: noteId } });
    if (!current) {
      throw new NotFoundException('便签不存在');
    }

    await this.prisma.noteRecord.update({
      where: { id: noteId },
      data: this.serializeNote(current.workspaceId, { ...note, id: noteId }, current.version + 1),
    });
    await syncWorkspaceTagRecords(this.prisma, current.workspaceId);
    return this.getNoteDetail(noteId);
  }

  async deleteNote(noteId: string) {
    const current = await this.prisma.noteRecord.findUnique({ where: { id: noteId } });
    if (!current) {
      throw new NotFoundException('便签不存在');
    }

    await this.prisma.noteRecord.delete({ where: { id: noteId } });
    await syncWorkspaceTagRecords(this.prisma, current.workspaceId);
    return { removed: noteId };
  }

  async listTemplates(query = '', workspaceId?: string): Promise<AdminTemplateListItem[]> {
    const normalizedQuery = query.trim().toLowerCase();
    const templates = await this.prisma.templateRecord.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      include: {
        workspace: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return templates
      .map((record) => ({ record, template: toTemplateEntity(record) }))
      .filter(({ template, record }) =>
        this.matchesQuery([template.name, template.description, template.key, record.workspace.name], normalizedQuery),
      )
      .map(({ template, record }) => ({
        id: template.id,
        key: template.key,
        name: template.name,
        description: template.description,
        workspaceId: record.workspaceId,
        workspaceName: record.workspace.name,
        updatedAt: template.updatedAt,
      }));
  }

  async getTemplateDetail(templateId: string): Promise<AdminTemplateDetail> {
    const record = await this.prisma.templateRecord.findUnique({
      where: { id: templateId },
      include: { workspace: true },
    });

    if (!record) {
      throw new NotFoundException('模板不存在');
    }

    const template = toTemplateEntity(record);
    const [workspaceSummary, relatedTemplateRecords, relatedTagRecords] = await Promise.all([
      this.getWorkspaceSummary(record.workspaceId),
      this.prisma.templateRecord.findMany({
        where: { workspaceId: record.workspaceId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.tagRecord.findMany({
        where: {
          workspaceId: record.workspaceId,
          ...(template.note.tags.length ? { name: { in: template.note.tags } } : {}),
        },
        include: { workspace: true },
        orderBy: template.note.tags.length
          ? [{ pinned: 'desc' }, { usageCount: 'desc' }, { name: 'asc' }]
          : [{ pinned: 'desc' }, { usageCount: 'desc' }, { lastUsedAt: 'desc' }, { name: 'asc' }],
        take: 5,
      }) as Promise<TagRecordWithWorkspace[]>,
    ]);

    return {
      workspaceId: record.workspaceId,
      workspaceName: record.workspace.name,
      workspaceSummary,
      template,
      relatedTemplates: relatedTemplateRecords
        .filter((item) => item.id !== template.id)
        .slice(0, 5)
        .map((item) => this.toAdminRecentTemplateItem(toTemplateEntity(item))),
      relatedTags: relatedTagRecords.map((tag) => this.toAdminTagListItem(tag)),
    };
  }

  async createTemplate(workspaceId: string, template: Template): Promise<AdminTemplateDetail> {
    await this.ensureWorkspace(workspaceId);
    const existing = await this.prisma.templateRecord.findUnique({ where: { id: template.id } });
    if (existing) {
      throw new ConflictException('模板 ID 已存在');
    }

    await this.prisma.templateRecord.create({
      data: this.serializeTemplate(workspaceId, template, 1),
    });

    return this.getTemplateDetail(template.id);
  }

  async updateTemplate(templateId: string, template: Template): Promise<AdminTemplateDetail> {
    const current = await this.prisma.templateRecord.findUnique({ where: { id: templateId } });
    if (!current) {
      throw new NotFoundException('模板不存在');
    }

    await this.prisma.templateRecord.update({
      where: { id: templateId },
      data: this.serializeTemplate(current.workspaceId, { ...template, id: templateId }, current.version + 1),
    });

    return this.getTemplateDetail(templateId);
  }

  async deleteTemplate(templateId: string) {
    await this.ensureTemplate(templateId);
    await this.prisma.templateRecord.delete({ where: { id: templateId } });
    return { removed: templateId };
  }

  async listTags(query = '', workspaceId?: string, pinned?: string): Promise<AdminTagListItem[]> {
    const normalizedQuery = query.trim().toLowerCase();
    const tags = (await this.prisma.tagRecord.findMany({
      where: {
        ...(workspaceId ? { workspaceId } : {}),
        ...(typeof pinned === 'string' && pinned.length ? { pinned: pinned === 'true' } : {}),
      },
      include: {
        workspace: true,
      },
      orderBy: [{ pinned: 'desc' }, { usageCount: 'desc' }, { name: 'asc' }],
    })) as TagRecordWithWorkspace[];

    return tags
      .filter((tag: TagRecordWithWorkspace) => this.matchesQuery([tag.name, tag.workspace.name], normalizedQuery))
      .map((tag: TagRecordWithWorkspace) => this.toAdminTagListItem(tag));
  }

  async getTagDetail(name: string, workspaceId: string): Promise<AdminTagDetail> {
    if (!workspaceId) {
      throw new BadRequestException('缺少工作区参数');
    }

    const tag = await this.prisma.tagRecord.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
      include: { workspace: true },
    }) as TagRecordWithWorkspace | null;

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    const [workspaceSummary, noteRecords] = await Promise.all([
      this.getWorkspaceSummary(workspaceId),
      this.prisma.noteRecord.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const notesPreview = noteRecords
      .map((record) => toNoteEntity(record))
      .filter((note) => note.tags.includes(name))
      .slice(0, 5)
      .map((note) => this.toAdminRecentNoteItem(note));

    return {
      workspaceId,
      workspaceName: tag.workspace.name,
      workspaceSummary,
      tag: this.toAdminTagListItem(tag),
      notesPreview,
      impactCount: tag.usageCount,
    };
  }

  async updateTag(name: string, input: { workspaceId: string; renamedTo?: string; color?: string; pinned?: boolean }): Promise<TagMeta> {
    const current = await this.prisma.tagRecord.findUnique({
      where: {
        workspaceId_name: {
          workspaceId: input.workspaceId,
          name,
        },
      },
    });

    if (!current) {
      throw new NotFoundException('标签不存在');
    }

    const nextName = input.renamedTo?.trim() || name;
    if (nextName !== name) {
      const duplicated = await this.prisma.tagRecord.findUnique({
        where: {
          workspaceId_name: {
            workspaceId: input.workspaceId,
            name: nextName,
          },
        },
      });

      if (duplicated) {
        throw new ConflictException('目标标签名称已存在');
      }

      await this.rewriteTagOnNotes(input.workspaceId, name, nextName);
    }

    const synced = await syncWorkspaceTagRecords(this.prisma, input.workspaceId);
    const target = synced.find((tag) => tag.name === nextName);
    if (!target) {
      throw new NotFoundException('标签同步失败');
    }

    const updated = await this.prisma.tagRecord.update({
      where: {
        workspaceId_name: {
          workspaceId: input.workspaceId,
          name: nextName,
        },
      },
      data: {
        color: input.color ?? target.color,
        pinned: typeof input.pinned === 'boolean' ? input.pinned : target.pinned,
      },
    });

    return toTagMetaEntity(updated);
  }

  async deleteTag(name: string, workspaceId: string) {
    await this.rewriteTagOnNotes(workspaceId, name, null);
    await this.prisma.tagRecord.deleteMany({
      where: {
        workspaceId,
        name,
      },
    });
    await syncWorkspaceTagRecords(this.prisma, workspaceId);
    return { removed: name };
  }

  async listSyncConflicts(): Promise<AdminConflictListItem[]> {
    const records = await this.prisma.noteRecord.findMany({
      include: { workspace: true },
      orderBy: { updatedAt: 'desc' },
    });

    return records
      .map((record) => ({ record, note: toNoteEntity(record) }))
      .filter(({ note }) => note.syncStatus === 'conflict')
      .map(({ record, note }) => ({
        id: note.id,
        title: note.title,
        workspaceId: record.workspaceId,
        workspaceName: record.workspace.name,
        status: note.status,
        priority: note.priority,
        dueDate: note.dueDate,
        tags: note.tags,
        completed: note.completed,
        state: note.deletedAt ? 'trash' : note.archivedAt ? 'archived' : this.isNoteOverdue(note) ? 'overdue' : 'active',
        updatedAt: note.updatedAt,
        syncStatus: note.syncStatus,
      }));
  }

  private async getWorkspaceNoteStats(workspaceIds: string[]) {
    const ids = [...new Set(workspaceIds.filter(Boolean))];
    const statsMap = new Map<string, { overdueCount: number; conflictCount: number }>();

    if (!ids.length) {
      return statsMap;
    }

    ids.forEach((id) => {
      statsMap.set(id, { overdueCount: 0, conflictCount: 0 });
    });

    const records = await this.prisma.noteRecord.findMany({
      where: {
        workspaceId: {
          in: ids,
        },
      },
    });

    records.forEach((record) => {
      const note = toNoteEntity(record);
      const stats = statsMap.get(record.workspaceId) || { overdueCount: 0, conflictCount: 0 };

      if (this.isNoteOverdue(note)) {
        stats.overdueCount += 1;
      }

      if (note.syncStatus === 'conflict') {
        stats.conflictCount += 1;
      }

      statsMap.set(record.workspaceId, stats);
    });

    return statsMap;
  }

  private async getWorkspaceSummary(workspaceId: string): Promise<AdminWorkspaceSummary> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: {
            members: true,
            notes: true,
            templates: true,
            tags: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('工作区不存在');
    }

    const statsMap = await this.getWorkspaceNoteStats([workspaceId]);
    const stats = statsMap.get(workspaceId) || { overdueCount: 0, conflictCount: 0 };

    return {
      id: workspace.id,
      name: workspace.name,
      memberCount: workspace._count.members,
      noteCount: workspace._count.notes,
      templateCount: workspace._count.templates,
      tagCount: workspace._count.tags,
      overdueCount: stats.overdueCount,
      conflictCount: stats.conflictCount,
      risk: this.getWorkspaceRisk(stats.overdueCount, stats.conflictCount),
    };
  }

  private toAdminRecentNoteItem(note: Note): AdminWorkspaceRecentNoteItem {
    return {
      id: note.id,
      title: note.title,
      status: note.status,
      priority: note.priority,
      dueDate: note.dueDate,
      updatedAt: note.updatedAt,
    };
  }

  private toAdminRecentTemplateItem(template: Template): AdminWorkspaceRecentTemplateItem {
    return {
      id: template.id,
      key: template.key,
      name: template.name,
      updatedAt: template.updatedAt,
    };
  }

  private toAdminTagListItem(tag: TagRecordWithWorkspace): AdminTagListItem {
    return {
      workspaceId: tag.workspaceId,
      workspaceName: tag.workspace.name,
      name: tag.name,
      color: tag.color,
      usageCount: tag.usageCount,
      pinned: tag.pinned,
      lastUsedAt: tag.lastUsedAt?.toISOString() || null,
    };
  }

  private matchesNoteState(note: Pick<Note, 'archivedAt' | 'deletedAt' | 'completed' | 'dueDate'>, state: string) {
    switch (state) {
      case 'active':
        return !note.deletedAt && !note.archivedAt;
      case 'archived':
        return Boolean(note.archivedAt) && !note.deletedAt;
      case 'trash':
        return Boolean(note.deletedAt);
      case 'overdue':
        return this.isNoteOverdue(note as Note);
      default:
        return true;
    }
  }

  private isNoteOverdue(note: Pick<Note, 'dueDate' | 'completed' | 'deletedAt' | 'archivedAt'>) {
    return Boolean(
      note.dueDate &&
      !note.completed &&
      !note.deletedAt &&
      !note.archivedAt &&
      new Date(note.dueDate).getTime() < Date.now(),
    );
  }

  private getWorkspaceRisk(overdueCount: number, conflictCount: number): 'high' | 'normal' {
    return overdueCount > 0 || conflictCount > 0 ? 'high' : 'normal';
  }

  private buildTrend(timestamps: string[], days: number) {
    const points = Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - index - 1));
      return {
        date: date.toISOString().slice(0, 10),
        value: 0,
      };
    });

    const pointMap = new Map(points.map((point) => [point.date, point]));
    timestamps.forEach((timestamp) => {
      const key = timestamp.slice(0, 10);
      const point = pointMap.get(key);
      if (point) {
        point.value += 1;
      }
    });

    return points;
  }

  private matchesQuery(values: Array<string | null | undefined>, query: string) {
    if (!query) {
      return true;
    }

    return values.some((value) => String(value || '').toLowerCase().includes(query));
  }

  private toAdminUser(user: UserRecord): AdminUserListItem {
    const roles = [...new Set(user.memberships.map((membership) => membership.role as WorkspaceRole))];
    const ownedWorkspaceCount = user.memberships.filter((membership) => membership.role === 'owner').length;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      workspaceCount: user.memberships.length,
      ownedWorkspaceCount,
      roles,
      canDelete: ownedWorkspaceCount === 0,
    };
  }

  private toAdminWorkspaceList(workspace: WorkspaceAggregateRecord): AdminWorkspaceListItem {
    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      memberCount: workspace._count.members,
      noteCount: workspace._count.notes,
      templateCount: workspace._count.templates,
      ownerNames: workspace.members.map((member: WorkspaceOwnerRecord) => member.user?.name || member.user?.email || member.userId),
    };
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

  private async rewriteTagOnNotes(workspaceId: string, from: string, to: string | null) {
    const records = await this.prisma.noteRecord.findMany({
      where: { workspaceId },
    });

    for (const record of records) {
      const note = toNoteEntity(record);
      if (!note.tags.includes(from)) {
        continue;
      }

      const nextTags = to ? note.tags.map((tag) => (tag === from ? to : tag)) : note.tags.filter((tag) => tag !== from);
      const updatedAt = new Date().toISOString();
      const nextNote: Note = {
        ...note,
        tags: [...new Set(nextTags)],
        updatedAt,
        version: record.version + 1,
        syncStatus: 'synced',
      };

      await this.prisma.noteRecord.update({
        where: { id: note.id },
        data: this.serializeNote(workspaceId, nextNote, record.version + 1),
      });
    }
  }

  private async ensureOwnerMutationAllowed(
    workspaceId: string,
    member: { id: string; role: string },
    action: 'delete' | 'role-change',
    nextRole?: WorkspaceRole,
  ) {
    const changingOwner = member.role === 'owner' && (action === 'delete' || nextRole !== 'owner');
    if (!changingOwner) {
      return;
    }

    const ownerCount = await this.prisma.workspaceMember.count({
      where: {
        workspaceId,
        role: 'owner',
      },
    });

    if (ownerCount <= 1) {
      throw new ConflictException('工作区至少需要保留一名 owner');
    }
  }

  private async ensureUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('账号不存在');
    }
    return user;
  }

  private async ensureOrCreateUserByEmail(email?: string) {
    if (!email) {
      throw new BadRequestException('请提供成员邮箱');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return existing;
    }

    return this.prisma.user.create({
      data: {
        email,
        name: email.split('@')[0],
        passwordHash: await bcrypt.hash(randomBytes(16).toString('hex'), 10),
      },
    });
  }

  private async ensureWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundException('工作区不存在');
    }
    return workspace;
  }

  private async ensureTemplate(templateId: string) {
    const template = await this.prisma.templateRecord.findUnique({ where: { id: templateId } });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }
    return template;
  }
}
