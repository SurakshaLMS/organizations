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
    description: 'Introduction video URL',
    example: 'https://youtube.com/watch?v=example',
    type: 'string'
  })
  @IsUrl({}, { message: 'introVideoUrl must be a valid URL' })
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
    description: 'Updated introduction video URL',
    example: 'https://youtube.com/watch?v=updated',
    type: 'string'
  })
  @IsUrl({}, { message: 'introVideoUrl must be a valid URL' })
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
}
