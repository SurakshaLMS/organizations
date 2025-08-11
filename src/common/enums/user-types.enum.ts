/**
 * User Types Enum for Organization Role Management
 * Production-ready hierarchy system
 */
export enum UserType {
  PRESIDENT = 'PRESIDENT',
  ADMIN = 'ADMIN', 
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
  ORGANIZATION_MANAGER = 'ORGANIZATION_MANAGER' // Special admin type with global organization access
}

/**
 * Role Hierarchy Levels (Higher number = Higher authority)
 */
export const ROLE_HIERARCHY: Record<UserType, number> = {
  [UserType.MEMBER]: 1,
  [UserType.MODERATOR]: 2,
  [UserType.ADMIN]: 3,
  [UserType.PRESIDENT]: 4,
  [UserType.ORGANIZATION_MANAGER]: 5 // Highest level - global organization access
};

/**
 * Manager Roles - Can manage organization
 */
export const MANAGER_ROLES = [UserType.ADMIN, UserType.PRESIDENT, UserType.ORGANIZATION_MANAGER];

/**
 * Leadership Roles - Can moderate and lead
 */
export const LEADERSHIP_ROLES = [UserType.MODERATOR, UserType.ADMIN, UserType.PRESIDENT, UserType.ORGANIZATION_MANAGER];

/**
 * Global Access Roles - Can access all organizations
 */
export const GLOBAL_ACCESS_ROLES = [UserType.ORGANIZATION_MANAGER];

/**
 * All Available Roles
 */
export const ALL_ROLES = Object.values(UserType);
