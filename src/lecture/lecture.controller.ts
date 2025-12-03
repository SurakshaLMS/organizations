import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseInterceptors, Logger, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { LectureService } from './lecture.service';
import { CreateLectureDto, UpdateLectureDto, LectureQueryDto } from './dto/lecture.dto';
import { CreateLectureWithFilesDto, UpdateLectureWithFilesDto } from './dto/lecture-with-files.dto';
import { CreateLectureWithDocumentsDto } from './dto/create-lecture-with-documents.dto';
import { CreateLectureWithDocumentsBodyDto } from './dto/create-lecture-documents-body.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { EnhancedJwtAuthGuard, EnhancedOptionalJwtAuthGuard } from '../auth/guards/enhanced-jwt-auth.guard';
import { EnhancedJwtValidationInterceptor } from '../auth/interceptors/enhanced-jwt-validation.interceptor';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RequireMember, RequireModerator, RequireAdmin } from '../auth/decorators/roles.decorator';
import { RequireOrganizationMember, RequireOrganizationModerator, RequireOrganizationAdmin } from '../auth/decorators/organization-access.decorator';
import { EnhancedJwtPayload } from '../auth/organization-access.service';

/**
 * LECTURE CONTROLLER
 * 
 * Handles all lecture-related operations with S3 signed URL upload flow
 * All file uploads must go through the signed URL endpoint first
 * CORS and proxy support handled centrally in main.ts for any origin/proxy configuration
 * 
 * Features:
 * - Basic lecture CRUD operations
 * - Document management with pre-uploaded S3 URLs (signed URL flow)
 * - Comprehensive API documentation with Swagger
 * - JWT authentication and authorization
 * 
 * UPLOAD FLOW:
 * 1. Frontend requests signed URL from /signed-url/generate-upload-url
 * 2. Frontend uploads file directly to S3 using signed URL
 * 3. Frontend sends returned URL to lecture endpoints (this controller)
 */
@ApiTags('Lectures')
@Controller('lectures')
@UseInterceptors(SecurityHeadersInterceptor, EnhancedJwtValidationInterceptor)
export class LectureController {
  private readonly logger = new Logger(LectureController.name);

  constructor(private lectureService: LectureService) {}

