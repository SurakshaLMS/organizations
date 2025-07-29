import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAccessValidationService } from '../auth/jwt-access-validation.service';
import { CreateLectureDto, UpdateLectureDto, LectureQueryDto } from './dto/lecture.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { convertToBigInt, convertToString, EnhancedJwtPayload } from '../auth/organization-access.service';

/**
 * ENTERPRISE LECTURE SERVICE
 * 
 * Production-ready lecture management with:
 * - JWT-based access control (zero auth queries)
 * - Optimized filtering by cause IDs
 * - Minimal database joins
 * - Enhanced performance and security
 * - Comprehensive error handling
 */
@Injectable()
export class LectureService {
  private readonly logger = new Logger(LectureService.name);
  
  constructor(
    private prisma: PrismaService,
    private jwtAccessValidation: JwtAccessValidationService,
  ) {}

  /**
   * CREATE LECTURE (ENTERPRISE OPTIMIZED)
   * 
   * Features:
   * - JWT-based access validation (zero auth queries)
   * - Minimal database queries
   * - Production-ready error handling
   */
  async createLecture(createLectureDto: CreateLectureDto, user: EnhancedJwtPayload) {
    const { causeId, title, content, isPublic } = createLectureDto;

    try {
      // Step 1: Get cause with minimal data and organization info
      const causeBigIntId = convertToBigInt(causeId);
      const cause = await this.prisma.cause.findUnique({
        where: { causeId: causeBigIntId },
        select: {
          causeId: true,
          organizationId: true,
          title: true,
          isPublic: true,
        },
      });

      if (!cause) {
        throw new NotFoundException('Cause not found');
      }

      // Step 2: JWT-BASED ACCESS VALIDATION (zero database queries)
      const organizationId = convertToString(cause.organizationId);
      this.jwtAccessValidation.requireOrganizationModerator(user, organizationId);

      // Step 3: Create lecture with minimal data return
      const lecture = await this.prisma.lecture.create({
        data: {
          causeId: causeBigIntId,
          title,
          content,
          description: createLectureDto.description,
          venue: createLectureDto.venue,
          mode: createLectureDto.mode,
          timeStart: createLectureDto.timeStart ? new Date(createLectureDto.timeStart) : null,
          timeEnd: createLectureDto.timeEnd ? new Date(createLectureDto.timeEnd) : null,
          liveLink: createLectureDto.liveLink,
          liveMode: createLectureDto.liveMode,
          recordingUrl: createLectureDto.recordingUrl,
          isPublic: isPublic ?? false,
        },
        select: {
          lectureId: true,
          causeId: true,
          title: true,
          description: true,
          content: true,
          venue: true,
          mode: true,
          timeStart: true,
          timeEnd: true,
          liveLink: true,
          liveMode: true,
          recordingUrl: true,
          isPublic: true,
          createdAt: true,
          cause: {
            select: {
              causeId: true,
              title: true,
              organizationId: true,
            },
          },
        },
      });

      this.logger.log(`📚 Lecture created: ${lecture.lectureId} by user ${user.sub} in cause ${causeId}`);
      return lecture;

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Lecture creation failed for cause ${causeId}:`, error);
      throw new BadRequestException('Failed to create lecture');
    }
  }

  /**
   * GET LECTURES WITH ADVANCED FILTERING (ENTERPRISE OPTIMIZED)
   * 
   * Features:
   * - JWT-based access filtering
   * - Optimized cause ID filtering
   * - Minimal joins and queries
   * - Production-ready pagination
   */
  async getLectures(
    user: EnhancedJwtPayload | undefined, 
    queryDto: LectureQueryDto = {}
  ): Promise<PaginatedResponse<any>> {
    
    try {
      // Step 1: Build optimized where clause
      const where = this.buildOptimizedWhereClause(user, queryDto);
      
      // Step 2: Pagination setup
      const page = parseInt(queryDto.page || '1');
      const limit = Math.min(parseInt(queryDto.limit || '10'), 100); // Max 100 items
      const skip = (page - 1) * limit;

      // Step 3: Sorting setup
      const orderBy = this.buildOrderByClause(queryDto);

      // Step 4: Execute optimized query with minimal joins
      const [lectures, total] = await Promise.all([
        this.prisma.lecture.findMany({
          where,
          select: {
            lectureId: true,
            title: true,
            description: true,
            venue: true,
            mode: true,
            timeStart: true,
            timeEnd: true,
            liveLink: true,
            liveMode: true,
            recordingUrl: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
            causeId: true,
            cause: {
              select: {
                causeId: true,
                title: true,
                organizationId: true,
                organization: {
                  select: {
                    organizationId: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.lecture.count({ where }),
      ]);

      this.logger.log(`📚 Retrieved ${lectures.length} lectures (${total} total) for user ${user?.sub || 'anonymous'}`);

      const paginationDto = new PaginationDto();
      paginationDto.page = page.toString();
      paginationDto.limit = limit.toString();
      paginationDto.sortBy = queryDto.sortBy || 'createdAt';
      paginationDto.sortOrder = (queryDto.sortOrder || 'desc') as 'asc' | 'desc';
      paginationDto.search = queryDto.search;

      return createPaginatedResponse(lectures, total, paginationDto);

    } catch (error) {
      this.logger.error('Lecture retrieval failed:', error);
      throw new BadRequestException('Failed to retrieve lectures');
    }
  }

  /**
   * GET LECTURE BY ID (ENTERPRISE OPTIMIZED)
   */
  async getLectureById(lectureId: string, user?: EnhancedJwtPayload) {
    try {
      const lectureBigIntId = convertToBigInt(lectureId);
      
      // Get lecture with minimal joins
      const lecture = await this.prisma.lecture.findUnique({
        where: { lectureId: lectureBigIntId },
        select: {
          lectureId: true,
          title: true,
          description: true,
          content: true,
          venue: true,
          mode: true,
          timeStart: true,
          timeEnd: true,
          liveLink: true,
          liveMode: true,
          recordingUrl: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
          causeId: true,
          cause: {
            select: {
              causeId: true,
              title: true,
              organizationId: true,
              organization: {
                select: {
                  organizationId: true,
                  name: true,
                  isPublic: true,
                },
              },
            },
          },
        },
      });

      if (!lecture) {
        throw new NotFoundException('Lecture not found');
      }

      // JWT-based access validation
      if (!lecture.isPublic && user) {
        const organizationId = convertToString(lecture.cause.organization.organizationId);
        this.jwtAccessValidation.requireOrganizationMember(user, organizationId);
      } else if (!lecture.isPublic && !user) {
        throw new ForbiddenException('Access denied - authentication required');
      }

      this.logger.log(`📚 Lecture ${lectureId} accessed by user ${user?.sub || 'anonymous'}`);
      return lecture;

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Lecture retrieval failed for ID ${lectureId}:`, error);
      throw new BadRequestException('Failed to retrieve lecture');
    }
  }

  /**
   * UPDATE LECTURE (ENTERPRISE OPTIMIZED)
   */
  async updateLecture(lectureId: string, updateLectureDto: UpdateLectureDto, user: EnhancedJwtPayload) {
    try {
      const lectureBigIntId = convertToBigInt(lectureId);

      // Get lecture with minimal organization data
      const lecture = await this.prisma.lecture.findUnique({
        where: { lectureId: lectureBigIntId },
        select: {
          lectureId: true,
          causeId: true,
          cause: {
            select: {
              organizationId: true,
            },
          },
        },
      });

      if (!lecture) {
        throw new NotFoundException('Lecture not found');
      }

      // JWT-based access validation
      const organizationId = convertToString(lecture.cause.organizationId);
      this.jwtAccessValidation.requireOrganizationModerator(user, organizationId);

      // Prepare update data
      const updateData: any = {};
      Object.keys(updateLectureDto).forEach(key => {
        const value = updateLectureDto[key as keyof UpdateLectureDto];
        if (value !== undefined) {
          if (key === 'timeStart' || key === 'timeEnd') {
            updateData[key] = value ? new Date(value as string) : null;
          } else {
            updateData[key] = value;
          }
        }
      });

      // Update lecture
      const updatedLecture = await this.prisma.lecture.update({
        where: { lectureId: lectureBigIntId },
        data: updateData,
        select: {
          lectureId: true,
          title: true,
          description: true,
          content: true,
          venue: true,
          mode: true,
          timeStart: true,
          timeEnd: true,
          liveLink: true,
          liveMode: true,
          recordingUrl: true,
          isPublic: true,
          updatedAt: true,
          causeId: true,
        },
      });

      this.logger.log(`📚 Lecture ${lectureId} updated by user ${user.sub}`);
      return updatedLecture;

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Lecture update failed for ID ${lectureId}:`, error);
      throw new BadRequestException('Failed to update lecture');
    }
  }

  /**
   * DELETE LECTURE (ENTERPRISE OPTIMIZED)
   */
  async deleteLecture(lectureId: string, user: EnhancedJwtPayload) {
    try {
      const lectureBigIntId = convertToBigInt(lectureId);

      // Get lecture with minimal organization data
      const lecture = await this.prisma.lecture.findUnique({
        where: { lectureId: lectureBigIntId },
        select: {
          lectureId: true,
          title: true,
          causeId: true,
          cause: {
            select: {
              organizationId: true,
            },
          },
        },
      });

      if (!lecture) {
        throw new NotFoundException('Lecture not found');
      }

      // JWT-based access validation (require admin level)
      const organizationId = convertToString(lecture.cause.organizationId);
      this.jwtAccessValidation.requireOrganizationAdmin(user, organizationId);

      // Delete lecture
      await this.prisma.lecture.delete({
        where: { lectureId: lectureBigIntId },
      });

      this.logger.warn(`🗑️ Lecture ${lectureId} (${lecture.title}) deleted by user ${user.sub}`);
      
      return {
        message: 'Lecture deleted successfully',
        deletedLecture: {
          lectureId: convertToString(lecture.lectureId),
          title: lecture.title,
          deletedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Lecture deletion failed for ID ${lectureId}:`, error);
      throw new BadRequestException('Failed to delete lecture');
    }
  }

  /**
   * OPTIMIZED WHERE CLAUSE BUILDER
   * 
   * Builds efficient database queries with JWT-based filtering
   */
  private buildOptimizedWhereClause(user: EnhancedJwtPayload | undefined, queryDto: LectureQueryDto): any {
    const where: any = {};

    // Step 1: Base access control (JWT-based)
    if (user) {
      // Get user's organization IDs from JWT token
      const userOrgIds = this.jwtAccessValidation.getUserOrganizationsByRole(user)
        .map(org => convertToBigInt(org.organizationId));

      where.OR = [
        { isPublic: true },
        {
          cause: {
            organizationId: {
              in: userOrgIds,
            },
          },
        },
      ];
    } else {
      // Anonymous users see only public lectures
      where.isPublic = true;
    }

    // Step 2: OPTIMIZED CAUSE ID FILTERING (main feature)
    if (queryDto.causeIds) {
      const causeIdArray = queryDto.causeIds.split(',').map(id => convertToBigInt(id.trim()));
      where.causeId = { in: causeIdArray };
    } else if (queryDto.causeId) {
      where.causeId = convertToBigInt(queryDto.causeId);
    }

    // Step 3: Organization filtering (if specified and user has access)
    if (queryDto.organizationIds && user) {
      const orgIdArray = queryDto.organizationIds.split(',').map(id => convertToBigInt(id.trim()));
      where.cause = {
        ...(where.cause || {}),
        organizationId: { in: orgIdArray },
      };
    } else if (queryDto.organizationId && user) {
      where.cause = {
        ...(where.cause || {}),
        organizationId: convertToBigInt(queryDto.organizationId),
      };
    }

    // Step 4: Search filtering
    if (queryDto.search) {
      where.OR = [
        ...(where.OR || []),
        {
          title: { contains: queryDto.search, mode: 'insensitive' },
        },
        {
          description: { contains: queryDto.search, mode: 'insensitive' },
        },
      ];
    }

    // Step 5: Mode filtering
    if (queryDto.mode) {
      where.mode = queryDto.mode;
    }

    // Step 6: Visibility filtering
    if (queryDto.isPublic && queryDto.isPublic !== 'all') {
      where.isPublic = queryDto.isPublic === 'true';
    }

    // Step 7: Date filtering
    if (queryDto.fromDate || queryDto.toDate) {
      where.timeStart = {};
      if (queryDto.fromDate) {
        where.timeStart.gte = new Date(queryDto.fromDate);
      }
      if (queryDto.toDate) {
        where.timeStart.lte = new Date(queryDto.toDate);
      }
    }

    // Step 8: Status filtering (upcoming, live, completed)
    if (queryDto.status && queryDto.status !== 'all') {
      const now = new Date();
      switch (queryDto.status) {
        case 'upcoming':
          where.timeStart = { gt: now };
          break;
        case 'live':
          where.AND = [
            { timeStart: { lte: now } },
            { timeEnd: { gte: now } },
          ];
          break;
        case 'completed':
          where.timeEnd = { lt: now };
          break;
      }
    }

    return where;
  }

  /**
   * OPTIMIZED ORDER BY CLAUSE BUILDER
   */
  private buildOrderByClause(queryDto: LectureQueryDto): any {
    const sortBy = queryDto.sortBy || 'createdAt';
    const sortOrder = queryDto.sortOrder || 'desc';

    return { [sortBy]: sortOrder };
  }
}
