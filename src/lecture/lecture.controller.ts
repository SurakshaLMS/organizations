import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { LectureService } from './lecture.service';
import { CreateLectureDto, UpdateLectureDto } from './dto/lecture.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('lectures')
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
   */
  @Get()
  async getLectures(@Query('userId') userId?: string) {
    return this.lectureService.getLectures(userId);
  }

  /**
   * Get lecture by ID
   */
  @Get(':id')
  async getLectureById(
    @Param('id') lectureId: string,
    @Query('userId') userId?: string,
  ) {
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
