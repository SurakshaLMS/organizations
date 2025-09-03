import { Module } from '@nestjs/common';
import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAccessValidationService } from '../auth/jwt-access-validation.service';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentationController],
  providers: [DocumentationService, JwtAccessValidationService],
  exports: [DocumentationService],
})
export class DocumentationModule {}
