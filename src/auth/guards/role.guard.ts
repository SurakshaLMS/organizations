import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationRole } from '../decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationId = request.params.organizationId || request.params.id || request.body.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization ID is required');
    }

    // Check if user has required role in the organization
    const organizationUser = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.userId,
        },
      },
    });

    if (!organizationUser) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    if (!organizationUser.isVerified) {
      throw new ForbiddenException('User is not verified in this organization');
    }

    return requiredRoles.includes(organizationUser.role as OrganizationRole);
  }
}
