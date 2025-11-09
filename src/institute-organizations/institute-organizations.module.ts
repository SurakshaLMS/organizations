import { Module } from '@nestjs/common';
import { InstituteOrganizationsController } from './institute-organizations.controller';
import { InstituteOrganizationsService } from './institute-organizations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [InstituteOrganizationsController],
  providers: [InstituteOrganizationsService],
  exports: [InstituteOrganizationsService],
})
export class InstituteOrganizationsModule {}