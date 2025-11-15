import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUrl, IsDateString, IsIn, Matches, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
