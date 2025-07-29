import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateOrganizationDto, UpdateOrganizationDto, EnrollUserDto, VerifyUserDto, AssignInstituteDto } from './dto/organization.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { convertToBigInt, convertToString } from '../auth/organization-access.service';

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}

  /**
   * Simple conversion from string to BigInt for MySQL auto-increment IDs
   * @param id - Numeric string ID
   * @returns BigInt for database operations
   */
  private toBigInt(id: string): bigint {
    return BigInt(id);
  }

  /**
   * Get organization names by IDs for compact JWT token operations
   * Used for search functionality when working with compact format
   */
  async getOrganizationNamesByIds(organizationIds: string[], searchTerm?: string) {
    const orgBigIntIds = organizationIds.map(id => convertToBigInt(id));
    
    const whereClause: any = {
      organizationId: {
        in: orgBigIntIds,
      },
    };

    // Add search filter if provided
    if (searchTerm) {
      whereClause.OR = [
        {
          name: {
            contains: searchTerm,
          },
        },
        {
          type: {
            contains: searchTerm,
          },
        },
      ];
    }

    return this.prisma.organization.findMany({
      where: whereClause,
      select: {
        organizationId: true,
        name: true,
        type: true,
      },
    });
  }

  /**
   * Create a new organization
   */
  async createOrganization(createOrganizationDto: CreateOrganizationDto, creatorUserId: string) {
    const { name, type, isPublic, shouldVerifyEnrollment, enrollmentKey, instituteId } = createOrganizationDto;

    // Validate enrollment key requirement
    if (!isPublic && !enrollmentKey) {
      throw new BadRequestException('Enrollment key is required for private organizations');
    }

    // Validate institute exists if provided (using try-catch to reduce unnecessary queries)
    let instituteBigIntId: bigint | null = null;
    if (instituteId) {
      try {
        instituteBigIntId = convertToBigInt(instituteId);
        // Will throw if institute doesn't exist due to foreign key constraint
      } catch (error) {
        throw new BadRequestException('Invalid institute ID format');
      }
    }

    // Create organization with proper verification settings
    const creatorUserBigIntId = this.toBigInt(creatorUserId);
    
    const organization = await this.prisma.organization.create({
      data: {
        name,
        type,
        isPublic,
        shouldVerifyEnrollment: shouldVerifyEnrollment ?? true,
        enrollmentKey: isPublic ? null : enrollmentKey,
        instituteId: instituteBigIntId,
        organizationUsers: {
          create: {
            userId: creatorUserBigIntId,
            role: 'PRESIDENT',
            isVerified: true, // Creator is always verified
          },
        },
      },
      select: {
        organizationId: true,
        name: true,
        type: true,
        isPublic: true,
        shouldVerifyEnrollment: true,
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
      const userBigIntId = this.toBigInt(userId);
      // Get user's organizations and public organizations
      where.OR = [
        { isPublic: true },
        {
          organizationUsers: {
            some: {
              userId: userBigIntId,
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
   * Get organizations that a specific user is enrolled in
   * Returns only organizations where user is a verified member
   * Optimized query with minimal data and no sensitive information
   */
  async getUserEnrolledOrganizations(userId: string, paginationDto?: PaginationDto): Promise<PaginatedResponse<any>> {
    const pagination = paginationDto || new PaginationDto();

    // Convert user ID to BigInt for database operations
    const userBigIntId = this.toBigInt(userId);

    // Build where clause for user's enrolled organizations only
    const where: any = {
      organizationUsers: {
        some: {
          userId: userBigIntId,
          isVerified: true, // Only verified memberships
        },
      },
    };

    // Add search functionality
    if (pagination.search) {
      where.name = {
        contains: pagination.search,
        // Note: MySQL doesn't support mode: 'insensitive', but LIKE is case-insensitive by default
      };
    }

    // Build order by
    const orderBy: any = {};
    if (pagination.sortBy === 'memberCount') {
      orderBy.organizationUsers = {
        _count: pagination.sortOrder,
      };
    } else if (pagination.sortBy === 'role') {
      // Custom sorting by user's role in the organization
      orderBy.organizationUsers = {
        _count: pagination.sortOrder,
      };
    } else {
      orderBy[pagination.sortBy || 'createdAt'] = pagination.sortOrder;
    }

    // Get total count
    const total = await this.prisma.organization.count({ where });

    // Get paginated data with user's role information
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
        // Include user's role and status in this organization
        organizationUsers: {
          where: {
            userId: userBigIntId,
            isVerified: true,
          },
          select: {
            role: true,
            isVerified: true,
            createdAt: true, // When user joined the organization
          },
        },
        // Include basic stats (optional)
        _count: {
          select: {
            organizationUsers: {
              where: {
                isVerified: true,
              },
            },
            causes: true,
          },
        },
        // Exclude: enrollmentKey, createdAt, updatedAt (sensitive/unnecessary data)
      },
    });

    // Transform data to flatten user role information
    const transformedOrganizations = organizations.map(org => ({
      organizationId: org.organizationId.toString(),
      name: org.name,
      type: org.type,
      isPublic: org.isPublic,
      instituteId: org.instituteId ? org.instituteId.toString() : null,
      userRole: (org as any).organizationUsers[0]?.role || 'MEMBER',
      isVerified: (org as any).organizationUsers[0]?.isVerified || false,
      joinedAt: (org as any).organizationUsers[0]?.createdAt ? new Date((org as any).organizationUsers[0].createdAt).toISOString() : null,
      memberCount: (org as any)._count.organizationUsers,
      causeCount: (org as any)._count.causes,
    }));

    return createPaginatedResponse(transformedOrganizations, total, pagination);
  }

  /**
   * Get organization by ID with optimized access control
   */
  async getOrganizationById(organizationId: string, userId?: string) {
    const orgBigIntId = convertToBigInt(organizationId);
    
    // Single query to get organization with user membership (if applicable)
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
      include: {
        organizationUsers: userId ? {
          where: { userId: this.toBigInt(userId) },
          select: { userId: true, role: true, isVerified: true },
        } : false,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check access for private organizations
    if (!organization.isPublic) {
      if (!userId) {
        throw new ForbiddenException('Access denied to this organization');
      }
      
      const userMembership = (organization as any).organizationUsers?.[0];
      if (!userMembership) {
        throw new ForbiddenException('Access denied to this organization');
      }
    }

    // Return clean organization data
    return {
      organizationId: organization.organizationId,
      name: organization.name,
      type: organization.type,
      isPublic: organization.isPublic,
      shouldVerifyEnrollment: organization.shouldVerifyEnrollment,
      instituteId: organization.instituteId,
    };
  }

  /**
   * Update organization
   */
  async updateOrganization(organizationId: string, updateOrganizationDto: UpdateOrganizationDto, userId: string) {
    const { name, isPublic, shouldVerifyEnrollment, enrollmentKey, instituteId } = updateOrganizationDto;

    // Check if user has admin/president role
    await this.checkUserRole(organizationId, userId, ['ADMIN', 'PRESIDENT']);

    // Validate enrollment key requirement
    if (isPublic === false && !enrollmentKey) {
      throw new BadRequestException('Enrollment key is required for private organizations');
    }

    // Validate institute exists if provided (use foreign key constraint instead of extra query)
    let instituteBigIntId: bigint | null = null;
    if (instituteId !== undefined) {
      if (instituteId) {
        try {
          instituteBigIntId = convertToBigInt(instituteId);
        } catch (error) {
          throw new BadRequestException('Invalid institute ID format');
        }
      }
    }

    const orgBigIntId = convertToBigInt(organizationId);
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
      updateData.enrollmentKey = isPublic ? null : enrollmentKey;
    }
    if (shouldVerifyEnrollment !== undefined) updateData.shouldVerifyEnrollment = shouldVerifyEnrollment;
    if (instituteId !== undefined) updateData.instituteId = instituteBigIntId;

    return this.prisma.organization.update({
      where: { organizationId: orgBigIntId },
      data: updateData,
      select: {
        organizationId: true,
        name: true,
        type: true,
        isPublic: true,
        shouldVerifyEnrollment: true,
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

    const orgBigIntId = convertToBigInt(organizationId);
    return this.prisma.organization.delete({
      where: { organizationId: orgBigIntId },
    });
  }

  /**
   * Trigger token refresh for user when organization membership changes
   */
  private async triggerTokenRefresh(userId: string): Promise<void> {
    try {
      // Refresh user's token with updated organization access
      await this.authService.refreshUserToken(userId);
    } catch (error) {
      // Log error but don't fail the main operation
      console.warn(`Failed to refresh token for user ${userId}:`, error.message);
    }
  }

  /**
   * Enroll user in organization with enhanced access control
   */
  async enrollUser(enrollUserDto: EnrollUserDto, userId: string) {
    const { organizationId, enrollmentKey } = enrollUserDto;
    const orgBigIntId = convertToBigInt(organizationId);
    const userBigIntId = this.toBigInt(userId);

    // Get organization with institute information (single query)
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
      include: {
        institute: {
          select: {
            instituteId: true,
            name: true,
          },
        },
        organizationUsers: {
          where: { userId: userBigIntId },
          select: { userId: true },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is already enrolled
    if (organization.organizationUsers.length > 0) {
      throw new BadRequestException('User is already enrolled in this organization');
    }

    // ACCESS CONTROL LOGIC
    
    // 1. PUBLIC ORGANIZATIONS - Anyone can enroll
    if (organization.isPublic) {
      const shouldAutoVerify = !organization.shouldVerifyEnrollment;
      
      const enrollment = await this.prisma.organizationUser.create({
        data: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
          role: 'MEMBER',
          isVerified: shouldAutoVerify,
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
              shouldVerifyEnrollment: true,
            },
          },
        },
      });

      // Trigger token refresh for the user
      await this.triggerTokenRefresh(userId);

      return {
        ...enrollment,
        message: shouldAutoVerify 
          ? 'Successfully enrolled and verified in public organization'
          : 'Successfully enrolled in public organization. Awaiting admin verification.',
      };
    }

    // 2. PRIVATE INSTITUTE ORGANIZATIONS - Must be enrolled in institute first
    if (organization.type === 'INSTITUTE' && organization.instituteId) {
      // Check if user is enrolled in the institute
      const instituteEnrollment = await this.prisma.instituteUser.findFirst({
        where: {
          instituteId: organization.instituteId,
          userId: userBigIntId,
          isActive: true,
        },
      });

      if (!instituteEnrollment) {
        throw new ForbiddenException(
          `You must be enrolled in ${organization.institute?.name || 'the institute'} before joining this organization`
        );
      }
    }

    // 3. PRIVATE ORGANIZATIONS - Validate enrollment key
    if (!enrollmentKey || enrollmentKey !== organization.enrollmentKey) {
      throw new BadRequestException('Invalid enrollment key');
    }

    // Create enrollment for private organization
    const shouldAutoVerify = !organization.shouldVerifyEnrollment;
    
    const enrollment = await this.prisma.organizationUser.create({
      data: {
        organizationId: orgBigIntId,
        userId: userBigIntId,
        role: 'MEMBER',
        isVerified: shouldAutoVerify,
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
            shouldVerifyEnrollment: true,
          },
        },
      },
    });

    // Trigger token refresh for the user
    await this.triggerTokenRefresh(userId);

    return {
      ...enrollment,
      message: shouldAutoVerify 
        ? 'Successfully enrolled and verified in organization'
        : 'Successfully enrolled in organization. Awaiting admin verification.',
    };
  }

  /**
   * Verify user in organization
   */
  async verifyUser(organizationId: string, verifyUserDto: VerifyUserDto, verifierUserId: string) {
    const { userId, isVerified } = verifyUserDto;

    // Check if verifier has admin/president role
    await this.checkUserRole(organizationId, verifierUserId, ['ADMIN', 'PRESIDENT']);

    // Check if user exists in organization
    const orgBigIntId = convertToBigInt(organizationId);
    const userBigIntId = this.toBigInt(userId);
    const organizationUser = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
        },
      },
    });

    if (!organizationUser) {
      throw new NotFoundException('User not found in organization');
    }

    return this.prisma.organizationUser.update({
      where: {
        organizationId_userId: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
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
    const orgBigIntId = convertToBigInt(organizationId);
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
      select: { organizationId: true, isPublic: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const where: any = { organizationId: orgBigIntId };

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
    const orgBigIntId = convertToBigInt(organizationId);
    
    // Validate organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
      select: { organizationId: true, isPublic: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const where: any = { organizationId: orgBigIntId };

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
    const orgBigIntId = this.toBigInt(organizationId);
    const userBigIntId = this.toBigInt(userId);
    
    const organizationUser = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
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
          organizationId: orgBigIntId,
          userId: userBigIntId,
        },
      },
    });
  }

  /**
   * Helper: Check if user has required role in organization
   */
  private async checkUserRole(organizationId: string, userId: string, requiredRoles: string[]) {
    const orgBigIntId = convertToBigInt(organizationId);
    const userBigIntId = this.toBigInt(userId);
    
    const organizationUser = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
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
    const orgBigIntId = convertToBigInt(organizationId);
    const userBigIntId = this.toBigInt(userId);
    
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
      include: {
        organizationUsers: {
          where: { userId: userBigIntId },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!organization.isPublic && (organization as any).organizationUsers.length === 0) {
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
    const instituteBigIntId = convertToBigInt(instituteId);
    const orgBigIntId = convertToBigInt(organizationId);

    // Validate institute exists
    const institute = await this.prisma.institute.findUnique({
      where: { instituteId: instituteBigIntId },
    });

    if (!institute) {
      throw new NotFoundException('Institute not found');
    }

    // Update organization with institute assignment
    const updatedOrganization = await this.prisma.organization.update({
      where: { organizationId: orgBigIntId },
      data: { instituteId: instituteBigIntId },
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

    const orgBigIntId = convertToBigInt(organizationId);

    // Check if organization is currently assigned to an institute
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
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
      where: { organizationId: orgBigIntId },
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
    const instituteBigIntId = convertToBigInt(instituteId);
    
    // Validate institute exists
    const institute = await this.prisma.institute.findUnique({
      where: { instituteId: instituteBigIntId },
    });

    if (!institute) {
      throw new NotFoundException('Institute not found');
    }

    const where: any = { instituteId: instituteBigIntId };

    if (userId) {
      // Get organizations where user has access (member or public)
      const userBigIntId = this.toBigInt(userId);
      where.OR = [
        { isPublic: true },
        {
          organizationUsers: {
            some: { userId: userBigIntId },
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
