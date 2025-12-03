import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUrl, IsDateString, IsIn, Matches, IsArray, ValidateNested, MaxLength } from 'class-validator';
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
 * ENHANCED LECTURE CREATION DTO WITH DOCUMENTS
 * 
 * Supports creating lectures with multiple documents in one operation
 */
export class CreateLectureWithDocumentsDto {
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

  @IsString()
  @IsOptional()
  @Matches(/^https?:\/\/.+/, { message: 'liveLink must be a valid http or https URL' })
  @MaxLength(500, { message: 'liveLink cannot exceed 500 characters' })
  @Transform(({ value }) => {
    const trimmed = value?.trim();
    return (trimmed === '' || trimmed === null || trimmed === undefined) ? undefined : trimmed;
  })
  liveLink?: string;

  @IsString()
  @IsOptional()
  @IsIn(['youtube', 'meet', 'zoom', 'teams'])
  liveMode?: 'youtube' | 'meet' | 'zoom' | 'teams';

  @IsString()
  @IsOptional()
  @Matches(/^https?:\/\/.+/, { message: 'recordingUrl must be a valid http or https URL' })
  @MaxLength(500, { message: 'recordingUrl cannot exceed 500 characters' })
  @Transform(({ value }) => {
    const trimmed = value?.trim();
    return (trimmed === '' || trimmed === null || trimmed === undefined) ? undefined : trimmed;
  })
  recordingUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;

  // Document metadata (to be paired with uploaded files)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentDto)
  @IsOptional()
  documents?: CreateDocumentDto[];
}

/**
 * RESPONSE DTO FOR LECTURE WITH DOCUMENTS
 */
export class LectureWithDocumentsResponseDto {
  lectureId: string;
  causeId: string;
  title: string;
  description?: string;
  content?: string;
  venue?: string;
  mode?: string;
  timeStart?: string;
  timeEnd?: string;
  liveLink?: string;
  liveMode?: string;
  recordingUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  documents: DocumentResponseDto[];
}

/**
 * DOCUMENT RESPONSE DTO
 */
export class DocumentResponseDto {
  documentationId: string;
  lectureId: string;
  title: string;
  description?: string;
  content?: string;
  docUrl: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}
