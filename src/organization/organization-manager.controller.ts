import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { RateLimit } from '../auth/guards/rate-limit.guard';
import { EnhancedJwtPayload } from '../auth/organization-access.service';
import { ParseOrganizationIdPipe } from '../common/pipes/parse-numeric-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
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
@ApiBearerAuth()
@UsePipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  disableErrorMessages: false,
  validateCustomDecorators: true
}))
export class OrganizationManagerController {
  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * Create Organization (Global endpoint, moved here for consistency)
   */
  @Post('/create')
  @RateLimit(5, 60000) // 5 organizations per minute
  @ApiOperation({
    summary: 'Create new organization - Requires Authentication',
    description: 'Create a new organization. User becomes PRESIDENT automatically. Requires JWT token.'
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
    @Body() createOrganizationDto: CreateOrganizationDto,
    @GetUser() user?: EnhancedJwtPayload
  ): Promise<OrganizationDto> {
    return this.organizationService.createOrganization(createOrganizationDto, user?.sub || '1');
  }

  /**
   * Update Organization
   */
  @Put()
  @RateLimit(20, 60000) // 20 updates per minute
  @ApiOperation({
    summary: 'Update organization - Requires Authentication',
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
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateOrganization(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @GetUser() user?: EnhancedJwtPayload
  ): Promise<OrganizationDto> {
    return this.organizationService.updateOrganization(organizationId, updateOrganizationDto, user);
  }

  /**
   * Patch Organization (Alternative to PUT)
   */
  @Patch()
  @RateLimit(20, 60000) // 20 updates per minute
  @ApiOperation({
    summary: 'Patch organization - Requires Authentication',
    description: 'Partially update organization details. Requires ADMIN or PRESIDENT role.'
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
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async patchOrganization(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @GetUser() user?: EnhancedJwtPayload
  ): Promise<OrganizationDto> {
    return this.organizationService.updateOrganization(organizationId, updateOrganizationDto, user);
  }

  /**
   * Delete Organization
   */
  @Delete()
  @RateLimit(3, 60000) // 3 deletions per minute
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete organization - Requires Authentication',
    description: 'Permanently delete organization. Only PRESIDENT can delete. This action is irreversible.'
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    required: true,
    type: String
  })
  @ApiResponse({ status: 204, description: 'Organization deleted successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions (PRESIDENT only)' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async deleteOrganization(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @GetUser() user?: EnhancedJwtPayload
  ): Promise<void> {
    await this.organizationService.deleteOrganization(organizationId, user);
  }

  /**
   * Get Organization Members
   */
  @Get('/members')
  @RateLimit(50, 60000) // 50 requests per minute
  @ApiOperation({
    summary: 'Get organization members - Requires Authentication',
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
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationMembers(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Query() pagination: PaginationDto,
    @GetUser() user?: EnhancedJwtPayload
  ): Promise<OrganizationMembersResponseDto> {
    return this.organizationService.getOrganizationMembers(organizationId, pagination, user);
  }

  /**
   * Assign User Role
   */
  @Post('/assign-role')
  @RateLimit(30, 60000) // 30 role assignments per minute
  @ApiOperation({
    summary: 'Assign role to user - Requires Authentication',
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
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization or user not found' })
  async assignUserRole(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() assignUserRoleDto: AssignUserRoleDto,
    @GetUser() user?: EnhancedJwtPayload
  ): Promise<RoleAssignmentResponseDto> {
    return this.organizationService.assignUserRole(organizationId, assignUserRoleDto, user);
  }

  /**
   * Change User Role
   */
  @Put('/change-role')
  @RateLimit(20, 60000) // 20 role changes per minute
  @ApiOperation({
    summary: 'Change user role - Requires Authentication',
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
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization or user not found' })
  async changeUserRole(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() changeUserRoleDto: ChangeUserRoleDto,
    @GetUser() user?: EnhancedJwtPayload
  ): Promise<RoleAssignmentResponseDto> {
    return this.organizationService.changeUserRole(organizationId, changeUserRoleDto, user);
  }

  /**
   * Remove User from Organization
   */
  @Delete('/remove-user')
  @RateLimit(15, 60000) // 15 removals per minute
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove user from organization - Requires Authentication',
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
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization or user not found' })
  async removeUserFromOrganization(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body() removeUserDto: RemoveUserDto,
    @GetUser() user?: EnhancedJwtPayload
  ): Promise<void> {
    await this.organizationService.removeUserFromOrganization(organizationId, removeUserDto, user);
  }

  /**
   * Transfer Presidency
   */
  @Put('/transfer-presidency')
  @RateLimit(5, 60000) // 5 transfers per minute
  @ApiOperation({
    summary: 'Transfer presidency - Requires Authentication',
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
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Only PRESIDENT can transfer presidency' })
  @ApiResponse({ status: 404, description: 'Organization or user not found' })
  async transferPresidency(
    @Param('id', ParseOrganizationIdPipe()) organizationId: string,
    @Body('newPresidentUserId') newPresidentUserId: string,
    @GetUser() user?: EnhancedJwtPayload
  ) {
    return this.organizationService.transferPresidency(organizationId, newPresidentUserId, user);
  }
}
