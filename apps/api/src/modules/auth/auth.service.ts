import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import type { AuthSession, AuthTokens, UserProfile, Workspace, WorkspaceRole } from '@shared';

import { PrismaService } from '../../common/prisma.service';
import type { RequestUser } from '../../common/request-user';

interface SessionParts {
  user: UserProfile
  workspace: Workspace
  role: WorkspaceRole
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(input: { email: string; password: string; name?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('该邮箱已被注册');
    }

    const name = input.name?.trim() || '新用户';
    const passwordHash = await bcrypt.hash(input.password, 10);

    const result = await this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name,
          passwordHash,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${name} 的工作区`,
          description: '注册时自动创建的默认工作区',
        },
      });

      const membership = await tx.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'owner',
          status: 'active',
        },
      });

      return { user, workspace, membership };
    });

    const sessionParts = this.toSessionParts(result.user, result.workspace, result.membership.role as WorkspaceRole, 1);
    const tokens = await this.issueTokens(sessionParts);
    return this.buildSession(tokens, sessionParts);
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: {
        memberships: {
          orderBy: { createdAt: 'asc' },
          include: { workspace: true },
        },
      },
    });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('邮箱或密码不正确');
    }

    const membership = user.memberships[0];
    if (!membership?.workspace) {
      throw new NotFoundException('未找到当前账号的工作区');
    }

    const sessionParts = this.toSessionParts(
      user,
      membership.workspace,
      membership.role as WorkspaceRole,
      user.memberships.length,
    );
    const tokens = await this.issueTokens(sessionParts);
    return this.buildSession(tokens, sessionParts);
  }

  async refresh(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
      },
    });

    if (!storedToken || storedToken.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('刷新令牌已失效，请重新登录');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const sessionParts = await this.getSessionParts(payload.sub, payload.workspaceId);
    const tokens = await this.issueTokens(sessionParts);
    return this.buildSession(tokens, sessionParts);
  }

  async logout(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { message: 'logged-out' };
  }

  async me(user: RequestUser) {
    const sessionParts = await this.getSessionParts(user.userId, user.workspaceId);
    return {
      user: sessionParts.user,
      workspace: sessionParts.workspace,
    };
  }

  private async getSessionParts(userId: string, workspaceId: string): Promise<SessionParts> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    const membership = user?.memberships.find((item: { workspaceId: string }) => item.workspaceId === workspaceId);
    if (!user || !membership?.workspace) {
      throw new NotFoundException('当前登录会话不存在');
    }

    return this.toSessionParts(
      user,
      membership.workspace,
      membership.role as WorkspaceRole,
      user.memberships.length,
    );
  }

  private toSessionParts(
    user: { id: string; email: string; name: string },
    workspace: { id: string; name: string; description: string; createdAt: Date },
    role: WorkspaceRole,
    members: number,
  ): SessionParts {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        members,
        createdAt: workspace.createdAt.toISOString(),
      },
      role,
    };
  }

  private async issueTokens(session: SessionParts): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(
      {
        sub: session.user.id,
        email: session.user.email,
        workspaceId: session.workspace.id,
        role: session.role,
      },
      { expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      {
        sub: session.user.id,
        email: session.user.email,
        workspaceId: session.workspace.id,
        role: session.role,
        type: 'refresh',
        jti: randomUUID(),
      },
      { expiresIn: '7d' },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: session.user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private buildSession(tokens: AuthTokens, session: SessionParts): AuthSession {
    return {
      tokens,
      user: session.user,
      workspace: session.workspace,
    };
  }

  private verifyRefreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{
        sub: string
        workspaceId: string
        type?: string
      }>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('刷新令牌无效，请重新登录');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('刷新令牌无效，请重新登录');
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
