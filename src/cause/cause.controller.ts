import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { CauseService } from './cause.service';
import { CreateCauseDto, UpdateCauseDto } from './dto/cause.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('causes')
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
   * Get all causes
   */
  @Get()
  async getCauses(@Query('userId') userId?: string) {
    return this.causeService.getCauses(userId);
  }

  /**
   * Get cause by ID
   */
  @Get(':id')
  async getCauseById(
    @Param('id') causeId: string,
    @Query('userId') userId?: string,
  ) {
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
   */
  @Get('organization/:organizationId')
  async getCausesByOrganization(
    @Param('organizationId') organizationId: string,
    @Query('userId') userId?: string,
  ) {
    return this.causeService.getCausesByOrganization(organizationId, userId);
  }
}
