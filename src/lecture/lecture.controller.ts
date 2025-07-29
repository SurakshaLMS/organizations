import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, UseInterceptors, Logger } from '@nestjs/common';
import { LectureService } from './lecture.service';
import { CreateLectureDto, UpdateLectureDto, LectureQueryDto } from './dto/lecture.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { EnhancedJwtPayload } from '../auth/organization-access.service';

/**
 * ENTERPRISE LECTURE CONTROLLER
 * 
 * Production-ready lecture endpoints with:
 * - JWT-based access control
 * - Optimized cause ID filtering
 * - Enhanced security and performance
 * - Comprehensive error handling
 */
@Controller('lectures')
@UseInterceptors(SecurityHeadersInterceptor)
export class LectureController {
  private readonly logger = new Logger(LectureController.name);

  constructor(private lectureService: LectureService) {}

  /**
   * CREATE LECTURE (ENTERPRISE OPTIMIZED)
   * 
   * Requires JWT authentication and organization moderator access
   * Features: JWT-based access validation, minimal database queries
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createLecture(
    @Body() createLectureDto: CreateLectureDto,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}" by user ${user.sub}`);
    return this.lectureService.createLecture(createLectureDto, user);
  }

  /**
   * GET LECTURES WITH ADVANCED FILTERING (ENTERPRISE OPTIMIZED)
   * 
   * Features:
   * - Optional JWT authentication for enhanced access
   * - Optimized cause ID filtering (main feature)
   * - JWT-based access control with zero auth queries
   * - Production-ready pagination and search
   * 
   * Query Parameters:
   * - causeIds: "1,2,3" - Filter by multiple cause IDs
   * - causeId: "1" - Filter by single cause ID
   * - organizationIds: "1,2" - Filter by organization IDs (authenticated users only)
   * - search: "machine learning" - Search in title/description
   * - page, limit, sortBy, sortOrder - Pagination and sorting
   * - mode: "online|offline|hybrid" - Filter by lecture mode
   * - status: "upcoming|live|completed" - Filter by lecture status
   * - isPublic: "true|false|all" - Filter by visibility
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getLectures(
    @Query() queryDto: LectureQueryDto,
    @GetUser() user?: EnhancedJwtPayload,
  ) {
    this.logger.log(`📚 Fetching lectures with query: ${JSON.stringify(queryDto)} for user ${user?.sub || 'anonymous'}`);
    return this.lectureService.getLectures(user, queryDto);
  }

  /**
   * GET LECTURE BY ID (ENTERPRISE OPTIMIZED)
   * 
   * Features optional authentication for enhanced access to private lectures
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getLectureById(
    @Param('id') lectureId: string,
    @GetUser() user?: EnhancedJwtPayload,
  ) {
    this.logger.log(`📚 Fetching lecture ${lectureId} for user ${user?.sub || 'anonymous'}`);
    return this.lectureService.getLectureById(lectureId, user);
  }

  /**
   * UPDATE LECTURE (ENTERPRISE OPTIMIZED)
   * 
   * Requires JWT authentication and organization moderator access
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateLecture(
    @Param('id') lectureId: string,
    @Body() updateLectureDto: UpdateLectureDto,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    this.logger.log(`📚 Updating lecture ${lectureId} by user ${user.sub}`);
    return this.lectureService.updateLecture(lectureId, updateLectureDto, user);
  }

  /**
   * DELETE LECTURE (ENTERPRISE OPTIMIZED)
   * 
   * Requires JWT authentication and organization admin access
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteLecture(
    @Param('id') lectureId: string,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    this.logger.warn(`🗑️ Deleting lecture ${lectureId} by user ${user.sub}`);
    return this.lectureService.deleteLecture(lectureId, user);
  }

  /**
   * GET LECTURE DOCUMENTS (ENTERPRISE OPTIMIZED)
   * 
   * Separate endpoint for documents to avoid loading them when not needed
   * Supports optional authentication for enhanced access
   */
  @Get(':id/documents')
  @UseGuards(OptionalJwtAuthGuard)
  async getLectureDocuments(
    @Param('id') lectureId: string,
    @GetUser() user?: EnhancedJwtPayload,
  ) {
    this.logger.log(`📄 Fetching documents for lecture ${lectureId} by user ${user?.sub || 'anonymous'}`);
    return this.lectureService.getLectureDocuments(lectureId, user);
  }
}
