import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // Reduce query logging for performance (remove 'query' in production)
      log: ['info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    // Add timeout and retry for Cloud Run startup
    const maxRetries = 3;
    const timeout = 10000; // 10 seconds per attempt
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔌 Attempting database connection (attempt ${i + 1}/${maxRetries})...`);
        
        await Promise.race([
          this.$connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), timeout)
          )
        ]);
        
        console.log('✅ Database connected successfully');
        return;
      } catch (error) {
        console.error(`❌ Database connection attempt ${i + 1} failed:`, error.message);
        
        if (i === maxRetries - 1) {
          console.error('❌ Failed to connect to database after max retries');
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
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
