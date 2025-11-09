import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUrl, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCauseDto {
  @ApiProperty({
    description: 'Organization ID as a numeric string',
    example: '1',
    type: 'string'
  })
  @IsString({ message: 'organizationId must be a string' })
  @IsNotEmpty({ message: 'organizationId should not be empty' })
  @Matches(/^\d+$/, { message: 'organizationId must be a numeric string (e.g., "1", "123")' })
  organizationId: string;

  @ApiProperty({
    description: 'Cause title',
    example: 'Environmental Conservation Initiative',
    type: 'string'
  })
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title should not be empty' })
  title: string;

  @ApiPropertyOptional({
    description: 'Cause description',
    example: 'A comprehensive initiative to promote environmental awareness',
    type: 'string'
  })
  @IsString({ message: 'description must be a string' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Introduction video URL (full URL or relative path from signed URL upload)',
    example: 'causes/videos/1731234567890-intro.mp4',
    type: 'string'
  })
  @IsString({ message: 'introVideoUrl must be a string' })
  @IsOptional()
  introVideoUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the cause is public or private',
    example: false,
    type: 'boolean',
    default: false
  })
  @IsBoolean({ message: 'isPublic must be a boolean' })
  @IsOptional()
  isPublic?: boolean = false;

  @ApiPropertyOptional({
    description: 'Image URL for the cause (relative path from signed URL upload)',
    example: 'causes/images/1731234567890-banner.jpg',
    type: 'string'
  })
  @IsString({ message: 'imageUrl must be a string' })
  @IsOptional()
  imageUrl?: string;
}

export class UpdateCauseDto {
  @ApiPropertyOptional({
    description: 'Updated cause title',
    example: 'Updated Environmental Initiative',
    type: 'string'
  })
  @IsString({ message: 'title must be a string' })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated cause description',
    example: 'Updated comprehensive initiative description',
    type: 'string'
  })
  @IsString({ message: 'description must be a string' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated introduction video URL (full URL or relative path from signed URL upload)',
    example: 'causes/videos/1731234567890-updated-intro.mp4',
    type: 'string'
  })
  @IsString({ message: 'introVideoUrl must be a string' })
  @IsOptional()
  introVideoUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated visibility setting',
    example: true,
    type: 'boolean'
  })
  @IsBoolean({ message: 'isPublic must be a boolean' })
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Updated image URL for the cause (relative path from signed URL upload)',
    example: 'causes/images/1731234567890-updated-banner.jpg',
    type: 'string'
  })
  @IsString({ message: 'imageUrl must be a string' })
  @IsOptional()
  imageUrl?: string;
}
