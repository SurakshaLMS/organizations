import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudStorageService } from './services/cloud-storage.service';
import { SignedUrlService } from './services/signed-url.service';
import { SignedUrlController } from './controllers/signed-url.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * COMMON MODULE
 * 
 * Shared services and utilities used across the application
 */
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [SignedUrlController],
  providers: [CloudStorageService, SignedUrlService],
  exports: [CloudStorageService, SignedUrlService],
})
export class CommonModule {}