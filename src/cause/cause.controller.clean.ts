import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseInterceptors } from '@nestjs/common';
import { CauseService } from './cause.service';
import { CreateCauseDto, UpdateCauseDto } from './dto/cause.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { EnhancedJwtPayload } from '../auth/organization-access.service';

@Controller('causes')
@UseInterceptors(SecurityHeadersInterceptor)
export class CauseController {
  constructor(private causeService: CauseService) {}

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
   * Create a new cause
   */
  @Post()
  async createCause(@Body() createCauseDto: CreateCauseDto) {
    return this.causeService.createCause(createCauseDto);
  }

  /**
   * Get all causes with pagination
   */
  @Get()
  async getCauses(
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

    return this.causeService.getCauses(undefined, paginationDto);
  }

  /**
   * Get cause by ID
   */
  @Get(':id')
  async getCauseById(@Param('id') causeId: string) {
    return this.causeService.getCauseById(causeId, undefined);
  }

  /**
   * Update cause
   */
  @Put(':id')
  async updateCause(
    @Param('id') causeId: string,
    @Body() updateCauseDto: UpdateCauseDto,
  ) {
    return this.causeService.updateCause(causeId, updateCauseDto);
  }

  /**
   * Delete cause
   */
  @Delete(':id')
  async deleteCause(@Param('id') causeId: string) {
    const mockUser = this.getMockUser();
    return this.causeService.deleteCause(causeId, mockUser.sub);
  }

  /**
   * Get causes by organization
   */
  @Get('organization/:organizationId')
  async getCausesByOrganization(@Param('organizationId') organizationId: string) {
    return this.causeService.getCausesByOrganization(organizationId, undefined);
  }
}
