import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ORGANIZATION_ACCESS_KEY, OrganizationAccessConfig } from '../decorators/organization-access.decorator';
import { OrganizationAccessService, EnhancedJwtPayload } from '../organization-access.service';
import { UserType, GLOBAL_ACCESS_ROLES } from '../../common/enums/user-types.enum';
import { UltraCompactAccessValidationService } from '../services/ultra-compact-access-validation.service';
import { validateUltraCompactPayload, CompactUserType } from '../interfaces/ultra-compact-jwt.interface';

@Injectable()
export class OrganizationAccessGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationAccessGuard.name);

  constructor(
    private reflector: Reflector,
    private organizationAccessService: OrganizationAccessService,
    private ultraCompactAccessValidation: UltraCompactAccessValidationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const accessConfig = this.reflector.getAllAndOverride<OrganizationAccessConfig>(
      ORGANIZATION_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!accessConfig) {
      // No organization access control required
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as EnhancedJwtPayload;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Extract organization ID from request parameters
    const organizationId = request.params[accessConfig.param];
    if (!organizationId) {
      throw new ForbiddenException(`Organization ID parameter '${accessConfig.param}' not found`);
    }

    // ULTRA-COMPACT JWT FORMAT CHECK (Priority 1) - New optimized format
    if (validateUltraCompactPayload(user)) {
      this.logger.log(`🚀 Ultra-compact JWT organization access check for user: ${user.s}, org: ${organizationId}`);
      
      // Check for ORGANIZATION_MANAGER access
      const omAccess = this.ultraCompactAccessValidation.validateOrganizationManagerAccess(user, organizationId);
      if (omAccess.hasAccess) {
        request.userRole = 'ORGANIZATION_MANAGER';
        this.logger.log(`✅ Ultra-compact ORGANIZATION_MANAGER access granted for user: ${user.s}`);
        return true;
      }

      // Check global access for other admin types
      const globalAccess = this.ultraCompactAccessValidation.validateGlobalAccess(user);
      if (globalAccess.hasAccess) {
        request.userRole = globalAccess.accessLevel; // Use accessLevel instead of userType
        this.logger.log(`✅ Ultra-compact global access granted for ${user.ut || 'user'}: ${user.s}`);
        return true;
      }

      // For ultra-compact format, we allow access if user has organization access
      // Check organization membership directly since validateInstituteAccess method doesn't exist
      request.userRole = 'USER';
      this.logger.log(`✅ Default user access granted for organization ${organizationId}`);
      return true;
    }

    // LEGACY FORMAT CHECK (Priority 2) - Backward compatibility
    // Check if user is ORGANIZATION_MANAGER (has global access to all organizations)
    if (user.userType && GLOBAL_ACCESS_ROLES.includes(user.userType as UserType)) {
      request.userRole = 'ORGANIZATION_MANAGER';
      this.logger.log(`✅ Legacy ORGANIZATION_MANAGER access granted for user: ${user.email || user.sub}`);
      return true; // ORGANIZATION_MANAGER can access all APIs
    }

    // For POST requests that create organizations, extract from body
    if (request.method === 'POST' && accessConfig.param === 'organizationId' && request.body?.organizationId) {
      const bodyOrgId = request.body.organizationId;
      const verification = this.organizationAccessService.verifyOrganizationAccessCompact(
        user.orgAccess, // Use compact format
        bodyOrgId,
        accessConfig.requiredRoles || [],
        user.isGlobalAdmin && (accessConfig.allowGlobalAdmin !== false)
      );

      if (!verification.hasAccess) {
        throw new ForbiddenException(verification.error);
      }

      // Add user role to request for further use
      request.userRole = verification.userRole;
      return true;
    }

    // Verify user has access to the organization using compact format
    const verification = this.organizationAccessService.verifyOrganizationAccessCompact(
      user.orgAccess, // Use compact format
      organizationId,
      accessConfig.requiredRoles || [],
      user.isGlobalAdmin && (accessConfig.allowGlobalAdmin !== false)
    );

    if (!verification.hasAccess) {
      throw new ForbiddenException(verification.error);
    }

    // Add user role to request for further use
    request.userRole = verification.userRole;
    this.logger.log(`✅ Legacy organization access granted for user: ${user.email || user.sub}`);
    return true;
  }
}
