import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { EnhancedJwtPayload } from '../organization-access.service';
import { OrganizationRole } from '@prisma/client';
import { UltraCompactAccessValidationService } from '../services/ultra-compact-access-validation.service';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private ultraCompactAccessValidation: UltraCompactAccessValidationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<OrganizationRole[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: EnhancedJwtPayload }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    this.logger.log(`✅ Access granted for user ${user.email}`);
    return true;
  }
}