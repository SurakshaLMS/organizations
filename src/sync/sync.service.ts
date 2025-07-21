import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private sourceConnection: mysql.Connection;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeSourceConnection();
  }

  async onModuleDestroy() {
    if (this.sourceConnection) {
      await this.sourceConnection.end();
    }
  }

  private async initializeSourceConnection() {
    try {
      this.sourceConnection = await mysql.createConnection({
        host: this.configService.get('DB_HOST'),
        port: parseInt(this.configService.get('DB_PORT') || '3306'),
        user: this.configService.get('DB_USERNAME'),
        password: this.configService.get('DB_PASSWORD'),
        database: 'laas', // Source database
        timezone: '+00:00',
      });
      this.logger.log('Source database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to source database:', error);
      throw error;
    }
  }

  // Run sync daily at 2:30 AM (configured as 2-3 AM window)
  @Cron('30 2 * * *')
  async performDailySync() {
    if (!this.configService.get<boolean>('USER_SYNC_ENABLED')) {
      this.logger.log('User sync is disabled');
      return;
    }

    this.logger.log('🔄 Starting daily data synchronization...');
    const startTime = Date.now();

    try {
      // Sync in optimized order to handle foreign key dependencies
      await this.syncInstitutes();
      await this.syncUsers();
      await this.syncInstituteUsers();

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Data synchronization completed successfully in ${duration}ms`);
    } catch (error) {
      this.logger.error('❌ Data synchronization failed:', error);
      throw error;
    }
  }

  // Manual sync trigger for development/testing
  async triggerSync() {
    this.logger.log('🔄 Manual sync triggered...');
    await this.performDailySync();
  }

  // Manual sync method with hardcoded credentials for specific table
  async sync(tableName: string, username: string, password: string) {
    // Hardcoded credentials for security
    const SYNC_USERNAME = 'admin';
    const SYNC_PASSWORD = 'Skaveesha1355660';
    
    if (username !== SYNC_USERNAME || password !== SYNC_PASSWORD) {
      this.logger.error('❌ Invalid credentials for manual sync');
      throw new Error('Invalid credentials');
    }

    this.logger.log(`🔄 Manual sync triggered for table: ${tableName} by user: ${username}`);
    
    try {
      switch (tableName.toLowerCase()) {
        case 'institutes':
        case 'institute':
          await this.syncInstitutes();
          break;
        case 'users':
        case 'user':
          await this.syncUsers();
          break;
        case 'institute_users':
        case 'instituteuser':
        case 'instituteusers':
          await this.syncInstituteUsers();
          break;
        case 'all':
          await this.performDailySync();
          break;
        default:
          throw new Error(`Unknown table: ${tableName}`);
      }
      
      this.logger.log(`✅ Manual sync completed for table: ${tableName}`);
      return { success: true, message: `Sync completed for ${tableName}`, timestamp: new Date() };
    } catch (error) {
      this.logger.error(`❌ Manual sync failed for table ${tableName}:`, error);
      throw error;
    }
  }

  private async syncInstitutes() {
    this.logger.log('🏛️ Syncing institutes...');
    
    try {
      // Get all institutes from source database
      const [rows] = await this.sourceConnection.execute(`
        SELECT 
          id,
          name,
          code,
          email,
          phone,
          address,
          city,
          state,
          country,
          pin_code as pinCode,
          type,
          is_active as isActive,
          imageUrl
        FROM institutes 
        WHERE is_active = 1
        ORDER BY id
      `);

      const institutes = rows as any[];
      
      if (institutes.length === 0) {
        this.logger.log('No institutes found to sync');
        return;
      }

      const syncTime = new Date();

      // Use upsert for efficient sync (insert or update) - preserve local timestamps
      for (const institute of institutes) {
        await this.prisma.institute.upsert({
          where: { instituteId: BigInt(institute.id) },
          update: {
            name: institute.name,
            imageUrl: institute.imageUrl,
            lastSyncAt: syncTime,
            // Don't update timestamps - keep local timestamps
          },
          create: {
            instituteId: BigInt(institute.id),
            name: institute.name,
            imageUrl: institute.imageUrl,
            lastSyncAt: syncTime,
            // Let Prisma set createdAt and updatedAt automatically
          },
        });
      }

      this.logger.log(`✅ Synced ${institutes.length} institutes`);
    } catch (error) {
      this.logger.error('Failed to sync institutes:', error);
      throw error;
    }
  }

  private async syncUsers() {
    this.logger.log('👥 Syncing users...');
    
    try {
      // Get all active users from source database with valid email and password
      const [rows] = await this.sourceConnection.execute(`
        SELECT 
          id,
          first_name as firstName,
          last_name as lastName,
          email,
          password,
          phone_number as phoneNumber,
          is_first_login as isFirstLogin,
          user_type as userType,
          date_of_birth as dateOfBirth,
          gender,
          nic,
          birth_certificate_no as birthCertificateNo,
          address_line1 as addressLine1,
          address_line2 as addressLine2,
          city,
          district,
          province,
          postal_code as postalCode,
          country,
          is_active as isActive,
          image_url as imageUrl,
          id_url as idUrl,
          is_paid as isPaid,
          payment_expires_at as paymentExpiresAt
        FROM users 
        WHERE is_active = 1 AND email IS NOT NULL AND password IS NOT NULL
        ORDER BY id
      `);

      const users = rows as any[];
      
      if (users.length === 0) {
        this.logger.log('No users found to sync');
        return;
      }

      const syncTime = new Date();

      // Batch process users for better performance
      const batchSize = 100;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (user) => {
          const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
          
          // Skip users without valid email or password
          if (!user.email || !user.password) {
            return;
          }
          
          await this.prisma.user.upsert({
            where: { userId: BigInt(user.id) },
            update: {
              email: user.email,
              password: user.password, // Keep original hashed password
              name: fullName,
              lastSyncAt: syncTime,
              // Don't update timestamps - keep local timestamps
            },
            create: {
              userId: BigInt(user.id),
              email: user.email,
              password: user.password,
              name: fullName,
              lastSyncAt: syncTime,
              // Let Prisma set createdAt and updatedAt automatically
            },
          });
        }));
      }

      this.logger.log(`✅ Synced ${users.length} users`);
    } catch (error) {
      this.logger.error('Failed to sync users:', error);
      throw error;
    }
  }

  private async syncInstituteUsers() {
    this.logger.log('🎓 Syncing institute users...');
    
    try {
      // Get all institute user relationships from source database
      const [rows] = await this.sourceConnection.execute(`
        SELECT 
          iu.institute_user_id as instituteUserId,
          iu.institute_id as instituteId,
          iu.user_id as userId,
          iu.user_type as userType,
          iu.user_id_institue as userIdByInstitute,
          iu.status
        FROM institute_user iu
        INNER JOIN institutes i ON iu.institute_id = i.id
        INNER JOIN users u ON iu.user_id = u.id
        WHERE i.is_active = 1 AND u.is_active = 1
        ORDER BY iu.institute_user_id
      `);

      const instituteUsers = rows as any[];
      
      if (instituteUsers.length === 0) {
        this.logger.log('No institute users found to sync');
        return;
      }

      // Map UserType enum from LAAS to organization service
      const mapUserTypeToRole = (userType: string) => {
        switch (userType) {
          case 'ADMIN':
            return 'ADMIN';
          case 'TEACHER':
          case 'INSTRUCTOR':
            return 'FACULTY';
          case 'STUDENT':
            return 'STUDENT';
          case 'STAFF':
            return 'STAFF';
          case 'DIRECTOR':
            return 'DIRECTOR';
          default:
            return 'STUDENT';
        }
      };

      // Map status from LAAS to boolean
      const mapStatus = (status: string) => {
        return status === 'ACTIVE';
      };

      const syncTime = new Date();

      // Batch process institute users
      const batchSize = 100;
      for (let i = 0; i < instituteUsers.length; i += batchSize) {
        const batch = instituteUsers.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (iu) => {
          await this.prisma.instituteUser.upsert({
            where: {
              instituteId_userId: {
                instituteId: BigInt(iu.instituteId),
                userId: BigInt(iu.userId),
              },
            },
            update: {
              role: mapUserTypeToRole(iu.userType),
              isActive: mapStatus(iu.status),
              lastSyncAt: syncTime,
              // Don't update timestamps - keep local timestamps
            },
            create: {
              instituteId: BigInt(iu.instituteId),
              userId: BigInt(iu.userId),
              role: mapUserTypeToRole(iu.userType),
              isActive: mapStatus(iu.status),
              lastSyncAt: syncTime,
              // Let Prisma set createdAt and updatedAt automatically
            },
          });
        }));
      }

      this.logger.log(`✅ Synced ${instituteUsers.length} institute user relationships`);
    } catch (error) {
      this.logger.error('Failed to sync institute users:', error);
      throw error;
    }
  }

  // Health check method to verify sync status
  async getSyncStatus() {
    try {
      const [orgCounts, sourceCounts] = await Promise.all([
        this.getOrganizationCounts(),
        this.getSourceCounts(),
      ]);

      return {
        lastSync: new Date(),
        organizationService: orgCounts,
        sourceDatabase: sourceCounts,
        isHealthy: true,
      };
    } catch (error) {
      this.logger.error('Failed to get sync status:', error);
      return {
        lastSync: null,
        organizationService: null,
        sourceDatabase: null,
        isHealthy: false,
        error: error.message,
      };
    }
  }

  private async getOrganizationCounts() {
    const [users, institutes, instituteUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.institute.count(),
      this.prisma.instituteUser.count(),
    ]);

    return { users, institutes, instituteUsers };
  }

  private async getSourceCounts() {
    const [userRows] = await this.sourceConnection.execute(
      'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
    );
    const [instituteRows] = await this.sourceConnection.execute(
      'SELECT COUNT(*) as count FROM institutes WHERE is_active = 1'
    );
    const [instituteUserRows] = await this.sourceConnection.execute(`
      SELECT COUNT(*) as count FROM institute_user iu
      INNER JOIN institutes i ON iu.institute_id = i.id
      INNER JOIN users u ON iu.user_id = u.id
      WHERE i.is_active = 1 AND u.is_active = 1
    `);

    return {
      users: (userRows as any[])[0].count,
      institutes: (instituteRows as any[])[0].count,
      instituteUsers: (instituteUserRows as any[])[0].count,
    };
  }
}
