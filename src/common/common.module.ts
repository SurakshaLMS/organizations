import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * COMMON MODULE
 * 
 * Shared services and utilities used across the application
 */
@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class CommonModule {}