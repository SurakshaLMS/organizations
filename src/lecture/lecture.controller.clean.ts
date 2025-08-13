import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseInterceptors, Logger } from '@nestjs/common';
import { LectureService } from './lecture.service';
import { CreateLectureDto, UpdateLectureDto, LectureQueryDto } from './dto/lecture.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { EnhancedJwtPayload } from '../auth/organization-access.service';

/**
 * LECTURE CONTROLLER - TESTING MODE
 * 
 * All authentication removed for testing purposes
 */
@Controller('lectures')
@UseInterceptors(SecurityHeadersInterceptor)
export class LectureController {
  private readonly logger = new Logger(LectureController.name);

  constructor(private lectureService: LectureService) {}

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
   * CREATE LECTURE
   */
  @Post()
  async createLecture(@Body() createLectureDto: CreateLectureDto) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}" by test user`);
    return this.lectureService.createLecture(createLectureDto, this.getMockUser());
  }

  /**
   * GET LECTURES WITH FILTERING
   */
  @Get()
  async getLectures(@Query() queryDto: LectureQueryDto) {
    this.logger.log(`📚 Fetching lectures with filters: ${JSON.stringify(queryDto)}`);
    return this.lectureService.getLectures(this.getMockUser(), queryDto);
  }

  /**
   * GET LECTURE BY ID
   */
  @Get(':id')
  async getLectureById(@Param('id') id: string) {
    this.logger.log(`📚 Fetching lecture with ID: ${id}`);
    return this.lectureService.getLectureById(id, this.getMockUser());
  }

  /**
   * UPDATE LECTURE
   */
  @Put(':id')
  async updateLecture(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureDto,
  ) {
    this.logger.log(`📚 Updating lecture ${id}`);
    return this.lectureService.updateLecture(id, updateLectureDto, this.getMockUser());
  }

  /**
   * DELETE LECTURE
   */
  @Delete(':id')
  async deleteLecture(@Param('id') id: string) {
    this.logger.log(`📚 Deleting lecture ${id}`);
    return this.lectureService.deleteLecture(id, this.getMockUser());
  }

  /**
   * GET LECTURE DOCUMENTS
   */
  @Get(':id/documents')
  async getLectureDocuments(@Param('id') id: string) {
    this.logger.log(`📚 Fetching documents for lecture ${id}`);
    return this.lectureService.getLectureDocuments(id, this.getMockUser());
  }
}
