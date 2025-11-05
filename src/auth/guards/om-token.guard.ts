import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Organization Manager Token Guard
 * 
 * Validates the special OM_TOKEN for system-level organization operations.
 * This follows the JWT architecture pattern but uses a static token for
 * Organization Manager operations instead of dynamic JWT tokens.
 */
@Injectable()
export class OrganizationManagerTokenGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationManagerTokenGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    // Validate authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header missing or invalid format');
    }

    const token = authHeader.replace('Bearer ', '');
    const validOMToken = this.configService.get<string>('OM_TOKEN');

    // Validate OM token is configured
    if (!validOMToken) {
      this.logger.error('OM_TOKEN not configured in environment variables');
      throw new UnauthorizedException('Organization Manager token not configured');
    }

    // Validate token matches
    if (token !== validOMToken) {
      this.logger.warn('Invalid Organization Manager token provided');
      throw new UnauthorizedException('Invalid Organization Manager token');
    }

    this.logger.debug('Organization Manager token validated successfully');

    // Create standardized user object following JWT architecture
    const organizationManagerUser = {
      // Standard JWT fields
      sub: 'OM_USER',
      userId: 'OM_USER', 
      id: 'OM_USER',
      
      // User information
      email: 'org.manager@system.local',
      firstName: 'Organization',
      lastName: 'Manager',
      name: 'Organization Manager',
      
      // User type (following ultra-compact format)
      userType: 'ORGANIZATION_MANAGER',
      ut: 'OM', // Ultra-compact user type
      
      // Access control
      isGlobalAdmin: true,
      adminAccess: {}, // No specific institute admin access
      hierarchicalAccess: {}, // No hierarchical access needed
      organizations: [], // No organization memberships
      instituteIds: [], // No institute associations
      studentIds: [], // Not applicable for OM
      
      // Organization Manager specific
      isOrganizationManager: true,
      hasSystemAccess: true,
      
      // Token metadata
      tokenType: 'OM_TOKEN',
      authMethod: 'ORGANIZATION_MANAGER_TOKEN',
      iat: Math.floor(Date.now() / 1000),
    };

    // Attach user to request (following NestJS JWT pattern)
    (request as any).user = organizationManagerUser;
    
    this.logger.debug('Organization Manager user context created');

    return true;
  }
}
