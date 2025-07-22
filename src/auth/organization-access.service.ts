import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserOrganizationAccess {
  organizationId: string;
  role: 'PRESIDENT' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  isVerified: boolean;
  name: string;
  type: string;
  isPublic: boolean;
  instituteId?: string | null;
  joinedAt: Date;
  memberCount: number;
  causeCount: number;
}

// Compact JWT format: ["Porg-123", "Aorg-456", "Morg-789"]
// P=President, A=Admin, O=mOderator, M=Member
export type CompactOrganizationAccess = string[];

export interface EnhancedJwtPayload {
  sub: string; // userId as string for JWT compatibility
  email: string;
  name: string;
  orgAccess: CompactOrganizationAccess; // Compact format ["Porg-123", "Aorg-456"]
  isGlobalAdmin: boolean; // Global organization admin
  iat?: number;
  exp?: number;
}

// Utility functions for ID conversion
export const convertToString = (id: bigint | string | number): string => {
  return typeof id === 'bigint' ? id.toString() : String(id);
};

export const convertToBigInt = (id: string | bigint | number): bigint => {
  if (typeof id === 'bigint') {
    return id;
  }
  
  // Validate that the ID is numeric
  const numericString = String(id);
  if (!/^\d+$/.test(numericString)) {
    throw new BadRequestException(`Invalid ID format: "${id}". Expected a numeric value (e.g., "1", "123"), but received: "${numericString}"`);
  }
  
  return BigInt(id);
};

@Injectable()
export class OrganizationAccessService {
  constructor(private prisma: PrismaService) {}

  /**
   * Role mapping for compact JWT format
   */
  private getRoleCode(role: string): string {
    const roleMap = {
      'PRESIDENT': 'P',
      'ADMIN': 'A',
      'MODERATOR': 'O', // mOderator
      'MEMBER': 'M'
    };
    return roleMap[role] || 'M';
  }

  /**
   * Parse role from compact format
   */
  private parseRoleFromCode(code: string): 'PRESIDENT' | 'ADMIN' | 'MODERATOR' | 'MEMBER' {
    const codeMap = {
      'P': 'PRESIDENT',
      'A': 'ADMIN', 
      'O': 'MODERATOR',
      'M': 'MEMBER'
    };
    return codeMap[code] as 'PRESIDENT' | 'ADMIN' | 'MODERATOR' | 'MEMBER' || 'MEMBER';
  }

  /**
   * Get user's organization access in compact format for JWT token
   * Returns compact array like ["Porg-123", "Aorg-456", "Morg-789"]
   */
  async getUserOrganizationAccessCompact(userId: string | bigint): Promise<CompactOrganizationAccess> {
    const userBigIntId = convertToBigInt(userId);
    const organizationUsers = await this.prisma.organizationUser.findMany({
      where: {
        userId: userBigIntId,
        isVerified: true, // Only verified memberships
      },
      select: {
        organizationId: true,
        role: true,
      },
    });

    return organizationUsers.map(ou => {
      const roleCode = this.getRoleCode(ou.role);
      return `${roleCode}${convertToString(ou.organizationId)}`;
    });
  }

  /**
   * Get user's organization access for JWT token with complete organization details
   * This method is kept for backward compatibility and detailed data when needed
   */
  async getUserOrganizationAccess(userId: string | bigint): Promise<UserOrganizationAccess[]> {
    const userBigIntId = convertToBigInt(userId);
    const organizationUsers = await this.prisma.organizationUser.findMany({
      where: {
        userId: userBigIntId,
        isVerified: true, // Only verified memberships
      },
      include: {
        organization: {
          select: {
            name: true,
            type: true,
            isPublic: true,
            instituteId: true,
            _count: {
              select: {
                organizationUsers: {
                  where: { isVerified: true }
                },
                causes: true,
              },
            },
          },
        },
      },
    });

    return organizationUsers.map(ou => ({
      organizationId: convertToString(ou.organizationId),
      role: ou.role as 'PRESIDENT' | 'ADMIN' | 'MODERATOR' | 'MEMBER',
      isVerified: ou.isVerified,
      name: (ou as any).organization.name,
      type: (ou as any).organization.type,
      isPublic: (ou as any).organization.isPublic,
      instituteId: convertToString((ou as any).organization.instituteId),
      joinedAt: ou.createdAt, // Using createdAt as joinedAt
      memberCount: (ou as any).organization._count.organizationUsers,
      causeCount: (ou as any).organization._count.causes,
    }));
  }

