import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { Note, Template, WorkspaceRole } from '@shared';

import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import type { RequestUser } from '../../common/request-user';
import {
  AdminNoteUpdateDto,
  AdminNoteUpsertDto,
  AdminPasswordResetDto,
  AdminSearchQueryDto,
  AdminTagUpdateDto,
  AdminTemplateUpdateDto,
  AdminTemplateUpsertDto,
  AdminUserCreateDto,
  AdminUserUpdateDto,
  AdminWorkspaceCreateDto,
  AdminWorkspaceMemberCreateDto,
  AdminWorkspaceMemberUpdateDto,
  AdminWorkspaceUpdateDto,
} from './admin.dto';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('health')
  health() {
    return this.adminService.health();
  }

  @Get('dashboard')
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get('metrics')
  metrics() {
    return this.adminService.dashboard();
  }

  @Get('users')
  listUsers(@Query() query: AdminSearchQueryDto) {
    return this.adminService.listUsers(query.query);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post('users')
  createUser(@Body() body: AdminUserCreateDto) {
    return this.adminService.createUser(body);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: AdminUserUpdateDto) {
    return this.adminService.updateUser(id, body);
  }

  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: AdminPasswordResetDto) {
    return this.adminService.resetUserPassword(id, body.password);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('workspaces')
  listWorkspaces(@Query() query: AdminSearchQueryDto) {
    return this.adminService.listWorkspaces(query.query, query.ownerUserId, query.risk);
  }

  @Get('workspaces/:id')
  getWorkspace(@Param('id') id: string) {
    return this.adminService.getWorkspaceDetail(id);
  }

  @Post('workspaces')
  createWorkspace(@CurrentUser() user: RequestUser, @Body() body: AdminWorkspaceCreateDto) {
    return this.adminService.createWorkspace(user, body);
  }

  @Patch('workspaces/:id')
  updateWorkspace(@Param('id') id: string, @Body() body: AdminWorkspaceUpdateDto) {
    return this.adminService.updateWorkspace(id, body);
  }

  @Delete('workspaces/:id')
  deleteWorkspace(@Param('id') id: string) {
    return this.adminService.deleteWorkspace(id);
  }

  @Get('workspaces/:id/members')
  listWorkspaceMembers(@Param('id') id: string) {
    return this.adminService.listWorkspaceMembers(id);
  }

  @Post('workspaces/:id/members')
  addWorkspaceMember(@Param('id') id: string, @Body() body: AdminWorkspaceMemberCreateDto) {
    return this.adminService.addWorkspaceMember(id, {
      userId: body.userId,
      email: body.email,
      role: body.role as WorkspaceRole,
    });
  }

  @Patch('workspaces/:id/members/:memberId')
  updateWorkspaceMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: AdminWorkspaceMemberUpdateDto,
  ) {
    return this.adminService.updateWorkspaceMember(id, memberId, body.role as WorkspaceRole);
  }

  @Delete('workspaces/:id/members/:memberId')
  removeWorkspaceMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.adminService.removeWorkspaceMember(id, memberId);
  }

  @Get('notes')
  listNotes(@Query() query: AdminSearchQueryDto) {
    return this.adminService.listNotes(query.query, query.workspaceId, query.tag, query.status, query.priority, query.state);
  }

  @Get('notes/:id')
  getNote(@Param('id') id: string) {
    return this.adminService.getNoteDetail(id);
  }

  @Post('notes')
  createNote(@Body() body: AdminNoteUpsertDto) {
    return this.adminService.createNote(body.workspaceId, body.note as unknown as Note);
  }

  @Patch('notes/:id')
  updateNote(@Param('id') id: string, @Body() body: AdminNoteUpdateDto) {
    return this.adminService.updateNote(id, body.note as unknown as Note);
  }

  @Delete('notes/:id')
  deleteNote(@Param('id') id: string) {
    return this.adminService.deleteNote(id);
  }

  @Get('templates')
  listTemplates(@Query() query: AdminSearchQueryDto) {
    return this.adminService.listTemplates(query.query, query.workspaceId);
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.adminService.getTemplateDetail(id);
  }

  @Post('templates')
  createTemplate(@Body() body: AdminTemplateUpsertDto) {
    return this.adminService.createTemplate(body.workspaceId, body.template as unknown as Template);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() body: AdminTemplateUpdateDto) {
    return this.adminService.updateTemplate(id, body.template as unknown as Template);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.adminService.deleteTemplate(id);
  }

  @Get('tags')
  listTags(@Query() query: AdminSearchQueryDto) {
    return this.adminService.listTags(query.query, query.workspaceId, query.pinned);
  }

  @Get('tags/:name')
  getTag(@Param('name') name: string, @Query('workspaceId') workspaceId: string) {
    return this.adminService.getTagDetail(name, workspaceId);
  }

  @Patch('tags/:name')
  updateTag(@Param('name') name: string, @Body() body: AdminTagUpdateDto) {
    return this.adminService.updateTag(name, body);
  }

  @Delete('tags/:name')
  deleteTag(@Param('name') name: string, @Query('workspaceId') workspaceId: string) {
    return this.adminService.deleteTag(name, workspaceId);
  }

  @Get('sync/conflicts')
  listSyncConflicts() {
    return this.adminService.listSyncConflicts();
  }
}
