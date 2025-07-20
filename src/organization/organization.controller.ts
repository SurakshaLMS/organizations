import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto, EnrollUserDto, VerifyUserDto, AssignInstituteDto } from './dto/organization.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { 
  RequireOrganizationMember, 
  RequireOrganizationAdmin, 
  RequireOrganizationPresident 
} from '../auth/decorators/organization-access.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetUserOrganizations } from '../auth/decorators/get-user-organizations.decorator';
import { EnhancedJwtPayload, UserOrganizationAccess } from '../auth/organization-access.service';

@Controller('organizations')
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  /**
   * Create a new organization
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    return this.organizationService.createOrganization(createOrganizationDto, user.sub);
  }

  /**
   * Get all organizations with pagination (public or user's organizations)
   */
  @Get()
  async getOrganizations(
    @Query('userId') userId?: string,
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

    return this.organizationService.getOrganizations(userId, paginationDto);
  }

  /**
   * Get organizations that the authenticated user is enrolled in
   * Returns only verified memberships with user's role and basic stats
   * @deprecated This endpoint is now redundant as the same data is included in JWT token
   * Use the JWT token's organizationAccess field instead for better performance
   */
  @Get('user/enrolled')
  @UseGuards(JwtAuthGuard)
  async getUserEnrolledOrganizations(
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

    // Note: This data is now available in the JWT token for better performance
    // Consider using the organizationAccess field from the JWT instead
    return this.organizationService.getUserEnrolledOrganizations(user.sub, paginationDto);
  }

  /**
   * Get user's organization dashboard (optimized from JWT token)
   * This demonstrates how to use the JWT token organization data without additional DB calls
   */
  @Get('user/dashboard')
  @UseGuards(JwtAuthGuard)
  async getUserOrganizationDashboard(
    @GetUserOrganizations() organizations: UserOrganizationAccess[],
    @Query('search') search?: string,
  ) {
    // Filter organizations if search is provided
    let filteredOrgs = organizations;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredOrgs = organizations.filter(org => 
        org.name.toLowerCase().includes(searchLower) ||
        org.type.toLowerCase().includes(searchLower)
      );
    }

    // Calculate dashboard statistics
    const stats = {
      totalOrganizations: filteredOrgs.length,
      organizationsByRole: {
        PRESIDENT: filteredOrgs.filter(org => org.role === 'PRESIDENT').length,
        ADMIN: filteredOrgs.filter(org => org.role === 'ADMIN').length,
        MODERATOR: filteredOrgs.filter(org => org.role === 'MODERATOR').length,
        MEMBER: filteredOrgs.filter(org => org.role === 'MEMBER').length,
      },
      organizationsByType: {
        INSTITUTE: filteredOrgs.filter(org => org.type === 'INSTITUTE').length,
        GLOBAL: filteredOrgs.filter(org => org.type === 'GLOBAL').length,
      },
      totalMembers: filteredOrgs.reduce((sum, org) => sum + org.memberCount, 0),
      totalCauses: filteredOrgs.reduce((sum, org) => sum + org.causeCount, 0),
      averageMembersPerOrg: Math.round(
        filteredOrgs.reduce((sum, org) => sum + org.memberCount, 0) / Math.max(filteredOrgs.length, 1)
      ),
    };

    return {
      organizations: filteredOrgs.map(org => ({
        organizationId: org.organizationId,
        name: org.name,
        type: org.type,
        userRole: org.role,
        isPublic: org.isPublic,
        memberCount: org.memberCount,
        causeCount: org.causeCount,
        joinedAt: org.joinedAt,
        hasInstituteLink: !!org.instituteId,
      })),
      statistics: stats,
      message: 'Dashboard data loaded from JWT token (no database calls)',
    };
  }

  /**
   * Get organization by ID
   */
  @Get(':id')
  async getOrganizationById(
    @Param('id') organizationId: string,
    @Query('userId') userId?: string,
  ) {
    return this.organizationService.getOrganizationById(organizationId, userId);
  }

  /**
   * Update organization
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationAdmin('id')
  async updateOrganization(
    @Param('id') organizationId: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    return this.organizationService.updateOrganization(organizationId, updateOrganizationDto, user.sub);
  }

  /**
   * Delete organization
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationPresident('id')
  async deleteOrganization(
    @Param('id') organizationId: string,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    return this.organizationService.deleteOrganization(organizationId, user.sub);
  }

  /**
   * Enroll user in organization
   */
  @Post('enroll')
  @UseGuards(JwtAuthGuard)
  async enrollUser(
    @Body() enrollUserDto: EnrollUserDto,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    return this.organizationService.enrollUser(enrollUserDto, user.sub);
  }

  /**
   * Verify user in organization
   */
  @Put(':id/verify')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationAdmin('id')
  async verifyUser(
    @Param('id') organizationId: string,
    @Body() verifyUserDto: VerifyUserDto,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    return this.organizationService.verifyUser(organizationId, verifyUserDto, user.sub);
  }

  /**
   * Get organization members with pagination
   */
  @Get(':id/members')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationMember('id')
  async getOrganizationMembers(
    @Param('id') organizationId: string,
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

    return this.organizationService.getOrganizationMembers(organizationId, paginationDto);
  }

  /**
   * Leave organization
   */
  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationMember('id')
  async leaveOrganization(
    @Param('id') organizationId: string,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    return this.organizationService.leaveOrganization(organizationId, user.sub);
  }

  /**
   * Assign organization to institute
   */
  @Put(':id/assign-institute')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationAdmin('id')
  async assignToInstitute(
    @Param('id') organizationId: string,
    @Body() assignInstituteDto: AssignInstituteDto,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    return this.organizationService.assignToInstitute(organizationId, assignInstituteDto, user.sub);
  }

  /**
   * Remove organization from institute
   */
  @Delete(':id/remove-institute')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationAdmin('id')
  async removeFromInstitute(
    @Param('id') organizationId: string,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    return this.organizationService.removeFromInstitute(organizationId, user.sub);
  }

  /**
   * Get organizations by institute
   */
  @Get('institute/:instituteId')
  async getOrganizationsByInstitute(
    @Param('instituteId') instituteId: string,
    @Query('userId') userId?: string,
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

    return this.organizationService.getOrganizationsByInstitute(instituteId, userId, paginationDto);
  }

  /**
   * Get available institutes with pagination
   */
  @Get('institutes/available')
  async getAvailableInstitutes(
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

    return this.organizationService.getAvailableInstitutes(paginationDto);
  }

  /**
   * Get organization causes with pagination  
   */
  @Get(':id/causes')
  async getOrganizationCauses(
    @Param('id') organizationId: string,
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

    return this.organizationService.getOrganizationCauses(organizationId, paginationDto);
  }
}
