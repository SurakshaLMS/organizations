import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, UpdateOrganizationDto, EnrollUserDto, VerifyUserDto, AssignInstituteDto } from './dto/organization.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new organization
   */
  async createOrganization(createOrganizationDto: CreateOrganizationDto, creatorUserId: string) {
    const { name, type, isPublic, enrollmentKey, instituteId } = createOrganizationDto;

    // Validate enrollment key requirement
    if (!isPublic && !enrollmentKey) {
      throw new BadRequestException('Enrollment key is required for private organizations');
    }

    // Note: Enrollment keys are no longer unique, multiple organizations can use the same key

    // Validate institute exists if provided
    if (instituteId) {
      const institute = await this.prisma.institute.findUnique({
        where: { instituteId },
      });
      if (!institute) {
        throw new BadRequestException('Institute not found');
      }
    }

    // Create organization
    const organization = await this.prisma.organization.create({
      data: {
        name,
        type,
        isPublic,
        enrollmentKey: isPublic ? null : enrollmentKey,
        instituteId,
        organizationUsers: {
          create: {
            userId: creatorUserId,
            role: 'PRESIDENT',
            isVerified: true,
          },
        },
      },
      select: {
        organizationId: true,
        name: true,
        type: true,
        isPublic: true,
        instituteId: true,
        // Exclude: enrollmentKey, createdAt, updatedAt
      },
    });

    return organization;
  }

  /**
   * Get all organizations with pagination (public ones or user's organizations)
   */
  async getOrganizations(userId?: string, paginationDto?: PaginationDto): Promise<PaginatedResponse<any>> {
    const pagination = paginationDto || new PaginationDto();
    
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

    // Add search functionality
    if (pagination.search) {
      const searchCondition = {
        name: {
          contains: pagination.search,
        },
      };
      
      if (where.OR) {
        where.OR = where.OR.map((condition: any) => ({
          ...condition,
          ...searchCondition,
        }));
      } else {
        where.name = searchCondition.name;
      }
    }

    // Build order by
    const orderBy: any = {};
    if (pagination.sortBy === 'memberCount') {
      // For member count, we need to sort by the count of organization users
      orderBy.organizationUsers = {
        _count: pagination.sortOrder,
      };
    } else if (pagination.sortBy === 'causeCount') {
      orderBy.causes = {
        _count: pagination.sortOrder,
      };
    } else {
      orderBy[pagination.sortBy || 'createdAt'] = pagination.sortOrder;
    }

    // Get total count
    const total = await this.prisma.organization.count({ where });

    // Get paginated data
    const organizations = await this.prisma.organization.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.limitNumber,
      select: {
        organizationId: true,
        name: true,
        type: true,
        isPublic: true,
        instituteId: true,
        // Exclude: enrollmentKey, createdAt, updatedAt
      },
    });

    return createPaginatedResponse(organizations, total, pagination);
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(organizationId: string, userId?: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
      select: {
        organizationId: true,
        name: true,
        type: true,
        isPublic: true,
        instituteId: true,
        // Exclude: enrollmentKey, createdAt, updatedAt, and related data
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user has access to this organization (if it's private)
    if (!organization.isPublic && userId) {
      const userInOrg = await this.prisma.organizationUser.findFirst({
        where: {
          organizationId,
          userId,
        },
      });
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
    const { name, isPublic, enrollmentKey, instituteId } = updateOrganizationDto;

    // Check if user has admin/president role
    await this.checkUserRole(organizationId, userId, ['ADMIN', 'PRESIDENT']);

    // Validate enrollment key requirement
    if (isPublic === false && !enrollmentKey) {
      throw new BadRequestException('Enrollment key is required for private organizations');
    }

    // Note: Enrollment keys are no longer unique, multiple organizations can use the same key

    // Validate institute exists if provided
    if (instituteId !== undefined) {
      if (instituteId) {
        const institute = await this.prisma.institute.findUnique({
          where: { instituteId },
        });
        if (!institute) {
          throw new BadRequestException('Institute not found');
        }
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
      updateData.enrollmentKey = isPublic ? null : enrollmentKey;
    }
    if (instituteId !== undefined) updateData.instituteId = instituteId;

    return this.prisma.organization.update({
      where: { organizationId },
      data: updateData,
      select: {
        organizationId: true,
        name: true,
        type: true,
        isPublic: true,
        instituteId: true,
        // Exclude: enrollmentKey, createdAt, updatedAt
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
  async getOrganizationMembers(organizationId: string, paginationDto: PaginationDto) {
    // Validate organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
      select: { organizationId: true, isPublic: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const where: any = { organizationId };

    // Add search functionality
    if (paginationDto.search) {
      where.user = {
        OR: [
          {
            name: {
              contains: paginationDto.search,
            },
          },
          {
            email: {
              contains: paginationDto.search,
            },
          },
        ],
      };
    }

    // Build order by
    const orderBy: any = {};
    if (paginationDto.sortBy === 'userName') {
      orderBy.user = { name: paginationDto.sortOrder };
    } else if (paginationDto.sortBy === 'userEmail') {
      orderBy.user = { email: paginationDto.sortOrder };
    } else {
      orderBy[paginationDto.sortBy || 'role'] = paginationDto.sortOrder;
    }

    // Get total count
    const total = await this.prisma.organizationUser.count({ where });

    // Get paginated data
    const members = await this.prisma.organizationUser.findMany({
      where,
      orderBy,
      skip: paginationDto.skip,
      take: paginationDto.limitNumber,
      select: {
        userId: true,
        organizationId: true,
        role: true,
        isVerified: true,
        // Exclude: createdAt, updatedAt
      },
    });

    return createPaginatedResponse(members, total, paginationDto);
  }

  /**
   * Get organization causes with pagination
   */
  async getOrganizationCauses(organizationId: string, paginationDto: PaginationDto) {
    // Validate organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
      select: { organizationId: true, isPublic: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const where: any = { organizationId };

    // Add search functionality
    if (paginationDto.search) {
      where.OR = [
        {
          title: {
            contains: paginationDto.search,
          },
        },
        {
          description: {
            contains: paginationDto.search,
          },
        },
      ];
    }

    // Build order by
    const orderBy: any = {};
    orderBy[paginationDto.sortBy || 'title'] = paginationDto.sortOrder;

    // Get total count
    const total = await this.prisma.cause.count({ where });

    // Get paginated data
    const causes = await this.prisma.cause.findMany({
      where,
      orderBy,
      skip: paginationDto.skip,
      take: paginationDto.limitNumber,
      select: {
        causeId: true,
        title: true,
        description: true,
        isPublic: true,
        organizationId: true,
        // Exclude: createdAt, updatedAt
      },
    });

    return createPaginatedResponse(causes, total, paginationDto);
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

  /**
   * Assign organization to institute
   */
  async assignToInstitute(organizationId: string, assignInstituteDto: AssignInstituteDto, userId: string) {
    // Check if user has permission (Admin or President)
    await this.checkUserRole(organizationId, userId, ['ADMIN', 'PRESIDENT']);

    const { instituteId } = assignInstituteDto;

    // Validate institute exists
    const institute = await this.prisma.institute.findUnique({
      where: { instituteId },
    });

    if (!institute) {
      throw new NotFoundException('Institute not found');
    }

    // Update organization with institute assignment
    const updatedOrganization = await this.prisma.organization.update({
      where: { organizationId },
      data: { instituteId },
      include: {
        institute: {
          select: {
            instituteId: true,
            name: true,
            imageUrl: true,
          },
        },
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

    return {
      message: 'Organization successfully assigned to institute',
      organization: updatedOrganization,
    };
  }

  /**
   * Remove organization from institute
   */
  async removeFromInstitute(organizationId: string, userId: string) {
    // Check if user has permission (Admin or President)
    await this.checkUserRole(organizationId, userId, ['ADMIN', 'PRESIDENT']);

    // Check if organization is currently assigned to an institute
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
      include: { institute: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!organization.instituteId) {
      throw new BadRequestException('Organization is not assigned to any institute');
    }

    // Remove institute assignment
    const updatedOrganization = await this.prisma.organization.update({
      where: { organizationId },
      data: { instituteId: null },
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

    return {
      message: 'Organization successfully removed from institute',
      organization: updatedOrganization,
    };
  }

  /**
   * Get organizations by institute
   */
  async getOrganizationsByInstitute(instituteId: string, userId?: string, paginationDto?: PaginationDto): Promise<PaginatedResponse<any> & { institute: any }> {
    const pagination = paginationDto || new PaginationDto();
    
    // Validate institute exists
    const institute = await this.prisma.institute.findUnique({
      where: { instituteId },
    });

    if (!institute) {
      throw new NotFoundException('Institute not found');
    }

    const where: any = { instituteId };

    if (userId) {
      // Get organizations where user has access (member or public)
      where.OR = [
        { isPublic: true },
        {
          organizationUsers: {
            some: { userId },
          },
        },
      ];
    } else {
      // Only public organizations for non-authenticated users
      where.isPublic = true;
    }

    // Add search functionality
    if (pagination.search) {
      const searchCondition = {
        name: {
          contains: pagination.search,
        },
      };
      
      if (where.OR) {
        where.OR = where.OR.map((condition: any) => ({
          ...condition,
          ...searchCondition,
        }));
      } else {
        where.name = searchCondition.name;
      }
    }

    // Build order by
    const orderBy: any = {};
    if (pagination.sortBy === 'memberCount') {
      orderBy.organizationUsers = {
        _count: pagination.sortOrder,
      };
    } else if (pagination.sortBy === 'causeCount') {
      orderBy.causes = {
        _count: pagination.sortOrder,
      };
    } else {
      orderBy[pagination.sortBy || 'createdAt'] = pagination.sortOrder;
    }

    // Get total count
    const total = await this.prisma.organization.count({ where });

    // Get paginated data
    const organizations = await this.prisma.organization.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.limitNumber,
      include: {
        institute: {
          select: {
            instituteId: true,
            name: true,
            imageUrl: true,
          },
        },
        organizationUsers: {
          select: {
            role: true,
            isVerified: true,
            user: {
              select: {
                userId: true,
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

    const formattedOrgs = organizations.map(org => ({
      organizationId: org.organizationId,
      name: org.name,
      type: org.type,
      isPublic: org.isPublic,
      memberCount: org._count.organizationUsers,
      causeCount: org._count.causes,
      createdAt: org.createdAt,
      institute: org.institute,
    }));

    const paginatedResponse = createPaginatedResponse(formattedOrgs, total, pagination);

    return {
      ...paginatedResponse,
      institute: {
        instituteId: institute.instituteId,
        name: institute.name,
        imageUrl: institute.imageUrl,
      },
    };
  }

  /**
   * Get available institutes for organization assignment with pagination
   */
  async getAvailableInstitutes(paginationDto?: PaginationDto): Promise<PaginatedResponse<any>> {
    const pagination = paginationDto || new PaginationDto();
    
    const where: any = {};

    // Add search functionality
    if (pagination.search) {
      where.name = {
        contains: pagination.search,
      };
    }

    // Build order by
    const orderBy: any = {};
    if (pagination.sortBy === 'organizationCount') {
      orderBy.organizations = {
        _count: pagination.sortOrder,
      };
    } else {
      orderBy[pagination.sortBy || 'name'] = pagination.sortOrder || 'asc';
    }

    // Get total count
    const total = await this.prisma.institute.count({ where });

    // Get paginated data
    const institutes = await this.prisma.institute.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.limitNumber,
      select: {
        instituteId: true,
        name: true,
        imageUrl: true,
        _count: {
          select: {
            organizations: true,
          },
        },
      },
    });

    const formattedInstitutes = institutes.map(institute => ({
      instituteId: institute.instituteId,
      name: institute.name,
      imageUrl: institute.imageUrl,
      organizationCount: institute._count.organizations,
    }));

    return createPaginatedResponse(formattedInstitutes, total, pagination);
  }
}
