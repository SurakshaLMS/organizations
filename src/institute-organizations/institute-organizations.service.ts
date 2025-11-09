import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstituteOrganizationDto, UpdateInstituteOrganizationDto } from './dto/institute-organization.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { UrlTransformerService } from '../common/services/url-transformer.service';

@Injectable()
export class InstituteOrganizationsService {
  private readonly logger = new Logger(InstituteOrganizationsService.name);

  constructor(
    private prisma: PrismaService,
    private urlTransformer: UrlTransformerService,
  ) {}

  /**
   * Create a new organization for an institute (No authentication required)
   */
  async createOrganization(createOrganizationDto: CreateInstituteOrganizationDto) {
    const { name, type, isPublic, enrollmentKey, needEnrollmentVerification, enabledEnrollments, imageUrl, instituteId } = createOrganizationDto;

    this.logger.log(`🏗️ Creating organization for institute: ${instituteId}`);

    // Validate enrollment key requirement
    if (!isPublic && !enrollmentKey) {
      throw new BadRequestException('Enrollment key is required for private organizations');
    }

    // Validate institute exists
    const instituteBigIntId = BigInt(instituteId);
    const institute = await this.prisma.institute.findUnique({
      where: { instituteId: instituteBigIntId },
    });
    if (!institute) {
      throw new BadRequestException('Institute not found');
    }

    // Create organization
    const createdOrganization = await this.prisma.organization.create({
      data: {
        name,
        type,
        isPublic: isPublic ?? false,
        enrollmentKey,
        needEnrollmentVerification: needEnrollmentVerification ?? true,
        enabledEnrollments: enabledEnrollments ?? true,
        imageUrl,
        instituteId: instituteBigIntId,
      },
      include: {
        institute: {
          select: {
            instituteId: true,
            name: true,
            code: true
          }
        }
      }
    });

    this.logger.log(`✅ Organization created successfully: ${createdOrganization.organizationId} for institute: ${instituteId}`);

    const result = {
      id: createdOrganization.organizationId.toString(),
      name: createdOrganization.name,
      type: createdOrganization.type,
      isPublic: createdOrganization.isPublic,
      enrollmentKey: createdOrganization.enrollmentKey,
      needEnrollmentVerification: createdOrganization.needEnrollmentVerification,
      enabledEnrollments: createdOrganization.enabledEnrollments,
      imageUrl: createdOrganization.imageUrl,
      instituteId: createdOrganization.instituteId?.toString() || instituteId,
      institute: createdOrganization.institute ? {
        id: createdOrganization.institute.instituteId.toString(),
        name: createdOrganization.institute.name,
        code: createdOrganization.institute.code
      } : null,
      createdAt: createdOrganization.createdAt,
      updatedAt: createdOrganization.updatedAt
    };
    
    return this.urlTransformer.transformCommonFields(result);
  }