  /**
   * Check if user is a global organization admin
   */
  async isGlobalOrganizationAdmin(userId: string | bigint): Promise<boolean> {
    // Check if user has admin role in the system
    // This could be based on a specific organization type or user role
    const userBigIntId = convertToBigInt(userId);
    const globalAdminOrgs = await this.prisma.organizationUser.findMany({
      where: {
        userId: userBigIntId,
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
   * Verify user has access to organization with required role using compact format
   */
  verifyOrganizationAccessCompact(
    compactAccess: CompactOrganizationAccess,
    organizationId: string,
    requiredRoles: string[] = [],
    isGlobalAdmin: boolean = false
  ): { hasAccess: boolean; userRole?: string; error?: string } {
    // Global admin has access to any organization
    if (isGlobalAdmin) {
      return { hasAccess: true, userRole: 'GLOBAL_ADMIN' };
    }

    // Find user's access to the specific organization
    const orgAccessEntry = compactAccess.find(entry => entry.endsWith(organizationId));

    if (!orgAccessEntry) {
      return { 
        hasAccess: false, 
        error: 'Access denied: User is not a member of this organization' 
      };
    }

    // Extract role from compact format
    const roleCode = orgAccessEntry.charAt(0);
    const userRole = this.parseRoleFromCode(roleCode);

    // If no specific roles required, any verified membership is sufficient
    if (requiredRoles.length === 0) {
      return { hasAccess: true, userRole };
    }

    // Check if user has required role
    if (!requiredRoles.includes(userRole)) {
      return { 
        hasAccess: false, 
        error: `Access denied: Required role(s): ${requiredRoles.join(', ')}, User role: ${userRole}` 
      };
    }

    return { hasAccess: true, userRole };
  }

  /**
   * Parse organization IDs from compact access format
   */
  getOrganizationIdsFromCompact(compactAccess: CompactOrganizationAccess): string[] {
    return compactAccess.map(entry => entry.substring(1)); // Remove first character (role code)
  }

  /**
   * Get user's role for specific organization from compact format
   */
  getUserRoleInOrganization(compactAccess: CompactOrganizationAccess, organizationId: string): string | null {
    const orgAccessEntry = compactAccess.find(entry => entry.endsWith(organizationId));
    if (!orgAccessEntry) return null;
    
    const roleCode = orgAccessEntry.charAt(0);
    return this.parseRoleFromCode(roleCode);
  }

  /**
   * Filter organizations by role from compact access
   */
  filterOrganizationsByRole(compactAccess: CompactOrganizationAccess, role: string): string[] {
    const roleCode = this.getRoleCode(role);
    return compactAccess
      .filter(entry => entry.charAt(0) === roleCode)
      .map(entry => entry.substring(1));
  }

  /**
   * Verify user has access to organization with required role (legacy method for backward compatibility)
   */
  verifyOrganizationAccess(
    userAccess: UserOrganizationAccess[],
    organizationId: string,
    requiredRoles: string[] = [],
    isGlobalAdmin: boolean = false
  ): { hasAccess: boolean; userRole?: string; error?: string } {
    // Convert to compact format and use new method
    const compactAccess = userAccess.map(access => {
      const roleCode = this.getRoleCode(access.role);
      return `${roleCode}${access.organizationId}`;
    });

    return this.verifyOrganizationAccessCompact(compactAccess, organizationId, requiredRoles, isGlobalAdmin);
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
