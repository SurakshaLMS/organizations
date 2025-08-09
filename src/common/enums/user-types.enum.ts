/**
 * User Types Enum for Organization Role Management
 * Production-ready hierarchy system
 */
export enum UserType {
  PRESIDENT = 'PRESIDENT',
  ADMIN = 'ADMIN', 
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER'
}

/**
 * Role Hierarchy Levels (Higher number = Higher authority)
 */
export const ROLE_HIERARCHY: Record<UserType, number> = {
  [UserType.MEMBER]: 1,
  [UserType.MODERATOR]: 2,
  [UserType.ADMIN]: 3,
  [UserType.PRESIDENT]: 4
};

/**
 * Manager Roles - Can manage organization
 */
export const MANAGER_ROLES = [UserType.ADMIN, UserType.PRESIDENT];

/**
 * Leadership Roles - Can moderate and lead
 */
export const LEADERSHIP_ROLES = [UserType.MODERATOR, UserType.ADMIN, UserType.PRESIDENT];

/**
 * All Available Roles
 */
export const ALL_ROLES = Object.values(UserType);
