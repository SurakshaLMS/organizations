import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudStorageService } from './services/cloud-storage.service';

/**
 * COMMON MODULE
 * 
 * Shared services and utilities used across the application
 */
@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [CloudStorageService],
  exports: [CloudStorageService],
})
export class CommonModule {}