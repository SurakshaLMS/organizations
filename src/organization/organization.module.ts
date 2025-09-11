import { Module, forwardRef } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationManagerController } from './organization-manager.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GCSImageService } from '../common/services/gcs-image.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [OrganizationController, OrganizationManagerController],
  providers: [OrganizationService, GCSImageService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
