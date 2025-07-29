import { 
  Injectable, 
  CanActivate, 
  ExecutionContext, 
  ForbiddenException, 
  UnauthorizedException,
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ORGANIZATION_ACCESS_KEY, OrganizationAccessConfig } from '../decorators/organization-access.decorator';
import { OrganizationAccessService, EnhancedJwtPayload } from '../organization-access.service';

/**
 * Enhanced Organization Security Guard
 * 
 * Enterprise-level security implementation that:
 * 1. Validates ALL API methods without database queries
 * 2. Uses JWT token-based access control exclusively
 * 3. Implements role hierarchy validation
 * 4. Provides comprehensive audit logging
 * 5. Ensures zero-trust security model
 * 
 * Security Features:
 * - Token-only access validation (no DB queries)
 * - Role-based access control with hierarchy
 * - Organization membership verification
 * - Audit trail for all access attempts
 * - Production-ready performance optimization
 */
@Injectable()
export class EnhancedOrganizationSecurityGuard implements CanActivate {
  private readonly logger = new Logger(EnhancedOrganizationSecurityGuard.name);

  constructor(
    private reflector: Reflector,
    private organizationAccessService: OrganizationAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const accessConfig = this.reflector.getAllAndOverride<OrganizationAccessConfig>(
        ORGANIZATION_ACCESS_KEY,
        [context.getHandler(), context.getClass()],
      );

      // If no organization access control required, allow access
      if (!accessConfig) {
        return true;
      }

      const request = context.switchToHttp().getRequest();
      const user = request.user as EnhancedJwtPayload;

      // Validate JWT token presence
      if (!user) {
        this.logSecurityEvent('UNAUTHORIZED_ACCESS', {
          endpoint: request.url,
          method: request.method,
          reason: 'Missing JWT token'
        });
        throw new UnauthorizedException('Authentication required - JWT token missing');
      }

      // Validate JWT token structure
      if (!user.orgAccess || !Array.isArray(user.orgAccess)) {
        this.logSecurityEvent('INVALID_TOKEN_STRUCTURE', {
          userId: user.sub,
          endpoint: request.url,
          reason: 'Invalid organization access structure in JWT'
        });
        throw new UnauthorizedException('Invalid JWT token structure');
      }

      // Extract organization ID from multiple sources
      const organizationId = this.extractOrganizationId(request, accessConfig);
      if (!organizationId) {
        throw new BadRequestException(`Organization ID not found in ${accessConfig.param}`);
      }

      // Validate organization ID format (must be numeric for MySQL auto-increment)
      if (!/^\d+$/.test(organizationId)) {
        throw new BadRequestException(`Invalid organization ID format: ${organizationId}`);
      }

      // ZERO-DATABASE-QUERY ACCESS VALIDATION
      const accessValidation = this.validateTokenBasedAccess(
        user,
        organizationId,
        accessConfig,
        request
      );

      if (!accessValidation.hasAccess) {
        this.logSecurityEvent('ACCESS_DENIED', {
          userId: user.sub,
          organizationId,
          endpoint: request.url,
          method: request.method,
          userRole: accessValidation.userRole || 'NONE',
          requiredRoles: accessConfig.requiredRoles || [],
          reason: accessValidation.error
        });
        throw new ForbiddenException(accessValidation.error);
      }

      // Add security context to request for downstream use
      request.securityContext = {
        userId: user.sub,
        organizationId,
        userRole: accessValidation.userRole,
        isGlobalAdmin: user.isGlobalAdmin,
        accessGrantedAt: new Date(),
        validationMethod: 'JWT_TOKEN_ONLY'
      };

      // Log successful access for audit
      this.logSecurityEvent('ACCESS_GRANTED', {
        userId: user.sub,
        organizationId,
        endpoint: request.url,
        method: request.method,
        userRole: accessValidation.userRole,
        processingTime: Date.now() - startTime
      });

      return true;

    } catch (error) {
      this.logSecurityEvent('VALIDATION_ERROR', {
        endpoint: context.switchToHttp().getRequest().url,
        error: error.message,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Extract organization ID from request parameters, body, or query
   * Supports multiple parameter sources for flexibility
   */
  private extractOrganizationId(request: any, accessConfig: OrganizationAccessConfig): string | null {
    // 1. Check URL parameters (most common)
    if (request.params[accessConfig.param]) {
      return request.params[accessConfig.param];
    }

    // 2. Check request body (for POST/PUT requests)
    if (request.body && request.body[accessConfig.param]) {
      return request.body[accessConfig.param];
    }

    // 3. Check request body organizationId field (common pattern)
    if (request.body && request.body.organizationId) {
      return request.body.organizationId;
    }

    // 4. Check query parameters (for GET requests with organization filter)
    if (request.query && request.query[accessConfig.param]) {
      return request.query[accessConfig.param];
    }

    return null;
  }

  /**
   * TOKEN-ONLY ACCESS VALIDATION
   * 
   * Validates access exclusively using JWT token data without any database queries.
   * This ensures maximum performance and security.
   */
  private validateTokenBasedAccess(
    user: EnhancedJwtPayload,
    organizationId: string,
    accessConfig: OrganizationAccessConfig,
    request: any
  ): { hasAccess: boolean; userRole?: string; error?: string } {
    
    // 1. GLOBAL ADMIN CHECK (highest privilege)
    if (user.isGlobalAdmin && accessConfig.allowGlobalAdmin !== false) {
      return { 
        hasAccess: true, 
        userRole: 'GLOBAL_ADMIN' 
      };
    }

    // 2. ORGANIZATION MEMBERSHIP CHECK
    const membershipEntry = user.orgAccess.find(entry => entry.endsWith(organizationId));
    
    if (!membershipEntry) {
      return {
        hasAccess: false,
        error: `Access denied: User is not a member of organization ${organizationId}`
      };
    }

    // 3. ROLE EXTRACTION AND VALIDATION
    const roleCode = membershipEntry.charAt(0);
    const userRole = this.parseRoleFromCode(roleCode);
    
    if (!userRole) {
      return {
        hasAccess: false,
        error: `Invalid role code in JWT token: ${roleCode}`
      };
    }

    // 4. ROLE-BASED ACCESS CONTROL
    if (accessConfig.requiredRoles && accessConfig.requiredRoles.length > 0) {
      const hasRequiredRole = this.validateRoleHierarchy(userRole, accessConfig.requiredRoles);
      
      if (!hasRequiredRole) {
        return {
          hasAccess: false,
          error: `Access denied: Required role(s): ${accessConfig.requiredRoles.join(', ')}, User role: ${userRole}`
        };
      }
    }

    // 5. SELF-ACCESS VALIDATION (if required)
    if (accessConfig.allowSelf && this.isSelfAccess(request, user.sub)) {
      return { hasAccess: true, userRole };
    }

    return { hasAccess: true, userRole };
  }

  /**
   * Parse role code to role name with enterprise validation
   */
  private parseRoleFromCode(code: string): string | null {
    const roleMap = {
      'P': 'PRESIDENT',    // P = President (highest organization role)
      'A': 'ADMIN',        // A = Admin (organization administration)
      'O': 'MODERATOR',    // O = mOderator (content moderation)
      'M': 'MEMBER'        // M = Member (basic membership)
    };
    
    return roleMap[code] || null;
  }

  /**
   * Validate role hierarchy for enterprise security
   * 
   * Role Hierarchy (highest to lowest):
   * PRESIDENT > ADMIN > MODERATOR > MEMBER
   */
  private validateRoleHierarchy(userRole: string, requiredRoles: string[]): boolean {
    const roleHierarchy = {
      'MEMBER': 1,
      'MODERATOR': 2, 
      'ADMIN': 3,
      'PRESIDENT': 4
    };

    const userLevel = roleHierarchy[userRole];
    if (!userLevel) return false;

    // Check if user role meets any of the required role levels
    return requiredRoles.some(requiredRole => {
      const requiredLevel = roleHierarchy[requiredRole];
      return requiredLevel && userLevel >= requiredLevel;
    });
  }

  /**
   * Check if request is for user's own data
   */
  private isSelfAccess(request: any, userId: string): boolean {
    // Check if the userId in the request matches the authenticated user
    const targetUserId = request.params.userId || request.body.userId || request.query.userId;
    return targetUserId === userId;
  }

  /**
   * Enterprise audit logging for security events
   */
  private logSecurityEvent(event: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      ...data,
      source: 'EnhancedOrganizationSecurityGuard'
    };

    // In production, this would go to a security audit log system
    if (event.includes('DENIED') || event.includes('ERROR') || event.includes('UNAUTHORIZED')) {
      this.logger.warn(`🚨 SECURITY EVENT: ${event}`, logEntry);
    } else {
      this.logger.log(`🔒 Security: ${event}`, logEntry);
    }
  }
}
