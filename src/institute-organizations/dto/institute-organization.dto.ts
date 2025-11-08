import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum, Matches, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateInstituteOrganizationDto {
  @ApiProperty({
    description: 'Name of the organization',
    example: 'Tech Innovation Club'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Type of organization',
    enum: OrganizationType,
    example: OrganizationType.INSTITUTE
  })
  @IsEnum(OrganizationType)
  type: OrganizationType;

  @ApiProperty({
    description: 'Institute ID (required for institute organizations)',
    example: '123'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'instituteId must be a numeric string (e.g., "1", "123")' })
  instituteId: string;

  @ApiPropertyOptional({
    description: 'Whether the organization is public',
    example: false
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
    description: 'Enrollment key for joining the organization',
    example: 'tech-club-2024'
  })
  @IsString()
  @IsOptional()
  enrollmentKey?: string;

  @ApiPropertyOptional({
    description: 'Whether enrollment requires admin/president verification',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  needEnrollmentVerification?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether users can self-enroll in this organization',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  enabledEnrollments?: boolean = true;

  @ApiPropertyOptional({
    description: 'Image URL for the organization (will be ignored if image file is uploaded)',
    example: 'https://example.com/organization-logo.jpg'
  })
  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Image URL must be less than 500 characters' })
  imageUrl?: string;
}

export class CreateInstituteOrganizationWithImageDto extends CreateInstituteOrganizationDto {
  // Deprecated - use CreateInstituteOrganizationDto with imageUrl field instead
}

export class UpdateInstituteOrganizationDto {
  @ApiPropertyOptional({
    description: 'Name of the organization',
    example: 'Tech Innovation Club Updated'
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Whether the organization is public',
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
    description: 'Enrollment key for joining the organization',
    example: 'tech-club-2024-updated'
  })
  @IsString()
  @IsOptional()
  enrollmentKey?: string;

  @ApiPropertyOptional({
    description: 'Whether enrollment requires admin/president verification',
    example: false
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  needEnrollmentVerification?: boolean;

  @ApiPropertyOptional({
    description: 'Whether users can self-enroll in this organization',
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
  enabledEnrollments?: boolean;

  @ApiPropertyOptional({
    description: 'Image URL for the organization (will be ignored if image file is uploaded)',
    example: 'https://example.com/updated-organization-logo.jpg'
  })
  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Image URL must be less than 500 characters' })
  imageUrl?: string;
}

export class UpdateInstituteOrganizationWithImageDto extends UpdateInstituteOrganizationDto {
  // Deprecated - use UpdateInstituteOrganizationDto with imageUrl field instead
}

export class InstituteOrganizationDto {
  @ApiProperty({
    description: 'Unique identifier of the organization',
    example: '12345',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the organization',
    example: 'Tech Innovation Club',
  })
  name: string;

  @ApiProperty({
    description: 'Type of the organization',
    enum: OrganizationType,
    example: OrganizationType.INSTITUTE,
  })
  type: OrganizationType;

  @ApiProperty({
    description: 'Whether the organization is public',
    example: true,
  })
  isPublic: boolean;

  @ApiProperty({
    description: 'Whether enrollment requires admin/president verification',
    example: true,
  })
  needEnrollmentVerification: boolean;

  @ApiProperty({
    description: 'Whether users can self-enroll in this organization',
    example: true,
  })
  enabledEnrollments: boolean;

  @ApiPropertyOptional({
    description: 'Image URL of the organization',
    example: 'https://example.com/organization-logo.jpg',
  })
  imageUrl?: string | null;

  @ApiProperty({
    description: 'Institute ID associated with the organization',
    example: '123',
  })
  instituteId: string;

  @ApiPropertyOptional({
    description: 'Institute information',
  })
  institute?: {
    id: string;
    name: string;
    code: string;
  } | null;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;
}