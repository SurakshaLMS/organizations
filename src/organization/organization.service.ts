import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtAccessValidationService } from '../auth/jwt-access-validation.service';
import { CreateOrganizationDto, UpdateOrganizationDto, EnrollUserDto, VerifyUserDto, AssignInstituteDto } from './dto/organization.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { EnhancedJwtPayload } from '../auth/organization-access.service';
import { UserType, GLOBAL_ACCESS_ROLES } from '../common/enums/user-types.enum';
import { UrlTransformerService } from '../common/services/url-transformer.service';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private jwtAccessValidation: JwtAccessValidationService,
    private urlTransformer: UrlTransformerService,
  ) {}

  /**
   * Get organization names by IDs for compact JWT token operations
   * Used for search functionality when working with compact format
   */
  async getOrganizationNamesByIds(organizationIds: string[], searchTerm?: string) {
    const orgBigIntIds = organizationIds.map(id => BigInt(id));
    
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
  async createOrganization(createOrganizationDto: CreateOrganizationDto, user: EnhancedJwtPayload) {
    const { name, type, isPublic, enrollmentKey, needEnrollmentVerification, enabledEnrollments, imageUrl, instituteId } = createOrganizationDto;

    // Validate Organization Manager Access - Support both JWT formats
    // Cast to any to handle ultra-compact JWT format fields
    const userAny = user as any;
    
    const isOrganizationManager = 
      user.userType === 'ORGANIZATION_MANAGER' ||  // Standard JWT format
      userAny.ut === 'OM' ||                       // Ultra-compact ORGANIZATION_MANAGER
      userAny.ut === 'SA' ||                       // Ultra-compact SUPERADMIN
      user.isGlobalAdmin === true ||               // Global admin flag
      (user.userType && GLOBAL_ACCESS_ROLES.includes(user.userType as UserType));

    if (!isOrganizationManager) {
      this.logger.warn(`❌ Organization creation denied for user: ${user.sub || userAny.s}, userType: ${user.userType || userAny.ut}, isGlobalAdmin: ${user.isGlobalAdmin}`);
      throw new ForbiddenException('Only Organization Managers can create organizations');
    }

    this.logger.log(`✅ Organization creation authorized for user: ${user.sub || userAny.s}, userType: ${user.userType || userAny.ut}`);

    // Validate enrollment key requirement
    if (!isPublic && !enrollmentKey) {
      throw new BadRequestException('Enrollment key is required for private organizations');
    }

    // Note: Enrollment keys are no longer unique, multiple organizations can use the same key

    // Validate institute exists if provided
    if (instituteId) {
      const instituteBigIntId = BigInt(instituteId);
      const institute = await this.prisma.institute.findUnique({
        where: { instituteId: instituteBigIntId },
      });
      if (!institute) {
        throw new BadRequestException('Institute not found');
      }
    }

    // Create organization first
    // Handle special Organization Manager case
    let creatorUserBigIntId: bigint | null = null;
    let creatorUser: any = null;

    if (user.sub !== 'OM_USER') {
      // Regular user creation
      creatorUserBigIntId = BigInt(user.sub);
      
      // Validate that the creator user exists
      creatorUser = await this.prisma.user.findUnique({
        where: { userId: creatorUserBigIntId },
      });

      if (!creatorUser) {
        throw new BadRequestException(`Creator user with ID ${user.sub} not found`);
      }
    } else {
      // Organization Manager creation - no user relationship needed
      this.logger.log('✅ Creating organization via Organization Manager - no user relationship created');
    }

    const instituteBigIntId = instituteId ? BigInt(instituteId) : null;
    
    const organization = await this.prisma.organization.create({
      data: {
        name,
        type,
        isPublic,
        enrollmentKey: enrollmentKey || null,
        needEnrollmentVerification: needEnrollmentVerification ?? true,
        enabledEnrollments: enabledEnrollments ?? true,
        imageUrl,
        instituteId: instituteBigIntId,
      },
      select: {
        organizationId: true,
        name: true,
        type: true,
        isPublic: true,
        needEnrollmentVerification: true,
        enabledEnrollments: true,
        imageUrl: true,
        instituteId: true,
      },
    });

    // Create the organization user relationship
    if (creatorUserBigIntId !== null) {
      // Regular user creation - assign as MEMBER
      await this.prisma.organizationUser.create({
        data: {
          organizationId: organization.organizationId,
          userId: creatorUserBigIntId,
          role: 'MEMBER',
          isVerified: true,
        }
      });
      this.logger.log(`✅ Organization-user relationship created for user ${user.sub} as MEMBER`);
    } else {
      // Organization Manager creation - create system user relationship as PRESIDENT
      // First, check if OM system user exists, if not create it
      let omSystemUser = await this.prisma.user.findUnique({
        where: { email: 'org.manager@system.local' }
      });

      if (!omSystemUser) {
        // Create Organization Manager system user
        omSystemUser = await this.prisma.user.create({
          data: {
            email: 'org.manager@system.local',
            firstName: 'Organization',
            lastName: 'Manager',
            isActive: 1 as any, // TinyInt in database
            password: null,
            userType: 'ORGANIZATION_MANAGER',
            district: 'COLOMBO' as any,
            province: 'WESTERN' as any,
          }
        });
        this.logger.log(`✅ Created Organization Manager system user with ID: ${omSystemUser.userId}`);
      }

      // Assign Organization Manager as PRESIDENT of the created organization
      await this.prisma.organizationUser.create({
        data: {
          organizationId: organization.organizationId,
          userId: omSystemUser.userId,
          role: 'PRESIDENT',
          isVerified: true,
        }
      });
      this.logger.log(`✅ Organization Manager assigned as PRESIDENT of organization ${organization.organizationId}`);
    }

    // Transform to match OrganizationDto
    const response = {
      id: organization.organizationId.toString(),
      name: organization.name,
      type: organization.type,
      isPublic: organization.isPublic,
      needEnrollmentVerification: organization.needEnrollmentVerification,
      enabledEnrollments: organization.enabledEnrollments,
      imageUrl: organization.imageUrl,
      instituteId: organization.instituteId ? organization.instituteId.toString() : null
    };

    // Transform URLs: relative paths → full URLs, full URLs → unchanged
    return this.urlTransformer.transformCommonFields(response);
  }

  /**
   * Get all organizations with pagination (public ones or user's organizations)
   */
  async getOrganizations(userId?: string, paginationDto?: PaginationDto, user?: any): Promise<PaginatedResponse<any>> {
    const pagination = paginationDto || new PaginationDto();
    
    const where: any = {};

    if (userId) {
      const userBigIntId = BigInt(userId);
      
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

    const transformedOrgs = this.urlTransformer.transformCommonFieldsArray(organizations);
    return createPaginatedResponse(transformedOrgs, total, pagination);
  }

  /**
   * Get organizations that a specific user is enrolled in
   * Returns only organizations where user is a verified member
   * Optimized query with minimal data and no sensitive information
   */
  async getUserEnrolledOrganizations(userId: string, paginationDto?: PaginationDto): Promise<PaginatedResponse<any>> {
    const pagination = paginationDto || new PaginationDto();

    // Convert user ID to BigInt for database operations
    const userBigIntId = BigInt(userId);

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

    // Transform URLs in organizations
    const organizationsWithUrls = this.urlTransformer.transformCommonFieldsArray(transformedOrganizations);

    return createPaginatedResponse(organizationsWithUrls, total, pagination);
  }

  /**
   * Get global organizations that user is NOT enrolled in
   * Returns public organizations from the entire system that the user hasn't joined yet
   * Supports pagination and search
   * Optimized: No expensive count queries, only basic organization fields
   */
  async getGlobalOrganizationsNotEnrolled(userId: string, paginationDto?: PaginationDto): Promise<PaginatedResponse<any>> {
    const pagination = paginationDto || new PaginationDto();
    const userBigIntId = BigInt(userId);

    // Build where clause for public organizations user is NOT enrolled in
    const where: any = {
      isPublic: true, // Only public/global organizations
      NOT: {
        organizationUsers: {
          some: {
            userId: userBigIntId, // Exclude organizations user is already in
          },
        },
      },
    };

    // Add search functionality
    if (pagination.search) {
      where.OR = [
        {
          name: {
            contains: pagination.search,
          },
        },
        {
          type: {
            contains: pagination.search,
          },
        },
      ];
    }

    // Build order by - only allow sorting by actual organization fields
    const orderBy: any = {};
    const validSortFields = ['name', 'type', 'createdAt'];
    const sortBy = validSortFields.includes(pagination.sortBy || '') ? pagination.sortBy : 'name';
    orderBy[sortBy || 'name'] = pagination.sortOrder || 'asc';

    // Get total count - single optimized query
    const total = await this.prisma.organization.count({ where });

    // Get paginated data - simple query with only existing fields
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
        enabledEnrollments: true,
        imageUrl: true,
        instituteId: true,
        createdAt: true,
      },
    });

    // Transform data - only basic fields, no counts
    const transformedOrganizations = organizations.map(org => ({
      organizationId: org.organizationId.toString(),
      name: org.name,
      type: org.type,
      isPublic: org.isPublic,
      needEnrollmentVerification: org.needEnrollmentVerification,
      enabledEnrollments: org.enabledEnrollments,
      imageUrl: org.imageUrl,
      instituteId: org.instituteId ? org.instituteId.toString() : null,
      createdAt: org.createdAt.toISOString(),
      enrollmentStatus: 'not_enrolled',
      canEnroll: org.enabledEnrollments,
    }));

    // Transform URLs in organizations
    const organizationsWithUrls = this.urlTransformer.transformCommonFieldsArray(transformedOrganizations);

    this.logger.log(`🌍 Found ${total} global organizations user ${userId} is NOT enrolled in`);

    return createPaginatedResponse(organizationsWithUrls, total, pagination);
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(organizationId: string, userId?: string) {
    const orgBigIntId = BigInt(organizationId);
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
      const userBigIntId = BigInt(userId);
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

    return this.urlTransformer.transformCommonFields(organization);
  }

  /**
   * Update organization (SIMPLIFIED - no authentication required)
   */
  async updateOrganization(
    organizationId: string, 
    updateOrganizationDto: UpdateOrganizationDto, 
    user?: any
  ) {
    const { name, isPublic, enrollmentKey, needEnrollmentVerification, enabledEnrollments, imageUrl, instituteId } = updateOrganizationDto;

    // Validate enrollment key requirement
    if (isPublic === false && !enrollmentKey) {
      throw new BadRequestException('Enrollment key is required for private organizations');
    }

    // Validate institute exists if provided
    if (instituteId !== undefined) {
      if (instituteId) {
        const instituteBigIntId = BigInt(instituteId);
        const institute = await this.prisma.institute.findUnique({
          where: { instituteId: instituteBigIntId },
        });
        if (!institute) {
          throw new BadRequestException('Institute not found');
        }
      }
    }

    const orgBigIntId = BigInt(organizationId);
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (needEnrollmentVerification !== undefined) updateData.needEnrollmentVerification = needEnrollmentVerification;
    if (enabledEnrollments !== undefined) updateData.enabledEnrollments = enabledEnrollments;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (enrollmentKey !== undefined) updateData.enrollmentKey = enrollmentKey || null;
    if (instituteId !== undefined) updateData.instituteId = instituteId ? BigInt(instituteId) : null;

    this.logger.log(`📝 Organization ${organizationId} updated by user ${user.sub}`);

    const updatedOrganization = await this.prisma.organization.update({
      where: { organizationId: orgBigIntId },
      data: updateData,
      select: {
        organizationId: true,
        name: true,
        type: true,
        isPublic: true,
        needEnrollmentVerification: true,
        enabledEnrollments: true,
        imageUrl: true,
        instituteId: true,
        // Exclude: enrollmentKey, createdAt, updatedAt
      },
    });

    // Transform to match OrganizationDto
    const result = {
      id: updatedOrganization.organizationId.toString(),
      name: updatedOrganization.name,
      type: updatedOrganization.type,
      isPublic: updatedOrganization.isPublic,
      needEnrollmentVerification: updatedOrganization.needEnrollmentVerification,
      enabledEnrollments: updatedOrganization.enabledEnrollments,
      imageUrl: updatedOrganization.imageUrl,
      instituteId: updatedOrganization.instituteId ? updatedOrganization.instituteId.toString() : null
    };
    
    // Transform URLs: relative paths → full URLs, full URLs → unchanged
    return this.urlTransformer.transformCommonFields(result);
  }

  /**
   * Delete organization (SIMPLIFIED - no authentication required)
   */
  async deleteOrganization(organizationId: string, user?: any) {
    const orgBigIntId = BigInt(organizationId);

    this.logger.warn(`🗑️ Organization ${organizationId} deleted by user ${user.sub}`);

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
      this.logger.warn(`Failed to refresh token for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Enroll user in organization - Enhanced with enrollment control
   */
  async enrollUser(enrollUserDto: EnrollUserDto, userId: string) {
    const { organizationId, enrollmentKey } = enrollUserDto;

    const orgBigIntId = BigInt(organizationId);
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // 1. Check if self-enrollment is enabled
    if (!organization.enabledEnrollments) {
      throw new BadRequestException('Self-enrollment is disabled for this organization. Please contact an administrator.');
    }

    // 2. Enhanced enrollment key validation
    if (organization.enrollmentKey) {
      // If organization has an enrollment key, user MUST provide the correct key
      if (!enrollmentKey) {
        throw new BadRequestException('Enrollment key is required for this organization');
      }
      if (enrollmentKey !== organization.enrollmentKey) {
        throw new BadRequestException('Invalid enrollment key');
      }
    } else {
      // If organization has no enrollment key, user can enroll freely (no key required)
      // This allows for open enrollment when enabledEnrollments=true and no key is set
    }

    // 3. Additional validation for private organizations
    if (!organization.isPublic && !organization.enrollmentKey) {
      throw new BadRequestException('Private organizations must have an enrollment key or disable self-enrollment');
    }

    // Determine if user should be auto-verified based on organization settings
    // User is automatically verified if:
    // 1. Organization doesn't require enrollment verification (needEnrollmentVerification = false)
    // Note: Public/private status doesn't affect verification - only needEnrollmentVerification matters
    const shouldAutoVerify = !organization.needEnrollmentVerification;

    const userBigIntId = BigInt(userId);

    try {
      // Attempt to create enrollment directly
      // If user is already enrolled, the composite primary key constraint will cause an error
      await this.prisma.organizationUser.create({
        data: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
          role: 'MEMBER', // Self-enrolled users always start as MEMBER
          isVerified: shouldAutoVerify,
          verifiedBy: shouldAutoVerify ? userBigIntId : null, // Self-verified if auto-verified
          verifiedAt: shouldAutoVerify ? new Date() : null,
        },
      });

      // Trigger token refresh for the user to update organization access
      await this.triggerTokenRefresh(userId);

      // Return simplified organization details only (no sensitive data, no joins)
      return {
        organizationId: organization.organizationId.toString(),
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
   * Verify user in organization (with enrollment checks)
   */
  async verifyUser(organizationId: string, verifyUserDto: VerifyUserDto, verifierUser?: any) {
    const { userId, isVerified } = verifyUserDto;

    // Check if user exists in organization and organization settings
    const orgBigIntId = BigInt(organizationId);
    const userBigIntId = BigInt(userId);
    
    // First, check if the organization still has enrollments enabled
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
      select: { 
        organizationId: true, 
        enabledEnrollments: true,
        needEnrollmentVerification: true,
        name: true
      }
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if enrollments are still enabled before verification
    if (!organization.enabledEnrollments) {
      throw new BadRequestException('Enrollments are disabled for this organization. Cannot verify new members.');
    }

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

    this.logger.log(`👤 User ${userId} ${isVerified ? 'verified' : 'unverified'} in organization ${organizationId} by ${verifierUser.sub}`);

    const verifierBigIntId = verifierUser?.sub ? BigInt(verifierUser.sub) : userBigIntId;

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
    const orgBigIntId = BigInt(organizationId);
    
    // Validate organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
      select: { organizationId: true, isPublic: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const where: any = { 
      organizationId: orgBigIntId,
      isActive: true, // Only show active (non-deleted) causes
    };

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
        imageUrl: true,
        introVideoUrl: true,
        isPublic: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transform causes to convert BigInt IDs to strings
    const transformedCauses = causes.map(cause => ({
      ...cause,
      causeId: cause.causeId.toString(),
      organizationId: cause.organizationId.toString(),
    }));

    // Transform URLs: relative paths → full URLs with base domain
    const causesWithUrls = this.urlTransformer.transformCommonFieldsArray(transformedCauses);

    return createPaginatedResponse(causesWithUrls, total, paginationDto);
  }

  /**
   * Leave organization (Self-leave only using JWT token verification)
   * Members can only leave organization by themselves
   * Uses JWT token to verify membership without database queries
   */
  async leaveOrganization(organizationId: string, user: EnhancedJwtPayload) {
    const orgBigIntId = BigInt(organizationId);
    const userBigIntId = BigInt(user.sub);
    
    // Debug logging to check JWT token format
    this.logger.log(`🔍 Debug Leave Organization: User ${user.sub}, Org ${organizationId}`);
    this.logger.log(`🔍 JWT orgAccess: ${JSON.stringify(user.orgAccess)}`);
    
    // Verify user is a member of the organization using JWT token (no DB query)
    const userRole = this.jwtAccessValidation.getUserRoleInOrganization(user, organizationId);
    
    this.logger.log(`🔍 JWT Role Found: ${userRole || 'null'}`);
    
    if (!userRole) {
      // Fallback: Check database directly for troubleshooting
      const dbMembership = await this.prisma.organizationUser.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgBigIntId,
            userId: userBigIntId,
          },
        },
        select: { role: true, isVerified: true },
      });
      
      this.logger.log(`🔍 DB Membership: ${JSON.stringify(dbMembership)}`);
      
      if (!dbMembership) {
        throw new NotFoundException('You are not a member of this organization');
      }
      
      if (!dbMembership.isVerified) {
        throw new BadRequestException('Your membership is not verified yet');
      }
      
      // Use the database role if JWT verification failed
      const dbUserRole = dbMembership.role;
      this.logger.warn(`⚠️ JWT verification failed, using DB role: ${dbUserRole}`);
      
      // Prevent PRESIDENT from leaving without transferring role first
      if (dbUserRole === 'PRESIDENT') {
        throw new BadRequestException('President cannot leave organization. You must transfer the presidency to another member first.');
      }
      
      // Continue with database-verified role
      await this.performLeaveOperation(organizationId, user, dbUserRole);
      return;
    }

    // Prevent PRESIDENT from leaving without transferring role first
    if (userRole === 'PRESIDENT') {
      throw new BadRequestException('President cannot leave organization. You must transfer the presidency to another member first.');
    }

    // Continue with JWT-verified role
    await this.performLeaveOperation(organizationId, user, userRole);
  }

  /**
   * Perform the actual leave operation
   */
  private async performLeaveOperation(organizationId: string, user: EnhancedJwtPayload, userRole: string) {
    const orgBigIntId = BigInt(organizationId);
    const userBigIntId = BigInt(user.sub);

    // Log the leave action
    this.logger.log(`User ${user.sub} (${userRole}) leaving organization ${organizationId}`);

    // Get minimal organization and user details for response (single optimized query)
    const organizationDetails = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
        },
      },
      select: {
        organization: {
          select: {
            name: true,
            organizationId: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Remove user from organization
    await this.prisma.organizationUser.delete({
      where: {
        organizationId_userId: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
        },
      },
    });

    // Trigger token refresh to update user's organization access
    await this.triggerTokenRefresh(user.sub);

    // Return success response with organization details
    return {
      message: 'Successfully left the organization',
      organization: {
        organizationId: organizationDetails?.organization.organizationId.toString() || organizationId,
        name: organizationDetails?.organization.name || 'Unknown Organization',
        leftAt: new Date().toISOString(),
      },
      user: {
        name: organizationDetails?.user 
          ? `${organizationDetails.user.firstName} ${organizationDetails.user.lastName}` 
          : user.name || 'Unknown User',
        email: organizationDetails?.user?.email || user.email,
        previousRole: userRole,
      },
    };
  }

  /**
   * SIMPLIFIED INSTITUTE ASSIGNMENT (No authentication required)
   */
  async assignToInstitute(organizationId: string, assignInstituteDto: AssignInstituteDto, user?: any) {
    try {
      // INPUT VALIDATION AND SANITIZATION
      const { instituteId } = assignInstituteDto;
      const instituteBigIntId = BigInt(instituteId);
      const orgBigIntId = BigInt(organizationId);

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
        if (organization.instituteId && organization.instituteId.toString() === instituteId) {
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
        `assigned to institute ${instituteId} by user ${user.sub} ` +
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
          userId: user.sub,
        },
      };

    } catch (error) {
      // Enhanced error handling with security audit
      this.logger.error(
        `❌ INSTITUTE ASSIGNMENT FAILED: Organization ${organizationId} to institute ${assignInstituteDto.instituteId} ` +
        `by user ${user.sub} | Error: ${error.message}`
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
    const orgBigIntId = BigInt(organizationId);

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

    this.logger.log(`🏢 Organization ${organizationId} removed from institute by user ${user.sub}`);

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
    const instituteBigIntId = BigInt(instituteId);
    
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
      const userBigIntId = BigInt(userId);
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
   * Get organization members (verified only)
   */
  async getOrganizationMembers(organizationId: string, pagination: PaginationDto, user?: any) {
    const orgBigIntId = BigInt(organizationId);

    // Get total count of verified members only
    const total = await this.prisma.organizationUser.count({
      where: { 
        organizationId: orgBigIntId,
        isVerified: true
      }
    });

    // Get paginated verified members only
    const members = await this.prisma.organizationUser.findMany({
      where: { 
        organizationId: orgBigIntId,
        isVerified: true
      },
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

    // Calculate role breakdown for verified members only
    const roleBreakdown = await this.prisma.organizationUser.groupBy({
      by: ['role'],
      where: { 
        organizationId: orgBigIntId,
        isVerified: true
      },
      _count: { role: true, }
    });

    const roleCount = roleBreakdown.reduce((acc, item) => {
      acc[item.role] = item._count?.role || 0;
      return acc;
    }, {} as Record<string, number>);

    return {
      members: members.map(member => ({
        userId: member.user.userId.toString(),
        name: `${member.user.firstName} ${member.user.lastName || ''}`.trim(),
        email: member.user.email,
        role: member.role,
        isVerified: member.isVerified,
        joinedAt: member.createdAt
      })),
      totalMembers: total,
      roleBreakdown: roleCount,
      status: 'verified_only'
    };
  }

  /**
   * Get unverified organization members (Admin/President access required)
   */
  async getUnverifiedMembers(organizationId: string, pagination: PaginationDto, user?: any) {
    const orgBigIntId = BigInt(organizationId);

    // Access validation: Only ADMIN/PRESIDENT can view unverified members
    // Note: Additional role-based validation should be added via guards
    
    // Get total count of unverified members only
    const total = await this.prisma.organizationUser.count({
      where: { 
        organizationId: orgBigIntId,
        isVerified: false
      }
    });

    // Get paginated unverified members only
    const members = await this.prisma.organizationUser.findMany({
      where: { 
        organizationId: orgBigIntId,
        isVerified: false
      },
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

    return {
      unverifiedMembers: members.map(member => ({
        userId: member.user.userId.toString(),
        name: `${member.user.firstName} ${member.user.lastName || ''}`.trim(),
        email: member.user.email,
        role: member.role,
        isVerified: member.isVerified,
        enrolledAt: member.createdAt
      })),
      totalUnverified: total,
      status: 'unverified_only'
    };
  }

  /**
   * Assign role to user in organization (SIMPLIFIED - no authentication required)
   */
  async assignUserRole(organizationId: string, assignUserRoleDto: any, user?: any) {
    const orgBigIntId = BigInt(organizationId);
    const targetUserBigIntId = BigInt(assignUserRoleDto.userId);

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
    const orgBigIntId = BigInt(organizationId);
    const targetUserBigIntId = BigInt(changeUserRoleDto.userId);

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
    const orgBigIntId = BigInt(organizationId);
    const targetUserBigIntId = BigInt(removeUserDto.userId);

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
    const orgBigIntId = BigInt(organizationId);
    const newPresidentBigIntId = BigInt(newPresidentUserId);

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

    // Find current president (if any)
    const currentPresident = await this.prisma.organizationUser.findFirst({
      where: {
        organizationId: orgBigIntId,
        role: 'PRESIDENT'
      }
    });

    if (currentPresident) {
      // Transfer presidency in a transaction (demote current president)
      await this.prisma.$transaction([
        // Make current president an admin
        this.prisma.organizationUser.update({
          where: {
            organizationId_userId: {
              userId: currentPresident.userId,
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
    } else {
      // No current president - just promote the new user to president
      await this.prisma.organizationUser.update({
        where: {
          organizationId_userId: {
            userId: newPresidentBigIntId,
            organizationId: orgBigIntId
          }
        },
        data: { role: 'PRESIDENT' }
      });
    }

    return {
      message: 'Presidency transferred successfully',
      newPresidentUserId,
      previousPresidentUserId: user.sub,
      transferredAt: new Date().toISOString()
    };
  }
}
