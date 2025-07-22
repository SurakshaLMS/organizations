import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, UseInterceptors } from '@nestjs/common';
import { CauseService } from './cause.service';
import { CreateCauseDto, UpdateCauseDto } from './dto/cause.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { EnhancedJwtPayload } from '../auth/organization-access.service';

@Controller('causes')
@UseInterceptors(SecurityHeadersInterceptor)
export class CauseController {
  constructor(private causeService: CauseService) {}

  /**
   * Create a new cause
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createCause(
    @Body() createCauseDto: CreateCauseDto,
    @GetUser('userId') userId: string,
  ) {
    return this.causeService.createCause(createCauseDto, userId);
  }

  /**
   * Get all causes with pagination
   * Enhanced with optional authentication
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getCauses(
    @GetUser() user?: EnhancedJwtPayload,
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

    // Extract userId from JWT token if authenticated, otherwise undefined for public access
    const userId = user?.sub;
    return this.causeService.getCauses(userId, paginationDto);
  }

  /**
   * Get cause by ID
   * Enhanced with optional authentication
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getCauseById(
    @Param('id') causeId: string,
    @GetUser() user?: EnhancedJwtPayload,
  ) {
    // Extract userId from JWT token if authenticated, otherwise undefined for public access
    const userId = user?.sub;
    return this.causeService.getCauseById(causeId, userId);
  }

  /**
   * Update cause
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateCause(
    @Param('id') causeId: string,
    @Body() updateCauseDto: UpdateCauseDto,
    @GetUser('userId') userId: string,
  ) {
    return this.causeService.updateCause(causeId, updateCauseDto, userId);
  }

  /**
   * Delete cause
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteCause(
    @Param('id') causeId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.causeService.deleteCause(causeId, userId);
  }

  /**
   * Get causes by organization
   * Enhanced with optional authentication
   */
  @Get('organization/:organizationId')
  @UseGuards(OptionalJwtAuthGuard)
  async getCausesByOrganization(
    @Param('organizationId') organizationId: string,
    @GetUser() user?: EnhancedJwtPayload,
  ) {
    // Extract userId from JWT token if authenticated, otherwise undefined for public access
    const userId = user?.sub;
    return this.causeService.getCausesByOrganization(organizationId, userId);
  }
}
