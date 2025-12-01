import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUrl, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CREATE CAUSE WITH IMAGE UPLOAD DTO
 * 
 * Enhanced DTO for creating causes with optional image upload
 * Supports multipart/form-data for image uploads using Multer
 */
export class CreateCauseWithImageDto {
  @ApiProperty({
    description: 'Organization ID (numeric string)',
    example: '1'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'organizationId must be a numeric string (e.g., "1", "123")' })
  organizationId: string;

  @ApiProperty({
    description: 'Cause title',
    example: 'Environmental Conservation Initiative'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Cause description',
    example: 'A comprehensive initiative to promote environmental awareness and conservation practices'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Introduction video URL',
    example: 'https://youtube.com/watch?v=example'
  })
  @IsString()
  @IsOptional()
  introVideoUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the cause is public or private',
    example: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  isPublic?: boolean = false;

  @ApiPropertyOptional({
    description: 'Image URL for the cause',
    example: 'https://example.com/image.jpg'
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}

/**
 * UPDATE CAUSE WITH IMAGE UPLOAD DTO
 * 
 * Enhanced DTO for updating causes with optional image upload
 * All fields optional for partial updates
 */
export class UpdateCauseWithImageDto {
  @ApiPropertyOptional({
    description: 'Updated cause title',
    example: 'Updated: Environmental Conservation Initiative'
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated cause description',
    example: 'Updated comprehensive initiative to promote environmental awareness'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated introduction video URL',
    example: 'https://youtube.com/watch?v=updated-example'
  })
  @IsString()
  @IsOptional()
  introVideoUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated visibility setting',
    example: true
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Updated image URL for the cause',
    example: 'https://example.com/updated-image.jpg'
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}

/**
 * CAUSE RESPONSE DTO
 * 
 * Response structure for cause operations with image URL
 */
export class CauseResponseDto {
  @ApiProperty({
    description: 'Cause ID',
    example: '1'
  })
  causeId: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '1'
  })
  organizationId: string;

  @ApiProperty({
    description: 'Cause title',
    example: 'Environmental Conservation Initiative'
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Cause description',
    example: 'A comprehensive initiative to promote environmental awareness'
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Introduction video URL',
    example: 'https://youtube.com/watch?v=example'
  })
  introVideoUrl?: string;

  @ApiPropertyOptional({
    description: 'Cause image URL (if uploaded)',
    example: 'https://storage.googleapis.com/laas-file-storage/causes/[causeId]/image.jpg'
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'Whether the cause is public or private',
    example: false
  })
  isPublic: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-12-15T10:00:00Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-12-15T10:00:00Z'
  })
  updatedAt: string;
}
