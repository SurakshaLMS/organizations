import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { EnhancedJwtPayload } from '../organization-access.service';

@Injectable()
export class UserVerificationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: EnhancedJwtPayload = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if user has at least one verified organization membership using compact format
    if (!user.orgAccess || user.orgAccess.length === 0) {
      if (!user.isGlobalAdmin) {
        throw new UnauthorizedException(
          'Access denied: User must be a member of at least one organization or be a global admin'
        );
      }
    }

    // All entries in orgAccess are already verified (only verified memberships are included)
    return true;
  }
}
