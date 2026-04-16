import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { CommonModule } from './common/common.module';
import { validateEnvironment } from './common/env';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotesModule } from './modules/notes/notes.module';
import { SyncModule } from './modules/sync/sync.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET || 'smart-notes-dev-secret' }),
    CommonModule,
    AuthModule,
    NotesModule,
    TemplatesModule,
    SyncModule,
    WorkspacesModule,
    AdminModule,
  ],
})
export class AppModule {}
