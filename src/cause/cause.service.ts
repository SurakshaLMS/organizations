import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCauseDto, UpdateCauseDto } from './dto/cause.dto';
import { CreateCauseWithImageDto, UpdateCauseWithImageDto } from './dto/cause-with-image.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { convertToBigInt, convertToString } from '../auth/organization-access.service';
import { GCSImageService } from '../common/services/gcs-image.service';

@Injectable()
export class CauseService {
  constructor(
    private prisma: PrismaService,
    private gcsImageService: GCSImageService,
  ) {}

  /**
   * Create a new cause (ENHANCED with validation)
   */
  async createCause(createCauseDto: CreateCauseDto) {
    const { organizationId, title, description, isPublic } = createCauseDto;
    const orgBigIntId = convertToBigInt(organizationId);

    // Validate that the organization exists to prevent foreign key constraint violation
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
      select: { organizationId: true, name: true }
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    return this.prisma.cause.create({
      data: {
        organizationId: orgBigIntId,
        title,
        description,
        isPublic,
      },
      select: {
        causeId: true,
        title: true,
        description: true,
        isPublic: true,
        organizationId: true,
        // Exclude: createdAt, updatedAt
      },
    });
  }

  /**
   * Create a new cause with image upload (ENHANCED with Transaction Support)
   * 
   * Features:
   * - Organization validation before image upload
   * - Image upload to Google Cloud Storage
   * - Automatic image validation and processing
   * - Transaction-based cleanup on failure
   * - Public URL generation for immediate access
   */
  async createCauseWithImage(
    createCauseDto: CreateCauseWithImageDto,
    image?: Express.Multer.File
  ) {
    const { organizationId, title, description, introVideoUrl, isPublic } = createCauseDto;
    const orgBigIntId = convertToBigInt(organizationId);

    // First, validate that the organization exists to prevent foreign key constraint violation
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId: orgBigIntId },
      select: { organizationId: true, name: true }
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    let imageUrl: string | undefined;
    let uploadedImageKey: string | undefined;

    // Upload image to GCS if provided
    if (image) {
      try {
        const uploadResult = await this.gcsImageService.uploadImage(image, 'causes');
        imageUrl = uploadResult.url;
        uploadedImageKey = uploadResult.key; // Store the key for potential cleanup
      } catch (error) {
        throw new Error(`Image upload failed: ${error.message}`);
      }
    }

