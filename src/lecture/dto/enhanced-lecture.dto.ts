import { 
  IsString, 
  IsNotEmpty, 
  IsBoolean, 
  IsOptional, 
  IsUrl, 
  IsDateString, 
  IsIn, 
  Matches, 
  IsNumberString,
  Length,
  IsEnum,
  MaxLength,
  MinLength,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsInt,
  Min,
  Max
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsSafeString, 
  IsStringLength, 
  IsNumericStringInRange, 
  IsMeetingUrl,
  IsFutureDate,
  IsAfterStartTime,
  IsValidFileSize,
  IsAllowedFileType 
} from '../../common/decorators/validation.decorators';

/**
 * ENHANCED LECTURE VALIDATION ENUMS
 */
export enum LectureMode {
  ONLINE = 'online',
  PHYSICAL = 'physical',
  HYBRID = 'hybrid'
}

export enum LectureType {
  WORKSHOP = 'workshop',
  SEMINAR = 'seminar',
  WEBINAR = 'webinar',
  CONFERENCE = 'conference',
  TRAINING = 'training',
  DISCUSSION = 'discussion',
  PRESENTATION = 'presentation',
  OTHER = 'other'
}

export enum LecturePlatform {
  YOUTUBE = 'youtube',
  MEET = 'meet',
  ZOOM = 'zoom',
  TEAMS = 'teams',
  WEBEX = 'webex',
  CUSTOM = 'custom'
}

export enum LectureStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed'
}

export enum LectureDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

/**
 * ENHANCED CREATE LECTURE DTO
 * 
 * Comprehensive validation with business rules and security
 */
export class EnhancedCreateLectureDto {
  @ApiProperty({
    description: 'Cause ID as a numeric string',
    example: '1',
    type: 'string',
    pattern: '^\\d+$'
  })
  @IsString({ message: 'Cause ID must be a string' })
  @IsNotEmpty({ message: 'Cause ID is required' })
  @IsNumericStringInRange(1, 999999, { message: 'Cause ID must be between 1 and 999999' })
  causeId: string;

