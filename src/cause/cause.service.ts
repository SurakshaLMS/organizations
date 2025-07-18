import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCauseDto, UpdateCauseDto } from './dto/cause.dto';

@Injectable()
export class CauseService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new cause
   */
  async createCause(createCauseDto: CreateCauseDto, userId: string) {
    const { organizationId, title, description, isPublic } = createCauseDto;

    // Check if user has permission to create causes in this organization
    await this.checkUserAccess(organizationId, userId, ['ADMIN', 'PRESIDENT', 'MODERATOR']);

    return this.prisma.cause.create({
      data: {
        organizationId,
        title,
        description,
        isPublic,
      },
      include: {
        organization: {
          select: {
            organizationId: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: {
            lectures: true,
            assignments: true,
          },
        },
      },
    });
  }

  /**
   * Get all causes (public or user's organization causes)
   */
  async getCauses(userId?: string) {
    const where: any = {};

    if (userId) {
      // Get causes from user's organizations and public causes
      where.OR = [
        { isPublic: true },
        {
          organization: {
            organizationUsers: {
              some: {
                userId,
                isVerified: true,
              },
            },
          },
        },
      ];
    } else {
      // Only public causes for unauthenticated users
      where.isPublic = true;
    }

    return this.prisma.cause.findMany({
      where,
      include: {
        organization: {
          select: {
            organizationId: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: {
            lectures: true,
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get cause by ID
   */
  async getCauseById(causeId: string, userId?: string) {
    const cause = await this.prisma.cause.findUnique({
      where: { causeId },
      include: {
        organization: {
          select: {
            organizationId: true,
            name: true,
            type: true,
            isPublic: true,
          },
        },
        lectures: {
          where: userId ? {
            OR: [
              { isPublic: true },
              {
                cause: {
                  organization: {
                    organizationUsers: {
                      some: {
                        userId,
                        isVerified: true,
                      },
                    },
                  },
                },
              },
            ],
          } : { isPublic: true },
          orderBy: { createdAt: 'asc' },
        },
        assignments: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!cause) {
      throw new NotFoundException('Cause not found');
    }

    // Check if user has access to this cause
    if (!cause.isPublic && userId) {
      const hasAccess = await this.checkUserHasAccess(cause.organizationId, userId);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this cause');
      }
    } else if (!cause.isPublic && !userId) {
      throw new ForbiddenException('Access denied to this cause');
    }

    return cause;
  }

  /**
   * Update cause
   */
  async updateCause(causeId: string, updateCauseDto: UpdateCauseDto, userId: string) {
    const cause = await this.prisma.cause.findUnique({
      where: { causeId },
      select: { organizationId: true },
    });

    if (!cause) {
      throw new NotFoundException('Cause not found');
    }

    // Check if user has permission to update this cause
    await this.checkUserAccess(cause.organizationId, userId, ['ADMIN', 'PRESIDENT', 'MODERATOR']);

    return this.prisma.cause.update({
      where: { causeId },
      data: updateCauseDto,
      include: {
        organization: {
          select: {
            organizationId: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: {
            lectures: true,
            assignments: true,
          },
        },
      },
    });
  }

  /**
   * Delete cause
   */
  async deleteCause(causeId: string, userId: string) {
    const cause = await this.prisma.cause.findUnique({
      where: { causeId },
      select: { organizationId: true },
    });

    if (!cause) {
      throw new NotFoundException('Cause not found');
    }

    // Check if user has permission to delete this cause
    await this.checkUserAccess(cause.organizationId, userId, ['ADMIN', 'PRESIDENT']);

    return this.prisma.cause.delete({
      where: { causeId },
    });
  }

  /**
   * Get causes by organization
   */
  async getCausesByOrganization(organizationId: string, userId?: string) {
    // Check if user has access to this organization
    if (userId) {
      const hasAccess = await this.checkUserHasAccess(organizationId, userId);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this organization');
      }
    }

    const where: any = { organizationId };

    if (!userId) {
      // Only public causes for unauthenticated users
      where.isPublic = true;
    } else {
      // Get all causes for organization members, only public for non-members
      const userInOrg = await this.prisma.organizationUser.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
      });

      if (!userInOrg || !userInOrg.isVerified) {
        where.isPublic = true;
      }
    }

    return this.prisma.cause.findMany({
      where,
      include: {
        organization: {
          select: {
            organizationId: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: {
            lectures: true,
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Helper: Check if user has required role in organization
   */
  private async checkUserAccess(organizationId: string, userId: string, requiredRoles: string[]) {
    const organizationUser = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!organizationUser) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    if (!organizationUser.isVerified) {
      throw new ForbiddenException('User is not verified in this organization');
    }

    if (!requiredRoles.includes(organizationUser.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  /**
   * Helper: Check if user has access to organization
   */
  private async checkUserHasAccess(organizationId: string, userId: string): Promise<boolean> {
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
      include: {
        organizationUsers: {
          where: {
            userId,
            isVerified: true,
          },
        },
      },
    });

    if (!organization) {
      return false;
    }

    return organization.isPublic || organization.organizationUsers.length > 0;
  }
}
