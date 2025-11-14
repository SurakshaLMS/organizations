import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  Query, 
  UsePipes, 
  ValidationPipe,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InstituteOrganizationsService } from './institute-organizations.service';
import { 
  CreateInstituteOrganizationDto, 
  UpdateInstituteOrganizationDto, 
  InstituteOrganizationDto 
} from './dto/institute-organization.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ParseOrganizationIdPipe, ParseInstituteIdPipe } from '../common/pipes/parse-numeric-id.pipe';
import { PaginationValidationPipe } from '../common/pipes/pagination-validation.pipe';

@ApiTags('Institute Organizations (No Auth)')
@Controller('institute-organizations')
@UsePipes(new ValidationPipe({ 
  transform: true, 
  whitelist: true, 
  forbidNonWhitelisted: true,
  disableErrorMessages: false,
  validateCustomDecorators: true
}))
export class InstituteOrganizationsController {
  private readonly logger = new Logger(InstituteOrganizationsController.name);

  constructor(
    private readonly instituteOrganizationsService: InstituteOrganizationsService,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create organization for institute - No authentication required',
    description: 'Use POST /signed-urls/organization to get upload URL for image, then include imageUrl here after verification'
  })
  @ApiBody({ type: CreateInstituteOrganizationDto })
  @ApiResponse({ status: 201, description: 'Organization created successfully', type: InstituteOrganizationDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid organization data' })
  async createOrganization(
    @Body() createOrganizationDto: CreateInstituteOrganizationDto,
  ) {
    try {
      this.logger.log('🚀 Institute organization creation request received:', {
        organizationData: createOrganizationDto,
        imageUrl: createOrganizationDto.imageUrl || 'none'
      });

      // Validate institute exists
      await this.instituteOrganizationsService.validateInstituteExists(createOrganizationDto.instituteId);

      const result = await this.instituteOrganizationsService.createOrganization(createOrganizationDto);
      
      this.logger.log('✅ Institute organization created successfully:', {
        organizationId: result.id,
        name: result.name,
        instituteId: result.instituteId,
        hasImage: !!createOrganizationDto.imageUrl
      });

      return result;
    } catch (error) {
      this.logger.error('❌ Institute organization creation failed:', {
        error: error.message,
        stack: error.stack,
        organizationData: createOrganizationDto
      });
      throw error;
    }
  }

  @Get('public')
  @ApiOperation({ summary: 'Get all public organizations from all institutes - No authentication required' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Public organizations retrieved successfully' })
  async getPublicOrganizations(
    @Query(new PaginationValidationPipe()) paginationQuery?: any
  ) {
    const paginationDto = paginationQuery || new PaginationDto();
    return this.instituteOrganizationsService.getPublicOrganizations(paginationDto);
  }

  @Get('institute/:instituteId')
  @ApiOperation({ summary: 'Get all organizations for a specific institute - No authentication required' })
  @ApiParam({ name: 'instituteId', description: 'Institute ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Institute organizations retrieved successfully' })
  async getOrganizationsByInstitute(
    @Param('instituteId', ParseInstituteIdPipe()) instituteId: string,
    @Query(new PaginationValidationPipe()) paginationQuery?: any
  ) {
    // Validate institute exists
    await this.instituteOrganizationsService.validateInstituteExists(instituteId);
    
    const paginationDto = paginationQuery || new PaginationDto();
    return this.instituteOrganizationsService.getOrganizationsByInstitute(instituteId, paginationDto);
  }

  @Get('institute/:instituteId/:organizationId')
  @ApiOperation({ summary: 'Get specific organization by ID and institute - No authentication required' })
  @ApiParam({ name: 'instituteId', description: 'Institute ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully', type: InstituteOrganizationDto })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationByIdAndInstitute(
    @Param('instituteId', ParseInstituteIdPipe()) instituteId: string,
    @Param('organizationId', ParseOrganizationIdPipe()) organizationId: string
  ) {
    return this.instituteOrganizationsService.getOrganizationByIdAndInstitute(organizationId, instituteId);
  }

  @Put('institute/:instituteId/:organizationId')
  @ApiOperation({ 
    summary: 'Update organization for institute - No authentication required',
    description: 'Use POST /signed-urls/organization to get upload URL for new image, then include imageUrl here after verification'
  })
  @ApiParam({ name: 'instituteId', description: 'Institute ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiBody({ type: UpdateInstituteOrganizationDto })
  @ApiResponse({ status: 200, description: 'Organization updated successfully', type: InstituteOrganizationDto })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateOrganization(
    @Param('instituteId', ParseInstituteIdPipe()) instituteId: string,
    @Param('organizationId', ParseOrganizationIdPipe()) organizationId: string,
    @Body() updateOrganizationDto: UpdateInstituteOrganizationDto,
  ) {
    console.log(`🔄 Updating organization ${organizationId} for institute ${instituteId}, imageUrl: ${updateOrganizationDto.imageUrl || 'none'}`);

    return this.instituteOrganizationsService.updateOrganization(organizationId, instituteId, updateOrganizationDto);
  }

  @Delete('institute/:instituteId/:organizationId')
  @ApiOperation({ summary: 'Delete organization for institute - No authentication required' })
  @ApiParam({ name: 'instituteId', description: 'Institute ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async deleteOrganization(
    @Param('instituteId', ParseInstituteIdPipe()) instituteId: string,
    @Param('organizationId', ParseOrganizationIdPipe()) organizationId: string
  ) {
    console.log(`🗑️ Deleting organization ${organizationId} for institute ${instituteId}`);
    
    return this.instituteOrganizationsService.deleteOrganization(organizationId, instituteId);
  }
}