  @ApiProperty({
    description: 'Lecture title (5-150 characters)',
    example: 'Introduction to Sustainable Development',
    type: 'string',
    minLength: 5,
    maxLength: 150
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @IsStringLength(5, 150, { message: 'Title must be between 5 and 150 characters' })
  @IsSafeString({ message: 'Title contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiPropertyOptional({
    description: 'Lecture description (20-3000 characters)',
    example: 'A comprehensive overview of sustainable development practices and their impact on global communities',
    type: 'string',
    minLength: 20,
    maxLength: 3000
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @IsStringLength(20, 3000, { message: 'Description must be between 20 and 3000 characters' })
  @IsSafeString({ message: 'Description contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({
    description: 'Detailed lecture content (50-10000 characters)',
    example: 'Lecture outline and detailed content...',
    type: 'string',
    minLength: 50,
    maxLength: 10000
  })
  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  @IsStringLength(50, 10000, { message: 'Content must be between 50 and 10000 characters' })
  @IsSafeString({ message: 'Content contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  content?: string;

  @ApiPropertyOptional({
    description: 'Lecture type/category',
    example: 'workshop',
    enum: LectureType,
    default: LectureType.SEMINAR
  })
  @IsOptional()
  @IsEnum(LectureType, { message: 'Invalid lecture type' })
  type?: LectureType = LectureType.SEMINAR;

  @ApiPropertyOptional({
    description: 'Lecture difficulty level',
    example: 'intermediate',
    enum: LectureDifficulty,
    default: LectureDifficulty.BEGINNER
  })
  @IsOptional()
  @IsEnum(LectureDifficulty, { message: 'Invalid difficulty level' })
  difficulty?: LectureDifficulty = LectureDifficulty.BEGINNER;

  @ApiPropertyOptional({
    description: 'Venue for physical lectures (5-200 characters)',
    example: 'Conference Room A, Building 1',
    type: 'string',
    minLength: 5,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: 'Venue must be a string' })
  @IsStringLength(5, 200, { message: 'Venue must be between 5 and 200 characters' })
  @IsSafeString({ message: 'Venue contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  venue?: string;

  @ApiPropertyOptional({
    description: 'Lecture delivery mode',
    example: 'online',
    enum: LectureMode,
    default: LectureMode.ONLINE
  })
  @IsOptional()
  @IsEnum(LectureMode, { message: 'Invalid lecture mode' })
  mode?: LectureMode = LectureMode.ONLINE;

  @ApiPropertyOptional({
    description: 'Lecture start time (future date required)',
    example: '2024-12-01T10:00:00Z',
    type: 'string',
    format: 'date-time'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid start time format' })
  @IsFutureDate({ message: 'Start time must be in the future' })
  timeStart?: string;

  @ApiPropertyOptional({
    description: 'Lecture end time (must be after start time)',
    example: '2024-12-01T12:00:00Z',
    type: 'string',
    format: 'date-time'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid end time format' })
  @IsAfterStartTime('timeStart', { message: 'End time must be after start time' })
  timeEnd?: string;

  @ApiPropertyOptional({
    description: 'Expected duration in minutes (15-480 = 8 hours max)',
    example: '120',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Duration must be a string' })
  @IsNumericStringInRange(15, 480, { message: 'Duration must be between 15 and 480 minutes (8 hours)' })
  durationMinutes?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of attendees (1-10000)',
    example: '100',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Max attendees must be a string' })
  @IsNumericStringInRange(1, 10000, { message: 'Max attendees must be between 1 and 10000' })
  maxAttendees?: string;

  @ApiPropertyOptional({
    description: 'Live streaming/meeting link',
    example: 'https://meet.google.com/abc-defg-hij',
    type: 'string'
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Invalid live link format' })
  @IsMeetingUrl({ message: 'Please provide a valid meeting platform URL' })
  @MaxLength(500, { message: 'Live link cannot exceed 500 characters' })
  liveLink?: string;

  @ApiPropertyOptional({
    description: 'Live streaming platform',
    example: 'meet',
    enum: LecturePlatform,
    default: LecturePlatform.MEET
  })
  @IsOptional()
  @IsEnum(LecturePlatform, { message: 'Invalid live platform' })
  liveMode?: LecturePlatform = LecturePlatform.MEET;

  @ApiPropertyOptional({
    description: 'Recording URL after lecture completion',
    example: 'https://youtube.com/watch?v=recording123',
    type: 'string'
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Invalid recording URL format' })
  @MaxLength(500, { message: 'Recording URL cannot exceed 500 characters' })
  recordingUrl?: string;

  @ApiPropertyOptional({
    description: 'Prerequisites for the lecture (max 500 chars)',
    example: 'Basic understanding of environmental science',
    type: 'string',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'Prerequisites must be a string' })
  @MaxLength(500, { message: 'Prerequisites cannot exceed 500 characters' })
  @IsSafeString({ message: 'Prerequisites contain unsafe content' })
  @Transform(({ value }) => value?.trim())
  prerequisites?: string;

  @ApiPropertyOptional({
    description: 'Learning objectives (max 1000 chars)',
    example: 'By the end of this lecture, participants will understand...',
    type: 'string',
    maxLength: 1000
  })
  @IsOptional()
  @IsString({ message: 'Learning objectives must be a string' })
  @MaxLength(1000, { message: 'Learning objectives cannot exceed 1000 characters' })
  @IsSafeString({ message: 'Learning objectives contain unsafe content' })
  @Transform(({ value }) => value?.trim())
  learningObjectives?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization (max 15 tags, 25 chars each)',
    example: ['sustainability', 'environment', 'development'],
    type: [String],
    maxItems: 15
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @ArrayMaxSize(15, { message: 'Maximum 15 tags allowed' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @MaxLength(25, { each: true, message: 'Each tag cannot exceed 25 characters' })
  @IsSafeString({ each: true, message: 'Tags contain unsafe content' })
  @Transform(({ value }) => value?.map((tag: string) => tag.trim().toLowerCase()))
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Lecture status',
    example: 'scheduled',
    enum: LectureStatus,
    default: LectureStatus.DRAFT
  })
  @IsOptional()
  @IsEnum(LectureStatus, { message: 'Invalid lecture status' })
  status?: LectureStatus = LectureStatus.DRAFT;

  @ApiPropertyOptional({
    description: 'Speaker/instructor name (3-100 chars)',
    example: 'Dr. Jane Smith',
    type: 'string',
    minLength: 3,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'Speaker name must be a string' })
  @IsStringLength(3, 100, { message: 'Speaker name must be between 3 and 100 characters' })
  @IsSafeString({ message: 'Speaker name contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  speakerName?: string;

  @ApiPropertyOptional({
    description: 'Speaker email contact',
    example: 'speaker@example.com',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Speaker email must be a string' })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Invalid speaker email format' })
  @MaxLength(100, { message: 'Speaker email cannot exceed 100 characters' })
  speakerEmail?: string;

  @ApiPropertyOptional({
    description: 'Whether the lecture is public or private',
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
    description: 'Whether registration is required',
    example: true,
    type: 'boolean',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Registration required must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  requiresRegistration?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether the lecture allows Q&A',
    example: true,
    type: 'boolean',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Allows Q&A must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  allowsQA?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether recording is allowed',
    example: false,
    type: 'boolean',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'Recording allowed must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  recordingAllowed?: boolean = false;
}

/**
 * ENHANCED UPDATE LECTURE DTO
 * 
 * All fields optional for partial updates with same validation rules
 */
export class EnhancedUpdateLectureDto {
  @ApiPropertyOptional({
    description: 'Updated lecture title (5-150 characters)',
    example: 'Advanced Sustainable Development Strategies',
    type: 'string',
    minLength: 5,
    maxLength: 150
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @IsStringLength(5, 150, { message: 'Title must be between 5 and 150 characters' })
  @IsSafeString({ message: 'Title contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated lecture description (20-3000 characters)',
    example: 'Updated comprehensive overview...',
    type: 'string',
    minLength: 20,
    maxLength: 3000
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @IsStringLength(20, 3000, { message: 'Description must be between 20 and 3000 characters' })
  @IsSafeString({ message: 'Description contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated detailed content (50-10000 characters)',
    example: 'Updated lecture outline...',
    type: 'string',
    minLength: 50,
    maxLength: 10000
  })
  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  @IsStringLength(50, 10000, { message: 'Content must be between 50 and 10000 characters' })
  @IsSafeString({ message: 'Content contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  content?: string;

  @ApiPropertyOptional({
    description: 'Updated lecture type',
    example: 'webinar',
    enum: LectureType
  })
  @IsOptional()
  @IsEnum(LectureType, { message: 'Invalid lecture type' })
  type?: LectureType;

  @ApiPropertyOptional({
    description: 'Updated difficulty level',
    example: 'advanced',
    enum: LectureDifficulty
  })
  @IsOptional()
  @IsEnum(LectureDifficulty, { message: 'Invalid difficulty level' })
  difficulty?: LectureDifficulty;

  @ApiPropertyOptional({
    description: 'Updated venue (5-200 characters)',
    example: 'Updated Conference Room B',
    type: 'string',
    minLength: 5,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: 'Venue must be a string' })
  @IsStringLength(5, 200, { message: 'Venue must be between 5 and 200 characters' })
  @IsSafeString({ message: 'Venue contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  venue?: string;

  @ApiPropertyOptional({
    description: 'Updated delivery mode',
    example: 'hybrid',
    enum: LectureMode
  })
  @IsOptional()
  @IsEnum(LectureMode, { message: 'Invalid lecture mode' })
  mode?: LectureMode;

  @ApiPropertyOptional({
    description: 'Updated start time',
    example: '2024-12-15T14:00:00Z',
    type: 'string',
    format: 'date-time'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid start time format' })
  timeStart?: string;

  @ApiPropertyOptional({
    description: 'Updated end time',
    example: '2024-12-15T16:00:00Z',
    type: 'string',
    format: 'date-time'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid end time format' })
  @IsAfterStartTime('timeStart', { message: 'End time must be after start time' })
  timeEnd?: string;

  @ApiPropertyOptional({
    description: 'Updated duration in minutes',
    example: '180',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Duration must be a string' })
  @IsNumericStringInRange(15, 480, { message: 'Duration must be between 15 and 480 minutes' })
  durationMinutes?: string;

  @ApiPropertyOptional({
    description: 'Updated max attendees',
    example: '150',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Max attendees must be a string' })
  @IsNumericStringInRange(1, 10000, { message: 'Max attendees must be between 1 and 10000' })
  maxAttendees?: string;

  @ApiPropertyOptional({
    description: 'Updated live link',
    example: 'https://zoom.us/j/updated-meeting',
    type: 'string'
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Invalid live link format' })
  @IsMeetingUrl({ message: 'Please provide a valid meeting platform URL' })
  @MaxLength(500, { message: 'Live link cannot exceed 500 characters' })
  liveLink?: string;

  @ApiPropertyOptional({
    description: 'Updated live platform',
    example: 'zoom',
    enum: LecturePlatform
  })
  @IsOptional()
  @IsEnum(LecturePlatform, { message: 'Invalid live platform' })
  liveMode?: LecturePlatform;

  @ApiPropertyOptional({
    description: 'Updated recording URL',
    example: 'https://youtube.com/watch?v=updated-recording',
    type: 'string'
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Invalid recording URL format' })
  @MaxLength(500, { message: 'Recording URL cannot exceed 500 characters' })
  recordingUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated prerequisites',
    example: 'Updated prerequisites...',
    type: 'string',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'Prerequisites must be a string' })
  @MaxLength(500, { message: 'Prerequisites cannot exceed 500 characters' })
  @IsSafeString({ message: 'Prerequisites contain unsafe content' })
  @Transform(({ value }) => value?.trim())
  prerequisites?: string;

  @ApiPropertyOptional({
    description: 'Updated learning objectives',
    example: 'Updated learning objectives...',
    type: 'string',
    maxLength: 1000
  })
  @IsOptional()
  @IsString({ message: 'Learning objectives must be a string' })
  @MaxLength(1000, { message: 'Learning objectives cannot exceed 1000 characters' })
  @IsSafeString({ message: 'Learning objectives contain unsafe content' })
  @Transform(({ value }) => value?.trim())
  learningObjectives?: string;

  @ApiPropertyOptional({
    description: 'Updated tags',
    example: ['updated', 'sustainability', 'advanced'],
    type: [String],
    maxItems: 15
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @ArrayMaxSize(15, { message: 'Maximum 15 tags allowed' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @MaxLength(25, { each: true, message: 'Each tag cannot exceed 25 characters' })
  @IsSafeString({ each: true, message: 'Tags contain unsafe content' })
  @Transform(({ value }) => value?.map((tag: string) => tag.trim().toLowerCase()))
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Updated status',
    example: 'scheduled',
    enum: LectureStatus
  })
  @IsOptional()
  @IsEnum(LectureStatus, { message: 'Invalid lecture status' })
  status?: LectureStatus;

  @ApiPropertyOptional({
    description: 'Updated speaker name',
    example: 'Prof. John Doe',
    type: 'string',
    minLength: 3,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'Speaker name must be a string' })
  @IsStringLength(3, 100, { message: 'Speaker name must be between 3 and 100 characters' })
  @IsSafeString({ message: 'Speaker name contains unsafe content' })
  @Transform(({ value }) => value?.trim())
  speakerName?: string;

  @ApiPropertyOptional({
    description: 'Updated speaker email',
    example: 'updated.speaker@example.com',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Speaker email must be a string' })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Invalid speaker email format' })
  @MaxLength(100, { message: 'Speaker email cannot exceed 100 characters' })
  speakerEmail?: string;

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
    description: 'Updated registration requirement',
    example: false,
    type: 'boolean'
  })
  @IsOptional()
  @IsBoolean({ message: 'Registration required must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  requiresRegistration?: boolean;

  @ApiPropertyOptional({
    description: 'Updated Q&A setting',
    example: false,
    type: 'boolean'
  })
  @IsOptional()
  @IsBoolean({ message: 'Allows Q&A must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  allowsQA?: boolean;

  @ApiPropertyOptional({
    description: 'Updated recording permission',
    example: true,
    type: 'boolean'
  })
  @IsOptional()
  @IsBoolean({ message: 'Recording allowed must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  recordingAllowed?: boolean;
}

/**
 * ENHANCED LECTURE QUERY DTO FOR ADVANCED FILTERING
 */
export class EnhancedLectureQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination (1-1000)',
    example: '1',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Page must be a string' })
  @IsNumericStringInRange(1, 1000, { message: 'Page must be between 1 and 1000' })
  page?: string;

  @ApiPropertyOptional({
    description: 'Items per page (1-100)',
    example: '20',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Limit must be a string' })
  @IsNumericStringInRange(1, 100, { message: 'Limit must be between 1 and 100' })
  limit?: string;

  @ApiPropertyOptional({
    description: 'Search term (max 100 chars)',
    example: 'sustainability',
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
    description: 'Filter by cause ID',
    example: '1',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Cause ID must be a string' })
  @IsNumericStringInRange(1, 999999, { message: 'Invalid cause ID' })
  causeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by multiple cause IDs (comma-separated)',
    example: '1,2,3',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Cause IDs must be a string' })
  @Matches(/^\d+(,\d+)*$/, { message: 'Cause IDs must be comma-separated numbers' })
  causeIds?: string;

  @ApiPropertyOptional({
    description: 'Filter by organization ID',
    example: '1',
    type: 'string'
  })
  @IsOptional()
  @IsString({ message: 'Organization ID must be a string' })
  @IsNumericStringInRange(1, 999999, { message: 'Invalid organization ID' })
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by lecture type',
    example: 'workshop',
    enum: LectureType
  })
  @IsOptional()
  @IsEnum(LectureType, { message: 'Invalid lecture type' })
  type?: LectureType;

  @ApiPropertyOptional({
    description: 'Filter by difficulty level',
    example: 'intermediate',
    enum: LectureDifficulty
  })
  @IsOptional()
  @IsEnum(LectureDifficulty, { message: 'Invalid difficulty level' })
  difficulty?: LectureDifficulty;

  @ApiPropertyOptional({
    description: 'Filter by delivery mode',
    example: 'online',
    enum: LectureMode
  })
  @IsOptional()
  @IsEnum(LectureMode, { message: 'Invalid lecture mode' })
  mode?: LectureMode;

  @ApiPropertyOptional({
    description: 'Filter by lecture status',
    example: 'scheduled',
    enum: LectureStatus
  })
  @IsOptional()
  @IsEnum(LectureStatus, { message: 'Invalid lecture status' })
  status?: LectureStatus;

  @ApiPropertyOptional({
    description: 'Filter by visibility',
    example: 'true',
    type: 'string',
    enum: ['true', 'false', 'all']
  })
  @IsOptional()
  @IsString({ message: 'isPublic must be a string' })
  @Matches(/^(true|false|all)$/, { message: 'isPublic must be "true", "false", or "all"' })
  isPublic?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range start',
    example: '2024-01-01T00:00:00Z',
    type: 'string',
    format: 'date-time'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid from date format' })
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range end',
    example: '2024-12-31T23:59:59Z',
    type: 'string',
    format: 'date-time'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid to date format' })
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'timeStart',
    enum: ['title', 'createdAt', 'updatedAt', 'timeStart', 'timeEnd', 'type', 'difficulty', 'status']
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  @Matches(/^(title|createdAt|updatedAt|timeStart|timeEnd|type|difficulty|status)$/, { 
    message: 'Invalid sort field' 
  })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc']
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @Matches(/^(asc|desc)$/, { message: 'Sort order must be "asc" or "desc"' })
  sortOrder?: string;
}