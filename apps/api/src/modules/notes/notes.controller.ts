import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { Note, NoteBatchItem } from '@shared';

import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import type { RequestUser } from '../../common/request-user';
import { BatchNotesDto, CreateNoteDto, UpdateNoteDto, WorkspaceScopeDto } from './notes.dto';
import { NotesService } from './notes.service';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: WorkspaceScopeDto) {
    return this.notesService.list(user, query.workspaceId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateNoteDto) {
    return this.notesService.create(user, body.note as unknown as Note, body.workspaceId);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateNoteDto) {
    return this.notesService.update(user, id, body.note as unknown as Note, body.expectedVersion);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string, @Query() query: WorkspaceScopeDto) {
    return this.notesService.remove(user, id, query.workspaceId);
  }

  @Post('batch')
  batch(@CurrentUser() user: RequestUser, @Body() body: BatchNotesDto) {
    return this.notesService.batch(user, body.items as NoteBatchItem[], body.workspaceId);
  }
}
