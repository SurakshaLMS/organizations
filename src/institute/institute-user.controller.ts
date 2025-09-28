import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseInterceptors,
  UseGuards
} from '@nestjs/common';
import { InstituteUserService } from './institute-user.service';
import { 
  AssignUserToInstituteDto, 
  UpdateInstituteUserDto, 
  InstituteUserFilterDto 
} from './dto/institute-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RequireOrganizationAdmin, RequireOrganizationModerator } from '../auth/decorators/organization-access.decorator';
import { EnhancedJwtPayload } from '../auth/organization-access.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Institute User Management')
@Controller('institute-users')
@UseInterceptors(SecurityHeadersInterceptor)
export class InstituteUserController {
  constructor(private instituteUserService: InstituteUserService) {}

  /**
   * Assign user to institute
   * Requires ADMIN role or higher in the organization
   */
  @Post('assign')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationAdmin('instituteId')
  @ApiOperation({ 
    summary: 'Assign user to institute (Admin only)',
    description: 'Requires ADMIN or PRESIDENT role in the organization'
  })
  @ApiBody({ type: AssignUserToInstituteDto })
  @ApiResponse({ status: 201, description: 'User assigned to institute successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (requires ADMIN+)' })
  @ApiResponse({ status: 404, description: 'Institute or user not found' })
  async assignUserToInstitute(
    @Body() assignDto: AssignUserToInstituteDto,
    @GetUser() user: EnhancedJwtPayload
  ) {
    return this.instituteUserService.assignUserToInstitute(assignDto, user.sub);
  }

  /**
   * Update institute user assignment
   * Requires ADMIN role or higher in the organization
   */
  @Put(':instituteId/users/:userId')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationAdmin('instituteId')
  @ApiOperation({ 
    summary: 'Update institute user assignment (Admin only)',
    description: 'Requires ADMIN or PRESIDENT role in the organization'
  })
  @ApiParam({ name: 'instituteId', description: 'Institute ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: UpdateInstituteUserDto })
  @ApiResponse({ status: 200, description: 'Institute user assignment updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (requires ADMIN+)' })
  @ApiResponse({ status: 404, description: 'Institute user assignment not found' })
  async updateInstituteUser(
    @Param('instituteId') instituteId: string,
    @Param('userId') userId: string,
    @Body() updateDto: UpdateInstituteUserDto,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    return this.instituteUserService.updateInstituteUser(
      instituteId,
      userId,
      updateDto,
      user.sub,
    );
  }

  /**
   * Remove user from institute
   * Requires ADMIN role or higher in the organization
   */
  @Delete(':instituteId/users/:userId')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationAdmin('instituteId')
  @ApiOperation({ 
    summary: 'Remove user from institute (Admin only)',
    description: 'Requires ADMIN or PRESIDENT role in the organization'
  })
  @ApiParam({ name: 'instituteId', description: 'Institute ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User removed from institute successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (requires ADMIN+)' })
  @ApiResponse({ status: 404, description: 'Institute user assignment not found' })
  async removeUserFromInstitute(
    @Param('instituteId') instituteId: string,
    @Param('userId') userId: string,
    @GetUser() user: EnhancedJwtPayload,
  ) {
    return this.instituteUserService.removeUserFromInstitute(
      instituteId,
      userId,
      user.sub,
    );
  }

  /**
   * Get institute users with pagination and filtering
   * Public access for basic information, enhanced data for authenticated users
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get institute users with pagination and filtering (public access)',
    description: 'Basic information publicly available, enhanced data for authenticated users'
  })
  @ApiResponse({ status: 200, description: 'Institute users retrieved successfully' })
  async getInstituteUsers(
    @Query('instituteId') instituteId?: string,
    @Query('userId') userId?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('assignedBy') assignedBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
    @GetUser() user?: EnhancedJwtPayload,
  ) {
    const filterDto: InstituteUserFilterDto = {
      instituteId,
      userId,
      role: role as any,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      assignedBy,
    };

    const paginationDto = new PaginationDto();
    paginationDto.page = page;
    paginationDto.limit = limit;
    paginationDto.sortBy = sortBy;
    paginationDto.sortOrder = sortOrder;
    paginationDto.search = search;

    return this.instituteUserService.getInstituteUsers(filterDto, paginationDto);
  }

  /**
   * Get users by institute with pagination
   * Public access for basic information
   */
  @Get('institute/:instituteId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get users by institute with pagination (public access)',
    description: 'Basic information publicly available'
  })
  @ApiParam({ name: 'instituteId', description: 'Institute ID' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsersByInstitute(
    @Param('instituteId') instituteId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
    @GetUser() user?: EnhancedJwtPayload,
  ) {
    const paginationDto = new PaginationDto();
    paginationDto.page = page;
    paginationDto.limit = limit;
    paginationDto.sortBy = sortBy;
    paginationDto.sortOrder = sortOrder;
    paginationDto.search = search;

    return this.instituteUserService.getUsersByInstitute(instituteId, paginationDto);
  }

  /**
   * Get institutes by user with pagination
   * Requires authentication (user can see their own institutes)
   */
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get institutes by user with pagination (authenticated access)',
    description: 'Users can see their own institutes, admins can see any user\'s institutes'
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Institutes retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only access own data unless admin' })
  async getInstitutesByUser(
    @Param('userId') userId: string,
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

    return this.instituteUserService.getInstitutesByUser(userId, paginationDto);
  }

  /**
   * Get available roles
   * Public access - role definitions are not sensitive
   */
  @Get('roles')
  @ApiOperation({ 
    summary: 'Get available roles (public access)',
    description: 'Returns list of available institute user roles'
  })
  @ApiResponse({ status: 200, description: 'Available roles retrieved successfully' })
  getAvailableRoles() {
    return this.instituteUserService.getAvailableRoles();
  }
}
