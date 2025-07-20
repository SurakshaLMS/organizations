import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CompactOrganizationAccess } from '../organization-access.service';

/**
 * Decorator to extract user's organization access from JWT token in compact format
 * Usage: @GetUserOrganizations() orgs: CompactOrganizationAccess
 * Returns: ["Porg-123", "Aorg-456", "Morg-789"]
 */
export const GetUserOrganizations = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CompactOrganizationAccess => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.orgAccess || [];
  },
);

/**
 * Decorator to extract organization IDs only from compact format
 * Usage: @GetUserOrganizationIds() orgIds: string[]
 * Returns: ["org-123", "org-456", "org-789"]
 */
export const GetUserOrganizationIds = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest();
    const compactAccess: CompactOrganizationAccess = request.user?.orgAccess || [];
    return compactAccess.map(entry => entry.substring(1)); // Remove role code
  },
);

/**
 * Decorator to check if user has specific role in organization
 * Usage: @GetUserRoleInOrg('org-123') role: string | null
 */
export const GetUserRoleInOrg = createParamDecorator(
  (organizationId: string, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    const compactAccess: CompactOrganizationAccess = request.user?.orgAccess || [];
    
    const orgEntry = compactAccess.find(entry => entry.endsWith(organizationId));
    if (!orgEntry) return null;
    
    const roleMap = { 'P': 'PRESIDENT', 'A': 'ADMIN', 'O': 'MODERATOR', 'M': 'MEMBER' };
    const roleCode = orgEntry.charAt(0);
    return roleMap[roleCode] || 'MEMBER';
  },
);
