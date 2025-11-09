import { IsString, IsOptional, IsNotEmpty, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * CREATE DOCUMENTATION DTO
 * For creating new documentation with optional PDF upload
 */
export class CreateDocumentationDto {
  @ApiProperty({
    description: 'Lecture ID that this documentation belongs to',
    example: '12345'
  })
  @IsString()
  @IsNotEmpty()
  lectureId: string;

  @ApiProperty({
    description: 'Title of the documentation',
    example: 'Introduction to Algorithms',
    maxLength: 255
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the documentation',
    example: 'This document covers the basic concepts of algorithms including time complexity analysis.'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Main content of the documentation',
    example: 'Chapter 1: Introduction\n\nAlgorithms are step-by-step procedures...'
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Document URL (full URL or relative path from signed URL upload)',
    example: 'documentation/pdfs/1731234567890-intro-algorithms.pdf'
  })
  @IsOptional()
  @IsString()
  docUrl?: string;
}

/**
 * UPDATE DOCUMENTATION DTO
 * For updating existing documentation
 */
export class UpdateDocumentationDto {
  @ApiPropertyOptional({
    description: 'Updated title of the documentation',
    example: 'Advanced Algorithms',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the documentation'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated content of the documentation'
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Updated document URL (full URL or relative path from signed URL upload)'
  })
  @IsOptional()
  @IsString()
  docUrl?: string;
}

/**
 * DOCUMENTATION QUERY DTO
 * For filtering and searching documentation
 */
export class DocumentationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by lecture ID',
    example: '12345'
  })
  @IsOptional()
  @IsString()
  lectureId?: string;

  @ApiPropertyOptional({
    description: 'Search term for title, description, or content',
    example: 'algorithm'
  })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * DOCUMENTATION RESPONSE DTO
 * Response format for documentation data
 */
export class DocumentationResponseDto {
  @ApiProperty({
    description: 'Unique documentation ID',
    example: '67890'
  })
  id: string;

  @ApiProperty({
    description: 'Associated lecture ID',
    example: '12345'
  })
  lectureId: string;

  @ApiProperty({
    description: 'Documentation title',
    example: 'Introduction to Algorithms'
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Documentation description'
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Documentation content'
  })
  content?: string;

  @ApiPropertyOptional({
    description: 'External documentation URL'
  })
  docUrl?: string;

  @ApiPropertyOptional({
    description: 'PDF file URL if uploaded',
    example: '/uploads/documentation/lecture-12345-intro-algorithms.pdf'
  })
  pdfUrl?: string;

  @ApiPropertyOptional({
    description: 'Original PDF filename',
    example: 'intro-algorithms.pdf'
  })
  pdfFileName?: string;

  @ApiPropertyOptional({
    description: 'PDF file size in bytes',
    example: 2048576
  })
  pdfFileSize?: number;

  @ApiProperty({
    description: 'Creation date',
    example: '2025-09-04T10:30:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2025-09-04T15:45:00.000Z'
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Associated lecture information'
  })
  lecture?: {
    id: string;
    title: string;
    causeId: string;
  };
}

/**
 * FILE UPLOAD RESPONSE DTO
 * Response format for file upload operations
 */
export class FileUploadResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'PDF uploaded successfully'
  })
  message: string;

  @ApiProperty({
    description: 'Uploaded file URL',
    example: '/uploads/documentation/lecture-12345-intro-algorithms.pdf'
  })
  fileUrl: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'intro-algorithms.pdf'
  })
  originalName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576
  })
  size: number;

  @ApiProperty({
    description: 'File MIME type',
    example: 'application/pdf'
  })
  mimeType: string;
}
