import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { InstituteUserService } from './institute-user.service';
import { 
  AssignUserToInstituteDto, 
  UpdateInstituteUserDto, 
  InstituteUserFilterDto 
} from './dto/institute-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';

@Controller('institute-users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(SecurityHeadersInterceptor)
export class InstituteUserController {
  constructor(private instituteUserService: InstituteUserService) {}

  /**
   * Assign user to institute
   */
  @Post('assign')
  async assignUserToInstitute(
    @Body() assignDto: AssignUserToInstituteDto,
    @GetUser('userId') assignedByUserId: string,
  ) {
    return this.instituteUserService.assignUserToInstitute(assignDto, assignedByUserId);
  }

  /**
   * Update institute user assignment
   */
  @Put(':instituteId/users/:userId')
  async updateInstituteUser(
    @Param('instituteId') instituteId: string,
    @Param('userId') userId: string,
    @Body() updateDto: UpdateInstituteUserDto,
    @GetUser('userId') updatedByUserId: string,
  ) {
    return this.instituteUserService.updateInstituteUser(
      instituteId,
      userId,
      updateDto,
      updatedByUserId,
    );
  }

  /**
   * Remove user from institute
   */
  @Delete(':instituteId/users/:userId')
  async removeUserFromInstitute(
    @Param('instituteId') instituteId: string,
    @Param('userId') userId: string,
    @GetUser('userId') removedByUserId: string,
  ) {
    return this.instituteUserService.removeUserFromInstitute(
      instituteId,
      userId,
      removedByUserId,
    );
  }

  /**
   * Get institute users with pagination and filtering
   */
  @Get()
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
   */
  @Get('institute/:instituteId')
  async getUsersByInstitute(
    @Param('instituteId') instituteId: string,
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

    return this.instituteUserService.getUsersByInstitute(instituteId, paginationDto);
  }

  /**
   * Get institutes by user with pagination
   */
  @Get('user/:userId')
  async getInstitutesByUser(
    @Param('userId') userId: string,
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
   */
  @Get('roles')
  getAvailableRoles() {
    return this.instituteUserService.getAvailableRoles();
  }
}
