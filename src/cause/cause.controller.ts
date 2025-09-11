import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseInterceptors, UploadedFile, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { CauseService } from './cause.service';
import { CreateCauseDto, UpdateCauseDto } from './dto/cause.dto';
import { CreateCauseWithImageDto, UpdateCauseWithImageDto, CauseResponseDto } from './dto/cause-with-image.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
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

  // Mock user for testing period
  private getMockUser(): EnhancedJwtPayload {
    return {
      sub: "1",
      email: "test@test.com", 
      name: "Test User",
      orgAccess: [],
      isGlobalAdmin: true
    };
  }

  /**
   * Create a new cause (Basic - No Image Upload)
   */
  @Post()
  @ApiOperation({ summary: 'Create a new cause (without image upload)' })
  @ApiBody({ type: CreateCauseDto })
  @ApiResponse({ status: 201, description: 'Cause created successfully', type: CauseResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createCause(@Body() createCauseDto: CreateCauseDto) {
    this.logger.log(`📋 Creating cause "${createCauseDto.title}"`);
    return this.causeService.createCause(createCauseDto);
  }

  /**
   * Create a new cause with image upload (Enhanced)
   * 
   * Enhanced endpoint that allows creating a cause with optional image upload to GCS
   * Uses multipart/form-data to handle image uploads with Multer
   * Supports image validation and automatic resizing
   */
  @Post('with-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Create cause with image upload to Google Cloud Storage' })
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
    @UploadedFile() image?: Express.Multer.File
  ) {
    this.logger.log(`📋 Creating cause "${createCauseDto.title}" with ${image ? 'image' : 'no image'}`);
    return this.causeService.createCauseWithImage(createCauseDto, image);
  }

  /**
   * Get all causes with pagination
   */
  @Get()
  async getCauses(
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

    return this.causeService.getCauses("1", paginationDto);
  }

  /**
   * Get cause by ID
   */
  @Get(':id')
  async getCauseById(@Param('id') causeId: string) {
    return this.causeService.getCauseById(causeId, "1");
  }

  /**
   * Update cause (Basic - No Image Upload)
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update cause (without image upload)' })
  @ApiParam({ name: 'id', description: 'Cause ID' })
  @ApiBody({ type: UpdateCauseDto })
  @ApiResponse({ status: 200, description: 'Cause updated successfully', type: CauseResponseDto })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  async updateCause(
    @Param('id') causeId: string,
    @Body() updateCauseDto: UpdateCauseDto,
  ) {
    this.logger.log(`📋 Updating cause ${causeId}`);
    return this.causeService.updateCause(causeId, updateCauseDto);
  }

  /**
   * Update cause with image upload (Enhanced)
   * 
   * Enhanced endpoint for updating cause with optional image upload
   * Supports both updating cause details and replacing/adding image
   * Uses multipart/form-data with FileInterceptor for image handling
   */
  @Put(':id/with-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Update cause with image upload to Google Cloud Storage' })
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
    @UploadedFile() image?: Express.Multer.File
  ) {
    this.logger.log(`📋 Updating cause ${causeId} with ${image ? 'new image' : 'no image change'}`);
    return this.causeService.updateCauseWithImage(causeId, updateCauseDto, image);
  }

  /**
   * Delete cause
   */
  @Delete(':id')
  async deleteCause(@Param('id') causeId: string) {
    return this.causeService.deleteCause(causeId, "1");
  }

  /**
   * Get causes by organization
   */
  @Get('organization/:organizationId')
  async getCausesByOrganization(@Param('organizationId') organizationId: string) {
    return this.causeService.getCausesByOrganization(organizationId, "1");
  }
}
