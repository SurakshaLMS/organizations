import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto, EnrollUserDto, VerifyUserDto } from './dto/organization.dto';
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
   * Get all organizations (public or user's organizations)
   */
  @Get()
  async getOrganizations(@Query('userId') userId?: string) {
    return this.organizationService.getOrganizations(userId);
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
   * Get organization members
   */
  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  async getOrganizationMembers(
    @Param('id') organizationId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.organizationService.getOrganizationMembers(organizationId, userId);
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
}
