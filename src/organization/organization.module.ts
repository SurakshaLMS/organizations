import { Module, forwardRef } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationManagerController } from './organization-manager.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CloudStorageService } from '../common/services/cloud-storage.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [OrganizationController, OrganizationManagerController],
  providers: [OrganizationService, CloudStorageService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
