import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUrl, IsDateString, IsIn, Matches, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

/**
 * LECTURE CREATION WITH FILE UPLOAD DTO
 * 
 * Enhanced DTO for creating lectures with optional document uploads
 * Supports multipart/form-data for file uploads using Multer
 */
export class CreateLectureWithFilesDto {
  @ApiProperty({
    description: 'Cause ID (numeric string)',
    example: '1'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'causeId must be a numeric string (e.g., "1", "123")' })
  causeId: string;

  @ApiProperty({
    description: 'Lecture title',
    example: 'Introduction to React Development'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Lecture description',
    example: 'A comprehensive introduction to React development concepts'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Lecture content',
    example: 'This lecture covers React components, hooks, and state management...'
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Venue for physical lectures',
    example: 'Main Auditorium, Building A'
  })
  @IsString()
  @IsOptional()
  venue?: string;

  @ApiPropertyOptional({
    description: 'Lecture mode',
    enum: ['online', 'physical'],
    example: 'online'
  })
  @IsString()
  @IsOptional()
  @IsIn(['online', 'physical'])
  mode?: 'online' | 'physical';

  @ApiPropertyOptional({
    description: 'Lecture start time (ISO 8601 format)',
    example: '2024-12-15T10:00:00Z'
  })
  @IsDateString()
  @IsOptional()
  timeStart?: string;

  @ApiPropertyOptional({
    description: 'Lecture end time (ISO 8601 format)',
    example: '2024-12-15T12:00:00Z'
  })
  @IsDateString()
  @IsOptional()
  timeEnd?: string;

  @ApiPropertyOptional({
    description: 'Live stream link for online lectures',
    example: 'https://meet.google.com/abc-defg-hij'
  })
  @IsString()
  @IsOptional()
  @Matches(/^https?:\/\/.+/, { message: 'liveLink must be a valid http or https URL' })
  @MaxLength(500, { message: 'liveLink cannot exceed 500 characters' })
  @Transform(({ value }) => {
    const trimmed = value?.trim();
    return (trimmed === '' || trimmed === null || trimmed === undefined) ? undefined : trimmed;
  })
  liveLink?: string;

  @ApiPropertyOptional({
    description: 'Live streaming platform',
    enum: ['youtube', 'meet', 'zoom', 'teams'],
    example: 'meet'
  })
  @IsString()
  @IsOptional()
  @IsIn(['youtube', 'meet', 'zoom', 'teams'])
  liveMode?: 'youtube' | 'meet' | 'zoom' | 'teams';

  @ApiPropertyOptional({
    description: 'Recording URL (if available)',
    example: 'https://youtube.com/watch?v=example'
  })
  @IsString()
  @IsOptional()
  @Matches(/^https?:\/\/.+/, { message: 'recordingUrl must be a valid http or https URL' })
  @MaxLength(500, { message: 'recordingUrl cannot exceed 500 characters' })
  @Transform(({ value }) => {
    const trimmed = value?.trim();
    return (trimmed === '' || trimmed === null || trimmed === undefined) ? undefined : trimmed;
  })
  recordingUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the lecture is public or private',
    example: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;

  @ApiPropertyOptional({
    description: 'Document files to upload with the lecture',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary'
    }
  })
  documents?: any[];
}

/**
 * UPDATE LECTURE WITH FILE UPLOAD DTO
 * 
 * Enhanced DTO for updating lectures with optional document uploads
 * All fields optional for partial updates
 */
export class UpdateLectureWithFilesDto {
  @ApiPropertyOptional({
    description: 'Lecture title',
    example: 'Updated: Introduction to React Development'
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Lecture description',
    example: 'Updated comprehensive introduction to React development concepts'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Lecture content',
    example: 'Updated lecture content covering React components, hooks, and state management...'
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Venue for physical lectures',
    example: 'Updated venue: Conference Room B'
  })
  @IsString()
  @IsOptional()
  venue?: string;

  @ApiPropertyOptional({
    description: 'Lecture mode',
    enum: ['online', 'physical'],
    example: 'physical'
  })
  @IsString()
  @IsOptional()
  @IsIn(['online', 'physical'])
  mode?: 'online' | 'physical';

  @ApiPropertyOptional({
    description: 'Updated lecture start time (ISO 8601 format)',
    example: '2024-12-15T14:00:00Z'
  })
  @IsDateString()
  @IsOptional()
  timeStart?: string;

  @ApiPropertyOptional({
    description: 'Updated lecture end time (ISO 8601 format)',
    example: '2024-12-15T16:00:00Z'
  })
  @IsDateString()
  @IsOptional()
  timeEnd?: string;

  @ApiPropertyOptional({
    description: 'Updated live stream link for online lectures',
    example: 'https://meet.google.com/updated-link'
  })
  @IsString()
  @IsOptional()
  @Matches(/^https?:\/\/.+/, { message: 'liveLink must be a valid http or https URL' })
  @MaxLength(500, { message: 'liveLink cannot exceed 500 characters' })
  @Transform(({ value }) => {
    const trimmed = value?.trim();
    return (trimmed === '' || trimmed === null || trimmed === undefined) ? undefined : trimmed;
  })
  liveLink?: string;

  @ApiPropertyOptional({
    description: 'Updated live streaming platform',
    enum: ['youtube', 'meet', 'zoom', 'teams'],
    example: 'zoom'
  })
  @IsString()
  @IsOptional()
  @IsIn(['youtube', 'meet', 'zoom', 'teams'])
  liveMode?: 'youtube' | 'meet' | 'zoom' | 'teams';

  @ApiPropertyOptional({
    description: 'Updated recording URL (if available)',
    example: 'https://youtube.com/watch?v=updated-example'
  })
  @IsString()
  @IsOptional()
  @Matches(/^https?:\/\/.+/, { message: 'recordingUrl must be a valid http or https URL' })
  @MaxLength(500, { message: 'recordingUrl cannot exceed 500 characters' })
  @Transform(({ value }) => {
    const trimmed = value?.trim();
    return (trimmed === '' || trimmed === null || trimmed === undefined) ? undefined : trimmed;
  })
  recordingUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated visibility setting',
    example: true
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Additional document files to upload with the lecture update',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary'
    }
  })
  documents?: any[];
}
