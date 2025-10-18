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
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, CreateOrganizationWithImageDto, UpdateOrganizationDto, UpdateOrganizationWithImageDto, EnrollUserDto, VerifyUserDto, AssignInstituteDto } from './dto/organization.dto';
import { OrganizationDto } from './dto/organization.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ParseOrganizationIdPipe, ParseInstituteIdPipe } from '../common/pipes/parse-numeric-id.pipe';
import { PaginationValidationPipe } from '../common/pipes/pagination-validation.pipe';
import { EnhancedJwtPayload, CompactOrganizationAccess } from '../auth/organization-access.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { OrganizationManagerTokenGuard } from '../auth/guards/om-token.guard';
import { HybridOrganizationManagerGuard } from '../auth/guards/hybrid-om.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CloudStorageService } from '../common/services/cloud-storage.service';

@ApiTags('Organizations')
@Controller('organizations')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ 
  transform: true, 
  whitelist: true, 
  forbidNonWhitelisted: true,
  disableErrorMessages: false,
  validateCustomDecorators: true
}))
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly cloudStorageService: CloudStorageService
  ) {}

  @Post()
  @UseGuards(HybridOrganizationManagerGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create organization with optional image upload - Requires Organization Manager Token (Static or JWT)' })
  @ApiBody({ type: CreateOrganizationWithImageDto })
  @ApiResponse({ status: 201, description: 'Organization created successfully', type: OrganizationDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Organization Manager token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Organization Manager access required' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid organization data or image file' })
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @UploadedFile() image: Express.Multer.File,
    @GetUser() user: any
  ) {
    try {
      console.log('🚀 Organization creation request received:', {
        organizationData: createOrganizationDto,
        hasImage: !!image,
        imageInfo: image ? {
          originalName: image.originalname,
          mimetype: image.mimetype,
          size: image.size
        } : null,
        userContext: {
          userId: user?.userId,
          userType: user?.userType,
          authMethod: user?.authMethod,
          isOrganizationManager: user?.isOrganizationManager
        }
      });

      let imageUrl: string | undefined = createOrganizationDto.imageUrl;

      // Handle image upload if provided
      if (image) {
        try {
          // Upload image to Cloud Storage (Google/AWS/Local)
          const uploadResult = await this.cloudStorageService.uploadImage(image, 'organization-images');
          imageUrl = uploadResult.url;
          console.log('📤 Image uploaded to Cloud Storage:', imageUrl);
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

      const result = await this.organizationService.createOrganization(organizationData, user);
      
      console.log('✅ Organization created successfully:', {
        organizationId: result.id,
        name: result.name,
        hasImage: !!imageUrl,
        imageUrl: imageUrl
      });

      return result;
    } catch (error) {
      console.error('❌ Organization creation failed:', {
        error: error.message,
        stack: error.stack,
        organizationData: createOrganizationDto,
        userContext: user
      });
      throw error;
    }
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all organizations with pagination - Optional Authentication' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async getOrganizations(
    @Query(new PaginationValidationPipe()) paginationQuery?: any,
    @GetUser() user?: EnhancedJwtPayload
  ) {
    const paginationDto = paginationQuery || new PaginationDto();
    const userId = user?.sub; // undefined if not authenticated
    return this.organizationService.getOrganizations(userId, paginationDto, user);
  }

  @Get('user/enrolled')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get organizations that the user is enrolled in - Requires Authentication' })
  @ApiResponse({ status: 200, description: 'User enrolled organizations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async getUserEnrolledOrganizations(
    @GetUser() user: EnhancedJwtPayload,
    @Query(new PaginationValidationPipe()) paginationQuery?: any
  ) {
    const paginationDto = paginationQuery || new PaginationDto();
    return this.organizationService.getUserEnrolledOrganizations(user.sub, paginationDto);
  }

  @Get('user/not-enrolled')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get global organizations that user is NOT enrolled in - Requires Authentication',
    description: 'Returns all public/global organizations that the authenticated user has not joined yet. Supports pagination and search.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by organization name or type' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field (name, memberCount, causeCount, createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: asc)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Global organizations user is NOT enrolled in retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              organizationId: { type: 'string', example: '1' },
              name: { type: 'string', example: 'Computer Science Club' },
              type: { type: 'string', example: 'Academic' },
              isPublic: { type: 'boolean', example: true },
              needEnrollmentVerification: { type: 'boolean', example: false },
              enabledEnrollments: { type: 'boolean', example: true },
              imageUrl: { type: 'string', nullable: true },
              instituteId: { type: 'string', nullable: true },
              memberCount: { type: 'number', example: 42 },
              causeCount: { type: 'number', example: 5 },
              createdAt: { type: 'string', example: '2025-01-15T10:30:00.000Z' },
              enrollmentStatus: { type: 'string', example: 'not_enrolled' },
              canEnroll: { type: 'boolean', example: true }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async getGlobalOrganizationsNotEnrolled(
    @GetUser() user: EnhancedJwtPayload,
    @Query(new PaginationValidationPipe()) paginationQuery?: any
  ) {
    const paginationDto = paginationQuery || new PaginationDto();
    return this.organizationService.getGlobalOrganizationsNotEnrolled(user.sub, paginationDto);
  }

  @Get('user/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user organization dashboard - Requires Authentication' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'User dashboard retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async getUserOrganizationDashboard(
    @GetUser() user: EnhancedJwtPayload,
    @Query('search') search?: string
  ) {
    // Retrieve organizations with user context
    const paginationDto = new PaginationDto();
    paginationDto.page = '1';
    paginationDto.limit = '50';
    paginationDto.search = search;
    
    return await this.organizationService.getOrganizations(user.sub, paginationDto, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get organization by ID - Authentication required' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization found', type: OrganizationDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationById(
    @Param('id', ParseOrganizationIdPipe()) id: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    return this.organizationService.getOrganizationById(id, user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update organization with optional image upload - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBody({ type: UpdateOrganizationWithImageDto })
  @ApiResponse({ status: 200, description: 'Organization updated successfully', type: OrganizationDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid organization data or image file' })
  async updateOrganization(
    @Param('id', ParseOrganizationIdPipe()) id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @UploadedFile() image: Express.Multer.File,
    @GetUser() user: EnhancedJwtPayload
  ) {
    try {
      console.log('🔄 Organization update request received:', {
        organizationId: id,
        updateData: updateOrganizationDto,
        hasImage: !!image,
        imageInfo: image ? {
          originalName: image.originalname,
          mimetype: image.mimetype,
          size: image.size
        } : null,
        userId: user?.sub
      });

      let imageUrl: string | undefined = updateOrganizationDto.imageUrl;

      // Handle image upload if provided
      if (image) {
        try {
          // Get current organization to check for existing image
          const currentOrg = await this.organizationService.getOrganizationById(id, user.sub);
          
          // Upload new image and delete old one using Cloud Storage
          const uploadResult = await this.cloudStorageService.updateOrganizationImage(
            image,
            currentOrg.imageUrl || undefined
          );
          imageUrl = uploadResult.url;
          
          console.log('📤 Image updated in Cloud Storage:', imageUrl);
        } catch (imageError) {
          console.error('❌ Image update failed:', imageError.message);
          throw new BadRequestException(`Image update failed: ${imageError.message}`);
        }
      }

      // Update organization with new image URL if provided
      const organizationData = {
        ...updateOrganizationDto,
        ...(imageUrl && { imageUrl })
      };

      const result = await this.organizationService.updateOrganization(id, organizationData, user);
      
      console.log('✅ Organization updated successfully:', {
        organizationId: id,
        organizationName: result.name,
        imageUrl: result.imageUrl,
        updatedBy: user?.sub
      });

      return result;
    } catch (error) {
      console.error('❌ Organization update failed:', {
        error: error.message,
        stack: error.stack,
        organizationId: id,
        updateData: updateOrganizationDto,
        userId: user?.sub
      });
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete organization - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async deleteOrganization(
    @Param('id', ParseOrganizationIdPipe()) id: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    return this.organizationService.deleteOrganization(id, user);
  }

  @Post('enroll')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Enroll user in organization - Requires Authentication' })
  @ApiBody({ type: EnrollUserDto })
  @ApiResponse({ status: 201, description: 'User enrolled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async enrollUser(
    @Body() enrollUserDto: EnrollUserDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    return this.organizationService.enrollUser(enrollUserDto, user.sub);
  }

  @Put(':id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verify user in organization - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBody({ type: VerifyUserDto })
  @ApiResponse({ status: 200, description: 'User verified successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async verifyUser(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() verifyUserDto: VerifyUserDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    return this.organizationService.verifyUser(organizationId, verifyUserDto, user);
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get organization members (verified only) - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organization verified members retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async getOrganizationMembers(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @GetUser() user: EnhancedJwtPayload,
    @Query(new PaginationValidationPipe()) paginationQuery?: any
  ) {
    const paginationDto = paginationQuery || new PaginationDto();
    return this.organizationService.getOrganizationMembers(organizationId, paginationDto, user);
  }

  @Get(':id/members/unverified')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get unverified organization members - Requires Admin/President Access' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Unverified organization members retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/President access required' })
  async getUnverifiedMembers(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @GetUser() user: EnhancedJwtPayload,
    @Query(new PaginationValidationPipe()) paginationQuery?: any
  ) {
    const paginationDto = paginationQuery || new PaginationDto();
    return this.organizationService.getUnverifiedMembers(organizationId, paginationDto, user);
  }

  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Leave organization (Self-leave only)',
    description: 'Allows authenticated members to leave an organization. Only the member themselves can leave. Presidents must transfer their role before leaving.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Organization ID to leave',
    example: '1'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully left the organization',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Successfully left the organization' },
        organization: {
          type: 'object',
          properties: {
            organizationId: { type: 'string', example: '1' },
            name: { type: 'string', example: 'Computer Science Student Association' },
            leftAt: { type: 'string', example: '2025-09-14T11:45:10.450Z' }
          }
        },
        user: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@example.com' },
            previousRole: { type: 'string', example: 'MEMBER' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - President cannot leave without transferring role',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'President cannot leave organization. You must transfer the presidency to another member first.' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - JWT token required' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not found - User is not a member of this organization',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'You are not a member of this organization' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async leaveOrganization(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    return this.organizationService.leaveOrganization(organizationId, user);
  }

  @Put(':id/assign-institute')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Assign institute to organization - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBody({ type: AssignInstituteDto })
  @ApiResponse({ status: 200, description: 'Institute assigned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async assignInstitute(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() assignInstituteDto: AssignInstituteDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    return this.organizationService.assignToInstitute(organizationId, assignInstituteDto, user);
  }

  @Delete(':id/remove-institute')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove institute from organization - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Institute removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async removeInstitute(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    return this.organizationService.removeFromInstitute(organizationId, user);
  }

  @Get('institute/:instituteId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get organizations by institute ID - Optional Authentication' })
  @ApiParam({ name: 'instituteId', description: 'Institute ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async getOrganizationsByInstitute(
    @Param('instituteId', ParseInstituteIdPipe()) instituteId: string,
    @GetUser() user?: EnhancedJwtPayload,
    @Query(new PaginationValidationPipe()) paginationQuery?: any
  ) {
    const paginationDto = paginationQuery || new PaginationDto();
    const userId = user?.sub; // undefined if not authenticated
    return this.organizationService.getOrganizationsByInstitute(instituteId, userId, paginationDto);
  }

  @Get('institutes/available')
  @ApiOperation({ summary: 'Get available institutes for assignment - Public Endpoint' })
  @ApiResponse({ status: 200, description: 'Available institutes retrieved successfully' })
  async getAvailableInstitutes() {
    return this.organizationService.getAvailableInstitutes();
  }

  @Get(':id/causes')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get organization causes - Optional Authentication' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organization causes retrieved successfully' })
  async getOrganizationCauses(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Query(new PaginationValidationPipe()) paginationQuery?: any
  ) {
    const paginationDto = paginationQuery || new PaginationDto();
    return this.organizationService.getOrganizationCauses(organizationId, paginationDto);
  }
}
