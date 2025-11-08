import { Controller, Get, Post, Body, Param, Put, Delete, Query, Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
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
 * Uses signed URL upload system for secure and efficient file handling
 * 
 * Features:
 * - Basic cause CRUD operations
 * - Image management with GCS storage via signed URLs
 * - Comprehensive API documentation with Swagger
 * - Legacy endpoint support for backward compatibility (deprecated)
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
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Create cause with image (Use signed URL flow instead)',
    description: 'DEPRECATED: Use POST /signed-urls/cause to get upload URL, then create cause with imageUrl field. Authentication required.'
  })
  @ApiResponse({ status: 201, description: 'Cause created with image successfully', type: CauseResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data or image format' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 410, description: 'Endpoint deprecated - use signed URL flow' })
  async createCauseWithImage(
    @Body() createCauseDto: CreateCauseWithImageDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📋 Creating cause "${createCauseDto.title}" - User: ${user.email}`);
    return this.causeService.createCauseWithImage(createCauseDto, null);
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
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Update cause with image (Use signed URL flow instead)',
    description: 'DEPRECATED: Use POST /signed-urls/cause to get upload URL, then update cause with imageUrl field. Authentication required.'
  })
  @ApiParam({ name: 'id', description: 'Cause ID to update' })
  @ApiResponse({ status: 200, description: 'Cause updated with image successfully', type: CauseResponseDto })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 400, description: 'Invalid request data or image format' })
  @ApiResponse({ status: 410, description: 'Endpoint deprecated - use signed URL flow' })
  async updateCauseWithImage(
    @Param('id') causeId: string,
    @Body() updateCauseDto: UpdateCauseWithImageDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    this.logger.log(`📋 Updating cause ${causeId} - User: ${user.email}`);
    return this.causeService.updateCauseWithImage(causeId, updateCauseDto, null);
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
