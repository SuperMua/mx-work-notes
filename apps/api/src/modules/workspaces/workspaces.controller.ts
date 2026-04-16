import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import type { RequestUser } from '../../common/request-user';
import { CreateWorkspaceDto } from './workspaces.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.workspacesService.list(user);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateWorkspaceDto) {
    return this.workspacesService.create(user, body);
  }
}
