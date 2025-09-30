import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUrl, IsDateString, IsIn } from 'class-validator';

/**
 * CREATE LECTURE WITH DOCUMENTS DTO (for URL-based causeId)
 * 
 * This DTO is used when causeId comes from URL parameter (:causeId)
 * instead of request body, so causeId validation is not needed here
 */
export class CreateLectureWithDocumentsBodyDto {
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
  venue?: string;

  @IsString()
  @IsOptional()
  @IsIn(['online', 'physical'])
  mode?: 'online' | 'physical';

  @IsDateString()
  @IsOptional()
  timeStart?: string;

  @IsDateString()
  @IsOptional()
  timeEnd?: string;

  @IsUrl()
  @IsOptional()
  liveLink?: string;

  @IsString()
  @IsOptional()
  @IsIn(['youtube', 'meet', 'zoom', 'teams'])
  liveMode?: 'youtube' | 'meet' | 'zoom' | 'teams';

  @IsUrl()
  @IsOptional()
  recordingUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}