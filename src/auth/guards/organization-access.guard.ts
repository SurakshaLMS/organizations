import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ORGANIZATION_ACCESS_KEY, OrganizationAccessConfig } from '../decorators/organization-access.decorator';
import { OrganizationAccessService, EnhancedJwtPayload } from '../organization-access.service';

@Injectable()
export class OrganizationAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private organizationAccessService: OrganizationAccessService,
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

    // For POST requests that create organizations, extract from body
    if (request.method === 'POST' && accessConfig.param === 'organizationId' && request.body?.organizationId) {
      const bodyOrgId = request.body.organizationId;
      const verification = this.organizationAccessService.verifyOrganizationAccess(
        user.organizationAccess,
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

    // Verify user has access to the organization
    const verification = this.organizationAccessService.verifyOrganizationAccess(
      user.organizationAccess,
      organizationId,
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
}
