import { IsString, IsNotEmpty, IsOptional, IsUrl, Matches } from 'class-validator';

/**
 * ENTERPRISE DOCUMENTATION CREATION DTO
 * 
 * Optimized for production with proper validation and security
 */
export class CreateDocumentationDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'lectureId must be a numeric string (e.g., "1", "123")' })
  lectureId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsUrl()
  @IsOptional()
  docUrl?: string;
}

/**
 * ENTERPRISE DOCUMENTATION UPDATE DTO
 */
export class UpdateDocumentationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsUrl()
  @IsOptional()
  docUrl?: string;
}

/**
 * DOCUMENTATION QUERY DTO
 */
export class DocumentationQueryDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d+$/, { message: 'lectureId must be a numeric string' })
  lectureId?: string;

  @IsString()
  @IsOptional()
  search?: string;
}

/**
 * DOCUMENTATION RESPONSE DTO
 */
export interface DocumentationResponseDto {
  id: string;
  lectureId: string;
  title: string;
  description?: string;
  content?: string;
  docUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lecture?: {
    id: string;
    title: string;
    causeId: string;
  };
}
