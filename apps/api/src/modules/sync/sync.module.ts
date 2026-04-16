import { Module } from '@nestjs/common';

import { NotesModule } from '../notes/notes.module';
import { TemplatesModule } from '../templates/templates.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [NotesModule, TemplatesModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
