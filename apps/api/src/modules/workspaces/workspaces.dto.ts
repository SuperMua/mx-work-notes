import { IsEmail, IsOptional, IsString } from 'class-validator';
import type { WorkspaceRole } from '@shared';

import { emailMessage, stringMessage } from '../../common/validation-messages';

export class CreateWorkspaceDto {
  @IsString(stringMessage('工作区名称'))
  name!: string;

  @IsOptional()
  @IsString(stringMessage('工作区描述'))
  description?: string;
}

export class InviteWorkspaceMemberDto {
  @IsEmail({}, emailMessage('邮箱地址'))
  email!: string;

  @IsString(stringMessage('角色'))
  role!: WorkspaceRole;

  @IsOptional()
  @IsString(stringMessage('工作区参数'))
  workspaceId?: string;
}

export class WorkspaceMembersQueryDto {
  @IsOptional()
  @IsString(stringMessage('工作区参数'))
  workspaceId?: string;
}
