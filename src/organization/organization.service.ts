import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtAccessValidationService } from '../auth/jwt-access-validation.service';
import { CreateOrganizationDto, UpdateOrganizationDto, EnrollUserDto, VerifyUserDto, AssignInstituteDto } from './dto/organization.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { convertToBigInt, convertToString, EnhancedJwtPayload } from '../auth/organization-access.service';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private jwtAccessValidation: JwtAccessValidationService,
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
    const { name, type, isPublic, enrollmentKey, needEnrollmentVerification, imageUrl, instituteId } = createOrganizationDto;

    // Validate enrollment key requirement
    if (!isPublic && !enrollmentKey) {
      throw new BadRequestException('Enrollment key is required for private organizations');
    }

    // Note: Enrollment keys are no longer unique, multiple organizations can use the same key

    // Validate institute exists if provided
    if (instituteId) {
      const instituteBigIntId = convertToBigInt(instituteId);
      const institute = await this.prisma.institute.findUnique({
        where: { instituteId: instituteBigIntId },
      });
      if (!institute) {
        throw new BadRequestException('Institute not found');
      }
    }

    // Create organization first
    const creatorUserBigIntId = this.toBigInt(creatorUserId);

    // Validate that the creator user exists
    const creatorUser = await this.prisma.user.findUnique({
      where: { userId: creatorUserBigIntId },
    });

    if (!creatorUser) {
      throw new BadRequestException(`Creator user with ID ${creatorUserId} not found`);
    }

    const instituteBigIntId = instituteId ? convertToBigInt(instituteId) : null;
    
    const organization = await this.prisma.organization.create({
      data: {
        name,
        type,
        isPublic,
        enrollmentKey: enrollmentKey || null,
        needEnrollmentVerification: needEnrollmentVerification ?? true,
        imageUrl,
        instituteId: instituteBigIntId,
      },
      select: {
        organizationId: true,
        name: true,
        type: true,
        isPublic: true,
        needEnrollmentVerification: true,
        imageUrl: true,
        instituteId: true,
      },
    });

    // Create the organization user relationship separately
    await this.prisma.organizationUser.create({
      data: {
        organizationId: organization.organizationId,
        userId: creatorUserBigIntId,
        role: 'MEMBER',
        isVerified: true,
      }
    });

    // Transform to match OrganizationDto
    return {
      id: organization.organizationId.toString(),
      name: organization.name,
      type: organization.type,
      isPublic: organization.isPublic,
      needEnrollmentVerification: organization.needEnrollmentVerification,
      imageUrl: organization.imageUrl,
      instituteId: organization.instituteId ? organization.instituteId.toString() : null
    };
  }

  /**
   * Get all organizations with pagination (public ones or user's organizations)
   */
  async getOrganizations(userId?: string, paginationDto?: PaginationDto, user?: any): Promise<PaginatedResponse<any>> {
    const pagination = paginationDto || new PaginationDto();
    
    const where: any = {};

    if (userId) {
      const userBigIntId = this.toBigInt(userId);
      
      // Get user's institute IDs from JWT token for private organization filtering
      const userInstituteIds = user?.instituteIds || [];
      
      // Build comprehensive filtering logic:
      // 1. All public organizations (whole system)
      // 2. User's enrolled organizations 
      // 3. Private organizations from user's institutes
      const orConditions: any[] = [
        { isPublic: true }, // All public organizations
        {
          // User's enrolled organizations
          organizationUsers: {
            some: {
              userId: userBigIntId,
            },
          },
        }
      ];

      // Add private organizations filtering by user's institute IDs
      if (userInstituteIds.length > 0) {
        orConditions.push({
          AND: [
            { isPublic: false }, // Only private organizations
            {
              instituteId: {
                in: userInstituteIds // Filter by user's institute IDs
              }
            }
          ]
        });
      }

      where.OR = orConditions;
      
      // Log the filtering for debugging
      this.logger.log(`🏫 Filtering organizations for user ${userId} with institute IDs: [${userInstituteIds.join(', ')}]`);
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
        where.name = { contains: paginationDto?.search };
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
        needEnrollmentVerification: true,
        imageUrl: true,
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
        needEnrollmentVerification: true,
        imageUrl: true,
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
      needEnrollmentVerification: org.needEnrollmentVerification,
      imageUrl: org.imageUrl,
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
   * Get organization by ID
   */
  async getOrganizationById(organizationId: string, userId?: string) {
    const orgBigIntId = convertToBigInt(organizationId);
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
      select: {
        organizationId: true,
        name: true,
        type: true,
        isPublic: true,
        needEnrollmentVerification: true,
        imageUrl: true,
        instituteId: true,
        // Exclude: enrollmentKey, createdAt, updatedAt, and related data
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user has access to this organization (if it's private)
    if (!organization.isPublic && userId) {
      const userBigIntId = this.toBigInt(userId);
      const userInOrg = await this.prisma.organizationUser.findFirst({
        where: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
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
   * Update organization (SIMPLIFIED - no authentication required)
   */
  async updateOrganization(
    organizationId: string, 
    updateOrganizationDto: UpdateOrganizationDto, 
    user?: any
  ) {
    const { name, isPublic, enrollmentKey, needEnrollmentVerification, imageUrl, instituteId } = updateOrganizationDto;

    // Validate enrollment key requirement
    if (isPublic === false && !enrollmentKey) {
      throw new BadRequestException('Enrollment key is required for private organizations');
    }

    // Validate institute exists if provided
    if (instituteId !== undefined) {
      if (instituteId) {
        const instituteBigIntId = convertToBigInt(instituteId);
        const institute = await this.prisma.institute.findUnique({
          where: { instituteId: instituteBigIntId },
        });
        if (!institute) {
          throw new BadRequestException('Institute not found');
        }
      }
    }

    const orgBigIntId = convertToBigInt(organizationId);
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (needEnrollmentVerification !== undefined) updateData.needEnrollmentVerification = needEnrollmentVerification;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (enrollmentKey !== undefined) updateData.enrollmentKey = enrollmentKey || null;
    if (instituteId !== undefined) updateData.instituteId = instituteId ? convertToBigInt(instituteId) : null;

    this.logger.log(`📝 Organization ${organizationId} updated by user ${user?.sub || 'anonymous'}`);

    const updatedOrganization = await this.prisma.organization.update({
      where: { organizationId: orgBigIntId },
      data: updateData,
      select: {
        organizationId: true,
        name: true,
        type: true,
        isPublic: true,
        needEnrollmentVerification: true,
        imageUrl: true,
        instituteId: true,
        // Exclude: enrollmentKey, createdAt, updatedAt
      },
    });

    // Transform to match OrganizationDto
    return {
      id: updatedOrganization.organizationId.toString(),
      name: updatedOrganization.name,
      type: updatedOrganization.type,
      isPublic: updatedOrganization.isPublic,
      needEnrollmentVerification: updatedOrganization.needEnrollmentVerification,
      imageUrl: updatedOrganization.imageUrl,
      instituteId: updatedOrganization.instituteId ? updatedOrganization.instituteId.toString() : null
    };
  }

  /**
   * Delete organization (SIMPLIFIED - no authentication required)
   */
  async deleteOrganization(organizationId: string, user?: any) {
    const orgBigIntId = convertToBigInt(organizationId);

    this.logger.warn(`🗑️ Organization ${organizationId} deleted by user ${user?.sub || 'anonymous'}`);

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
   * Enroll user in organization
   */
  async enrollUser(enrollUserDto: EnrollUserDto, userId: string) {
    const { organizationId, enrollmentKey } = enrollUserDto;

    const orgBigIntId = convertToBigInt(organizationId);
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Validate enrollment key for private organizations
    if (!organization.isPublic) {
      if (!enrollmentKey || enrollmentKey !== organization.enrollmentKey) {
        throw new BadRequestException('Invalid enrollment key');
      }
    }

    // Determine if user should be auto-verified
    // Auto-verify if:
    // 1. Organization is public OR
    // 2. Organization doesn't require enrollment verification
    const shouldAutoVerify = organization.isPublic || !organization.needEnrollmentVerification;

    const userBigIntId = this.toBigInt(userId);

    try {
      // Attempt to create enrollment directly
      // If user is already enrolled, the composite primary key constraint will cause an error
      await this.prisma.organizationUser.create({
        data: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
          role: 'MEMBER',
          isVerified: shouldAutoVerify,
          verifiedBy: shouldAutoVerify ? userBigIntId : null, // Self-verified if auto-verified
          verifiedAt: shouldAutoVerify ? new Date() : null,
        },
      });

      // Trigger token refresh for the user to update organization access
      await this.triggerTokenRefresh(userId);

      // Return simplified organization details only (no sensitive data, no joins)
      return {
        organizationId: convertToString(organization.organizationId),
        name: organization.name,
        type: organization.type,
        isPublic: organization.isPublic,
        enrollmentStatus: shouldAutoVerify ? 'verified' : 'pending_verification',
        message: shouldAutoVerify 
          ? 'Successfully enrolled and verified in organization' 
          : 'Successfully enrolled in organization. Awaiting verification.'
      };
    } catch (error) {
      // Check if this is a duplicate key constraint error (user already enrolled)
      // Prisma throws P2002 for unique constraint violations or we can check the message
      if (error.code === 'P2002' || 
          (error.message && error.message.includes('Unique constraint failed')) ||
          (error.message && error.message.includes('PRIMARY'))) {
        // User is already enrolled - return a friendly message instead of technical error
        throw new BadRequestException('User is already enrolled in this organization');
      }
      
      // Re-throw any other errors
      throw error;
    }
  }

  /**
   * Verify user in organization (SIMPLIFIED - no authentication required)
   */
  async verifyUser(organizationId: string, verifyUserDto: VerifyUserDto, verifierUser?: any) {
    const { userId, isVerified } = verifyUserDto;

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

    this.logger.log(`👤 User ${userId} ${isVerified ? 'verified' : 'unverified'} in organization ${organizationId} by ${verifierUser?.sub || 'anonymous'}`);

    const verifierBigIntId = verifierUser?.sub ? this.toBigInt(verifierUser.sub) : userBigIntId;

    const result = await this.prisma.organizationUser.update({
      where: {
        organizationId_userId: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
        },
      },
      data: { 
        isVerified,
        verifiedBy: isVerified ? verifierBigIntId : null,
        verifiedAt: isVerified ? new Date() : null,
      },
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        verifier: isVerified ? {
          select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
        } : undefined,
      },
    });

    // Trigger token refresh for the verified user to update their organization access
    await this.triggerTokenRefresh(userId);

    return result;
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
    if (paginationDto?.search) {
      where.OR = [
        {
          title: {
            contains: paginationDto?.search,
          },
        },
        {
          description: {
            contains: paginationDto?.search,
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
   * SIMPLIFIED INSTITUTE ASSIGNMENT (No authentication required)
   */
  async assignToInstitute(organizationId: string, assignInstituteDto: AssignInstituteDto, user?: any) {
    try {
      // INPUT VALIDATION AND SANITIZATION
      const { instituteId } = assignInstituteDto;
      const instituteBigIntId = convertToBigInt(instituteId);
      const orgBigIntId = convertToBigInt(organizationId);

      // SINGLE ATOMIC TRANSACTION
      const result = await this.prisma.$transaction(async (tx) => {
        // Check if institute exists (minimal select)
        const institute = await tx.institute.findUnique({
          where: { instituteId: instituteBigIntId },
          select: { instituteId: true }, // Only ID needed for validation
        });

        if (!institute) {
          throw new NotFoundException(`Institute with ID ${instituteId} not found`);
        }

        // Check if organization exists and is not already assigned
        const organization = await tx.organization.findUnique({
          where: { organizationId: orgBigIntId },
          select: { 
            organizationId: true, 
            instituteId: true,
            name: true, // For audit logging only
          },
        });

        if (!organization) {
          throw new NotFoundException(`Organization with ID ${organizationId} not found`);
        }

        // Prevent duplicate assignment
        if (organization.instituteId && convertToString(organization.instituteId) === instituteId) {
          throw new BadRequestException(`Organization "${organization.name}" is already assigned to this institute`);
        }

        // Update organization with institute assignment (minimal operation)
        await tx.organization.update({
          where: { organizationId: orgBigIntId },
          data: { 
            instituteId: instituteBigIntId,
            updatedAt: new Date(), // Explicit timestamp for audit
          },
        });

        return { organizationName: organization.name };
      });

      // SECURITY AUDIT LOGGING
      this.logger.log(
        `🏢 INSTITUTE ASSIGNMENT: Organization "${result.organizationName}" (ID: ${organizationId}) ` +
        `assigned to institute ${instituteId} by user ${user?.sub || 'anonymous'} ` +
        `| Action: ASSIGN_INSTITUTE | Timestamp: ${new Date().toISOString()}`
      );

      // SUCCESS RESPONSE
      return {
        success: true,
        message: 'Organization successfully assigned to institute',
        timestamp: new Date().toISOString(),
        operation: 'ASSIGN_INSTITUTE',
        organizationId,
        instituteId,
        performedBy: {
          userId: user?.sub || 'anonymous',
        },
      };

    } catch (error) {
      // Enhanced error handling with security audit
      this.logger.error(
        `❌ INSTITUTE ASSIGNMENT FAILED: Organization ${organizationId} to institute ${assignInstituteDto.instituteId} ` +
        `by user ${user?.sub || 'anonymous'} | Error: ${error.message}`
      );

      // Re-throw known exceptions
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof ForbiddenException) {
        throw error;
      }

      // Generic error for unknown issues
      throw new BadRequestException('Failed to assign organization to institute. Please try again.');
    }
  }

  /**
   * Remove organization from institute (SIMPLIFIED - no authentication required)
   */
  async removeFromInstitute(organizationId: string, user?: any) {
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

    this.logger.log(`🏢 Organization ${organizationId} removed from institute by user ${user?.sub || 'anonymous'}`);

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
                firstName: true,
                lastName: true,
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
        where.name = { contains: paginationDto?.search };
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
            firstName: true,
            lastName: true,
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
      memberCount: org.organizationUsers?.length || 0,
      causeCount: org._count.causes,
      createdAt: org.createdAt,
      instituteId: org.instituteId,
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

  /**
   * Get organization members with roles (SIMPLIFIED - no authentication required)
   */
  async getOrganizationMembers(organizationId: string, pagination: PaginationDto, user?: any) {
    const orgBigIntId = convertToBigInt(organizationId);

    // Get total count
    const total = await this.prisma.organizationUser.count({
      where: { organizationId: orgBigIntId }
    });

    // Get paginated members
    const members = await this.prisma.organizationUser.findMany({
      where: { organizationId: orgBigIntId },
      include: {
        user: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      skip: pagination.skip,
      take: pagination.limitNumber,
      orderBy: { createdAt: 'desc' }
    });

    // Calculate role breakdown
    const roleBreakdown = await this.prisma.organizationUser.groupBy({
      by: ['role'],
      where: { organizationId: orgBigIntId },
      _count: { role: true, }
    });

    const roleCount = roleBreakdown.reduce((acc, item) => {
      acc[item.role] = item._count?.role || 0;
      return acc;
    }, {} as Record<string, number>);

    return {
      members: members.map(member => ({
        userId: member.user.userId.toString(),
        name: user.name,
        email: member.user.email,
        role: member.role,
        isVerified: member.isVerified,
        joinedAt: member.createdAt
      })),
      totalMembers: total,
      roleBreakdown: roleCount
    };
  }

  /**
   * Assign role to user in organization (SIMPLIFIED - no authentication required)
   */
  async assignUserRole(organizationId: string, assignUserRoleDto: any, user?: any) {
    const orgBigIntId = convertToBigInt(organizationId);
    const targetUserBigIntId = convertToBigInt(assignUserRoleDto.userId);

    // Prevent assigning PRESIDENT role
    if (assignUserRoleDto.role === 'PRESIDENT') {
      throw new BadRequestException('Cannot assign PRESIDENT role directly. Use transfer presidency instead.');
    }

    // Check if user is already in organization
    const existingMember = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          userId: targetUserBigIntId,
          organizationId: orgBigIntId
        }
      }
    });

    if (!existingMember) {
      throw new BadRequestException('User is not a member of this organization');
    }

    // Update role
    const updatedMember = await this.prisma.organizationUser.update({
      where: {
        organizationId_userId: {
          userId: targetUserBigIntId,
          organizationId: orgBigIntId
        }
      },
      data: { role: assignUserRoleDto.role }
    });

    return {
      message: 'User role assigned successfully',
      userId: assignUserRoleDto.userId,
      organizationId,
      role: assignUserRoleDto.role,
      assignedAt: updatedMember.updatedAt
    };
  }

  /**
   * Change user role in organization (SIMPLIFIED - no authentication required)
   */
  async changeUserRole(organizationId: string, changeUserRoleDto: any, user?: any) {
    const orgBigIntId = convertToBigInt(organizationId);
    const targetUserBigIntId = convertToBigInt(changeUserRoleDto.userId);

    // Prevent changing PRESIDENT role
    if (changeUserRoleDto.newRole === 'PRESIDENT') {
      throw new BadRequestException('Cannot assign PRESIDENT role directly. Use transfer presidency instead.');
    }

    // Check if target user is PRESIDENT
    const targetMember = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          userId: targetUserBigIntId,
          organizationId: orgBigIntId
        }
      }
    });

    if (!targetMember) {
      throw new BadRequestException('User is not a member of this organization');
    }

    if (targetMember.role === 'PRESIDENT') {
      throw new BadRequestException('Cannot change PRESIDENT role. Use transfer presidency instead.');
    }

    // Update role
    const updatedMember = await this.prisma.organizationUser.update({
      where: {
        organizationId_userId: {
          userId: targetUserBigIntId,
          organizationId: orgBigIntId
        }
      },
      data: { role: changeUserRoleDto.newRole }
    });

    return {
      message: 'User role changed successfully',
      userId: changeUserRoleDto.userId,
      organizationId,
      role: changeUserRoleDto.newRole,
      assignedAt: updatedMember.updatedAt
    };
  }

  /**
   * Remove user from organization (SIMPLIFIED - no authentication required)
   */
  async removeUserFromOrganization(organizationId: string, removeUserDto: any, user?: any) {
    const orgBigIntId = convertToBigInt(organizationId);
    const targetUserBigIntId = convertToBigInt(removeUserDto.userId);

    // Check if target user exists in organization
    const targetMember = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          userId: targetUserBigIntId,
          organizationId: orgBigIntId
        }
      }
    });

    if (!targetMember) {
      throw new BadRequestException('User is not a member of this organization');
    }

    // Prevent removing PRESIDENT
    if (targetMember.role === 'PRESIDENT') {
      throw new BadRequestException('Cannot remove PRESIDENT. Transfer presidency first.');
    }

    // Remove user
    await this.prisma.organizationUser.delete({
      where: {
        organizationId_userId: {
          userId: targetUserBigIntId,
          organizationId: orgBigIntId
        }
      }
    });
  }

  /**
   * Transfer presidency to another user (SIMPLIFIED - no authentication required)
   */
  async transferPresidency(organizationId: string, newPresidentUserId: string, user?: any) {
    const orgBigIntId = convertToBigInt(organizationId);
    const newPresidentBigIntId = convertToBigInt(newPresidentUserId);
    const currentPresidentBigIntId = user?.sub ? convertToBigInt(user.sub) : convertToBigInt('1'); // Default to user 1

    // Check if new president is a member
    const newPresidentMember = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          userId: newPresidentBigIntId,
          organizationId: orgBigIntId
        }
      }
    });

    if (!newPresidentMember) {
      throw new BadRequestException('New president must be a member of the organization');
    }

    // Transfer presidency in a transaction
    await this.prisma.$transaction([
      // Make current president an admin
      this.prisma.organizationUser.update({
        where: {
          organizationId_userId: {
            userId: currentPresidentBigIntId,
            organizationId: orgBigIntId
          }
        },
        data: { role: 'ADMIN' }
      }),
      // Make new user president
      this.prisma.organizationUser.update({
        where: {
          organizationId_userId: {
            userId: newPresidentBigIntId,
            organizationId: orgBigIntId
          }
        },
        data: { role: 'PRESIDENT' }
      })
    ]);

    return {
      message: 'Presidency transferred successfully',
      newPresidentUserId,
      previousPresidentUserId: user?.sub || 'anonymous',
      transferredAt: new Date().toISOString()
    };
  }
}
