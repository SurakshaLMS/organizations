import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, UseInterceptors } from '@nestjs/common';
import { LectureService } from './lecture.service';
import { CreateLectureDto, UpdateLectureDto } from './dto/lecture.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { EnhancedJwtPayload } from '../auth/organization-access.service';

@Controller('lectures')
@UseInterceptors(SecurityHeadersInterceptor)
export class LectureController {
  constructor(private lectureService: LectureService) {}

  /**
   * Create a new lecture
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createLecture(
    @Body() createLectureDto: CreateLectureDto,
    @GetUser('userId') userId: string,
  ) {
    return this.lectureService.createLecture(createLectureDto, userId);
  }

  /**
   * Get all lectures
   * Enhanced with optional authentication
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getLectures(@GetUser() user?: EnhancedJwtPayload) {
    // Extract userId from JWT token if authenticated, otherwise undefined for public access
    const userId = user?.sub;
    return this.lectureService.getLectures(userId);
  }

  /**
   * Get lecture by ID
   * Enhanced with optional authentication
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getLectureById(
    @Param('id') lectureId: string,
    @GetUser() user?: EnhancedJwtPayload,
  ) {
    // Extract userId from JWT token if authenticated, otherwise undefined for public access
    const userId = user?.sub;
    return this.lectureService.getLectureById(lectureId, userId);
  }

  /**
   * Update lecture
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateLecture(
    @Param('id') lectureId: string,
    @Body() updateLectureDto: UpdateLectureDto,
    @GetUser('userId') userId: string,
  ) {
    return this.lectureService.updateLecture(lectureId, updateLectureDto, userId);
  }

  /**
   * Delete lecture
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteLecture(
    @Param('id') lectureId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.lectureService.deleteLecture(lectureId, userId);
  }
}
