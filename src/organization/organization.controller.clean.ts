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
  ValidationPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto, EnrollUserDto, VerifyUserDto, AssignInstituteDto } from './dto/organization.dto';
import { OrganizationDto } from './dto/organization.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ParseOrganizationIdPipe, ParseInstituteIdPipe } from '../common/pipes/parse-numeric-id.pipe';
import { PaginationValidationPipe } from '../common/pipes/pagination-validation.pipe';
import { EnhancedJwtPayload, CompactOrganizationAccess } from '../auth/organization-access.service';

@ApiTags('Organizations')
@Controller('organizations')
@UsePipes(new ValidationPipe({ 
  transform: true, 
  whitelist: true, 
  forbidNonWhitelisted: true,
  disableErrorMessages: false,
  validateCustomDecorators: true
}))
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

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

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({ status: 201, description: 'Organization created successfully', type: OrganizationDto })
  async createOrganization(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationService.createOrganization(createOrganizationDto, "1");
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async getOrganizations(@Query(new PaginationValidationPipe()) paginationQuery?: any) {
    const paginationDto = paginationQuery || new PaginationDto();
    return this.organizationService.getOrganizations(undefined, paginationDto);
  }

  @Get('user/enrolled')
  @ApiOperation({ summary: 'Get organizations that the user is enrolled in' })
  @ApiResponse({ status: 200, description: 'User enrolled organizations retrieved successfully' })
  async getUserEnrolledOrganizations(@Query(new PaginationValidationPipe()) paginationQuery?: any) {
    const paginationDto = paginationQuery || new PaginationDto();
    return this.organizationService.getUserEnrolledOrganizations("1", paginationDto);
  }

  @Get('user/dashboard')
  @ApiOperation({ summary: 'Get user organization dashboard' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'User dashboard retrieved successfully' })
  async getUserOrganizationDashboard(@Query('search') search?: string) {
    // Mock dashboard data for testing
    return {
      message: 'Dashboard endpoint - functionality available during testing',
      organizations: [],
      search: search || null
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization found', type: OrganizationDto })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationById(@Param('id', ParseOrganizationIdPipe()) id: string) {
    return this.organizationService.getOrganizationById(id, "1");
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({ status: 200, description: 'Organization updated successfully', type: OrganizationDto })
  async updateOrganization(
    @Param('id', ParseOrganizationIdPipe()) id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto
  ) {
    return this.organizationService.updateOrganization(id, updateOrganizationDto, this.getMockUser());
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
  async deleteOrganization(@Param('id', ParseOrganizationIdPipe()) id: string) {
    return this.organizationService.deleteOrganization(id, this.getMockUser());
  }

  @Post('enroll')
  @ApiOperation({ summary: 'Enroll user in organization' })
  @ApiBody({ type: EnrollUserDto })
  @ApiResponse({ status: 201, description: 'User enrolled successfully' })
  async enrollUser(@Body() enrollUserDto: EnrollUserDto) {
    return this.organizationService.enrollUser(enrollUserDto, "1");
  }

  @Put(':id/verify')
  @ApiOperation({ summary: 'Verify user in organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBody({ type: VerifyUserDto })
  @ApiResponse({ status: 200, description: 'User verified successfully' })
  async verifyUser(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() verifyUserDto: VerifyUserDto
  ) {
    return this.organizationService.verifyUser(organizationId, verifyUserDto, this.getMockUser());
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organization members retrieved successfully' })
  async getOrganizationMembers(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Query(new PaginationValidationPipe()) paginationQuery?: any
  ) {
    const paginationDto = paginationQuery || new PaginationDto();
    return this.organizationService.getOrganizationMembers(organizationId, paginationDto, this.getMockUser());
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'User left organization successfully' })
  async leaveOrganization(@Param('id', ParseOrganizationIdPipe()) organizationId: string) {
    return this.organizationService.leaveOrganization(organizationId, "1");
  }

  @Put(':id/assign-institute')
  @ApiOperation({ summary: 'Assign institute to organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBody({ type: AssignInstituteDto })
  @ApiResponse({ status: 200, description: 'Institute assigned successfully' })
  async assignInstitute(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() assignInstituteDto: AssignInstituteDto
  ) {
    return this.organizationService.assignToInstitute(organizationId, assignInstituteDto, this.getMockUser());
  }

  @Delete(':id/remove-institute')
  @ApiOperation({ summary: 'Remove institute from organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Institute removed successfully' })
  async removeInstitute(@Param('id', ParseOrganizationIdPipe()) organizationId: string) {
    return this.organizationService.removeFromInstitute(organizationId, this.getMockUser());
  }

  @Get('institute/:instituteId')
  @ApiOperation({ summary: 'Get organizations by institute ID' })
  @ApiParam({ name: 'instituteId', description: 'Institute ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async getOrganizationsByInstitute(
    @Param('instituteId', ParseInstituteIdPipe()) instituteId: string,
    @Query(new PaginationValidationPipe()) paginationQuery?: any
  ) {
    const paginationDto = paginationQuery || new PaginationDto();
    return this.organizationService.getOrganizationsByInstitute(instituteId, "1", paginationDto);
  }

  @Get('institutes/available')
  @ApiOperation({ summary: 'Get available institutes for assignment' })
  @ApiResponse({ status: 200, description: 'Available institutes retrieved successfully' })
  async getAvailableInstitutes() {
    return this.organizationService.getAvailableInstitutes();
  }

  @Get(':id/causes')
  @ApiOperation({ summary: 'Get organization causes' })
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
