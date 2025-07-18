import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, UpdateOrganizationDto, EnrollUserDto, VerifyUserDto } from './dto/organization.dto';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new organization
   */
  async createOrganization(createOrganizationDto: CreateOrganizationDto, creatorUserId: string) {
    const { name, type, isPublic, enrollmentKey } = createOrganizationDto;

    // Validate enrollment key requirement
    if (!isPublic && !enrollmentKey) {
      throw new BadRequestException('Enrollment key is required for private organizations');
    }

    // Check if enrollment key is unique (if provided)
    if (enrollmentKey) {
      const existingOrg = await this.prisma.organization.findUnique({
        where: { enrollmentKey },
      });
      if (existingOrg) {
        throw new BadRequestException('Enrollment key already exists');
      }
    }

    // Create organization
    const organization = await this.prisma.organization.create({
      data: {
        name,
        type,
        isPublic,
        enrollmentKey: isPublic ? null : enrollmentKey,
        organizationUsers: {
          create: {
            userId: creatorUserId,
            role: 'PRESIDENT',
            isVerified: true,
          },
        },
      },
      include: {
        organizationUsers: {
          include: {
            user: {
              select: {
                userId: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return organization;
  }

  /**
   * Get all organizations (public ones or user's organizations)
   */
  async getOrganizations(userId?: string) {
    const where: any = {};

    if (userId) {
      // Get user's organizations and public organizations
      where.OR = [
        { isPublic: true },
        {
          organizationUsers: {
            some: {
              userId,
            },
          },
        },
      ];
    } else {
      // Only public organizations for unauthenticated users
      where.isPublic = true;
    }

    return this.prisma.organization.findMany({
      where,
      include: {
        organizationUsers: {
          include: {
            user: {
              select: {
                userId: true,
                email: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            organizationUsers: true,
            causes: true,
          },
        },
      },
    });
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(organizationId: string, userId?: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
      include: {
        organizationUsers: {
          include: {
            user: {
              select: {
                userId: true,
                email: true,
                name: true,
              },
            },
          },
        },
        causes: {
          where: userId ? {
            OR: [
              { isPublic: true },
              {
                organization: {
                  organizationUsers: {
                    some: {
                      userId,
                    },
                  },
                },
              },
            ],
          } : { isPublic: true },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user has access to this organization
    if (!organization.isPublic && userId) {
      const userInOrg = organization.organizationUsers.find(ou => ou.userId === userId);
      if (!userInOrg) {
        throw new ForbiddenException('Access denied to this organization');
      }
    } else if (!organization.isPublic && !userId) {
      throw new ForbiddenException('Access denied to this organization');
    }

    return organization;
  }

  /**
   * Update organization
   */
  async updateOrganization(organizationId: string, updateOrganizationDto: UpdateOrganizationDto, userId: string) {
    const { name, isPublic, enrollmentKey } = updateOrganizationDto;

    // Check if user has admin/president role
    await this.checkUserRole(organizationId, userId, ['ADMIN', 'PRESIDENT']);

    // Validate enrollment key requirement
    if (isPublic === false && !enrollmentKey) {
      throw new BadRequestException('Enrollment key is required for private organizations');
    }

    // Check if enrollment key is unique (if provided and different)
    if (enrollmentKey) {
      const existingOrg = await this.prisma.organization.findFirst({
        where: {
          enrollmentKey,
          NOT: { organizationId },
        },
      });
      if (existingOrg) {
        throw new BadRequestException('Enrollment key already exists');
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
      updateData.enrollmentKey = isPublic ? null : enrollmentKey;
    }

    return this.prisma.organization.update({
      where: { organizationId },
      data: updateData,
      include: {
        organizationUsers: {
          include: {
            user: {
              select: {
                userId: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Delete organization
   */
  async deleteOrganization(organizationId: string, userId: string) {
    // Check if user has president role
    await this.checkUserRole(organizationId, userId, ['PRESIDENT']);

    return this.prisma.organization.delete({
      where: { organizationId },
    });
  }

  /**
   * Enroll user in organization
   */
  async enrollUser(enrollUserDto: EnrollUserDto, userId: string) {
    const { organizationId, enrollmentKey } = enrollUserDto;

    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is already enrolled
    const existingEnrollment = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('User is already enrolled in this organization');
    }

    // Validate enrollment key for private organizations
    if (!organization.isPublic) {
      if (!enrollmentKey || enrollmentKey !== organization.enrollmentKey) {
        throw new BadRequestException('Invalid enrollment key');
      }
    }

    // Enroll user
    return this.prisma.organizationUser.create({
      data: {
        organizationId,
        userId,
        role: 'MEMBER',
        isVerified: organization.isPublic, // Auto-verify for public organizations
      },
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            name: true,
          },
        },
        organization: {
          select: {
            organizationId: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  /**
   * Verify user in organization
   */
  async verifyUser(organizationId: string, verifyUserDto: VerifyUserDto, verifierUserId: string) {
    const { userId, isVerified } = verifyUserDto;

    // Check if verifier has admin/president role
    await this.checkUserRole(organizationId, verifierUserId, ['ADMIN', 'PRESIDENT']);

    // Check if user exists in organization
    const organizationUser = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!organizationUser) {
      throw new NotFoundException('User not found in organization');
    }

    return this.prisma.organizationUser.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      data: { isVerified },
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string, userId: string) {
    // Check if user has access to this organization
    await this.checkUserAccess(organizationId, userId);

    return this.prisma.organizationUser.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Leave organization
   */
  async leaveOrganization(organizationId: string, userId: string) {
    const organizationUser = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!organizationUser) {
      throw new NotFoundException('User not found in organization');
    }

    if (organizationUser.role === 'PRESIDENT') {
      throw new BadRequestException('President cannot leave organization. Transfer role first.');
    }

    return this.prisma.organizationUser.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
  }

  /**
   * Helper: Check if user has required role in organization
   */
  private async checkUserRole(organizationId: string, userId: string, requiredRoles: string[]) {
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
  private async checkUserAccess(organizationId: string, userId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
      include: {
        organizationUsers: {
          where: { userId },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!organization.isPublic && organization.organizationUsers.length === 0) {
      throw new ForbiddenException('Access denied to this organization');
    }
  }
}
