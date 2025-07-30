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
    const { name, type, isPublic, enrollmentKey, instituteId } = createOrganizationDto;

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

    // Create organization
    const creatorUserBigIntId = this.toBigInt(creatorUserId);
    const instituteBigIntId = instituteId ? convertToBigInt(instituteId) : null;
    
    const organization = await this.prisma.organization.create({
      data: {
        name,
        type,
        isPublic,
        enrollmentKey: isPublic ? null : enrollmentKey,
        instituteId: instituteBigIntId,
        organizationUsers: {
          create: {
            userId: creatorUserBigIntId,
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
   * Update organization (ENHANCED with JWT-based validation)
   */
  async updateOrganization(
    organizationId: string, 
    updateOrganizationDto: UpdateOrganizationDto, 
    user: EnhancedJwtPayload
  ) {
    const { name, isPublic, enrollmentKey, instituteId } = updateOrganizationDto;

    // ENTERPRISE JWT-BASED ACCESS VALIDATION (zero database queries)
    this.validateJwtAccess(user, organizationId, ['ADMIN', 'PRESIDENT']);

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
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
      updateData.enrollmentKey = isPublic ? null : enrollmentKey;
    }
    if (instituteId !== undefined) updateData.instituteId = instituteId ? convertToBigInt(instituteId) : null;

    this.logger.log(`📝 Organization ${organizationId} updated by user ${user.sub} (${this.jwtAccessValidation.getUserRoleInOrganization(user, organizationId)})`);

    return this.prisma.organization.update({
      where: { organizationId: orgBigIntId },
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
   * Delete organization (ENHANCED with JWT-based validation)
   */
  async deleteOrganization(organizationId: string, user: EnhancedJwtPayload) {
    // ENTERPRISE JWT-BASED ACCESS VALIDATION (zero database queries)
    this.validateJwtAccess(user, organizationId, ['PRESIDENT']);

    const orgBigIntId = convertToBigInt(organizationId);

    this.logger.warn(`🗑️ Organization ${organizationId} deleted by user ${user.sub} (PRESIDENT)`);

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

    // Check if user is already enrolled
    const userBigIntId = this.toBigInt(userId);
    const existingEnrollment = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
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
    const enrollment = await this.prisma.organizationUser.create({
      data: {
        organizationId: orgBigIntId,
        userId: userBigIntId,
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

    // Trigger token refresh for the user to update organization access
    await this.triggerTokenRefresh(userId);

    return enrollment;
  }

  /**
   * Verify user in organization (ENHANCED with JWT-based validation)
   */
  async verifyUser(organizationId: string, verifyUserDto: VerifyUserDto, verifierUser: EnhancedJwtPayload) {
    const { userId, isVerified } = verifyUserDto;

    // ENTERPRISE JWT-BASED ACCESS VALIDATION (zero database queries)
    this.validateJwtAccess(verifierUser, organizationId, ['ADMIN', 'PRESIDENT']);

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

    this.logger.log(`👤 User ${userId} ${isVerified ? 'verified' : 'unverified'} in organization ${organizationId} by ${verifierUser.sub} (${this.jwtAccessValidation.getUserRoleInOrganization(verifierUser, organizationId)})`);

    const result = await this.prisma.organizationUser.update({
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

    // Trigger token refresh for the verified user to update their organization access
    await this.triggerTokenRefresh(userId);

    return result;
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
   * ENTERPRISE JWT-BASED ACCESS VALIDATION
   * 
   * Validates organization access exclusively through JWT tokens.
   * Zero database queries for maximum performance and security.
   */
  private validateJwtAccess(
    user: EnhancedJwtPayload, 
    organizationId: string, 
    requiredRoles: string[] = []
  ): { userRole: string; accessLevel: string } {
    const validation = this.jwtAccessValidation.validateOrganizationAccess(
      user, 
      organizationId, 
      requiredRoles
    );

    if (!validation.hasAccess) {
      this.logger.warn(`🚨 Access denied for user ${user.sub} to organization ${organizationId}: ${validation.error}`);
      throw new ForbiddenException(validation.error);
    }

    this.logger.log(`✅ Access granted: User ${user.sub} (${validation.userRole}) to organization ${organizationId}`);
    return {
      userRole: validation.userRole!,
      accessLevel: validation.accessLevel!
    };
  }

  /**
   * DEPRECATED: Helper: Check if user has required role in organization
   * 
   * @deprecated Use validateJwtAccess instead for JWT-based validation
   * This method performs database queries and should be avoided in production
   */
  private async checkUserRole(organizationId: string, userId: string, requiredRoles: string[]) {
    this.logger.warn(`⚠️ DEPRECATED: checkUserRole used for organization ${organizationId}. Use JWT-based validation instead.`);
    
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
   * DEPRECATED: Helper: Check if user has access to organization
   * 
   * @deprecated Use validateJwtAccess instead for JWT-based validation
   * This method performs database queries and should be avoided in production
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
   * ULTRA-OPTIMIZED INSTITUTE ASSIGNMENT (ADMIN ACCESS ONLY)
   * 
   * Features:
   * - Single atomic transaction (minimal DB queries)
   * - JWT-based security validation (zero DB access checks)
   * - Enhanced role validation (ADMIN ONLY - organization managers)
   * - Audit logging for security compliance
   * - Input sanitization and validation
   * - No unnecessary data return (performance optimized)
   */
  async assignToInstitute(organizationId: string, assignInstituteDto: AssignInstituteDto, user: EnhancedJwtPayload) {
    try {
      // STEP 1: ENTERPRISE JWT-BASED ACCESS VALIDATION (zero database queries)
      // Only ADMIN can assign institutes (organization managers only)
      this.validateJwtAccess(user, organizationId, ['ADMIN']);
      const userRole = this.jwtAccessValidation.getUserRoleInOrganization(user, organizationId);

      // STEP 2: INPUT VALIDATION AND SANITIZATION
      const { instituteId } = assignInstituteDto;
      const instituteBigIntId = convertToBigInt(instituteId);
      const orgBigIntId = convertToBigInt(organizationId);

      // STEP 3: SINGLE ATOMIC TRANSACTION (ultra-optimized)
      // Validate institute exists and update organization in one transaction
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

      // STEP 4: SECURITY AUDIT LOGGING
      this.logger.log(
        `🏢 INSTITUTE ASSIGNMENT: Organization "${result.organizationName}" (ID: ${organizationId}) ` +
        `assigned to institute ${instituteId} by user ${user.sub} (${userRole}) ` +
        `| Action: ASSIGN_INSTITUTE | Security: JWT_VALIDATED | Timestamp: ${new Date().toISOString()}`
      );

      // STEP 5: MINIMAL SUCCESS RESPONSE (performance optimized)
      return {
        success: true,
        message: 'Organization successfully assigned to institute',
        timestamp: new Date().toISOString(),
        operation: 'ASSIGN_INSTITUTE',
        organizationId,
        instituteId,
        performedBy: {
          userId: user.sub,
          role: userRole,
        },
      };

    } catch (error) {
      // Enhanced error handling with security audit
      this.logger.error(
        `❌ INSTITUTE ASSIGNMENT FAILED: Organization ${organizationId} to institute ${assignInstituteDto.instituteId} ` +
        `by user ${user.sub} | Error: ${error.message} | Security: JWT_VALIDATED`
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
   * Remove organization from institute (ENHANCED with JWT-based validation)
   */
  async removeFromInstitute(organizationId: string, user: EnhancedJwtPayload) {
    // ENTERPRISE JWT-BASED ACCESS VALIDATION (zero database queries)
    this.validateJwtAccess(user, organizationId, ['ADMIN', 'PRESIDENT']);

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

    this.logger.log(`🏢 Organization ${organizationId} removed from institute by user ${user.sub} (${this.jwtAccessValidation.getUserRoleInOrganization(user, organizationId)})`);

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
