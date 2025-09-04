import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseInterceptors, Logger, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { LectureService } from './lecture.service';
import { CreateLectureDto, UpdateLectureDto, LectureQueryDto } from './dto/lecture.dto';
import { CreateLectureWithDocumentsDto } from './dto/create-lecture-with-documents.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';

/**
 * LECTURE CONTROLLER
 * 
 * Handles all lecture-related operations including document uploads to S3
 */
@ApiTags('Lectures')
@Controller('lectures')
@UseInterceptors(SecurityHeadersInterceptor)
export class LectureController {
  private readonly logger = new Logger(LectureController.name);

  constructor(private lectureService: LectureService) {}

  /**
   * CREATE LECTURE
   */
  @Post()
  @ApiOperation({ summary: 'Create a new lecture' })
  @ApiBody({ type: CreateLectureDto })
  @ApiResponse({ status: 201, description: 'Lecture created successfully' })
  async createLecture(
    @Body() createLectureDto: CreateLectureDto
  ) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}"`);
    return this.lectureService.createLecture(createLectureDto, undefined);
  }

  /**
   * CREATE LECTURE WITH DOCUMENTS
   * 
   * Enhanced endpoint that allows creating a lecture with multiple document uploads to S3
   * Uses multipart/form-data to handle file uploads
   */
  @Post('with-documents/:causeId')
  @UseInterceptors(FilesInterceptor('documents', 10)) // Allow up to 10 files
  @ApiOperation({ summary: 'Create lecture with document uploads to S3' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'causeId', description: 'ID of the cause to create lecture for' })
  @ApiBody({ 
    type: CreateLectureDto,
    description: 'Lecture data with optional file uploads (use form-data)' 
  })
  @ApiResponse({ status: 201, description: 'Lecture created with documents successfully' })
  @ApiResponse({ status: 404, description: 'Cause not found' })
  async createLectureWithDocuments(
    @Param('causeId') causeId: string,
    @Body() createLectureDto: CreateLectureDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    this.logger.log(`📚 Creating lecture "${createLectureDto.title}" with ${files?.length || 0} documents for cause ${causeId}`);
    return this.lectureService.createLectureWithDocuments(
      createLectureDto,
      causeId,
      undefined,
      files
    );
  }

  /**
   * GET LECTURES WITH FILTERING
   */
  @Get()
  @ApiOperation({ summary: 'Get lectures with filtering' })
  @ApiQuery({ name: 'causeId', required: false, description: 'Filter by cause ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Lectures retrieved successfully' })
  async getLectures(
    @Query() queryDto: LectureQueryDto
  ) {
    this.logger.log(`📚 Fetching lectures with filters: ${JSON.stringify(queryDto)}`);
    return this.lectureService.getLectures(undefined, queryDto);
  }

  /**
   * GET LECTURE BY ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get lecture by ID' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async getLectureById(
    @Param('id') id: string
  ) {
    this.logger.log(`📚 Fetching lecture with ID: ${id}`);
    return this.lectureService.getLectureById(id, undefined);
  }

  /**
   * UPDATE LECTURE
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update lecture' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiBody({ type: UpdateLectureDto })
  @ApiResponse({ status: 200, description: 'Lecture updated successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async updateLecture(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureDto
  ) {
    this.logger.log(`📚 Updating lecture ${id}`);
    return this.lectureService.updateLecture(id, updateLectureDto, undefined);
  }

  /**
   * DELETE LECTURE
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete lecture' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async deleteLecture(
    @Param('id') id: string
  ) {
    this.logger.log(`📚 Deleting lecture ${id}`);
    return this.lectureService.deleteLecture(id, undefined);
  }

  /**
   * GET LECTURE DOCUMENTS
   */
  @Get(':id/documents')
  @ApiOperation({ summary: 'Get lecture documents' })
  @ApiParam({ name: 'id', description: 'Lecture ID' })
  @ApiResponse({ status: 200, description: 'Lecture documents retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async getLectureDocuments(
    @Param('id') id: string
  ) {
    this.logger.log(`📚 Fetching documents for lecture ${id}`);
    return this.lectureService.getLectureDocuments(id, undefined);
  }
}
