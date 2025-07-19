import { SetMetadata } from '@nestjs/common';

export const ORGANIZATION_ACCESS_KEY = 'organizationAccess';

export interface OrganizationAccessConfig {
  param: string; // Parameter name that contains organization ID (e.g., 'id', 'organizationId')
  requiredRoles?: string[]; // Required roles for access
  allowGlobalAdmin?: boolean; // Whether global admin has access
  allowSelf?: boolean; // Allow access if it's user's own data
}

export const RequireOrganizationAccess = (config: OrganizationAccessConfig) =>
  SetMetadata(ORGANIZATION_ACCESS_KEY, config);

// Convenience decorators for common use cases
export const RequireOrganizationMember = (param: string = 'id') =>
  RequireOrganizationAccess({ param, allowGlobalAdmin: true });

export const RequireOrganizationModerator = (param: string = 'id') =>
  RequireOrganizationAccess({ 
    param, 
    requiredRoles: ['MODERATOR', 'ADMIN', 'PRESIDENT'], 
    allowGlobalAdmin: true 
  });

export const RequireOrganizationAdmin = (param: string = 'id') =>
  RequireOrganizationAccess({ 
    param, 
    requiredRoles: ['ADMIN', 'PRESIDENT'], 
    allowGlobalAdmin: true 
  });

export const RequireOrganizationPresident = (param: string = 'id') =>
  RequireOrganizationAccess({ 
    param, 
    requiredRoles: ['PRESIDENT'], 
    allowGlobalAdmin: true 
  });
