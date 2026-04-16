import { IsObject, IsOptional, IsString } from 'class-validator';

import { objectMessage, stringMessage } from '../../common/validation-messages';

export class UpsertTemplateDto {
  @IsObject(objectMessage('模板内容'))
  template!: Record<string, unknown>;

  @IsOptional()
  @IsString(stringMessage('工作区参数'))
  workspaceId?: string;
}
