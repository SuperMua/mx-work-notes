import { IsBoolean, IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

import {
  booleanMessage,
  emailMessage,
  objectMessage,
  requiredMessage,
  stringMessage,
} from '../../common/validation-messages';

export class AdminSearchQueryDto {
  @IsOptional()
  @IsString(stringMessage('搜索关键词'))
  query?: string;

  @IsOptional()
  @IsString(stringMessage('工作区参数'))
  workspaceId?: string;

  @IsOptional()
  @IsString(stringMessage('标签参数'))
  tag?: string;

  @IsOptional()
  @IsString(stringMessage('状态参数'))
  status?: string;

  @IsOptional()
  @IsString(stringMessage('优先级参数'))
  priority?: string;

  @IsOptional()
  @IsString(stringMessage('便签状态参数'))
  state?: string;

  @IsOptional()
  @IsString(stringMessage('拥有者参数'))
  ownerUserId?: string;

  @IsOptional()
  @IsString(stringMessage('风险参数'))
  risk?: string;

  @IsOptional()
  @IsString(stringMessage('角色参数'))
  role?: string;

  @IsOptional()
  @IsString(stringMessage('置顶参数'))
  pinned?: string;
}

export class AdminUserCreateDto {
  @IsEmail({}, emailMessage('邮箱地址'))
  email!: string;

  @IsString(stringMessage('姓名'))
  @IsNotEmpty(requiredMessage('姓名'))
  name!: string;

  @IsString(stringMessage('密码'))
  @IsNotEmpty(requiredMessage('密码'))
  password!: string;
}

export class AdminUserUpdateDto {
  @IsOptional()
  @IsEmail({}, emailMessage('邮箱地址'))
  email?: string;

  @IsOptional()
  @IsString(stringMessage('姓名'))
  @IsNotEmpty(requiredMessage('姓名'))
  name?: string;
}

export class AdminPasswordResetDto {
  @IsString(stringMessage('密码'))
  @IsNotEmpty(requiredMessage('密码'))
  password!: string;
}

export class AdminWorkspaceCreateDto {
  @IsString(stringMessage('工作区名称'))
  @IsNotEmpty(requiredMessage('工作区名称'))
  name!: string;

  @IsOptional()
  @IsString(stringMessage('工作区描述'))
  description?: string;

  @IsOptional()
  @IsString(stringMessage('拥有者参数'))
  ownerUserId?: string;
}

export class AdminWorkspaceUpdateDto {
  @IsOptional()
  @IsString(stringMessage('工作区名称'))
  @IsNotEmpty(requiredMessage('工作区名称'))
  name?: string;

  @IsOptional()
  @IsString(stringMessage('工作区描述'))
  description?: string;
}

export class AdminWorkspaceMemberCreateDto {
  @IsOptional()
  @IsString(stringMessage('账号参数'))
  userId?: string;

  @IsOptional()
  @IsEmail({}, emailMessage('邮箱地址'))
  email?: string;

  @IsString(stringMessage('角色'))
  @IsNotEmpty(requiredMessage('角色'))
  role!: string;
}

export class AdminWorkspaceMemberUpdateDto {
  @IsString(stringMessage('角色'))
  @IsNotEmpty(requiredMessage('角色'))
  role!: string;
}

export class AdminNoteUpsertDto {
  @IsString(stringMessage('工作区参数'))
  @IsNotEmpty(requiredMessage('工作区参数'))
  workspaceId!: string;

  @IsObject(objectMessage('便签内容'))
  note!: Record<string, unknown>;
}

export class AdminNoteUpdateDto {
  @IsObject(objectMessage('便签内容'))
  note!: Record<string, unknown>;
}

export class AdminTemplateUpsertDto {
  @IsString(stringMessage('工作区参数'))
  @IsNotEmpty(requiredMessage('工作区参数'))
  workspaceId!: string;

  @IsObject(objectMessage('模板内容'))
  template!: Record<string, unknown>;
}

export class AdminTemplateUpdateDto {
  @IsObject(objectMessage('模板内容'))
  template!: Record<string, unknown>;
}

export class AdminTagUpdateDto {
  @IsString(stringMessage('工作区参数'))
  @IsNotEmpty(requiredMessage('工作区参数'))
  workspaceId!: string;

  @IsOptional()
  @IsString(stringMessage('标签名称'))
  renamedTo?: string;

  @IsOptional()
  @IsString(stringMessage('标签颜色'))
  color?: string;

  @IsOptional()
  @IsBoolean(booleanMessage('标签置顶参数'))
  pinned?: boolean;
}
