import { Controller, Post, Get, HttpCode, HttpStatus, UseGuards, Body, UseInterceptors } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';

@UseInterceptors(SecurityHeadersInterceptor)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  async triggerSync() {
    try {
      await this.syncService.triggerSync();
      return {
        success: true,
        message: 'Data synchronization completed successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Data synchronization failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('manual')
  @HttpCode(HttpStatus.OK)
  async manualSync(@Body() body: { tableName: string; username: string; password: string }) {
    const { tableName, username, password } = body;
    
    try {
      const result = await this.syncService.sync(tableName, username, password);
      return {
        ...result,
        tableName,
        syncType: 'manual',
      };
    } catch (error) {
      return {
        success: false,
        message: `Manual sync failed for table: ${tableName}`,
        error: error.message,
        tableName,
        syncType: 'manual',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('status')
  async getSyncStatus() {
    const status = await this.syncService.getSyncStatus();
    return {
      ...status,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('dashboard')
  async getSyncDashboard() {
    try {
      const status = await this.syncService.getSyncStatus();
      
      // Calculate sync health metrics
      const orgCounts = status.organizationService;
      const sourceCounts = status.sourceDatabase;
      
      const metrics = {
        userSyncRate: orgCounts && sourceCounts ? 
          Math.round((orgCounts.users / sourceCounts.users) * 100) : 0,
        instituteSyncRate: orgCounts && sourceCounts ? 
          Math.round((orgCounts.institutes / sourceCounts.institutes) * 100) : 0,
        instituteUserSyncRate: orgCounts && sourceCounts ? 
          Math.round((orgCounts.instituteUsers / sourceCounts.instituteUsers) * 100) : 0,
      };

      return {
        status: status.isHealthy ? 'healthy' : 'unhealthy',
        lastSync: status.lastSync,
        metrics,
        counts: {
          organization: orgCounts,
          source: sourceCounts,
        },
        syncRates: {
          users: `${metrics.userSyncRate}%`,
          institutes: `${metrics.instituteSyncRate}%`,
          instituteUsers: `${metrics.instituteUserSyncRate}%`,
        },
        nextSync: '2:30 AM daily',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('last-sync')
  async getLastSyncTimes() {
    try {
      // Get sample records with lastSyncAt to show sync status
      const [latestUser, latestInstitute, latestInstituteUser] = await Promise.all([
        this.syncService['prisma'].user.findFirst({
          where: { lastSyncAt: { not: null } },
          orderBy: { lastSyncAt: 'desc' },
          select: { lastSyncAt: true }
        }),
        this.syncService['prisma'].institute.findFirst({
          where: { lastSyncAt: { not: null } },
          orderBy: { lastSyncAt: 'desc' },
          select: { lastSyncAt: true }
        }),
        this.syncService['prisma'].instituteUser.findFirst({
          where: { lastSyncAt: { not: null } },
          orderBy: { lastSyncAt: 'desc' },
          select: { lastSyncAt: true }
        })
      ]);
      
      return {
        success: true,
        lastSyncTimes: {
          users: latestUser?.lastSyncAt,
          institutes: latestInstitute?.lastSyncAt,
          instituteUsers: latestInstituteUser?.lastSyncAt,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve last sync times',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
