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
import { EnhancedJwtPayload } from '../auth/organization-access.service';

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
