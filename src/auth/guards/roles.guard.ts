import { 
  Injectable, 
  CanActivate, 
  ExecutionContext, 
  ForbiddenException,
  UnauthorizedException,
  Logger
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RoleConfig } from '../decorators/roles.decorator';
import { OrganizationRole } from '@prisma/client';
import { EnhancedJwtPayload } from '../organization-access.service';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  // Role hierarchy levels (Higher number = Higher authority)
  private readonly ROLE_HIERARCHY: Record<OrganizationRole, number> = {
    [OrganizationRole.MEMBER]: 1,
    [OrganizationRole.MODERATOR]: 2,
    [OrganizationRole.ADMIN]: 3,
    [OrganizationRole.PRESIDENT]: 4
  };

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roleConfig = this.reflector.getAllAndOverride<RoleConfig>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roleConfig) {
      // No role requirements defined, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: EnhancedJwtPayload = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Extract organization ID from request parameters
    const organizationId = request.params[roleConfig.orgParam];
    
    if (!organizationId) {
      throw new ForbiddenException(`Organization ID parameter '${roleConfig.orgParam}' not found in request`);
    }

    // Check global admin access
    if (roleConfig.allowGlobalAdmin && user.isGlobalAdmin) {
      this.logger.log(`Global admin access granted for user ${user.sub} on organization ${organizationId}`);
      return true;
    }

    // Check user's role in the organization
    const userRole = this.getUserRoleInOrganization(user, organizationId);
    
    if (!userRole) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Access denied: Not a member of this organization',
        error: 'Forbidden',
        organizationId,
        requiredRoles: roleConfig.roles
      });
    }

    // Check if user has required role
    const hasRequiredRole = this.hasRequiredRole(userRole, roleConfig.roles);
    
    if (!hasRequiredRole) {
      throw new ForbiddenException({
        statusCode: 403,
        message: `Insufficient permissions. Required role: ${roleConfig.roles.join(' or ')}`,
        error: 'Forbidden',
        organizationId,
        userRole,
        requiredRoles: roleConfig.roles
      });
    }

    this.logger.log(`Access granted for user ${user.sub} with role ${userRole} on organization ${organizationId}`);
    return true;
  }

  /**
   * Extract user's role in specific organization from JWT
   */
  private getUserRoleInOrganization(user: EnhancedJwtPayload, organizationId: string): OrganizationRole | null {
    if (!user.orgAccess || !Array.isArray(user.orgAccess)) {
      return null;
    }

    // Find organization access in compact format (e.g., "Porg-123", "Aorg-456")
    for (const access of user.orgAccess) {
      if (access.includes(`org-${organizationId}`)) {
        const roleCode = access.charAt(0);
        return this.parseRoleFromCode(roleCode);
      }
    }

    return null;
  }

  /**
   * Parse role from compact JWT format
   */
  private parseRoleFromCode(code: string): OrganizationRole {
    const roleMap: Record<string, OrganizationRole> = {
      'P': OrganizationRole.PRESIDENT,
      'A': OrganizationRole.ADMIN,
      'O': OrganizationRole.MODERATOR, // mOderator
      'M': OrganizationRole.MEMBER
    };

    return roleMap[code] || OrganizationRole.MEMBER;
  }

  /**
   * Check if user has at least one of the required roles
   */
  private hasRequiredRole(userRole: OrganizationRole, requiredRoles: OrganizationRole[]): boolean {
    const userRoleLevel = this.ROLE_HIERARCHY[userRole];
    
    // Check if user's role level meets any of the required role levels
    return requiredRoles.some(requiredRole => {
      const requiredLevel = this.ROLE_HIERARCHY[requiredRole];
      return userRoleLevel >= requiredLevel;
    });
  }
}