  /**
   * Get all organizations for a specific institute
   */
  async getOrganizationsByInstitute(instituteId: string, paginationDto: PaginationDto): Promise<PaginatedResponse<any>> {
    const page = parseInt(paginationDto.page?.toString() || '1');
    const limit = parseInt(paginationDto.limit?.toString() || '10');
    const skip = (page - 1) * limit;
    const instituteBigIntId = BigInt(instituteId);

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where: { instituteId: instituteBigIntId },
        include: {
          institute: {
            select: {
              instituteId: true,
              name: true,
              code: true
            }
          },
          _count: {
            select: {
              organizationUsers: {
                where: { isVerified: true }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.organization.count({
        where: { instituteId: instituteBigIntId }
      })
    ]);

    const transformedOrgs = this.urlTransformer.transformCommonFieldsArray(
      organizations.map(org => ({
        id: org.organizationId.toString(),
        name: org.name,
        type: org.type,
        isPublic: org.isPublic,
        enrollmentKey: org.enrollmentKey,
        needEnrollmentVerification: org.needEnrollmentVerification,
        enabledEnrollments: org.enabledEnrollments,
        imageUrl: org.imageUrl,
        instituteId: org.instituteId?.toString() || '',
        institute: org.institute ? {
          id: org.institute.instituteId.toString(),
          name: org.institute.name,
          code: org.institute.code
        } : null,
        memberCount: org._count.organizationUsers,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      }))
    );
    
    return createPaginatedResponse(transformedOrgs, total, paginationDto);
  }

  /**
   * Get a specific organization by ID and institute ID
   */
  async getOrganizationByIdAndInstitute(organizationId: string, instituteId: string) {
    const orgBigIntId = BigInt(organizationId);
    const instituteBigIntId = BigInt(instituteId);

    const organization = await this.prisma.organization.findFirst({
      where: {
        organizationId: orgBigIntId,
        instituteId: instituteBigIntId
      },
      include: {
        institute: {
          select: {
            instituteId: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            organizationUsers: {
              where: { isVerified: true }
            }
          }
        }
      }
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found for institute ${instituteId}`);
    }

    const result = {
      id: organization.organizationId.toString(),
      name: organization.name,
      type: organization.type,
      isPublic: organization.isPublic,
      enrollmentKey: organization.enrollmentKey,
      needEnrollmentVerification: organization.needEnrollmentVerification,
      enabledEnrollments: organization.enabledEnrollments,
      imageUrl: organization.imageUrl,
      instituteId: organization.instituteId?.toString() || instituteId,
      institute: organization.institute ? {
        id: organization.institute.instituteId.toString(),
        name: organization.institute.name,
        code: organization.institute.code
      } : null,
      memberCount: organization._count.organizationUsers,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt
    };
    
    return this.urlTransformer.transformCommonFields(result);
  }

  /**
   * Update an organization for an institute
   */
  async updateOrganization(organizationId: string, instituteId: string, updateOrganizationDto: UpdateInstituteOrganizationDto) {
    const orgBigIntId = BigInt(organizationId);
    const instituteBigIntId = BigInt(instituteId);

    // Validate organization belongs to institute
    const existingOrganization = await this.prisma.organization.findFirst({
      where: {
        organizationId: orgBigIntId,
        instituteId: instituteBigIntId
      }
    });

    if (!existingOrganization) {
      throw new NotFoundException(`Organization ${organizationId} not found for institute ${instituteId}`);
    }

    // Update organization
    const updatedOrganization = await this.prisma.organization.update({
      where: { organizationId: orgBigIntId },
      data: updateOrganizationDto,
      include: {
        institute: {
          select: {
            instituteId: true,
            name: true,
            code: true
          }
        }
      }
    });

    this.logger.log(`✅ Organization updated successfully: ${organizationId} for institute: ${instituteId}`);

    const result = {
      id: updatedOrganization.organizationId.toString(),
      name: updatedOrganization.name,
      type: updatedOrganization.type,
      isPublic: updatedOrganization.isPublic,
      enrollmentKey: updatedOrganization.enrollmentKey,
      needEnrollmentVerification: updatedOrganization.needEnrollmentVerification,
      enabledEnrollments: updatedOrganization.enabledEnrollments,
      imageUrl: updatedOrganization.imageUrl,
      instituteId: updatedOrganization.instituteId?.toString() || instituteId,
      institute: updatedOrganization.institute ? {
        id: updatedOrganization.institute.instituteId.toString(),
        name: updatedOrganization.institute.name,
        code: updatedOrganization.institute.code
      } : null,
      createdAt: updatedOrganization.createdAt,
      updatedAt: updatedOrganization.updatedAt
    };
    
    return this.urlTransformer.transformCommonFields(result);
  }

  /**
   * Delete an organization for an institute
   */
  async deleteOrganization(organizationId: string, instituteId: string) {
    const orgBigIntId = BigInt(organizationId);
    const instituteBigIntId = BigInt(instituteId);

    // Validate organization belongs to institute
    const existingOrganization = await this.prisma.organization.findFirst({
      where: {
        organizationId: orgBigIntId,
        instituteId: instituteBigIntId
      }
    });

    if (!existingOrganization) {
      throw new NotFoundException(`Organization ${organizationId} not found for institute ${instituteId}`);
    }

    // Delete organization
    await this.prisma.organization.delete({
      where: { organizationId: orgBigIntId }
    });

    this.logger.log(`✅ Organization deleted successfully: ${organizationId} for institute: ${instituteId}`);

    return {
      message: 'Organization deleted successfully',
      organizationId,
      instituteId,
      deletedAt: new Date().toISOString()
    };
  }

  /**
   * Get public organizations (no institute restriction)
   */
  async getPublicOrganizations(paginationDto: PaginationDto): Promise<PaginatedResponse<any>> {
    const page = parseInt(paginationDto.page?.toString() || '1');
    const limit = parseInt(paginationDto.limit?.toString() || '10');
    const skip = (page - 1) * limit;

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where: { 
          isPublic: true,
          instituteId: { not: null } // Only include organizations with institute
        },
        include: {
          institute: {
            select: {
              instituteId: true,
              name: true,
              code: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.organization.count({
        where: { 
          isPublic: true,
          instituteId: { not: null }
        }
      })
    ]);

    const transformedOrgs = this.urlTransformer.transformCommonFieldsArray(
      organizations.map(org => ({
        id: org.organizationId.toString(),
        name: org.name,
        type: org.type,
        isPublic: org.isPublic,
        imageUrl: org.imageUrl,
        instituteId: org.instituteId?.toString(),
        institute: org.institute ? {
          id: org.institute.instituteId.toString(),
          name: org.institute.name,
          code: org.institute.code
        } : null,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      }))
    );
    
    return createPaginatedResponse(transformedOrgs, total, paginationDto);
  }

  /**
   * Validate institute exists
   */
  async validateInstituteExists(instituteId: string): Promise<void> {
    const instituteBigIntId = BigInt(instituteId);
    const institute = await this.prisma.institute.findUnique({
      where: { instituteId: instituteBigIntId },
    });
    
    if (!institute) {
      throw new BadRequestException(`Institute ${instituteId} not found`);
    }
  }
}