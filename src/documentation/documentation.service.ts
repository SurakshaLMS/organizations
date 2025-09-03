import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAccessValidationService } from '../auth/jwt-access-validation.service';
import { CreateDocumentationDto, UpdateDocumentationDto, DocumentationQueryDto, DocumentationResponseDto } from './dto/documentation.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { EnhancedJwtPayload } from '../auth/organization-access.service';

/**
 * ENTERPRISE DOCUMENTATION SERVICE
 * 
 * Production-ready documentation management with:
 * - JWT-based access control (zero auth queries)
 * - Optimized filtering by lecture IDs
 * - Minimal database joins
 * - Enhanced performance and security
 * - Comprehensive error handling
 */
@Injectable()
export class DocumentationService {
  private readonly logger = new Logger(DocumentationService.name);
  
  constructor(
    private prisma: PrismaService,
    private jwtAccessValidation: JwtAccessValidationService,
  ) {}

  /**
   * CREATE DOCUMENTATION (ENTERPRISE OPTIMIZED)
   * 
   * Features:
   * - JWT-based access validation (zero auth queries)
   * - Optimized lecture validation
   * - BigInt conversion handling
   * - Comprehensive error handling
   */
  async createDocumentation(
    createDocumentationDto: CreateDocumentationDto,
    userId: string,
    user: EnhancedJwtPayload
  ): Promise<DocumentationResponseDto> {
    try {
      const { lectureId, title, description, content, docUrl } = createDocumentationDto;
      
      // Convert IDs to BigInt for database operations
      const lectureBigIntId = BigInt(lectureId);
      
      // Validate lecture exists and get organization ID
      const lecture = await this.prisma.lecture.findUnique({
        where: { lectureId: lectureBigIntId },
        include: {
          cause: {
            select: {
              organizationId: true,
              title: true
            }
          }
        }
      });
      
      if (!lecture) {
        throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
      }
      
      // Validate user has access to the organization
      this.jwtAccessValidation.requireOrganizationMember(user, lecture.cause.organizationId.toString());
      
      // Create documentation
      const documentation = await this.prisma.documentation.create({
        data: {
          lectureId: lectureBigIntId,
          title,
          description,
          content,
          docUrl
        },
        include: {
          lecture: {
            select: {
              lectureId: true,
              title: true,
              causeId: true
            }
          }
        }
      });
      
      this.logger.log(`Documentation created successfully: ID ${documentation.documentationId}, Title: ${title}`);
      
      return this.transformToResponseDto(documentation);
      
    } catch (error) {
      this.logger.error(`Failed to create documentation: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET ALL DOCUMENTATION (ENTERPRISE OPTIMIZED)
   * 
   * Features:
   * - JWT-based organization filtering
   * - Advanced search capabilities
   * - Optimized pagination
   * - Minimal database joins
   */
  async getDocumentation(
    userId: string,
    queryDto: DocumentationQueryDto,
    paginationDto: PaginationDto,
    user: EnhancedJwtPayload
  ): Promise<PaginatedResponse<DocumentationResponseDto>> {
    try {
      // Get user's accessible organization IDs from JWT
      const userOrgIds = this.jwtAccessValidation.getUserOrganizationsByRole(user)
        .map(org => BigInt(org.organizationId));
      
      if (userOrgIds.length === 0) {
        return createPaginatedResponse([], 0, paginationDto);
      }
      
      // Build where clause
      const where: any = {
        lecture: {
          cause: {
            organizationId: {
              in: userOrgIds
            }
          }
        }
      };
      
      // Add lecture filter if specified
      if (queryDto.lectureId) {
        where.lectureId = BigInt(queryDto.lectureId);
      }
      
      // Add search filter
      if (queryDto.search) {
        where.OR = [
          { title: { contains: queryDto.search } },
          { description: { contains: queryDto.search } },
          { content: { contains: queryDto.search } }
        ];
      }
      
      // Calculate pagination
      const page = paginationDto.pageNumber;
      const limit = paginationDto.limitNumber;
      const skip = paginationDto.skip;
      
      // Execute query with pagination
      const [documentation, total] = await Promise.all([
        this.prisma.documentation.findMany({
          where,
          include: {
            lecture: {
              select: {
                lectureId: true,
                title: true,
                causeId: true
              }
            }
          },
          orderBy: {
            createdAt: paginationDto.sortOrder || 'desc'
          },
          skip,
          take: limit
        }),
        this.prisma.documentation.count({ where })
      ]);
      
      const transformedData = documentation.map(doc => this.transformToResponseDto(doc));
      
      this.logger.log(`Retrieved ${documentation.length} documentation items for user ${userId}`);
      
      return createPaginatedResponse(transformedData, total, paginationDto);
      
    } catch (error) {
      this.logger.error(`Failed to retrieve documentation: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET DOCUMENTATION BY ID (ENTERPRISE OPTIMIZED)
   */
  async getDocumentationById(
    documentationId: string,
    userId: string,
    user: EnhancedJwtPayload
  ): Promise<DocumentationResponseDto> {
    try {
      const docBigIntId = BigInt(documentationId);
      
      const documentation = await this.prisma.documentation.findUnique({
        where: { documentationId: docBigIntId },
        include: {
          lecture: {
            include: {
              cause: {
                select: {
                  organizationId: true
                }
              }
            }
          }
        }
      });
      
      if (!documentation) {
        throw new NotFoundException(`Documentation with ID ${documentationId} not found`);
      }
      
      // Validate user has access to the organization
      this.jwtAccessValidation.requireOrganizationMember(user, documentation.lecture.cause.organizationId.toString());
      
      return this.transformToResponseDto(documentation);
      
    } catch (error) {
      this.logger.error(`Failed to retrieve documentation ${documentationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * UPDATE DOCUMENTATION (ENTERPRISE OPTIMIZED)
   */
  async updateDocumentation(
    documentationId: string,
    updateDocumentationDto: UpdateDocumentationDto,
    userId: string,
    user: EnhancedJwtPayload
  ): Promise<DocumentationResponseDto> {
    try {
      const docBigIntId = BigInt(documentationId);
      
      // Check if documentation exists and user has access
      const existingDoc = await this.prisma.documentation.findUnique({
        where: { documentationId: docBigIntId },
        include: {
          lecture: {
            include: {
              cause: {
                select: {
                  organizationId: true
                }
              }
            }
          }
        }
      });
      
      if (!existingDoc) {
        throw new NotFoundException(`Documentation with ID ${documentationId} not found`);
      }
      
      // Validate user has moderator access to the organization
      this.jwtAccessValidation.requireOrganizationModerator(user, existingDoc.lecture.cause.organizationId.toString());
      
      // Update documentation
      const updatedDocumentation = await this.prisma.documentation.update({
        where: { documentationId: docBigIntId },
        data: updateDocumentationDto,
        include: {
          lecture: {
            select: {
              lectureId: true,
              title: true,
              causeId: true
            }
          }
        }
      });
      
      this.logger.log(`Documentation updated successfully: ID ${documentationId}`);
      
      return this.transformToResponseDto(updatedDocumentation);
      
    } catch (error) {
      this.logger.error(`Failed to update documentation ${documentationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * DELETE DOCUMENTATION (ENTERPRISE OPTIMIZED)
   */
  async deleteDocumentation(
    documentationId: string,
    userId: string,
    user: EnhancedJwtPayload
  ): Promise<{ message: string }> {
    try {
      const docBigIntId = BigInt(documentationId);
      
      // Check if documentation exists and user has access
      const existingDoc = await this.prisma.documentation.findUnique({
        where: { documentationId: docBigIntId },
        include: {
          lecture: {
            include: {
              cause: {
                select: {
                  organizationId: true
                }
              }
            }
          }
        }
      });
      
      if (!existingDoc) {
        throw new NotFoundException(`Documentation with ID ${documentationId} not found`);
      }
      
      // Validate user has admin access to the organization
      this.jwtAccessValidation.requireOrganizationAdmin(user, existingDoc.lecture.cause.organizationId.toString());
      
      // Delete documentation
      await this.prisma.documentation.delete({
        where: { documentationId: docBigIntId }
      });
      
      this.logger.log(`Documentation deleted successfully: ID ${documentationId}`);
      
      return { message: `Documentation ${documentationId} deleted successfully` };
      
    } catch (error) {
      this.logger.error(`Failed to delete documentation ${documentationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET DOCUMENTATION BY LECTURE ID (ENTERPRISE OPTIMIZED)
   */
  async getDocumentationByLecture(
    lectureId: string,
    userId: string,
    paginationDto: PaginationDto,
    user: EnhancedJwtPayload
  ): Promise<PaginatedResponse<DocumentationResponseDto>> {
    try {
      const lectureBigIntId = BigInt(lectureId);
      
      // Validate lecture exists and user has access
      const lecture = await this.prisma.lecture.findUnique({
        where: { lectureId: lectureBigIntId },
        include: {
          cause: {
            select: {
              organizationId: true
            }
          }
        }
      });
      
      if (!lecture) {
        throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
      }
      
      // Validate user has access to the organization
      this.jwtAccessValidation.requireOrganizationMember(user, lecture.cause.organizationId.toString());
      
      // Calculate pagination
      const page = paginationDto.pageNumber;
      const limit = paginationDto.limitNumber;
      const skip = paginationDto.skip;
      
      // Get documentation for the lecture
      const [documentation, total] = await Promise.all([
        this.prisma.documentation.findMany({
          where: { lectureId: lectureBigIntId },
          include: {
            lecture: {
              select: {
                lectureId: true,
                title: true,
                causeId: true
              }
            }
          },
          orderBy: {
            createdAt: paginationDto.sortOrder || 'desc'
          },
          skip,
          take: limit
        }),
        this.prisma.documentation.count({
          where: { lectureId: lectureBigIntId }
        })
      ]);
      
      const transformedData = documentation.map(doc => this.transformToResponseDto(doc));
      
      this.logger.log(`Retrieved ${documentation.length} documentation items for lecture ${lectureId}`);
      
      return createPaginatedResponse(transformedData, total, paginationDto);
      
    } catch (error) {
      this.logger.error(`Failed to retrieve documentation for lecture ${lectureId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * TRANSFORM TO RESPONSE DTO
   * 
   * Converts database model to response DTO with proper type conversion
   */
  private transformToResponseDto(documentation: any): DocumentationResponseDto {
    return {
      id: documentation.documentationId.toString(),
      lectureId: documentation.lectureId.toString(),
      title: documentation.title,
      description: documentation.description,
      content: documentation.content,
      docUrl: documentation.docUrl,
      createdAt: documentation.createdAt,
      updatedAt: documentation.updatedAt,
      lecture: documentation.lecture ? {
        id: documentation.lecture.lectureId.toString(),
        title: documentation.lecture.title,
        causeId: documentation.lecture.causeId.toString()
      } : undefined
    };
  }
}
