import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto, EnrollUserDto, VerifyUserDto, AssignInstituteDto } from './dto/organization.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles, OrganizationRole } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

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
    @GetUser('userId') userId: string,
  ) {
    return this.organizationService.createOrganization(createOrganizationDto, userId);
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
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(OrganizationRole.ADMIN, OrganizationRole.PRESIDENT)
  async updateOrganization(
    @Param('id') organizationId: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @GetUser('userId') userId: string,
  ) {
    return this.organizationService.updateOrganization(organizationId, updateOrganizationDto, userId);
  }

  /**
   * Delete organization
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(OrganizationRole.PRESIDENT)
  async deleteOrganization(
    @Param('id') organizationId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.organizationService.deleteOrganization(organizationId, userId);
  }

  /**
   * Enroll user in organization
   */
  @Post('enroll')
  @UseGuards(JwtAuthGuard)
  async enrollUser(
    @Body() enrollUserDto: EnrollUserDto,
    @GetUser('userId') userId: string,
  ) {
    return this.organizationService.enrollUser(enrollUserDto, userId);
  }

  /**
   * Verify user in organization
   */
  @Put(':id/verify')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(OrganizationRole.ADMIN, OrganizationRole.PRESIDENT)
  async verifyUser(
    @Param('id') organizationId: string,
    @Body() verifyUserDto: VerifyUserDto,
    @GetUser('userId') userId: string,
  ) {
    return this.organizationService.verifyUser(organizationId, verifyUserDto, userId);
  }

  /**
   * Get organization members with pagination
   */
  @Get(':id/members')
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
  @UseGuards(JwtAuthGuard)
  async leaveOrganization(
    @Param('id') organizationId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.organizationService.leaveOrganization(organizationId, userId);
  }

  /**
   * Assign organization to institute
   */
  @Put(':id/assign-institute')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(OrganizationRole.ADMIN, OrganizationRole.PRESIDENT)
  async assignToInstitute(
    @Param('id') organizationId: string,
    @Body() assignInstituteDto: AssignInstituteDto,
    @GetUser('userId') userId: string,
  ) {
    return this.organizationService.assignToInstitute(organizationId, assignInstituteDto, userId);
  }

  /**
   * Remove organization from institute
   */
  @Delete(':id/remove-institute')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(OrganizationRole.ADMIN, OrganizationRole.PRESIDENT)
  async removeFromInstitute(
    @Param('id') organizationId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.organizationService.removeFromInstitute(organizationId, userId);
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
