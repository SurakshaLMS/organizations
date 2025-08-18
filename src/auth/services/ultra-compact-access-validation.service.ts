import { Injectable, Logger } from '@nestjs/common';

/**
 * Ultra-Compact Access Validation Service
 */
@Injectable()
export class UltraCompactAccessValidationService {
  private readonly logger = new Logger(UltraCompactAccessValidationService.name);

  /**
   * ORGANIZATION MANAGER ACCESS VALIDATION
   */
  validateOrganizationManagerAccess(
    payload: any,
    organizationId?: string
  ): {
    hasAccess: boolean;
    accessLevel: string;
    reason: string;
  } {
    if (!payload || !payload.s || !payload.ut) {
      return {
        hasAccess: false,
        accessLevel: 'NONE',
        reason: 'Invalid token payload'
      };
    }

    // Check if user is ORGANIZATION_MANAGER
    if (payload.ut === 'ORGANIZATION_MANAGER' || payload.ut === 'OM') {
      this.logger.log(`✅ ORGANIZATION_MANAGER access granted for user ${payload.s} to organization ${organizationId || 'ALL'}`);
      
      return {
        hasAccess: true,
        accessLevel: 'GLOBAL_ORGANIZATION_ACCESS',
        reason: 'ORGANIZATION_MANAGER has global access to all organizations'
      };
    }

    return {
      hasAccess: false,
      accessLevel: 'NONE',
      reason: 'User is not ORGANIZATION_MANAGER'
    };
  }

  /**
   * GLOBAL ACCESS VALIDATION
   */
  validateGlobalAccess(payload: any): {
    hasAccess: boolean;
    accessLevel: string;
  } {
    if (!payload || !payload.s || !payload.ut) {
      return {
        hasAccess: false,
        accessLevel: 'NONE'
      };
    }

    const hasGlobal = ['SUPER_ADMIN', 'ORGANIZATION_MANAGER', 'SA', 'OM'].includes(payload.ut);

    if (hasGlobal) {
      const accessLevel = ['SUPER_ADMIN', 'SA'].includes(payload.ut) ? 'SUPERADMIN' : 'ORGANIZATION_MANAGER';
      
      this.logger.log(`✅ Global access granted for ${payload.ut} user ${payload.s}`);
      
      return {
        hasAccess: true,
        accessLevel
      };
    }

    return {
      hasAccess: false,
      accessLevel: 'STANDARD'
    };
  }
}