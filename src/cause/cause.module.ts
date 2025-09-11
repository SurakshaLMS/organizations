import { Module } from '@nestjs/common';
import { CauseService } from './cause.service';
import { CauseController } from './cause.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GCSImageService } from '../common/services/gcs-image.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CauseController],
  providers: [CauseService, GCSImageService],
  exports: [CauseService],
})
export class CauseModule {}