    // Use transaction to ensure data consistency and cleanup on failure
    try {
      const cause = await this.prisma.cause.create({
        data: {
          organizationId: orgBigIntId,
          title,
          description,
          introVideoUrl,
          imageUrl,
          isPublic: isPublic || false,
        },
        select: {
          causeId: true,
          title: true,
          description: true,
          introVideoUrl: true,
          imageUrl: true,
          isPublic: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        message: 'Cause created successfully',
        data: {
          ...cause,
          causeId: convertToString(cause.causeId),
          organizationId: convertToString(cause.organizationId),
        },
      };
    } catch (error) {
      // If database operation fails and we uploaded an image, clean it up
      if (imageUrl && uploadedImageKey) {
        try {
          await this.gcsImageService.deleteImage(uploadedImageKey);
          console.log(`🧹 Cleaned up uploaded image: ${uploadedImageKey} due to cause creation failure`);
        } catch (cleanupError) {
          console.error(`❌ Failed to cleanup uploaded image: ${uploadedImageKey}`, cleanupError);
        }
      }

      // Re-throw the original error with better context
      if (error.code === 'P2003') {
        throw new Error(`Invalid organization ID: ${organizationId}. Organization does not exist.`);
      }
      
      throw error;
    }
  }

  /**
   * Get all causes with pagination (public or user's organization causes)
   */
  async getCauses(userId?: string, paginationDto?: PaginationDto): Promise<PaginatedResponse<any>> {
    const pagination = paginationDto || new PaginationDto();
    
    const where: any = {};

    if (userId) {
      const userBigIntId = convertToBigInt(userId);
      // Get causes from user's organizations and public causes
      where.OR = [
        { isPublic: true },
        {
          organization: {
            organizationUsers: {
              some: {
                userId: userBigIntId,
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

    // Add search functionality
    if (pagination.search) {
      const searchCondition = {
        OR: [
          {
            title: {
              contains: pagination.search,
            },
          },
          {
            description: {
              contains: pagination.search,
            },
          },
        ],
      };
      
      if (where.OR) {
        where.OR = where.OR.map((condition: any) => ({
          ...condition,
          ...searchCondition,
        }));
      } else {
        where.OR = searchCondition.OR;
      }
    }

    // Build order by
    const orderBy: any = {};
    if (pagination.sortBy === 'lectureCount') {
      orderBy.lectures = {
        _count: pagination.sortOrder,
      };
    } else if (pagination.sortBy === 'assignmentCount') {
      orderBy.assignments = {
        _count: pagination.sortOrder,
      };
    } else if (pagination.sortBy === 'organizationName') {
      orderBy.organization = { name: pagination.sortOrder };
    } else {
      orderBy[pagination.sortBy || 'createdAt'] = pagination.sortOrder;
    }

    // Get total count
    const total = await this.prisma.cause.count({ where });

    // Get paginated data
    const causes = await this.prisma.cause.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.limitNumber,
      select: {
        causeId: true,
        title: true,
        description: true,
        introVideoUrl: true,
        imageUrl: true,
        isPublic: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return createPaginatedResponse(causes, total, pagination);
  }

  /**
   * Get cause by ID
   */
  async getCauseById(causeId: string, userId?: string) {
    const causeBigIntId = convertToBigInt(causeId);
    const cause = await this.prisma.cause.findUnique({
      where: { causeId: causeBigIntId },
      select: {
        causeId: true,
        title: true,
        description: true,
        introVideoUrl: true,
        imageUrl: true,
        isPublic: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!cause) {
      throw new NotFoundException('Cause not found');
    }

    return cause;
  }

  /**
   * Update cause
   */
  async updateCause(causeId: string, updateCauseDto: UpdateCauseDto) {
    const causeBigIntId = convertToBigInt(causeId);
    const cause = await this.prisma.cause.findUnique({
      where: { causeId: causeBigIntId },
      select: { organizationId: true },
    });

    if (!cause) {
      throw new NotFoundException('Cause not found');
    }

    return this.prisma.cause.update({
      where: { causeId: causeBigIntId },
      data: updateCauseDto,
      select: {
        causeId: true,
        title: true,
        description: true,
        introVideoUrl: true,
        imageUrl: true,
        isPublic: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update cause with image upload (ENHANCED)
   * 
   * Features:
   * - Optional image replacement with GCS upload
   * - Automatic cleanup of old image when replaced
   * - Comprehensive data update support
   */
  async updateCauseWithImage(
    causeId: string,
    updateCauseDto: UpdateCauseWithImageDto,
    image?: Express.Multer.File
  ) {
    const causeBigIntId = convertToBigInt(causeId);
    
    // Check if cause exists and get current data
    const existingCause = await this.prisma.cause.findUnique({
      where: { causeId: causeBigIntId },
      select: { 
        organizationId: true,
        imageUrl: true,
        title: true,
      },
    });

    if (!existingCause) {
      throw new NotFoundException('Cause not found');
    }

    let imageUrl = existingCause.imageUrl;

    // Handle image upload if provided
    if (image) {
      try {
        // Upload new image to GCS
        const uploadResult = await this.gcsImageService.uploadImage(image, 'causes');
        
        // Delete old image if it exists
        if (existingCause.imageUrl) {
          try {
            await this.gcsImageService.deleteImage(existingCause.imageUrl);
          } catch (error) {
            console.warn('Failed to delete old cause image:', error.message);
          }
        }
        
        imageUrl = uploadResult.url;
      } catch (error) {
        throw new Error(`Image upload failed: ${error.message}`);
      }
    }

    // Prepare update data
    const updateData: any = {
      ...updateCauseDto,
    };

    // Only include imageUrl if it's being updated
    if (image) {
      updateData.imageUrl = imageUrl;
    }

    const updatedCause = await this.prisma.cause.update({
      where: { causeId: causeBigIntId },
      data: updateData,
      select: {
        causeId: true,
        title: true,
        description: true,
        introVideoUrl: true,
        imageUrl: true,
        isPublic: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Cause updated successfully',
      data: {
        ...updatedCause,
        causeId: convertToString(updatedCause.causeId),
        organizationId: convertToString(updatedCause.organizationId),
      },
    };
  }

  /**
   * Delete cause
   */
  async deleteCause(causeId: string, userId: string) {
    const causeBigIntId = convertToBigInt(causeId);
    const cause = await this.prisma.cause.findUnique({
      where: { causeId: causeBigIntId },
      select: { organizationId: true },
    });

    if (!cause) {
      throw new NotFoundException('Cause not found');
    }

    return this.prisma.cause.delete({
      where: { causeId: causeBigIntId },
    });
  }

  /**
   * Get causes by organization
   */
  async getCausesByOrganization(organizationId: string, userId?: string) {
    const orgBigIntId = convertToBigInt(organizationId);
    
    const where: any = { organizationId: orgBigIntId };

    if (!userId) {
      // Only public causes for unauthenticated users
      where.isPublic = true;
    } else {
      // Get all causes for organization members, only public for non-members
      const userBigIntId = convertToBigInt(userId);
      const userInOrg = await this.prisma.organizationUser.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgBigIntId,
            userId: userBigIntId,
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

}
