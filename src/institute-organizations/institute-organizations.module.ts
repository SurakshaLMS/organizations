import { Module } from '@nestjs/common';
import { InstituteOrganizationsController } from './institute-organizations.controller';
import { InstituteOrganizationsService } from './institute-organizations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudStorageService } from '../common/services/cloud-storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [InstituteOrganizationsController],
  providers: [InstituteOrganizationsService, CloudStorageService],
  exports: [InstituteOrganizationsService],
})
export class InstituteOrganizationsModule {}