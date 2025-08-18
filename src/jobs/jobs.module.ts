import { Module } from '@nestjs/common';
// Removed: import { UserSyncService } from './user-sync.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    // Removed: UserSyncService
  ],
  exports: [
    // Removed: UserSyncService
  ],
})
export class JobsModule {}
