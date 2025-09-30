import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseInterceptors, Logger, UploadedFiles, UseGuards } from '@nestjs/common';
import { FilesInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { LectureService } from './lecture.service';
import { CreateLectureDto, UpdateLectureDto, LectureQueryDto } from './dto/lecture.dto';
import { CreateLectureWithFilesDto, UpdateLectureWithFilesDto } from './dto/lecture-with-files.dto';
import { CreateLectureWithDocumentsDto } from './dto/create-lecture-with-documents.dto';
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
@UseInterceptors(SecurityHeadersInterceptor, EnhancedJwtValidationInterceptor)
export class LectureController {
  private readonly logger = new Logger(LectureController.name);

  constructor(private lectureService: LectureService) {}

  /**
   * CREATE LECTURE (Basic - No File Upload)
   * No authentication required for testing
   */
  @Post()
  @ApiOperation({ 
    summary: 'Create a new lecture (without file upload)',
    description: 'No authentication required'
  })
  @ApiBody({ type: CreateLectureDto })
  @ApiResponse({ status: 201, description: 'Lecture created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createLecture(
    @Body() createLectureDto: CreateLectureDto
  ) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}" - No auth required`);
    // Create a mock user for the service call
    const mockUser = { 
      sub: 'anonymous-user',
      email: 'anonymous@example.com',
      name: 'Anonymous User',
      userType: 'USER', 
      orgAccess: [], // Compact format array
      isGlobalAdmin: false
    } as EnhancedJwtPayload;
    return this.lectureService.createLecture(createLectureDto, mockUser);
  }

  /**
   * CREATE LECTURE WITH FILE UPLOADS (Enhanced)
   * 
   * Enhanced endpoint that allows creating a lecture with multiple document uploads to GCS
   * Uses multipart/form-data to handle file uploads with Multer
   * Supports up to 10 document files per lecture
   * No authentication required for testing
   */
  @Post('with-files')
  @UseInterceptors(FilesInterceptor('documents', 10)) // Allow up to 10 files with field name 'documents'
  @ApiOperation({ 
    summary: 'Create lecture with document uploads to Google Cloud Storage',
    description: 'No authentication required'
  })
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
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}" with ${files?.length || 0} documents - No auth required`);
    
    // Create a mock user for the service call
    const mockUser = { 
      sub: 'anonymous-user',
      email: 'anonymous@example.com',
      name: 'Anonymous User',
      userType: 'USER', 
      orgAccess: [],
      isGlobalAdmin: false
    } as EnhancedJwtPayload;
    
    return this.lectureService.createLectureWithDocuments(
      createLectureDto,
      createLectureDto.causeId,
      mockUser,
      files
    );
  }

  /**
   * CREATE LECTURE WITH DOCUMENTS (Legacy Endpoint)
   * 
   * Legacy endpoint that requires causeId in URL path
   * Maintained for backward compatibility
   * Use POST /lectures/with-files for new implementations
   * No authentication required for testing
   */
  @Post('with-documents/:causeId')
  @UseInterceptors(FilesInterceptor('documents', 10)) // Allow up to 10 files
  @ApiOperation({ 
    summary: 'Create lecture with document uploads (Legacy - use /with-files instead)',
    deprecated: true,
    description: 'No authentication required'
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
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    this.logger.log(`📚 [LEGACY] Creating lecture "${createLectureDto.title}" with ${files?.length || 0} documents for cause ${causeId} - No auth required`);
    
    // Create a mock user for the service call
    const mockUser = { 
      sub: 'anonymous-user',
      email: 'anonymous@example.com',
      name: 'Anonymous User',
      userType: 'USER', 
      orgAccess: [],
      isGlobalAdmin: false
    } as EnhancedJwtPayload;
    
    return this.lectureService.createLectureWithDocuments(
      createLectureDto,
      causeId,
      mockUser,
      files
    );
  }

  /**
   * GET LECTURES WITH FILTERING
   * Public access with optional authentication
   */
  @Get()
  @UseGuards(EnhancedOptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get lectures with filtering (public access)' })
  @ApiQuery({ name: 'causeId', required: false, description: 'Filter by cause ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Lectures retrieved successfully' })
  async getLectures(
    @Query() queryDto: LectureQueryDto,
    @GetUser() user?: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Fetching lectures with filters: ${JSON.stringify(queryDto)}`);
    return this.lectureService.getLectures(user, queryDto);
  }

  /**
   * GET LECTURE BY ID
   * Public access with optional authentication
   */
  @Get(':id')
  @UseGuards(EnhancedOptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get lecture by ID (public access)' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async getLectureById(
    @Param('id') id: string,
    @GetUser() user?: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Fetching lecture with ID: ${id}`);
    return this.lectureService.getLectureById(id, user);
  }

  /**
   * UPDATE LECTURE (Basic - No File Upload)
   * No authentication required for testing
   */
  @Put(':id')
  @ApiOperation({ 
    summary: 'Update lecture (without file upload)',
    description: 'No authentication required'
  })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiBody({ type: UpdateLectureDto })
  @ApiResponse({ status: 200, description: 'Lecture updated successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async updateLecture(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureDto
  ) {
    this.logger.log(`📚 Updating lecture ${id} - No auth required`);
    
    // Create a mock user for the service call
    const mockUser = { 
      sub: 'anonymous-user',
      email: 'anonymous@example.com',
      name: 'Anonymous User',
      userType: 'USER', 
      orgAccess: [],
      isGlobalAdmin: false
    } as EnhancedJwtPayload;
    
    return this.lectureService.updateLecture(id, updateLectureDto, mockUser);
  }

  /**
   * UPDATE LECTURE WITH FILE UPLOADS (Enhanced)
   * 
   * Enhanced endpoint for updating lecture with new document uploads
   * Supports both updating lecture details and adding new documents
   * Uses multipart/form-data with FilesInterceptor for better file handling
   * No authentication required for testing
   */
  @Put(':id/with-files')
  @UseInterceptors(FilesInterceptor('documents', 10)) // Accept up to 10 files with field name 'documents'
  @ApiOperation({ 
    summary: 'Update lecture with document uploads to Google Cloud Storage',
    description: 'No authentication required'
  })
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
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    this.logger.log(`📚 Updating lecture ${id} with ${files?.length || 0} documents - No auth required`);
    
    // Create a mock user for the service call
    const mockUser = { 
      sub: 'anonymous-user',
      email: 'anonymous@example.com',
      name: 'Anonymous User',
      userType: 'USER', 
      orgAccess: [],
      isGlobalAdmin: false
    } as EnhancedJwtPayload;
    
    return this.lectureService.updateLectureWithDocuments(id, updateLectureDto, files, mockUser);
  }

  /**
   * UPDATE LECTURE WITH DOCUMENTS (Legacy Endpoint)
   * 
   * Legacy endpoint for updating lecture with new document uploads
   * Maintained for backward compatibility
   * Use PUT /:id/with-files for new implementations
   * Accepts files from any field name (documents, files, file, etc.)
   * No authentication required for testing
   */
  @Put(':id/with-documents')
  @UseInterceptors(AnyFilesInterceptor()) // Accept files from any field name
  @ApiOperation({ 
    summary: 'Update lecture with document uploads (Legacy - use /:id/with-files instead)',
    deprecated: true,
    description: 'No authentication required'
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
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    this.logger.log(`📚 [LEGACY] Updating lecture ${id} with ${files?.length || 0} documents - No auth required`);
    
    // Create a mock user for the service call
    const mockUser = { 
      sub: 'anonymous-user',
      email: 'anonymous@example.com',
      name: 'Anonymous User',
      userType: 'USER', 
      orgAccess: [],
      isGlobalAdmin: false
    } as EnhancedJwtPayload;
    
    return this.lectureService.updateLectureWithDocuments(id, updateLectureDto, files, mockUser);
  }

  /**
   * DELETE LECTURE
   * 
   * No authentication required for testing
   * Implements cascade deletion of all related documents from S3 and database
   */
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete lecture (No auth required)',
    description: 'Delete lecture without authentication'
  })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async deleteLecture(
    @Param('id') id: string
  ) {
    this.logger.log(`📚 Deleting lecture ${id} - No auth required`);
    
    // Create a mock user for the service call
    const mockUser = { 
      sub: 'anonymous-user',
      email: 'anonymous@example.com',
      name: 'Anonymous User',
      userType: 'USER', 
      orgAccess: [],
      isGlobalAdmin: false
    } as EnhancedJwtPayload;
    
    return this.lectureService.deleteLecture(id, mockUser);
  }

  /**
   * GET LECTURE DOCUMENTS
   * Public access with optional authentication
   */
  @Get(':id/documents')
  @UseGuards(EnhancedOptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get lecture documents (public access)' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture documents retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async getLectureDocuments(
    @Param('id') id: string,
    @GetUser() user?: EnhancedJwtPayload
  ) {
    this.logger.log(`📚 Fetching documents for lecture ${id}`);
    return this.lectureService.getLectureDocuments(id, user);
  }
}
