import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { EnhancedJwtPayload, CompactOrganizationAccess } from './organization-access.service';

/**
 * Enterprise JWT Access Validation Service
 * 
 * This service provides common methods for validating organization access
 * exclusively through JWT tokens without any database queries.
 * 
 * Key Features:
 * - Zero database queries for access validation
 * - Token-based security model
 * - Role hierarchy validation
 * - Performance optimized for enterprise scale
 * - Comprehensive audit logging
 * - Production-ready security controls
 */
@Injectable()
export class JwtAccessValidationService {
  private readonly logger = new Logger(JwtAccessValidationService.name);

  /**
   * Role hierarchy for enterprise security
   * Higher numbers = higher privileges
   */
  private readonly roleHierarchy = {
    'MEMBER': 1,
    'MODERATOR': 2,
    'ADMIN': 3,
    'PRESIDENT': 4
  };

  /**
   * Role code mapping for compact JWT format
   */
  private readonly roleCodeMap = {
    'P': 'PRESIDENT',    // P = President
    'A': 'ADMIN',        // A = Admin  
    'O': 'MODERATOR',    // O = mOderator
    'M': 'MEMBER'        // M = Member
  };

  /**
   * MAIN ACCESS VALIDATION METHOD
   * 
   * Validates organization access exclusively through JWT token.
   * This is the primary method for all organization access checks.
   * 
   * @param user - JWT payload with user information
   * @param organizationId - Organization ID to validate access for
   * @param requiredRoles - Array of required roles (optional)
   * @param allowGlobalAdmin - Whether global admin has automatic access
   * @returns Validation result with access status and user role
   */
  validateOrganizationAccess(
    user: EnhancedJwtPayload,
    organizationId: string,
    requiredRoles: string[] = [],
    allowGlobalAdmin: boolean = true
  ): { hasAccess: boolean; userRole?: string; error?: string; accessLevel?: string } {
    
    try {
      // 1. VALIDATE INPUT PARAMETERS
      if (!user || !organizationId) {
        return {
          hasAccess: false,
          error: 'Invalid parameters: user and organizationId are required'
        };
      }

      // 2. VALIDATE JWT TOKEN STRUCTURE
      if (!user.orgAccess || !Array.isArray(user.orgAccess)) {
        return {
          hasAccess: false,
          error: 'Invalid JWT token: organization access data missing'
        };
      }

      // 3. VALIDATE ORGANIZATION ID FORMAT
      if (!this.isValidOrganizationId(organizationId)) {
        return {
          hasAccess: false,
          error: `Invalid organization ID format: ${organizationId}`
        };
      }

      // 4. ORGANIZATION_MANAGER ACCESS CHECK (highest privilege)
      if (user.userType === 'ORGANIZATION_MANAGER') {
        this.logAccessEvent('ORGANIZATION_MANAGER_ACCESS', {
          userId: user.sub,
          organizationId,
          accessLevel: 'ORGANIZATION_MANAGER'
        });
        
        return {
          hasAccess: true,
          userRole: 'ORGANIZATION_MANAGER',
          accessLevel: 'ORGANIZATION_MANAGER'
        };
      }

      // 5. GLOBAL ADMIN ACCESS CHECK
      if (allowGlobalAdmin && user.isGlobalAdmin) {
        this.logAccessEvent('GLOBAL_ADMIN_ACCESS', {
          userId: user.sub,
          organizationId,
          accessLevel: 'GLOBAL_ADMIN'
        });
        
        return {
          hasAccess: true,
          userRole: 'GLOBAL_ADMIN',
          accessLevel: 'GLOBAL_ADMIN'
        };
      }

      // 6. ORGANIZATION MEMBERSHIP CHECK
      const membershipEntry = user.orgAccess.find(entry => entry.endsWith(organizationId));
      
      if (!membershipEntry) {
        this.logAccessEvent('MEMBERSHIP_DENIED', {
          userId: user.sub,
          organizationId,
          reason: 'Not a member of organization'
        });
        
        return {
          hasAccess: false,
          error: `Access denied: User is not a member of organization ${organizationId}`
        };
      }

      // 7. ROLE EXTRACTION AND VALIDATION
      const roleCode = membershipEntry.charAt(0);
      const userRole = this.roleCodeMap[roleCode];
      
      if (!userRole) {
        this.logAccessEvent('INVALID_ROLE_CODE', {
          userId: user.sub,
          organizationId,
          roleCode,
          membershipEntry
        });
        
        return {
          hasAccess: false,
          error: `Invalid role code in JWT token: ${roleCode}`
        };
      }

      // 7. ROLE-BASED ACCESS CONTROL
      if (requiredRoles.length > 0) {
        const hasRequiredRole = this.validateRoleHierarchy(userRole, requiredRoles);
        
        if (!hasRequiredRole) {
          this.logAccessEvent('INSUFFICIENT_ROLE', {
            userId: user.sub,
            organizationId,
            userRole,
            requiredRoles
          });
          
          return {
            hasAccess: false,
            error: `Access denied: Required role(s): ${requiredRoles.join(', ')}, User role: ${userRole}`
          };
        }
      }

      // 8. ACCESS GRANTED
      this.logAccessEvent('ACCESS_GRANTED', {
        userId: user.sub,
        organizationId,
        userRole,
        accessLevel: 'ORGANIZATION_MEMBER'
      });

      return {
        hasAccess: true,
        userRole,
        accessLevel: 'ORGANIZATION_MEMBER'
      };

    } catch (error) {
      this.logger.error('Access validation error:', error);
      return {
        hasAccess: false,
        error: 'Internal validation error'
      };
    }
  }

