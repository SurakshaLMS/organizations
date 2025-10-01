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
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { InstituteOrganizationsService } from './institute-organizations.service';
import { 
  CreateInstituteOrganizationDto, 
  CreateInstituteOrganizationWithImageDto,
  UpdateInstituteOrganizationDto, 
  UpdateInstituteOrganizationWithImageDto,
  InstituteOrganizationDto 
} from './dto/institute-organization.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ParseOrganizationIdPipe, ParseInstituteIdPipe } from '../common/pipes/parse-numeric-id.pipe';
import { PaginationValidationPipe } from '../common/pipes/pagination-validation.pipe';
import { GCSImageService } from '../common/services/gcs-image.service';

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
  constructor(
    private readonly instituteOrganizationsService: InstituteOrganizationsService,
    private readonly gcsImageService: GCSImageService
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create organization for institute - No authentication required' })
  @ApiBody({ type: CreateInstituteOrganizationWithImageDto })
  @ApiResponse({ status: 201, description: 'Organization created successfully', type: InstituteOrganizationDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid organization data or image file' })
  async createOrganization(
    @Body() createOrganizationDto: CreateInstituteOrganizationDto,
    @UploadedFile() image: Express.Multer.File
  ) {
    try {
      console.log('🚀 Institute organization creation request received:', {
        organizationData: createOrganizationDto,
        hasImage: !!image,
        imageInfo: image ? {
          originalName: image.originalname,
          mimetype: image.mimetype,
          size: image.size
        } : null
      });

      // Validate institute exists
      await this.instituteOrganizationsService.validateInstituteExists(createOrganizationDto.instituteId);

      let imageUrl: string | undefined = createOrganizationDto.imageUrl;

      // Handle image upload if provided
      if (image) {
        try {
          const uploadResult = await this.gcsImageService.uploadImage(image, 'institute-organization-images');
          imageUrl = uploadResult.url;
          console.log('📤 Image uploaded to Google Cloud Storage:', imageUrl);
        } catch (imageError) {
          console.error('❌ Image upload failed:', imageError.message);
          throw new BadRequestException(`Image upload failed: ${imageError.message}`);
        }
      }

      // Create organization with image URL
      const organizationData = {
        ...createOrganizationDto,
        imageUrl
      };

      const result = await this.instituteOrganizationsService.createOrganization(organizationData);
      
      console.log('✅ Institute organization created successfully:', {
        organizationId: result.id,
        name: result.name,
        instituteId: result.instituteId,
        hasImage: !!imageUrl
      });

      return result;
    } catch (error) {
      console.error('❌ Institute organization creation failed:', {
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
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update organization for institute - No authentication required' })
  @ApiParam({ name: 'instituteId', description: 'Institute ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiBody({ type: UpdateInstituteOrganizationWithImageDto })
  @ApiResponse({ status: 200, description: 'Organization updated successfully', type: InstituteOrganizationDto })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateOrganization(
    @Param('instituteId', ParseInstituteIdPipe()) instituteId: string,
    @Param('organizationId', ParseOrganizationIdPipe()) organizationId: string,
    @Body() updateOrganizationDto: UpdateInstituteOrganizationDto,
    @UploadedFile() image: Express.Multer.File
  ) {
    console.log(`🔄 Updating organization ${organizationId} for institute ${instituteId}`);

    let imageUrl: string | undefined = updateOrganizationDto.imageUrl;

    // Handle image upload if provided
    if (image) {
      try {
        const uploadResult = await this.gcsImageService.uploadImage(image, 'institute-organization-images');
        imageUrl = uploadResult.url;
        console.log('📤 Updated image uploaded to Google Cloud Storage:', imageUrl);
      } catch (imageError) {
        console.error('❌ Image upload failed:', imageError.message);
        throw new BadRequestException(`Image upload failed: ${imageError.message}`);
      }
    }

    const organizationData = {
      ...updateOrganizationDto,
      ...(imageUrl && { imageUrl })
    };

    return this.instituteOrganizationsService.updateOrganization(organizationId, instituteId, organizationData);
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