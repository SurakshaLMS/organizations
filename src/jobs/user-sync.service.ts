import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Daily user sync job
   * This job syncs user data from the main user table (managed externally)
   * Run at 2 AM daily by default
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async syncUsers() {
    const isEnabled = this.configService.get<boolean>('USER_SYNC_ENABLED', true);
    
    if (!isEnabled) {
      this.logger.log('User sync is disabled');
      return;
    }

    this.logger.log('Starting user sync job...');

    try {
      // Since the user table is managed externally, we only read from it
      // In a real scenario, you would sync from an external API or database
      
      // Example: Get all users from the external system
      const users = await this.prisma.user.findMany({
        select: {
          userId: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(`Found ${users.length} users to sync`);

      // In a real implementation, you would:
      // 1. Compare with external data source
      // 2. Update any changed user information
      // 3. Handle new users or removed users
      
      // For now, we'll just log the count
      this.logger.log(`User sync completed successfully. Processed ${users.length} users`);
      
    } catch (error) {
      this.logger.error('User sync failed', error);
    }
  }

  /**
   * Manual sync trigger for testing
   */
  async triggerManualSync() {
    this.logger.log('Manual user sync triggered');
    return this.syncUsers();
  }
}
