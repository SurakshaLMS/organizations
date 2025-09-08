import { Injectable } from '@nestjs/common';

/**
 * Enhanced Access Service
 * 
 * Provides access validation following the JWT architecture guide.
 * Handles ultra-compact JWT tokens and Organization Manager tokens.
 */
@Injectable()
export class EnhancedAccessService {
  
  /**
   * Validate if user is an Organization Manager
   */
  isOrganizationManager(user: any): boolean {
    return (
      user?.userType === 'ORGANIZATION_MANAGER' ||
      user?.ut === 'OM' ||
      user?.isOrganizationManager === true ||
      user?.tokenType === 'OM_TOKEN' ||
      user?.authMethod === 'ORGANIZATION_MANAGER_TOKEN'
    );
  }

  /**
   * Validate if user is a Super Admin
   */
  isSuperAdmin(user: any): boolean {
    return (
      user?.userType === 'SUPER_ADMIN' ||
      user?.ut === 'SA' ||
      user?.isGlobalAdmin === true
    );
  }

  /**
   * Validate if user has global admin privileges
   */
  hasGlobalAccess(user: any): boolean {
    return this.isOrganizationManager(user) || this.isSuperAdmin(user);
  }

  /**
   * Validate institute access for a user
   */
  validateInstituteAccess(user: any, instituteId: string): boolean {
    // Global access users can access any institute
    if (this.hasGlobalAccess(user)) {
      return true;
    }

    // Check admin access
    if (user?.adminAccess && user.adminAccess[instituteId]) {
      return true;
    }

    // Check hierarchical access
    if (user?.hierarchicalAccess && user.hierarchicalAccess[instituteId]) {
      return true;
    }

    // Check institute IDs array (legacy format)
    if (user?.instituteIds && Array.isArray(user.instituteIds)) {
      return user.instituteIds.includes(instituteId);
    }

    return false;
  }

  /**
   * Validate class access for a user
   */
  validateClassAccess(user: any, instituteId: string, classId: string): boolean {
    // Global access users can access any class
    if (this.hasGlobalAccess(user)) {
      return true;
    }

    // Must have institute access first
    if (!this.validateInstituteAccess(user, instituteId)) {
      return false;
    }

    // Check hierarchical access for specific class
    if (user?.hierarchicalAccess && user.hierarchicalAccess[instituteId]) {
      const instituteAccess = user.hierarchicalAccess[instituteId];
      return !!instituteAccess[classId];
    }

    // Admin access allows all classes in institute
    if (user?.adminAccess && user.adminAccess[instituteId]) {
      return true;
    }

    return false;
  }

  /**
   * Validate subject access for a user
   */
  validateSubjectAccess(user: any, instituteId: string, classId: string, subjectId: string): boolean {
    // Global access users can access any subject
    if (this.hasGlobalAccess(user)) {
      return true;
    }

    // Must have class access first
    if (!this.validateClassAccess(user, instituteId, classId)) {
      return false;
    }

    // Check hierarchical access for specific subject
    if (user?.hierarchicalAccess && user.hierarchicalAccess[instituteId]) {
      const instituteAccess = user.hierarchicalAccess[instituteId];
      if (instituteAccess[classId] && Array.isArray(instituteAccess[classId])) {
        return instituteAccess[classId].includes(subjectId);
      }
    }

    // Admin access allows all subjects
    if (user?.adminAccess && user.adminAccess[instituteId]) {
      return true;
    }

    return false;
  }

  /**
   * Get user access summary
   */
  getUserAccessSummary(user: any): object {
    return {
      userId: user?.userId || user?.sub || user?.id,
      userType: user?.userType || (user?.ut ? this.expandUserType(user.ut) : 'UNKNOWN'),
      isOrganizationManager: this.isOrganizationManager(user),
      isSuperAdmin: this.isSuperAdmin(user),
      hasGlobalAccess: this.hasGlobalAccess(user),
      authMethod: user?.authMethod || 'JWT',
      tokenType: user?.tokenType || 'JWT',
      instituteAccess: Object.keys(user?.adminAccess || {}),
      hierarchicalAccess: Object.keys(user?.hierarchicalAccess || {}),
    };
  }

  /**
   * Expand compact user types to full names
   */
  private expandUserType(compactType: string): string {
    const typeMap: Record<string, string> = {
      'SA': 'SUPER_ADMIN',
      'OM': 'ORGANIZATION_MANAGER',
      'IA': 'INSTITUTE_ADMIN', 
      'AM': 'ATTENDANCE_MARKER',
      'TE': 'TEACHER',
      'ST': 'STUDENT',
      'PA': 'PARENT',
    };
    
    return typeMap[compactType] || compactType;
  }
}
