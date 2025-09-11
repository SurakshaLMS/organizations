import { Module } from '@nestjs/common';
import { LectureService } from './lecture.service';
import { LectureController } from './lecture.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GCSService } from '../common/services/gcs.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LectureController],
  providers: [LectureService, GCSService],
  exports: [LectureService],
})
export class LectureModule {}
