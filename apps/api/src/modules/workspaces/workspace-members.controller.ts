import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import type { RequestUser } from '../../common/request-user';
import { InviteWorkspaceMemberDto, WorkspaceMembersQueryDto } from './workspaces.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspace-members')
@UseGuards(JwtAuthGuard)
export class WorkspaceMembersController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: WorkspaceMembersQueryDto) {
    return this.workspacesService.listMembers(user, query.workspaceId);
  }

  @Post()
  invite(@CurrentUser() user: RequestUser, @Body() body: InviteWorkspaceMemberDto) {
    return this.workspacesService.invite(user, body);
  }
}