  /**
   * BULK ORGANIZATION ACCESS VALIDATION
   * 
   * Validates access to multiple organizations at once.
   * Optimized for dashboard and listing operations.
   */
  validateMultipleOrganizationAccess(
    user: EnhancedJwtPayload,
    organizationIds: string[],
    requiredRole?: string
  ): { organizationId: string; hasAccess: boolean; userRole?: string }[] {
    
    return organizationIds.map(orgId => {
      const validation = this.validateOrganizationAccess(
        user, 
        orgId, 
        requiredRole ? [requiredRole] : []
      );
      
      return {
        organizationId: orgId,
        hasAccess: validation.hasAccess,
        userRole: validation.userRole
      };
    });
  }

  /**
   * GET USER'S ORGANIZATION IDS BY ROLE
   * 
   * Extracts organization IDs from JWT token filtered by role.
   */
  getUserOrganizationsByRole(
    user: EnhancedJwtPayload,
    role?: string
  ): { organizationId: string; role: string }[] {
    
    if (!user.orgAccess || !Array.isArray(user.orgAccess)) {
      return [];
    }

    return user.orgAccess
      .map(entry => {
        const roleCode = entry.charAt(0);
        const organizationId = entry.substring(1);
        const userRole = this.roleCodeMap[roleCode];
        
        return { organizationId, role: userRole };
      })
      .filter(org => !role || org.role === role);
  }

  /**
   * GET USER'S ROLE IN SPECIFIC ORGANIZATION
   * 
   * Returns user's role in a specific organization from JWT token.
   */
  getUserRoleInOrganization(user: EnhancedJwtPayload, organizationId: string): string | null {
    if (!user.orgAccess || !Array.isArray(user.orgAccess)) {
      return null;
    }

    const membershipEntry = user.orgAccess.find(entry => entry.endsWith(organizationId));
    if (!membershipEntry) {
      return null;
    }

    const roleCode = membershipEntry.charAt(0);
    return this.roleCodeMap[roleCode] || null;
  }

  /**
   * CHECK IF USER IS ADMIN IN ANY ORGANIZATION
   * 
   * Useful for global admin checks and elevated permissions.
   */
  isUserAdminInAnyOrganization(user: EnhancedJwtPayload): boolean {
    if (user.isGlobalAdmin) {
      return true;
    }

    if (!user.orgAccess || !Array.isArray(user.orgAccess)) {
      return false;
    }

    return user.orgAccess.some(entry => {
      const roleCode = entry.charAt(0);
      return roleCode === 'P' || roleCode === 'A'; // President or Admin
    });
  }

