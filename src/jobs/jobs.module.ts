import { Module } from '@nestjs/common';
import { UserSyncService } from './user-sync.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UserSyncService],
  exports: [UserSyncService],
})
export class JobsModule {}
