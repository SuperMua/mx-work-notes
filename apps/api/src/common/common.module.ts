import { Global, Module } from '@nestjs/common';

import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  providers: [PrismaService, JwtAuthGuard, RolesGuard],
  exports: [PrismaService, JwtAuthGuard, RolesGuard],
})
export class CommonModule {}
