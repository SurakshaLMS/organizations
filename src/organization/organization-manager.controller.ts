import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { RateLimit } from '../auth/guards/rate-limit.guard';
import { EnhancedJwtPayload } from '../auth/organization-access.service';
import { ParseOrganizationIdPipe } from '../common/pipes/parse-numeric-id.pipe';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationDto
} from './dto/organization.dto';
import {
  AssignUserRoleDto,
  RemoveUserDto,
  ChangeUserRoleDto,
  OrganizationMembersResponseDto,
  RoleAssignmentResponseDto
} from './dto/organization-management.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Organization Management')
@Controller('organizations/:id/management')
@UsePipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  disableErrorMessages: false,
  validateCustomDecorators: true
}))
export class OrganizationManagerController {
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

  /**
   * Create Organization (Global endpoint, moved here for consistency)
   */
  @Post('/create')
  @RateLimit(5, 60000) // 5 organizations per minute
  @ApiOperation({
    summary: 'Create new organization',
    description: 'Create a new organization. User becomes PRESIDENT automatically.'
  })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: OrganizationDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto
  ): Promise<OrganizationDto> {
    return this.organizationService.createOrganization(createOrganizationDto, "1"); // Default user ID for testing
  }

  /**
   * Update Organization
   */
  @Put()
  @RateLimit(20, 60000) // 20 updates per minute
  @ApiOperation({
    summary: 'Update organization',
    description: 'Update organization details. Requires ADMIN or PRESIDENT role.'
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    required: true,
    type: String
  })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    type: OrganizationDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateOrganization(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto
  ): Promise<OrganizationDto> {
    return this.organizationService.updateOrganization(organizationId, updateOrganizationDto, this.getMockUser());
  }

  /**
   * Delete Organization
   */
  @Delete()
  @RateLimit(3, 60000) // 3 deletions per minute
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete organization',
    description: 'Permanently delete organization. Only PRESIDENT can delete. This action is irreversible.'
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    required: true,
    type: String
  })
  @ApiResponse({ status: 204, description: 'Organization deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions (PRESIDENT only)' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async deleteOrganization(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string
  ): Promise<void> {
    await this.organizationService.deleteOrganization(organizationId, this.getMockUser());
  }

  /**
   * Get Organization Members
   */
  @Get('/members')
  @RateLimit(50, 60000) // 50 requests per minute
  @ApiOperation({
    summary: 'Get organization members',
    description: 'Retrieve list of all organization members with their roles. Requires ADMIN or PRESIDENT role.'
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    required: true,
    type: String
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (1-based)',
    required: false,
    type: Number,
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page (max 100)',
    required: false,
    type: Number,
    example: 20
  })
  @ApiResponse({
    status: 200,
    description: 'Organization members retrieved successfully',
    type: OrganizationMembersResponseDto
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationMembers(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Query() pagination: PaginationDto
  ): Promise<OrganizationMembersResponseDto> {
    return this.organizationService.getOrganizationMembers(organizationId, pagination, this.getMockUser());
  }

  /**
   * Assign User Role
   */
  @Post('/assign-role')
  @RateLimit(30, 60000) // 30 role assignments per minute
  @ApiOperation({
    summary: 'Assign role to user',
    description: 'Assign ADMIN, MODERATOR, or MEMBER role to a user. Requires ADMIN or PRESIDENT role. Cannot assign PRESIDENT role.'
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    required: true,
    type: String
  })
  @ApiBody({ type: AssignUserRoleDto })
  @ApiResponse({
    status: 201,
    description: 'User role assigned successfully',
    type: RoleAssignmentResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or user not in organization' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization or user not found' })
  async assignUserRole(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() assignUserRoleDto: AssignUserRoleDto
  ): Promise<RoleAssignmentResponseDto> {
    return this.organizationService.assignUserRole(organizationId, assignUserRoleDto, this.getMockUser());
  }

  /**
   * Change User Role
   */
  @Put('/change-role')
  @RateLimit(20, 60000) // 20 role changes per minute
  @ApiOperation({
    summary: 'Change user role',
    description: 'Change existing member role. Requires ADMIN or PRESIDENT role. Cannot change PRESIDENT role.'
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    required: true,
    type: String
  })
  @ApiBody({ type: ChangeUserRoleDto })
  @ApiResponse({
    status: 200,
    description: 'User role changed successfully',
    type: RoleAssignmentResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization or user not found' })
  async changeUserRole(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() changeUserRoleDto: ChangeUserRoleDto
  ): Promise<RoleAssignmentResponseDto> {
    return this.organizationService.changeUserRole(organizationId, changeUserRoleDto, this.getMockUser());
  }

  /**
   * Remove User from Organization
   */
  @Delete('/remove-user')
  @RateLimit(15, 60000) // 15 removals per minute
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove user from organization',
    description: 'Remove user from organization. Requires ADMIN or PRESIDENT role. Cannot remove PRESIDENT.'
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    required: true,
    type: String
  })
  @ApiBody({ type: RemoveUserDto })
  @ApiResponse({ status: 204, description: 'User removed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot remove user (e.g., trying to remove PRESIDENT)' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization or user not found' })
  async removeUserFromOrganization(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() removeUserDto: RemoveUserDto
  ): Promise<void> {
    await this.organizationService.removeUserFromOrganization(organizationId, removeUserDto, this.getMockUser());
  }

  /**
   * Transfer Presidency
   */
  @Put('/transfer-presidency')
  @RateLimit(5, 60000) // 5 transfers per minute
  @ApiOperation({
    summary: 'Transfer presidency',
    description: 'Transfer PRESIDENT role to another user. Only current PRESIDENT can do this. Current PRESIDENT becomes ADMIN.'
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    required: true,
    type: String
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newPresidentUserId: {
          type: 'string',
          description: 'User ID of new president',
          example: '123'
        }
      },
      required: ['newPresidentUserId']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Presidency transferred successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Presidency transferred successfully' },
        newPresidentUserId: { type: 'string', example: '123' },
        previousPresidentUserId: { type: 'string', example: '456' },
        transferredAt: { type: 'string', example: '2024-01-15T10:30:00Z' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid user or user not in organization' })
  @ApiResponse({ status: 403, description: 'Only PRESIDENT can transfer presidency' })
  @ApiResponse({ status: 404, description: 'Organization or user not found' })
  async transferPresidency(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body('newPresidentUserId') newPresidentUserId: string
  ) {
    return this.organizationService.transferPresidency(organizationId, newPresidentUserId, this.getMockUser());
  }
}
