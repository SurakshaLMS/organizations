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
   * Requires MODERATOR role or higher in the organization
   */
  @Post()
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationModerator('organizationId')
  @ApiOperation({ 
    summary: 'Create a new cause (without image upload)', 
    description: 'Requires MODERATOR, ADMIN, or PRESIDENT role in the organization' 
  })
  @ApiBody({ type: CreateCauseDto })
  @ApiResponse({ status: 201, description: 'Cause created successfully', type: CauseResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (requires MODERATOR+)' })
  async createCause(
    @Body() createCauseDto: CreateCauseDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📋 Creating cause "${createCauseDto.title}" by user ${user.sub} (${user.userType || 'USER'})`);
    return this.causeService.createCause(createCauseDto);
  }

  /**
   * Create a new cause with image upload (Enhanced)
   * 
   * Enhanced endpoint that allows creating a cause with optional image upload to GCS
   * Uses multipart/form-data to handle image uploads with Multer
   * Supports image validation and automatic resizing
   * Requires MODERATOR role or higher in the organization
   */
  @Post('with-image')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationModerator('organizationId')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ 
    summary: 'Create cause with image upload to Google Cloud Storage',
    description: 'Requires MODERATOR, ADMIN, or PRESIDENT role in the organization'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ 
    type: CreateCauseWithImageDto,
    description: 'Cause data with optional image upload (use form-data with field name "image")' 
  })
  @ApiResponse({ status: 201, description: 'Cause created with image successfully', type: CauseResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data or image format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (requires MODERATOR+)' })
  @ApiResponse({ status: 413, description: 'Image file too large' })
  async createCauseWithImage(
    @Body() createCauseDto: CreateCauseWithImageDto,
    @UploadedFile() image: Express.Multer.File,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📋 Creating cause "${createCauseDto.title}" with ${image ? 'image' : 'no image'} by user ${user.sub} (${user.userType || 'USER'})`);
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
   * Only accessible by ADMIN or PRESIDENT
   */
  @Get('test-gcs')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationAdmin('organizationId')
  @ApiOperation({ 
    summary: 'Test GCS connection (Debug - Admin/President only)',
    description: 'Requires ADMIN or PRESIDENT role in the organization'
  })
  @ApiResponse({ status: 200, description: 'GCS connection test result' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (requires ADMIN+)' })
  async testGCSConnection(@GetUser() user: EnhancedJwtPayload) {
    this.logger.log(`🧪 Testing GCS connection by user ${user.sub} (${user.userType || 'USER'})...`);
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
   * Requires MODERATOR role or higher in the organization
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationModerator('organizationId')
  @ApiOperation({ 
    summary: 'Update cause (without image upload)',
    description: 'Requires MODERATOR, ADMIN, or PRESIDENT role in the organization'
  })
  @ApiParam({ name: 'id', description: 'Cause ID' })
  @ApiBody({ type: UpdateCauseDto })
  @ApiResponse({ status: 200, description: 'Cause updated successfully', type: CauseResponseDto })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (requires MODERATOR+)' })
  async updateCause(
    @Param('id') causeId: string,
    @Body() updateCauseDto: UpdateCauseDto,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    this.logger.log(`📋 Updating cause ${causeId} by user ${user.sub} (${user.userType || 'USER'})`);
    return this.causeService.updateCause(causeId, updateCauseDto);
  }

  /**
   * Update cause with image upload (Enhanced)
   * 
   * Enhanced endpoint for updating cause with optional image upload
   * Supports both updating cause details and replacing/adding image
   * Uses multipart/form-data with FileInterceptor for image handling
   * Requires MODERATOR role or higher in the organization
   */
  @Put(':id/with-image')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationModerator('organizationId')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ 
    summary: 'Update cause with image upload to Google Cloud Storage',
    description: 'Requires MODERATOR, ADMIN, or PRESIDENT role in the organization'
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
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (requires MODERATOR+)' })
  @ApiResponse({ status: 413, description: 'Image file too large' })
  async updateCauseWithImage(
    @Param('id') causeId: string,
    @Body() updateCauseDto: UpdateCauseWithImageDto,
    @UploadedFile() image: Express.Multer.File,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📋 Updating cause ${causeId} with ${image ? 'new image' : 'no image change'} by user ${user.sub} (${user.userType || 'USER'})`);
    return this.causeService.updateCauseWithImage(causeId, updateCauseDto, image);
  }

  /**
   * Delete cause
   * Only ADMIN or PRESIDENT can delete causes
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationAdmin('organizationId')
  @ApiOperation({ 
    summary: 'Delete cause (Admin/President only)',
    description: 'Requires ADMIN or PRESIDENT role in the organization'
  })
  @ApiParam({ name: 'id', description: 'Cause ID' })
  @ApiResponse({ status: 200, description: 'Cause deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (requires ADMIN+)' })
  async deleteCause(
    @Param('id') causeId: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📋 Deleting cause ${causeId} by user ${user.sub} (${user.userType || 'USER'})`);
    return this.causeService.deleteCause(causeId, user.sub);
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
