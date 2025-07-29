import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUrl, IsDateString, IsIn, Matches, IsNumberString } from 'class-validator';

/**
 * ENTERPRISE LECTURE CREATION DTO
 * 
 * Optimized for production with proper validation and security
 */
export class CreateLectureDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'causeId must be a numeric string (e.g., "1", "123")' })
  causeId: string;

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
  isPublic?: boolean = false;
}

/**
 * ENTERPRISE LECTURE UPDATE DTO
 * 
 * All fields optional for partial updates
 */
export class UpdateLectureDto {
  @IsString()
  @IsOptional()
  title?: string;

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

/**
 * ENHANCED LECTURE QUERY DTO
 * 
 * Production-ready filtering with cause ID optimization
 * Supports advanced filtering by cause IDs, organizations, and more
 */
export class LectureQueryDto {
  // Pagination
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  // Search
  @IsOptional()
  @IsString()
  search?: string;

  // OPTIMIZED CAUSE FILTERING (primary use case)
  @IsOptional()
  @IsString()
  @Matches(/^\d+(,\d+)*$/, { message: 'causeIds must be comma-separated numeric values (e.g., "1,2,3")' })
  causeIds?: string; // Comma-separated cause IDs - MAIN FILTER

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'causeId must be a numeric string' })
  causeId?: string; // Single cause ID

  // Organization filtering (derived from JWT token for performance)
  @IsOptional()
  @IsString()
  @Matches(/^\d+(,\d+)*$/, { message: 'organizationIds must be comma-separated numeric values (e.g., "1,2,3")' })
  organizationIds?: string; // Comma-separated organization IDs

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'organizationId must be a numeric string' })
  organizationId?: string; // Single organization ID

  // Content filtering
  @IsOptional()
  @IsString()
  @IsIn(['online', 'physical'])
  mode?: 'online' | 'physical';

  @IsOptional()
  @IsString()
  @IsIn(['upcoming', 'live', 'completed', 'all'])
  status?: 'upcoming' | 'live' | 'completed' | 'all';

  // Visibility filtering
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false', 'all'])
  isPublic?: string;

  // Date filtering
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  // Sorting
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'timeStart', 'timeEnd', 'title'])
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string;
}
