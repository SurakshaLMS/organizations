import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { EnhancedJwtPayload } from '../organization-access.service';
import { UserType, GLOBAL_ACCESS_ROLES } from '../../common/enums/user-types.enum';
import { UltraCompactAccessValidationService } from '../services/ultra-compact-access-validation.service';
import { validateUltraCompactPayload, CompactUserType } from '../interfaces/ultra-compact-jwt.interface';

@Injectable()
export class UserVerificationGuard implements CanActivate {
  private readonly logger = new Logger(UserVerificationGuard.name);

  constructor(
    private ultraCompactAccessValidation: UltraCompactAccessValidationService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: EnhancedJwtPayload = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // ULTRA-COMPACT JWT FORMAT CHECK (Priority 1) - New optimized format
    if (validateUltraCompactPayload(user)) {
      this.logger.log(`🚀 Ultra-compact JWT detected for user: ${user.s}`);
      
      const globalAccess = this.ultraCompactAccessValidation.validateGlobalAccess(user);
      if (globalAccess.hasAccess) {
        this.logger.log(`✅ Ultra-compact global access granted for ${user.ut}: ${user.s}`);
        return true;
      }

      // Ultra-compact format doesn't require organization membership for non-global users
      // All ultra-compact tokens are considered valid if properly structured
      this.logger.log(`✅ Ultra-compact token validation passed for ${user.ut}: ${user.s}`);
      return true;
    }

    // LEGACY FORMAT CHECK (Priority 2) - Backward compatibility
    // Check if user is ORGANIZATION_MANAGER (has global access to all organizations)
    if (user.userType && GLOBAL_ACCESS_ROLES.includes(user.userType as UserType)) {
      this.logger.log(`✅ Legacy global access granted for ${user.userType}: ${user.email || user.sub}`);
      return true; // ORGANIZATION_MANAGER can access all APIs
    }

    // Check if user has at least one verified organization membership using compact format
    if (!user.orgAccess || user.orgAccess.length === 0) {
      if (!user.isGlobalAdmin) {
        throw new UnauthorizedException(
          'Access denied: User must be a member of at least one organization, be a global admin, or have ORGANIZATION_MANAGER role'
        );
      }
    }

    // All entries in orgAccess are already verified (only verified memberships are included)
    this.logger.log(`✅ Legacy token validation passed for user: ${user.email || user.sub}`);
    return true;
  }
}
