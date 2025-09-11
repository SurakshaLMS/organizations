import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseInterceptors, Logger, UploadedFiles, UseGuards } from '@nestjs/common';
import { FilesInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { LectureService } from './lecture.service';
import { CreateLectureDto, UpdateLectureDto, LectureQueryDto } from './dto/lecture.dto';
import { CreateLectureWithFilesDto, UpdateLectureWithFilesDto } from './dto/lecture-with-files.dto';
import { CreateLectureWithDocumentsDto } from './dto/create-lecture-with-documents.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { EnhancedJwtPayload } from '../auth/organization-access.service';

/**
 * LECTURE CONTROLLER
 * 
 * Handles all lecture-related operations including document uploads to Google Cloud Storage
 * Enhanced with Multer file upload support for seamless document management
 * CORS and proxy support handled centrally in main.ts for any origin/proxy configuration
 * 
 * Features:
 * - Basic lecture CRUD operations
 * - Enhanced file upload endpoints with Multer integration
 * - Document management with GCS storage
 * - Comprehensive API documentation with Swagger
 * - Legacy endpoint support for backward compatibility
 */
@ApiTags('Lectures')
@Controller('lectures')
@UseInterceptors(SecurityHeadersInterceptor)
export class LectureController {
  private readonly logger = new Logger(LectureController.name);

  constructor(private lectureService: LectureService) {}

  /**
   * CREATE LECTURE (Basic - No File Upload)
   */
  @Post()
  @ApiOperation({ summary: 'Create a new lecture (without file upload)' })
  @ApiBody({ type: CreateLectureDto })
  @ApiResponse({ status: 201, description: 'Lecture created successfully' })
  async createLecture(
    @Body() createLectureDto: CreateLectureDto
  ) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}"`);
    return this.lectureService.createLecture(createLectureDto, undefined);
  }

  /**
   * CREATE LECTURE WITH FILE UPLOADS (Enhanced)
   * 
   * Enhanced endpoint that allows creating a lecture with multiple document uploads to GCS
   * Uses multipart/form-data to handle file uploads with Multer
   * Supports up to 10 document files per lecture
   */
  @Post('with-files')
  @UseInterceptors(FilesInterceptor('documents', 10)) // Allow up to 10 files with field name 'documents'
  @ApiOperation({ summary: 'Create lecture with document uploads to Google Cloud Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ 
    type: CreateLectureWithFilesDto,
    description: 'Lecture data with optional file uploads (use form-data with field name "documents")' 
  })
  @ApiResponse({ status: 201, description: 'Lecture created with documents successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data or file format' })
  @ApiResponse({ status: 413, description: 'File too large or too many files' })
  async createLectureWithFiles(
    @Body() createLectureDto: CreateLectureWithFilesDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}" with ${files?.length || 0} documents`);
    
    return this.lectureService.createLectureWithDocuments(
      createLectureDto,
      createLectureDto.causeId,
      undefined,
      files
    );
  }

  /**
   * CREATE LECTURE WITH DOCUMENTS (Legacy Endpoint)
   * 
   * Legacy endpoint that requires causeId in URL path
   * Maintained for backward compatibility
   * Use POST /lectures/with-files for new implementations
   */
  @Post('with-documents/:causeId')
  @UseInterceptors(FilesInterceptor('documents', 10)) // Allow up to 10 files
  @ApiOperation({ 
    summary: 'Create lecture with document uploads (Legacy - use /with-files instead)',
    deprecated: true 
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'causeId', description: 'ID of the cause to create lecture for' })
  @ApiBody({ 
    type: CreateLectureDto,
    description: 'Lecture data with optional file uploads (use form-data)' 
  })
  @ApiResponse({ status: 201, description: 'Lecture created with documents successfully' })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  @ApiResponse({ status: 400, description: 'Invalid request data or file format' })
  async createLectureWithDocuments(
    @Param('causeId') causeId: string,
    @Body() createLectureDto: CreateLectureDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    this.logger.log(`📚 [LEGACY] Creating lecture "${createLectureDto.title}" with ${files?.length || 0} documents for cause ${causeId}`);
    
    return this.lectureService.createLectureWithDocuments(
      createLectureDto,
      causeId,
      undefined,
      files
    );
  }

  /**
   * GET LECTURES WITH FILTERING
   */
  @Get()
  @ApiOperation({ summary: 'Get lectures with filtering' })
  @ApiQuery({ name: 'causeId', required: false, description: 'Filter by cause ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Lectures retrieved successfully' })
  async getLectures(
    @Query() queryDto: LectureQueryDto
  ) {
    this.logger.log(`📚 Fetching lectures with filters: ${JSON.stringify(queryDto)}`);
    return this.lectureService.getLectures(undefined, queryDto);
  }

  /**
   * GET LECTURE BY ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get lecture by ID' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async getLectureById(
    @Param('id') id: string
  ) {
    this.logger.log(`📚 Fetching lecture with ID: ${id}`);
    return this.lectureService.getLectureById(id, undefined);
  }

  /**
   * UPDATE LECTURE (Basic - No File Upload)
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update lecture (without file upload)' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiBody({ type: UpdateLectureDto })
  @ApiResponse({ status: 200, description: 'Lecture updated successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async updateLecture(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureDto
  ) {
    this.logger.log(`📚 Updating lecture ${id}`);
    return this.lectureService.updateLecture(id, updateLectureDto, undefined);
  }

  /**
   * UPDATE LECTURE WITH FILE UPLOADS (Enhanced)
   * 
   * Enhanced endpoint for updating lecture with new document uploads
   * Supports both updating lecture details and adding new documents
   * Uses multipart/form-data with FilesInterceptor for better file handling
   */
  @Put(':id/with-files')
  @UseInterceptors(FilesInterceptor('documents', 10)) // Accept up to 10 files with field name 'documents'
  @ApiOperation({ summary: 'Update lecture with document uploads to Google Cloud Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Lecture ID to update' })
  @ApiBody({ 
    type: UpdateLectureWithFilesDto,
    description: 'Lecture update data with optional file uploads (use form-data with field name "documents")' 
  })
  @ApiResponse({ status: 200, description: 'Lecture updated with documents successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  @ApiResponse({ status: 400, description: 'Invalid request data or file format' })
  @ApiResponse({ status: 413, description: 'File too large or too many files' })
  async updateLectureWithFiles(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureWithFilesDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    this.logger.log(`📚 Updating lecture ${id} with ${files?.length || 0} documents`);
    return this.lectureService.updateLectureWithDocuments(id, updateLectureDto, files, undefined);
  }

  /**
   * UPDATE LECTURE WITH DOCUMENTS (Legacy Endpoint)
   * 
   * Legacy endpoint for updating lecture with new document uploads
   * Maintained for backward compatibility
   * Use PUT /:id/with-files for new implementations
   * Accepts files from any field name (documents, files, file, etc.)
   */
  @Put(':id/with-documents')
  @UseInterceptors(AnyFilesInterceptor()) // Accept files from any field name
  @ApiOperation({ 
    summary: 'Update lecture with document uploads (Legacy - use /:id/with-files instead)',
    deprecated: true 
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Lecture ID to update' })
  @ApiBody({ 
    type: UpdateLectureDto,
    description: 'Lecture update data with optional file uploads (use form-data with any field name like documents, files, or file)' 
  })
  @ApiResponse({ status: 200, description: 'Lecture updated with documents successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  @ApiResponse({ status: 400, description: 'Invalid request data or file format' })
  async updateLectureWithDocuments(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    this.logger.log(`📚 [LEGACY] Updating lecture ${id} with ${files?.length || 0} documents`);
    return this.lectureService.updateLectureWithDocuments(id, updateLectureDto, files, undefined);
  }

  /**
   * DELETE LECTURE
   * 
   * Requires JWT authentication and organization-level authorization
   * Only organization admins and moderators can delete lectures
   * Implements cascade deletion of all related documents from S3 and database
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete lecture (Admin/Moderator only)' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async deleteLecture(
    @Param('id') id: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Deleting lecture ${id} requested by user ${user.sub}`);
    return this.lectureService.deleteLecture(id, user);
  }

  /**
   * GET LECTURE DOCUMENTS
   */
  @Get(':id/documents')
  @ApiOperation({ summary: 'Get lecture documents' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture documents retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async getLectureDocuments(
    @Param('id') id: string
  ) {
    this.logger.log(`📚 Fetching documents for lecture ${id}`);
    return this.lectureService.getLectureDocuments(id, undefined);
  }
}
