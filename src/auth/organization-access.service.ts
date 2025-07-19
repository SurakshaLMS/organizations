import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserOrganizationAccess {
  organizationId: string;
  role: 'PRESIDENT' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  isVerified: boolean;
}

export interface EnhancedJwtPayload {
  sub: string; // userId
  email: string;
  name: string;
  organizationAccess: UserOrganizationAccess[];
  isGlobalAdmin: boolean; // Global organization admin
  iat?: number;
  exp?: number;
}

@Injectable()
export class OrganizationAccessService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user's organization access for JWT token
   */
  async getUserOrganizationAccess(userId: string): Promise<UserOrganizationAccess[]> {
    const organizationUsers = await this.prisma.organizationUser.findMany({
      where: {
        userId,
        isVerified: true, // Only verified memberships
      },
      select: {
        organizationId: true,
        role: true,
        isVerified: true,
      },
    });

    return organizationUsers.map(ou => ({
      organizationId: ou.organizationId,
      role: ou.role as 'PRESIDENT' | 'ADMIN' | 'MODERATOR' | 'MEMBER',
      isVerified: ou.isVerified,
    }));
  }

  /**
   * Check if user is a global organization admin
   */
  async isGlobalOrganizationAdmin(userId: string): Promise<boolean> {
    // Check if user has admin role in the system
    // This could be based on a specific organization type or user role
    const globalAdminOrgs = await this.prisma.organizationUser.findMany({
      where: {
        userId,
        role: 'ADMIN',
        isVerified: true,
        organization: {
          type: 'GLOBAL', // Assuming GLOBAL type organizations indicate system admin
        },
      },
    });

    return globalAdminOrgs.length > 0;
  }

  /**
   * Verify user has access to organization with required role
   */
  verifyOrganizationAccess(
    userAccess: UserOrganizationAccess[],
    organizationId: string,
    requiredRoles: string[] = [],
    isGlobalAdmin: boolean = false
  ): { hasAccess: boolean; userRole?: string; error?: string } {
    // Global admin has access to any organization
    if (isGlobalAdmin) {
      return { hasAccess: true, userRole: 'GLOBAL_ADMIN' };
    }

    // Find user's access to the specific organization
    const orgAccess = userAccess.find(access => access.organizationId === organizationId);

    if (!orgAccess) {
      return { 
        hasAccess: false, 
        error: 'Access denied: User is not a member of this organization' 
      };
    }

    if (!orgAccess.isVerified) {
      return { 
        hasAccess: false, 
        error: 'Access denied: User membership is not verified' 
      };
    }

    // If no specific roles required, any verified membership is sufficient
    if (requiredRoles.length === 0) {
      return { hasAccess: true, userRole: orgAccess.role };
    }

    // Check if user has required role
    if (!requiredRoles.includes(orgAccess.role)) {
      return { 
        hasAccess: false, 
        error: `Access denied: Required role(s): ${requiredRoles.join(', ')}, User role: ${orgAccess.role}` 
      };
    }

    return { hasAccess: true, userRole: orgAccess.role };
  }

  /**
   * Get hierarchy of roles for permission checking
   */
  getRoleHierarchy(): Record<string, number> {
    return {
      MEMBER: 1,
      MODERATOR: 2,
      ADMIN: 3,
      PRESIDENT: 4,
    };
  }

  /**
   * Check if user role has sufficient permissions
   */
  hasMinimumRole(userRole: string, minimumRole: string): boolean {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[userRole] >= hierarchy[minimumRole];
  }
}