  /**
   * VALIDATE ROLE HIERARCHY
   * 
   * Checks if user role meets minimum role requirements based on hierarchy.
   */
  private validateRoleHierarchy(userRole: string, requiredRoles: string[]): boolean {
    const userLevel = this.roleHierarchy[userRole];
    if (!userLevel) return false;

    // User must meet at least one of the required role levels
    return requiredRoles.some(requiredRole => {
      const requiredLevel = this.roleHierarchy[requiredRole];
      return requiredLevel && userLevel >= requiredLevel;
    });
  }

  /**
   * VALIDATE ORGANIZATION ID FORMAT
   * 
   * Ensures organization ID is valid MySQL auto-increment format.
   */
  private isValidOrganizationId(organizationId: string): boolean {
    // Must be numeric string for MySQL auto-increment IDs
    return /^\d+$/.test(organizationId) && parseInt(organizationId) > 0;
  }

  /**
   * ENTERPRISE AUDIT LOGGING
   * 
   * Logs access events for security monitoring and compliance.
   */
  private logAccessEvent(event: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      ...data,
      service: 'JwtAccessValidationService'
    };

    // Log warnings for security-related events
    if (event.includes('DENIED') || event.includes('INVALID') || event.includes('INSUFFICIENT')) {
      this.logger.warn(`🚨 ACCESS EVENT: ${event}`, logEntry);
    } else {
      this.logger.log(`🔒 Access: ${event}`, logEntry);
    }
  }

  /**
   * HELPER METHODS FOR COMMON VALIDATION PATTERNS
   */

  /**
   * Require organization member (any role)
   */
  requireOrganizationMember(user: EnhancedJwtPayload, organizationId: string) {
    const validation = this.validateOrganizationAccess(user, organizationId);
    if (!validation.hasAccess) {
      throw new ForbiddenException(validation.error);
    }
    return validation;
  }

  /**
   * Require organization moderator or higher
   */
  requireOrganizationModerator(user: EnhancedJwtPayload, organizationId: string) {
    const validation = this.validateOrganizationAccess(
      user, 
      organizationId, 
      ['MODERATOR', 'ADMIN', 'PRESIDENT']
    );
    if (!validation.hasAccess) {
      throw new ForbiddenException(validation.error);
    }
    return validation;
  }

  /**
   * Require organization admin or higher
   */
  requireOrganizationAdmin(user: EnhancedJwtPayload, organizationId: string) {
    const validation = this.validateOrganizationAccess(
      user, 
      organizationId, 
      ['ADMIN', 'PRESIDENT']
    );
    if (!validation.hasAccess) {
      throw new ForbiddenException(validation.error);
    }
    return validation;
  }

  /**
   * Require organization president
   */
  requireOrganizationPresident(user: EnhancedJwtPayload, organizationId: string) {
    const validation = this.validateOrganizationAccess(
      user, 
      organizationId, 
      ['PRESIDENT']
    );
    if (!validation.hasAccess) {
      throw new ForbiddenException(validation.error);
    }
    return validation;
  }

  /**
   * Get compact organization access statistics
   */
  getOrganizationAccessStats(user: EnhancedJwtPayload): {
    totalOrganizations: number;
    roleDistribution: Record<string, number>;
    isGlobalAdmin: boolean;
    compactTokenSize: number;
  } {
    const organizations = this.getUserOrganizationsByRole(user);
    
    const roleDistribution = organizations.reduce((acc, org) => {
      acc[org.role] = (acc[org.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOrganizations: organizations.length,
      roleDistribution,
      isGlobalAdmin: user.isGlobalAdmin || false,
      compactTokenSize: JSON.stringify(user.orgAccess || []).length
    };
  }
}
