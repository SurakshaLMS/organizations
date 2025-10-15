import { Module } from '@nestjs/common';
import { CauseService } from './cause.service';
import { CauseController } from './cause.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CloudStorageService } from '../common/services/cloud-storage.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CauseController],
  providers: [CauseService, CloudStorageService],
  exports: [CauseService],
})
export class CauseModule {}
