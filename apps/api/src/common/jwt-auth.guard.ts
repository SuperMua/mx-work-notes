import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { RequestUser } from './request-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; user?: RequestUser }>();
    const authorizationHeader = request.headers.authorization;
    const token = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;

    if (!token?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少访问令牌');
    }

    try {
      const payload = this.jwtService.verify<{
        sub: string
        email: string
        workspaceId: string
        role: RequestUser['role']
      }>(token.slice(7));

      request.user = {
        userId: payload.sub,
        email: payload.email,
        workspaceId: payload.workspaceId,
        role: payload.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException('访问令牌无效');
    }
  }
}
