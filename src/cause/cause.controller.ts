import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseInterceptors, UploadedFile, Logger, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { CauseService } from './cause.service';
import { CreateCauseDto, UpdateCauseDto } from './dto/cause.dto';
import { CreateCauseWithImageDto, UpdateCauseWithImageDto, CauseResponseDto } from './dto/cause-with-image.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
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
@UseInterceptors(SecurityHeadersInterceptor)
export class CauseController {
  private readonly logger = new Logger(CauseController.name);

  constructor(private causeService: CauseService) {}

  /**
   * Create a new cause (Basic - No Image Upload)
   * No authentication required for testing
   */
  @Post()
  @ApiOperation({ 
    summary: 'Create a new cause (without image upload)', 
    description: 'No authentication required' 
  })
  @ApiBody({ type: CreateCauseDto })
  @ApiResponse({ status: 201, description: 'Cause created successfully', type: CauseResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createCause(
    @Body() createCauseDto: CreateCauseDto
  ) {
    this.logger.log(`📋 Creating cause "${createCauseDto.title}" - No auth required`);
    return this.causeService.createCause(createCauseDto);
  }

  /**
   * Create a new cause with image upload (Enhanced)
   * 
   * Enhanced endpoint that allows creating a cause with optional image upload to GCS
   * Uses multipart/form-data to handle image uploads with Multer
   * Supports image validation and automatic resizing
   * No authentication required
   */
  @Post('with-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ 
    summary: 'Create cause with image upload to Google Cloud Storage',
    description: 'No authentication required'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ 
    type: CreateCauseWithImageDto,
    description: 'Cause data with optional image upload (use form-data with field name "image")' 
  })
  @ApiResponse({ status: 201, description: 'Cause created with image successfully', type: CauseResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data or image format' })
  @ApiResponse({ status: 413, description: 'Image file too large' })
  async createCauseWithImage(
    @Body() createCauseDto: CreateCauseWithImageDto,
    @UploadedFile() image: Express.Multer.File
  ) {
    this.logger.log(`📋 Creating cause "${createCauseDto.title}" with ${image ? 'image' : 'no image'} - No auth required`);
    return this.causeService.createCauseWithImage(createCauseDto, image);
  }

  /**
   * Get all causes with pagination
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all causes with pagination (public access)' })
  @ApiResponse({ status: 200, description: 'Causes retrieved successfully' })
  async getCauses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
    @GetUser() user?: EnhancedJwtPayload,
  ) {
    const paginationDto = new PaginationDto();
    paginationDto.page = page;
    paginationDto.limit = limit;
    paginationDto.sortBy = sortBy;
    paginationDto.sortOrder = sortOrder;
    paginationDto.search = search;

    const userId = user?.sub || undefined;
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
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get cause by ID (public access)' })
  @ApiParam({ name: 'id', description: 'Cause ID' })
  @ApiResponse({ status: 200, description: 'Cause retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  async getCauseById(
    @Param('id') causeId: string,
    @GetUser() user?: EnhancedJwtPayload
  ) {
    const userId = user?.sub || undefined;
    return this.causeService.getCauseById(causeId, userId);
  }

  /**
   * Update cause (Basic - No Image Upload)
   * No authentication required for testing
   */
  @Put(':id')
  @ApiOperation({ 
    summary: 'Update cause (without image upload)',
    description: 'No authentication required'
  })
  @ApiParam({ name: 'id', description: 'Cause ID' })
  @ApiBody({ type: UpdateCauseDto })
  @ApiResponse({ status: 200, description: 'Cause updated successfully', type: CauseResponseDto })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  async updateCause(
    @Param('id') causeId: string,
    @Body() updateCauseDto: UpdateCauseDto,
  ) {
    this.logger.log(`📋 Updating cause ${causeId} - No auth required`);
    return this.causeService.updateCause(causeId, updateCauseDto);
  }

  /**
   * Update cause with image upload (Enhanced)
   * 
   * Enhanced endpoint for updating cause with optional image upload
   * Supports both updating cause details and replacing/adding image
   * Uses multipart/form-data with FileInterceptor for image handling
   * No authentication required for testing
   */
  @Put(':id/with-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ 
    summary: 'Update cause with image upload to Google Cloud Storage',
    description: 'No authentication required'
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Cause ID to update' })
  @ApiBody({ 
    type: UpdateCauseWithImageDto,
    description: 'Cause update data with optional image upload (use form-data with field name "image")' 
  })
  @ApiResponse({ status: 200, description: 'Cause updated with image successfully', type: CauseResponseDto })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  @ApiResponse({ status: 400, description: 'Invalid request data or image format' })
  @ApiResponse({ status: 413, description: 'Image file too large' })
  async updateCauseWithImage(
    @Param('id') causeId: string,
    @Body() updateCauseDto: UpdateCauseWithImageDto,
    @UploadedFile() image: Express.Multer.File
  ) {
    this.logger.log(`📋 Updating cause ${causeId} with ${image ? 'new image' : 'no image change'} - No auth required`);
    return this.causeService.updateCauseWithImage(causeId, updateCauseDto, image);
  }

  /**
   * Delete cause
   * No authentication required for testing
   */
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete cause (No auth required)',
    description: 'Delete cause without authentication'
  })
  @ApiParam({ name: 'id', description: 'Cause ID' })
  @ApiResponse({ status: 200, description: 'Cause deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  async deleteCause(
    @Param('id') causeId: string
  ) {
    this.logger.log(`📋 Deleting cause ${causeId} - No auth required`);
    return this.causeService.deleteCause(causeId, 'anonymous-user');
  }

  /**
   * Get causes by organization
   */
  @Get('organization/:organizationId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get causes by organization (public access)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Causes retrieved successfully' })
  async getCausesByOrganization(
    @Param('organizationId') organizationId: string,
    @GetUser() user?: EnhancedJwtPayload
  ) {
    const userId = user?.sub || undefined;
    return this.causeService.getCausesByOrganization(organizationId, userId);
  }
}
