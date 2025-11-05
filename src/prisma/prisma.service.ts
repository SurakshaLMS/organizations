import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // Reduce query logging for performance (remove 'query' in production)
      log: ['info', 'warn', 'error'],
      // Add connection timeout for Cloud Run
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    // Skip database connection if DATABASE_URL is not provided
    if (!process.env.DATABASE_URL) {
      this.logger.warn('DATABASE_URL not provided, skipping database connection');
      return;
    }

    // Add timeout and retry for Cloud Run startup
    const maxRetries = 2; // Reduced for faster startup
    const timeout = 8000; // 8 seconds per attempt
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        this.logger.log(`Attempting database connection (attempt ${i + 1}/${maxRetries})...`);
        
        await Promise.race([
          this.$connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), timeout)
          )
        ]);
        
        this.logger.log('Database connected successfully');
        return;
      } catch (error) {
        this.logger.error(`Database connection attempt ${i + 1} failed: ${error.message}`);
        
        if (i === maxRetries - 1) {
          this.logger.warn('Starting server without database connection. Some features may not work.');
          // Don't throw error - let the app start without DB
          return;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced wait time
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Enable soft delete functionality
   */
  async enableShutdownHooks(app: any) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
