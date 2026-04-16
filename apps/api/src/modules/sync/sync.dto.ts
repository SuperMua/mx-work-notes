import { IsArray, IsOptional, IsString } from 'class-validator';

import { arrayMessage, stringMessage } from '../../common/validation-messages';

export class PullSyncDto {
  @IsOptional()
  @IsString(stringMessage('工作区参数'))
  workspaceId?: string;

  @IsOptional()
  @IsString(stringMessage('同步游标'))
  cursor?: string;
}

export class PushSyncDto {
  @IsArray(arrayMessage('同步队列'))
  items!: Array<{
    workspaceId?: string | null
    entityType: 'note' | 'template' | 'setting'
    entityId: string
    operation: 'create' | 'update' | 'delete'
    payload: unknown
    expectedVersion?: number
  }>;
}
