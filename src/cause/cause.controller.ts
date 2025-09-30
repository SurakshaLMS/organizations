import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseInterceptors, UploadedFile, Logger, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { CauseService } from './cause.service';
import { CreateCauseDto, UpdateCauseDto } from './dto/cause.dto';
import { CreateCauseWithImageDto, UpdateCauseWithImageDto, CauseResponseDto } from './dto/cause-with-image.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { EnhancedJwtAuthGuard, EnhancedOptionalJwtAuthGuard } from '../auth/guards/enhanced-jwt-auth.guard';
import { EnhancedJwtValidationInterceptor } from '../auth/interceptors/enhanced-jwt-validation.interceptor';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RequireMember, RequireModerator, RequireAdmin } from '../auth/decorators/roles.decorator';
import { RequireOrganizationMember, RequireOrganizationModerator, RequireOrganizationAdmin } from '../auth/decorators/organization-access.decorator';
import { EnhancedJwtPayload } from '../auth/organization-access.service';

/**
 * CAUSE CONTROLLER
 * 
 * Handles all cause-related operations including image uploads to Google Cloud Storage
 * Enhanced with Multer file upload support for seamless image management
 * 
 * Features:
 * - Basic cause CRUD operations
 * - Enhanced image upload endpoints with Multer integration
 * - Image management with GCS storage
 * - Comprehensive API documentation with Swagger
 * - Legacy endpoint support for backward compatibility
 */
@ApiTags('Causes')
@Controller('causes')
@UseInterceptors(SecurityHeadersInterceptor, EnhancedJwtValidationInterceptor)
export class CauseController {
  private readonly logger = new Logger(CauseController.name);

  constructor(private causeService: CauseService) {}

  /**
   * Create a new cause (Basic - No Image Upload)
   * Authentication required
   */
  @Post()
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Create a new cause (without image upload)', 
    description: 'Authentication required' 
  })
  @ApiBody({ type: CreateCauseDto })
  @ApiResponse({ status: 201, description: 'Cause created successfully', type: CauseResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async createCause(
    @Body() createCauseDto: CreateCauseDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📋 Creating cause "${createCauseDto.title}" - User: ${user.email}`);
    return this.causeService.createCause(createCauseDto);
  }

  /**
   * Create a new cause with image upload (Enhanced)
   * 
   * Enhanced endpoint that allows creating a cause with optional image upload to GCS
   * Uses multipart/form-data to handle image uploads with Multer
   * Supports image validation and automatic resizing
   * Authentication required
   */
  @Post('with-image')
  @UseInterceptors(FileInterceptor('image'))
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Create cause with image upload to Google Cloud Storage',
    description: 'Authentication required'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ 
    type: CreateCauseWithImageDto,
    description: 'Cause data with optional image upload (use form-data with field name "image")' 
  })
  @ApiResponse({ status: 201, description: 'Cause created with image successfully', type: CauseResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data or image format' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 413, description: 'Image file too large' })
  async createCauseWithImage(
    @Body() createCauseDto: CreateCauseWithImageDto,
    @UploadedFile() image: Express.Multer.File,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📋 Creating cause "${createCauseDto.title}" with ${image ? 'image' : 'no image'} - User: ${user.email}`);
    return this.causeService.createCauseWithImage(createCauseDto, image);
  }

  /**
   * Get all causes with pagination
   */
  @Get()
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ summary: 'Get all causes with pagination (authentication required)' })
  @ApiResponse({ status: 200, description: 'Causes retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async getCauses(
    @GetUser() user: EnhancedJwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
  ) {
    const paginationDto = new PaginationDto();
    paginationDto.page = page;
    paginationDto.limit = limit;
    paginationDto.sortBy = sortBy;
    paginationDto.sortOrder = sortOrder;
    paginationDto.search = search;

    const userId = user.sub;
    return this.causeService.getCauses(userId, paginationDto);
  }

  /**
   * Test GCS connection (Debug endpoint)
   * No authentication required for testing
   */
  @Get('test-gcs')
  @ApiOperation({ 
    summary: 'Test GCS connection (Debug - No auth required)',
    description: 'Test endpoint for GCS connection'
  })
  @ApiResponse({ status: 200, description: 'GCS connection test result' })
  async testGCSConnection() {
    this.logger.log(`🧪 Testing GCS connection - No auth required`);
    return this.causeService.testGCSConnection();
  }

  /**
   * Get cause by ID
   */
  @Get(':id')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ summary: 'Get cause by ID (authentication required)' })
  @ApiParam({ name: 'id', description: 'Cause ID' })
  @ApiResponse({ status: 200, description: 'Cause retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  async getCauseById(
    @Param('id') causeId: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    const userId = user.sub;
    return this.causeService.getCauseById(causeId, userId);
  }

  /**
   * Update cause (Basic - No Image Upload)
   * Authentication required
   */
  @Put(':id')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Update cause (without image upload)',
    description: 'Authentication required'
  })
  @ApiParam({ name: 'id', description: 'Cause ID' })
  @ApiBody({ type: UpdateCauseDto })
  @ApiResponse({ status: 200, description: 'Cause updated successfully', type: CauseResponseDto })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  async updateCause(
    @Param('id') causeId: string,
    @Body() updateCauseDto: UpdateCauseDto,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    this.logger.log(`📋 Updating cause ${causeId} - User: ${user.email}`);
    return this.causeService.updateCause(causeId, updateCauseDto);
  }

  /**
   * Update cause with image upload (Enhanced)
   * 
   * Enhanced endpoint for updating cause with optional image upload
   * Supports both updating cause details and replacing/adding image
   * Uses multipart/form-data with FileInterceptor for image handling
   * Authentication required
   */
  @Put(':id/with-image')
  @UseInterceptors(FileInterceptor('image'))
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Update cause with image upload to Google Cloud Storage',
    description: 'Authentication required'
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Cause ID to update' })
  @ApiBody({ 
    type: UpdateCauseWithImageDto,
    description: 'Cause update data with optional image upload (use form-data with field name "image")' 
  })
  @ApiResponse({ status: 200, description: 'Cause updated with image successfully', type: CauseResponseDto })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 400, description: 'Invalid request data or image format' })
  @ApiResponse({ status: 413, description: 'Image file too large' })
  async updateCauseWithImage(
    @Param('id') causeId: string,
    @Body() updateCauseDto: UpdateCauseWithImageDto,
    @UploadedFile() image: Express.Multer.File,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📋 Updating cause ${causeId} with ${image ? 'new image' : 'no image change'} - User: ${user.email}`);
    return this.causeService.updateCauseWithImage(causeId, updateCauseDto, image);
  }

  /**
   * Delete cause
   * Authentication required
   */
  @Delete(':id')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Delete cause (Authentication required)',
    description: 'Delete cause with authentication'
  })
  @ApiParam({ name: 'id', description: 'Cause ID' })
  @ApiResponse({ status: 200, description: 'Cause deleted successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  async deleteCause(
    @Param('id') causeId: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📋 Deleting cause ${causeId} - User: ${user.email}`);
    return this.causeService.deleteCause(causeId, user.sub);
  }

  /**
   * Get causes by organization
   */
  @Get('organization/:organizationId')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ summary: 'Get causes by organization (authentication required)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Causes retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async getCausesByOrganization(
    @Param('organizationId') organizationId: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    const userId = user.sub;
    return this.causeService.getCausesByOrganization(organizationId, userId);
  }
}
