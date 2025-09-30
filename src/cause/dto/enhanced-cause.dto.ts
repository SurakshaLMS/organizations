import { 
  IsString, 
  IsNotEmpty, 
  IsBoolean, 
  IsOptional, 
  IsUrl, 
  Matches, 
  Length,
  IsEnum,
  MaxLength,
  MinLength,
  IsArray,
  ArrayMaxSize,
  ValidateNested
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsSafeString, 
  IsStringLength, 
  IsNumericStringInRange, 
  IsYouTubeUrl,
  IsValidFileSize,
  IsAllowedFileType 
} from '../../common/decorators/validation.decorators';

/**
 * ENHANCED CAUSE VALIDATION ENUMS
 */
export enum CauseCategory {
  ENVIRONMENT = 'environment',
  EDUCATION = 'education',
  HEALTH = 'health',
  POVERTY = 'poverty',
  TECHNOLOGY = 'technology',
  COMMUNITY = 'community',
  ARTS = 'arts',
  SPORTS = 'sports',
  RESEARCH = 'research',
  OTHER = 'other'
}

export enum CausePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum CauseStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * ENHANCED CREATE CAUSE DTO
 * 
 * Comprehensive validation with security and business rules
 */
export class EnhancedCreateCauseDto {
  @ApiProperty({
    description: 'Organization ID as a numeric string',
    example: '1',
    type: 'string',
    pattern: '^\\d+$'
  })
  @IsString({ message: 'Organization ID must be a string' })
  @IsNotEmpty({ message: 'Organization ID is required' })
  @IsNumericStringInRange(1, 999999, { message: 'Organization ID must be between 1 and 999999' })
  organizationId: string;

