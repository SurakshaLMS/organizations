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
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto, EnrollUserDto, VerifyUserDto, AssignInstituteDto } from './dto/organization.dto';
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
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @UseGuards(HybridOrganizationManagerGuard)
  @ApiOperation({ summary: 'Create organization - Requires Organization Manager Token (Static or JWT)' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({ status: 201, description: 'Organization created successfully', type: OrganizationDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Organization Manager token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Organization Manager access required' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid organization data' })
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @GetUser() user: any
  ) {
    try {
      console.log('🚀 Organization creation request received:', {
        organizationData: createOrganizationDto,
        userContext: {
          userId: user?.userId,
          userType: user?.userType,
          authMethod: user?.authMethod,
          isOrganizationManager: user?.isOrganizationManager
        }
      });

      const result = await this.organizationService.createOrganization(createOrganizationDto, user);
      
      console.log('✅ Organization created successfully:', {
        organizationId: result.id,
        organizationName: result.name,
        createdBy: user?.userId
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
    // Mock dashboard data for testing
    return {
      message: 'Dashboard endpoint - functionality available during testing',
      organizations: [],
      userId: user.sub,
      userEmail: user.email,
      search: search || null
    };
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get organization by ID - Optional Authentication' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization found', type: OrganizationDto })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationById(
    @Param('id', ParseOrganizationIdPipe()) id: string,
    @GetUser() user?: EnhancedJwtPayload
  ) {
    const userId = user?.sub; // undefined if not authenticated
    return this.organizationService.getOrganizationById(id, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update organization - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({ status: 200, description: 'Organization updated successfully', type: OrganizationDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async updateOrganization(
    @Param('id', ParseOrganizationIdPipe()) id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    return this.organizationService.updateOrganization(id, updateOrganizationDto, user);
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
  @ApiOperation({ summary: 'Leave organization - Requires Authentication' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'User left organization successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async leaveOrganization(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @GetUser() user: EnhancedJwtPayload
  ) {
    return this.organizationService.leaveOrganization(organizationId, user.sub);
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