  /**
   * CREATE LECTURE (Basic - No File Upload)
   * Authentication required
   */
  @Post()
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Create a new lecture (without file upload)',
    description: 'Authentication required'
  })
  @ApiBody({ type: CreateLectureDto })
  @ApiResponse({ status: 201, description: 'Lecture created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async createLecture(
    @Body() createLectureDto: CreateLectureDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}" - User: ${user.email}`);
    return this.lectureService.createLecture(createLectureDto, user);
  }

  /**
   * CREATE LECTURE WITH DOCUMENT URLs (Signed URL Flow)
   * 
   * This endpoint accepts JSON with pre-uploaded document URLs
   * 
   * REQUIRED UPLOAD FLOW:
   * 1. Upload files first via POST /signed-url/generate-upload-url
   * 2. Upload file to returned signed URL
   * 3. Pass returned URLs in documents array here
   * 
   * Authentication required
   */
  @Post('with-files')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Create lecture with pre-uploaded document URLs (use signed URL flow)',
    description: 'Authentication required. Files must be uploaded via signed URL flow first.'
  })
  @ApiBody({ 
    type: CreateLectureWithFilesDto,
    description: 'Lecture data with document URLs from signed upload (JSON format only)' 
  })
  @ApiResponse({ status: 201, description: 'Lecture created with documents successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data. Ensure you are sending JSON with pre-uploaded URLs.' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async createLectureWithFiles(
    @Body() createLectureDto: CreateLectureWithFilesDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}" with ${createLectureDto.documents?.length || 0} documents - User: ${user.email}`);
    
    return this.lectureService.createLectureWithDocuments(
      createLectureDto,
      createLectureDto.causeId,
      user,
      []
    );
  }

  /**
   * CREATE LECTURE WITH DOCUMENTS (Signed URL Flow)
   * 
   * This endpoint accepts JSON with pre-uploaded document URLs (using signed URL flow)
   * Files must be uploaded first via /signed-url/generate-upload-url
   * Then pass the returned URLs in the documents array
   * Authentication required
   */
  @Post('with-documents/:causeId')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Create lecture with document URLs (use signed URL flow to upload files first)',
    description: 'Authentication required. Upload files first via /signed-url/generate-upload-url, then pass URLs here.'
  })
  @ApiParam({ name: 'causeId', description: 'ID of the cause to create lecture for' })
  @ApiBody({ 
    type: CreateLectureWithDocumentsBodyDto,
    description: 'Lecture data with document URLs from signed upload (JSON format)' 
  })
  @ApiResponse({ status: 201, description: 'Lecture created with documents successfully' })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 400, description: 'Invalid request data or file format' })
  async createLectureWithDocuments(
    @Param('causeId') causeId: string,
    @Body() createLectureDto: CreateLectureWithDocumentsBodyDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Received lecture creation request - Full DTO: ${JSON.stringify(createLectureDto)}`);
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}" for cause ${causeId} - User: ${user.email}`);
    
    // Validate required fields
    if (!createLectureDto.title || createLectureDto.title.trim() === '') {
      this.logger.error(`❌ Missing or empty title in request body`);
      throw new BadRequestException('title is required and cannot be empty');
    }
    
    // Create full DTO with causeId from URL parameter
    const fullLectureDto = {
      ...createLectureDto,
      causeId: causeId
    } as CreateLectureDto;
    
    return this.lectureService.createLectureWithDocuments(
      fullLectureDto,
      causeId,
      user,
      []
    );
  }

  /**
   * GET LECTURES WITH FILTERING
   * Authentication required
   */
  @Get()
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ summary: 'Get lectures with filtering (authentication required)' })
  @ApiQuery({ name: 'causeId', required: false, description: 'Filter by cause ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Lectures retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async getLectures(
    @GetUser() user: EnhancedJwtPayload,
    @Query() queryDto: LectureQueryDto,
  ) {
    this.logger.log(`📚 Fetching lectures with filters: ${JSON.stringify(queryDto)} - User: ${user.email}`);
    return this.lectureService.getLectures(user, queryDto);
  }

  /**
   * GET LECTURE BY ID
   * Authentication required
   */
  @Get(':id')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ summary: 'Get lecture by ID (authentication required)' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async getLectureById(
    @Param('id') id: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Fetching lecture with ID: ${id} - User: ${user.email}`);
    return this.lectureService.getLectureById(id, user);
  }

  /**
   * UPDATE LECTURE (Basic - No File Upload)
   * Authentication required
   */
  @Put(':id')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Update lecture (without file upload)',
    description: 'Authentication required'
  })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiBody({ type: UpdateLectureDto })
  @ApiResponse({ status: 200, description: 'Lecture updated successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async updateLecture(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Updating lecture ${id} - User: ${user.email}`);
    return this.lectureService.updateLecture(id, updateLectureDto, user);
  }

  /**
   * UPDATE LECTURE WITH FILES (Signed URL Flow)
   * 
   * Enhanced endpoint for updating lecture with pre-uploaded document URLs
   * Files must be uploaded via signed URL flow first
   * 
   * REQUIRED UPLOAD FLOW:
   * 1. Upload files first via POST /signed-url/generate-upload-url
   * 2. Upload file to returned signed URL
   * 3. Pass returned URLs in documents array here
   * 
   * Authentication required - uses JWT token
   */
  @Put(':id/with-files')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Update lecture with pre-uploaded document URLs (use signed URL flow)',
    description: 'Authentication required. Files must be uploaded via signed URL flow first.'
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Lecture ID to update' })
  @ApiBody({ 
    type: UpdateLectureWithFilesDto,
    description: 'Lecture update data with document URLs from signed upload (JSON format only)' 
  })
  @ApiResponse({ status: 200, description: 'Lecture updated with documents successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  @ApiResponse({ status: 400, description: 'Invalid request data. Ensure you are sending JSON with pre-uploaded URLs.' })
  async updateLectureWithFiles(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureWithFilesDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Updating lecture ${id} with ${updateLectureDto.documents?.length || 0} documents by user ${user.sub}`);
    return this.lectureService.updateLectureWithDocuments(id, updateLectureDto, [], user);
  }

  /**
   * UPDATE LECTURE WITH DOCUMENTS (Signed URL Flow)
   * 
   * Endpoint for updating lecture with pre-uploaded document URLs
   * Files must be uploaded via signed URL flow first
   * 
   * REQUIRED UPLOAD FLOW:
   * 1. Upload files first via POST /signed-url/generate-upload-url
   * 2. Upload file to returned signed URL
   * 3. Pass returned URLs in documents array here
   * 
   * Authentication required - uses JWT token
   */
  @Put(':id/with-documents')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Update lecture with pre-uploaded document URLs (use signed URL flow)',
    description: 'Authentication required. Files must be uploaded via signed URL flow first.'
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Lecture ID to update' })
  @ApiBody({ 
    type: UpdateLectureDto,
    description: 'Lecture update data with document URLs from signed upload (JSON format only)' 
  })
  @ApiResponse({ status: 200, description: 'Lecture updated with documents successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  @ApiResponse({ status: 400, description: 'Invalid request data or file format' })
  async updateLectureWithDocuments(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 [LEGACY] Updating lecture ${id} by user ${user.sub}`);
    return this.lectureService.updateLectureWithDocuments(id, updateLectureDto, [], user);
  }

  /**
   * DELETE LECTURE
   * 
   * Authentication required
   * Implements cascade deletion of all related documents from S3 and database
   */
  @Delete(':id')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Delete lecture (Authentication required)',
    description: 'Delete lecture with authentication'
  })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture deleted successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async deleteLecture(
    @Param('id') id: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Deleting lecture ${id} - User: ${user.email}`);
    return this.lectureService.deleteLecture(id, user);
  }

  /**
   * GET LECTURE DOCUMENTS
   * Authentication required
   */
  @Get(':id/documents')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ summary: 'Get lecture documents (authentication required)' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture documents retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async getLectureDocuments(
    @Param('id') id: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Fetching documents for lecture ${id} - User: ${user.email}`);
    return this.lectureService.getLectureDocuments(id, user);
  }

  /**
   * DELETE DOCUMENT
   * 
   * Deletes a specific document from both database and S3 storage
   * Requires organization moderator or admin permission
   * 
   * @example DELETE /organization/api/v1/lectures/documents/123
   */
  @Delete('documents/:documentId')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Delete lecture document',
    description: 'Delete a document from lecture (removes from both database and S3 storage). Requires moderator permission.'
  })
  @ApiParam({ name: 'documentId', description: 'Document ID to delete' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(
    @Param('documentId') documentId: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`🗑️ Deleting document ${documentId} - User: ${user.email}`);
    return this.lectureService.deleteDocument(documentId, user);
  }
}
