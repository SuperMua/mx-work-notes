import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { SyncPushItem } from '@shared';

import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import type { RequestUser } from '../../common/request-user';
import { PullSyncDto, PushSyncDto } from './sync.dto';
import { SyncService } from './sync.service';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('pull')
  pull(@CurrentUser() user: RequestUser, @Query() query: PullSyncDto) {
    return this.syncService.pull(user, query.cursor || null, query.workspaceId || null);
  }

  @Post('push')
  push(@CurrentUser() user: RequestUser, @Body() body: PushSyncDto) {
    return this.syncService.push(user, body.items as SyncPushItem[]);
  }
}
