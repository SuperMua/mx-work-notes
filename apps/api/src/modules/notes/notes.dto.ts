import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

import { arrayMessage, numberMessage, objectMessage, requiredMessage, stringMessage } from '../../common/validation-messages';

export class WorkspaceScopeDto {
  @IsOptional()
  @IsString(stringMessage('工作区参数'))
  workspaceId?: string;
}

export class UpdateNoteDto {
  @IsObject(objectMessage('便签内容'))
  note!: Record<string, unknown>;

  @IsOptional()
  @IsNumber({}, numberMessage('版本号'))
  expectedVersion?: number;
}

export class BatchNotesDto extends WorkspaceScopeDto {
  @IsArray(arrayMessage('批量操作项'))
  items!: Array<{
    operation: 'create' | 'update' | 'delete' | 'restore' | 'archive' | 'unarchive'
    entityId: string
    payload: Record<string, unknown> | null
    expectedVersion?: number
  }>;
}

export class CreateNoteDto extends WorkspaceScopeDto {
  @IsObject(objectMessage('便签内容'))
  @IsNotEmpty(requiredMessage('便签内容'))
  note!: Record<string, unknown>;
}
