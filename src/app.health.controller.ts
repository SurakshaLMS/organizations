import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Health check endpoint',
    description: 'Returns service health status including database connectivity'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-11-14T10:30:00.000Z',
        uptime: 12345.67,
        database: 'connected',
        environment: 'production',
        version: '1.0.0'
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is unhealthy',
    schema: {
      example: {
        status: 'error',
        timestamp: '2025-11-14T10:30:00.000Z',
        database: 'disconnected',
        error: 'Database connection failed'
      }
    }
  })
  async check() {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();

    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp,
        uptime,
        database: 'connected',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        service: 'organizations-service'
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          timestamp,
          uptime,
          database: 'disconnected',
          error: error.message,
          service: 'organizations-service'
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  @Get('ready')
  @ApiOperation({ 
    summary: 'Readiness check',
    description: 'Returns 200 if service is ready to accept traffic'
  })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch (error) {
      throw new HttpException(
        { ready: false, error: error.message },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  @Get('live')
  @ApiOperation({ 
    summary: 'Liveness check',
    description: 'Returns 200 if service process is alive'
  })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async liveness() {
    return { alive: true, timestamp: new Date().toISOString() };
  }
}
