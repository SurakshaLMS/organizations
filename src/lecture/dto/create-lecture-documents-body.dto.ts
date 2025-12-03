import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUrl, IsDateString, IsIn, IsArray, ValidateNested, MaxLength, MinLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * DOCUMENT CREATION DTO
 */
export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  docUrl?: string;
}

/**
 * CREATE LECTURE WITH DOCUMENTS DTO (for URL-based causeId)
 * 
 * This DTO is used when causeId comes from URL parameter (:causeId)
 * instead of request body, so causeId validation is not needed here
 */
export class CreateLectureWithDocumentsBodyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsString()
  @IsOptional()
  mode?: string;

  @IsString()
  @IsOptional()
  timeStart?: string;

  @IsString()
  @IsOptional()
  timeEnd?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => {
    const trimmed = value?.trim();
    return (trimmed === '' || trimmed === null || trimmed === undefined) ? undefined : trimmed;
  })
  liveLink?: string;

  @IsString()
  @IsOptional()
  liveMode?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => {
    const trimmed = value?.trim();
    return (trimmed === '' || trimmed === null || trimmed === undefined) ? undefined : trimmed;
  })
  recordingUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  // Document metadata (optional - to be paired with uploaded files)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentDto)
  @IsOptional()
  documents?: CreateDocumentDto[];
}