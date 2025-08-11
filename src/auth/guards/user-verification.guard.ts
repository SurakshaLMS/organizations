import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { EnhancedJwtPayload } from '../organization-access.service';
import { UserType, GLOBAL_ACCESS_ROLES } from '../../common/enums/user-types.enum';

@Injectable()
export class UserVerificationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: EnhancedJwtPayload = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if user is ORGANIZATION_MANAGER (has global access to all organizations)
    if (user.userType && GLOBAL_ACCESS_ROLES.includes(user.userType as UserType)) {
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
    return true;
  }
}
