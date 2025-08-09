import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const ORG_PARAM_KEY = 'orgParam';

export interface RoleConfig {
  orgParam: string; // Parameter name containing organization ID
  roles: OrganizationRole[]; // Required roles
  allowGlobalAdmin?: boolean; // Allow global admin access
  description?: string; // Description for documentation
}

/**
 * Custom decorator for organization role-based access control
 * @param orgParam - Parameter name containing organization ID (e.g., 'id', 'organizationId')
 * @param roles - Array of required user types
 * @param allowGlobalAdmin - Whether global admin bypasses role checks
 */
export const Roles = (
  orgParam: string,
  roles: OrganizationRole[],
  allowGlobalAdmin: boolean = true
) => {
  const config: RoleConfig = {
    orgParam,
    roles,
    allowGlobalAdmin,
    description: `Requires ${roles.join(' or ')} role in organization`
  };

  return applyDecorators(
    SetMetadata(ROLES_KEY, config),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ 
      description: 'Authentication required',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized access' },
          error: { type: 'string', example: 'Unauthorized' }
        }
      }
    }),
    ApiForbiddenResponse({ 
      description: `Insufficient permissions. Required role: ${roles.join(' or ')}`,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: `Insufficient permissions. Required role: ${roles.join(' or ')}` },
          error: { type: 'string', example: 'Forbidden' },
          requiredRoles: { type: 'array', items: { type: 'string' }, example: roles },
          userRole: { type: 'string', example: 'MEMBER' }
        }
      }
    })
  );
};

// Convenience decorators for common role combinations
export const RequirePresident = (orgParam: string = 'id') =>
  Roles(orgParam, [OrganizationRole.PRESIDENT]);

export const RequireAdmin = (orgParam: string = 'id') =>
  Roles(orgParam, [OrganizationRole.ADMIN, OrganizationRole.PRESIDENT]);

export const RequireModerator = (orgParam: string = 'id') =>
  Roles(orgParam, [OrganizationRole.MODERATOR, OrganizationRole.ADMIN, OrganizationRole.PRESIDENT]);

export const RequireMember = (orgParam: string = 'id') =>
  Roles(orgParam, [OrganizationRole.MEMBER, OrganizationRole.MODERATOR, OrganizationRole.ADMIN, OrganizationRole.PRESIDENT]);

// Manager-specific decorators
export const RequireOrganizationManager = (orgParam: string = 'id') =>
  Roles(orgParam, [OrganizationRole.ADMIN, OrganizationRole.PRESIDENT]);

export const RequireLeadership = (orgParam: string = 'id') =>
  Roles(orgParam, [OrganizationRole.MODERATOR, OrganizationRole.ADMIN, OrganizationRole.PRESIDENT]);
