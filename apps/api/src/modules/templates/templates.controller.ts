import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { Template } from '@shared';

import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import type { RequestUser } from '../../common/request-user';
import { WorkspaceScopeDto } from '../notes/notes.dto';
import { UpsertTemplateDto } from './templates.dto';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: WorkspaceScopeDto) {
    return this.templatesService.list(user, query.workspaceId);
  }

  @Post()
  upsert(@CurrentUser() user: RequestUser, @Body() body: UpsertTemplateDto) {
    return this.templatesService.upsert(user, body.template as unknown as Template, body.workspaceId);
  }
}
