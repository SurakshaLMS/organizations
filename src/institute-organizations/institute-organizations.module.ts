import { Module } from '@nestjs/common';
import { InstituteOrganizationsController } from './institute-organizations.controller';
import { InstituteOrganizationsService } from './institute-organizations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GCSImageService } from '../common/services/gcs-image.service';

@Module({
  imports: [PrismaModule],
  controllers: [InstituteOrganizationsController],
  providers: [InstituteOrganizationsService, GCSImageService],
  exports: [InstituteOrganizationsService],
})
export class InstituteOrganizationsModule {}