  @ApiProperty({
    description: 'Cause title (3-100 characters)',
    example: 'Environmental Conservation Initiative',
    type: 'string',
    minLength: 3,
    maxLength: 100
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @IsStringLength(3, 100, { message: 'Title must be between 3 and 100 characters' })
  @IsSafeString({ message: 'Title contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiPropertyOptional({
    description: 'Cause description (10-2000 characters)',
    example: 'A comprehensive initiative to promote environmental awareness and sustainable practices',
    type: 'string',
    minLength: 10,
    maxLength: 2000
  })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @IsStringLength(10, 2000, { message: 'Description must be between 10 and 2000 characters' })
  @IsSafeString({ message: 'Description contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({
    description: 'Cause category',
    example: 'environment',
    enum: CauseCategory
  })
  @IsOptional()
  @IsEnum(CauseCategory, { message: 'Invalid cause category' })
  category?: CauseCategory;

  @ApiPropertyOptional({
    description: 'Cause priority level',
    example: 'medium',
    enum: CausePriority,
    default: CausePriority.MEDIUM
  })
  @IsOptional()
  @IsEnum(CausePriority, { message: 'Invalid priority level' })
  priority?: CausePriority = CausePriority.MEDIUM;

  @ApiPropertyOptional({
    description: 'Cause status',
    example: 'active',
    enum: CauseStatus,
    default: CauseStatus.DRAFT
  })
  @IsOptional()
  @IsEnum(CauseStatus, { message: 'Invalid cause status' })
  status?: CauseStatus = CauseStatus.DRAFT;

  @ApiPropertyOptional({
    description: 'Introduction video URL (YouTube preferred)',
    example: 'https://youtube.com/watch?v=example',
    type: 'string'
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Invalid URL format' })
  @IsYouTubeUrl({ message: 'Please provide a valid YouTube URL' })
  @MaxLength(500, { message: 'Video URL cannot exceed 500 characters' })
  introVideoUrl?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization (max 10 tags, 20 chars each)',
    example: ['environment', 'sustainability', 'green'],
    type: [String],
    maxItems: 10
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @ArrayMaxSize(10, { message: 'Maximum 10 tags allowed' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @MaxLength(20, { each: true, message: 'Each tag cannot exceed 20 characters' })
  @IsSafeString({ each: true, message: 'Tags contain unsafe content' })
  @Transform(({ value }) => value?.map((tag: string) => tag.trim().toLowerCase()))
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Target funding amount (optional)',
    example: '50000',
    type: 'string',
    pattern: '^\\d+$'
  })
  @IsOptional()
  @IsString({ message: 'Target amount must be a string' })
  @IsNumericStringInRange(100, 10000000, { message: 'Target amount must be between 100 and 10,000,000' })
  targetAmount?: string;

  @ApiPropertyOptional({
    description: 'Expected duration in days',
    example: '365',
    type: 'string',
    pattern: '^\\d+$'
  })
  @IsOptional()
  @IsString({ message: 'Duration must be a string' })
  @IsNumericStringInRange(1, 3650, { message: 'Duration must be between 1 and 3650 days (10 years)' })
  durationDays?: string;

  @ApiPropertyOptional({
    description: 'Contact email for the cause',
    example: 'contact@cause.org',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Contact email must be a string' })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Invalid email format' })
  @MaxLength(100, { message: 'Email cannot exceed 100 characters' })
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Website URL for the cause',
    example: 'https://example.org',
    type: 'string'
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Invalid website URL format' })
  @MaxLength(500, { message: 'Website URL cannot exceed 500 characters' })
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the cause is public or private',
    example: false,
    type: 'boolean',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'Public setting must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  isPublic?: boolean = false;

  @ApiPropertyOptional({
    description: 'Whether the cause accepts volunteers',
    example: true,
    type: 'boolean',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Accepts volunteers must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  acceptsVolunteers?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether the cause accepts donations',
    example: true,
    type: 'boolean',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'Accepts donations must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  acceptsDonations?: boolean = false;
}

/**
 * ENHANCED UPDATE CAUSE DTO
 * 
 * All fields optional for partial updates with same validation rules
 */
export class EnhancedUpdateCauseDto {
  @ApiPropertyOptional({
    description: 'Updated cause title (3-100 characters)',
    example: 'Updated Environmental Initiative',
    type: 'string',
    minLength: 3,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @IsStringLength(3, 100, { message: 'Title must be between 3 and 100 characters' })
  @IsSafeString({ message: 'Title contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated cause description (10-2000 characters)',
    example: 'Updated comprehensive initiative description',
    type: 'string',
    minLength: 10,
    maxLength: 2000
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @IsStringLength(10, 2000, { message: 'Description must be between 10 and 2000 characters' })
  @IsSafeString({ message: 'Description contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated cause category',
    example: 'education',
    enum: CauseCategory
  })
  @IsOptional()
  @IsEnum(CauseCategory, { message: 'Invalid cause category' })
  category?: CauseCategory;

  @ApiPropertyOptional({
    description: 'Updated priority level',
    example: 'high',
    enum: CausePriority
  })
  @IsOptional()
  @IsEnum(CausePriority, { message: 'Invalid priority level' })
  priority?: CausePriority;

  @ApiPropertyOptional({
    description: 'Updated cause status',
    example: 'active',
    enum: CauseStatus
  })
  @IsOptional()
  @IsEnum(CauseStatus, { message: 'Invalid cause status' })
  status?: CauseStatus;

  @ApiPropertyOptional({
    description: 'Updated introduction video URL',
    example: 'https://youtube.com/watch?v=updated',
    type: 'string'
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Invalid URL format' })
  @IsYouTubeUrl({ message: 'Please provide a valid YouTube URL' })
  @MaxLength(500, { message: 'Video URL cannot exceed 500 characters' })
  introVideoUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated tags for categorization',
    example: ['environment', 'updated', 'green'],
    type: [String],
    maxItems: 10
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @ArrayMaxSize(10, { message: 'Maximum 10 tags allowed' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @MaxLength(20, { each: true, message: 'Each tag cannot exceed 20 characters' })
  @IsSafeString({ each: true, message: 'Tags contain unsafe content' })
  @Transform(({ value }) => value?.map((tag: string) => tag.trim().toLowerCase()))
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Updated target funding amount',
    example: '75000',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Target amount must be a string' })
  @IsNumericStringInRange(100, 10000000, { message: 'Target amount must be between 100 and 10,000,000' })
  targetAmount?: string;

  @ApiPropertyOptional({
    description: 'Updated duration in days',
    example: '180',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Duration must be a string' })
  @IsNumericStringInRange(1, 3650, { message: 'Duration must be between 1 and 3650 days' })
  durationDays?: string;

  @ApiPropertyOptional({
    description: 'Updated contact email',
    example: 'updated@cause.org',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Contact email must be a string' })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Invalid email format' })
  @MaxLength(100, { message: 'Email cannot exceed 100 characters' })
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Updated website URL',
    example: 'https://updated.org',
    type: 'string'
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Invalid website URL format' })
  @MaxLength(500, { message: 'Website URL cannot exceed 500 characters' })
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated visibility setting',
    example: true,
    type: 'boolean'
  })
  @IsOptional()
  @IsBoolean({ message: 'Public setting must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Updated volunteer acceptance setting',
    example: false,
    type: 'boolean'
  })
  @IsOptional()
  @IsBoolean({ message: 'Accepts volunteers must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  acceptsVolunteers?: boolean;

  @ApiPropertyOptional({
    description: 'Updated donation acceptance setting',
    example: true,
    type: 'boolean'
  })
  @IsOptional()
  @IsBoolean({ message: 'Accepts donations must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  acceptsDonations?: boolean;
}

/**
 * ENHANCED CAUSE QUERY DTO FOR FILTERING
 */
export class EnhancedCauseQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: '1',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Page must be a string' })
  @IsNumericStringInRange(1, 1000, { message: 'Page must be between 1 and 1000' })
  page?: string;

  @ApiPropertyOptional({
    description: 'Items per page (max 100)',
    example: '20',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Limit must be a string' })
  @IsNumericStringInRange(1, 100, { message: 'Limit must be between 1 and 100' })
  limit?: string;

  @ApiPropertyOptional({
    description: 'Search term (max 100 chars)',
    example: 'environment',
    type: 'string',
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  @MaxLength(100, { message: 'Search cannot exceed 100 characters' })
  @IsSafeString({ message: 'Search contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'environment',
    enum: CauseCategory
  })
  @IsOptional()
  @IsEnum(CauseCategory, { message: 'Invalid category' })
  category?: CauseCategory;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    example: 'high',
    enum: CausePriority
  })
  @IsOptional()
  @IsEnum(CausePriority, { message: 'Invalid priority' })
  priority?: CausePriority;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'active',
    enum: CauseStatus
  })
  @IsOptional()
  @IsEnum(CauseStatus, { message: 'Invalid status' })
  status?: CauseStatus;

  @ApiPropertyOptional({
    description: 'Organization ID filter',
    example: '1',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Organization ID must be a string' })
  @IsNumericStringInRange(1, 999999, { message: 'Invalid organization ID' })
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by public/private causes',
    example: 'true',
    type: 'string',
    enum: ['true', 'false', 'all']
  })
  @IsOptional()
  @IsString({ message: 'isPublic must be a string' })
  @Matches(/^(true|false|all)$/, { message: 'isPublic must be "true", "false", or "all"' })
  isPublic?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: ['title', 'createdAt', 'updatedAt', 'priority', 'status']
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  @Matches(/^(title|createdAt|updatedAt|priority|status)$/, { message: 'Invalid sort field' })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc']
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @Matches(/^(asc|desc)$/, { message: 'Sort order must be "asc" or "desc"' })
  sortOrder?: string;
}