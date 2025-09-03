import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseInterceptors, Logger, UploadedFiles, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { LectureService } from './lecture.service';
import { CreateLectureDto, UpdateLectureDto, LectureQueryDto } from './dto/lecture.dto';
import { CreateLectureWithDocumentsDto } from './dto/create-lecture-with-documents.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { EnhancedJwtPayload } from '../auth/organization-access.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

/**
 * LECTURE CONTROLLER
 * 
 * Handles all lecture-related operations including document uploads to S3
 */
@ApiTags('Lectures')
@Controller('lectures')
@UseInterceptors(SecurityHeadersInterceptor)
@ApiBearerAuth()
export class LectureController {
  private readonly logger = new Logger(LectureController.name);

  constructor(private lectureService: LectureService) {}

  /**
   * CREATE LECTURE
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new lecture - Requires Authentication' })
  @ApiBody({ type: CreateLectureDto })
  @ApiResponse({ status: 201, description: 'Lecture created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async createLecture(
    @Body() createLectureDto: CreateLectureDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}" by user ${user.sub}`);
    return this.lectureService.createLecture(createLectureDto, user);
  }

  /**
   * CREATE LECTURE WITH DOCUMENTS
   * 
   * Enhanced endpoint that allows creating a lecture with multiple document uploads to S3
   * Uses multipart/form-data to handle file uploads
   */
  @Post('with-documents/:causeId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('documents', 10)) // Allow up to 10 files
  @ApiOperation({ summary: 'Create lecture with document uploads to S3 - Requires Authentication' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'causeId', description: 'ID of the cause to create lecture for' })
  @ApiBody({ 
    type: CreateLectureDto,
    description: 'Lecture data with optional file uploads (use form-data)' 
  })
  @ApiResponse({ status: 201, description: 'Lecture created with documents successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this cause' })
  async createLectureWithDocuments(
    @Param('causeId') causeId: string,
    @Body() createLectureDto: CreateLectureDto,
    @GetUser() user: EnhancedJwtPayload,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}" with ${files?.length || 0} documents for cause ${causeId} by user ${user.sub}`);
    return this.lectureService.createLectureWithDocuments(
      createLectureDto,
      causeId,
      user,
      files
    );
  }

  /**
   * GET LECTURES WITH FILTERING
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get lectures with filtering - Requires Authentication' })
  @ApiQuery({ name: 'causeId', required: false, description: 'Filter by cause ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Lectures retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async getLectures(
    @Query() queryDto: LectureQueryDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Fetching lectures with filters: ${JSON.stringify(queryDto)} by user ${user.sub}`);
    return this.lectureService.getLectures(user, queryDto);
  }

  /**
   * GET LECTURE BY ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get lecture by ID - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async getLectureById(
    @Param('id') id: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Fetching lecture with ID: ${id} by user ${user.sub}`);
    return this.lectureService.getLectureById(id, user);
  }

  /**
   * UPDATE LECTURE
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update lecture - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiBody({ type: UpdateLectureDto })
  @ApiResponse({ status: 200, description: 'Lecture updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateLecture(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Updating lecture ${id} by user ${user.sub}`);
    return this.lectureService.updateLecture(id, updateLectureDto, user);
  }

  /**
   * DELETE LECTURE
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete lecture - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async deleteLecture(
    @Param('id') id: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Deleting lecture ${id} by user ${user.sub}`);
    return this.lectureService.deleteLecture(id, user);
  }

  /**
   * GET LECTURE DOCUMENTS
   */
  @Get(':id/documents')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get lecture documents - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture documents retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async getLectureDocuments(
    @Param('id') id: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Fetching documents for lecture ${id} by user ${user.sub}`);
    return this.lectureService.getLectureDocuments(id, user);
  }
}
