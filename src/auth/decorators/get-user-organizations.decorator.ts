import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserOrganizationAccess } from '../organization-access.service';

/**
 * Decorator to extract user's organization access from JWT token
 * Usage: @GetUserOrganizations() orgs: UserOrganizationAccess[]
 */
export const GetUserOrganizations = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserOrganizationAccess[] => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.organizationAccess || [];
  },
);

/**
 * Decorator to extract specific organization access from JWT token
 * Usage: @GetUserOrganization('org-id') org: UserOrganizationAccess | undefined
 */
export const GetUserOrganization = createParamDecorator(
  (organizationId: string, ctx: ExecutionContext): UserOrganizationAccess | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const organizations: UserOrganizationAccess[] = request.user?.organizationAccess || [];
    return organizations.find(org => org.organizationId === organizationId);
  },
);
