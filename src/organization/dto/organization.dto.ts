import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum, Matches, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationType } from '@prisma/client';

export class CreateOrganizationDto {
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

  @ApiPropertyOptional({
    description: 'Whether the organization is public',
    example: false
  })
  @IsBoolean()
  @IsOptional()
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
  needEnrollmentVerification?: boolean = true;

  @ApiPropertyOptional({
    description: 'Image URL for the organization',
    example: 'https://example.com/organization-logo.jpg'
  })
  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Image URL must be less than 500 characters' })
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Institute ID (numeric string)',
    example: '123'
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d+$/, { message: 'instituteId must be a numeric string (e.g., "1", "123")' })
  instituteId?: string; // Optional institute assignment
}

export class UpdateOrganizationDto {
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
  needEnrollmentVerification?: boolean;

  @ApiPropertyOptional({
    description: 'Image URL for the organization',
    example: 'https://example.com/updated-organization-logo.jpg'
  })
  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Image URL must be less than 500 characters' })
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Institute ID (numeric string)',
    example: '456'
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d+$/, { message: 'instituteId must be a numeric string (e.g., "1", "123")' })
  instituteId?: string; // Optional institute assignment
}

export class EnrollUserDto {
  @ApiProperty({
    description: 'Organization ID (numeric string)',
    example: '123',
    type: 'string'
  })
  @IsString({ message: 'organizationId must be a string (e.g., "123")' })
  @IsNotEmpty({ message: 'organizationId is required' })
  @Matches(/^\d+$/, { 
    message: 'organizationId must be a numeric string (e.g., "1", "123", "456"). Do not send as number or non-numeric string.' 
  })
  organizationId: string;

  @ApiPropertyOptional({
    description: 'Enrollment key for private organizations',
    example: 'tech-club-2024'
  })
  @IsString({ message: 'enrollmentKey must be a string' })
  @IsOptional()
  enrollmentKey?: string;
}

export class VerifyUserDto {
  @ApiProperty({
    description: 'User ID (numeric string)',
    example: '456',
    type: 'string'
  })
  @IsString({ message: 'userId must be a string (e.g., "456")' })
  @IsNotEmpty({ message: 'userId is required' })
  @Matches(/^\d+$/, { 
    message: 'userId must be a numeric string (e.g., "1", "123", "456"). Do not send as number or non-numeric string.' 
  })
  userId: string;

  @ApiProperty({
    description: 'Verification status',
    example: true
  })
  @IsBoolean({ message: 'isVerified must be a boolean (true or false)' })
  isVerified: boolean;
}

/**
 * ULTRA-SECURE INSTITUTE ASSIGNMENT DTO
 * 
 * Enhanced Validation Features:
 * - Strict numeric string validation
 * - Input sanitization to prevent injection
 * - Size limits to prevent overflow attacks
 * - Required field validation
 * - Type safety for BigInt database operations
 */
export class AssignInstituteDto {
  @IsString()
  @IsNotEmpty({ message: 'Institute ID is required' })
  @Matches(/^\d+$/, { 
    message: 'Institute ID must be a valid numeric string (e.g., "1", "123", "456")' 
  })
  @Length(1, 15, { 
    message: 'Institute ID must be between 1 and 15 digits long' 
  })
  instituteId: string;
}

export class RemoveInstituteDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'organizationId must be a numeric string (e.g., "1", "123")' })
  organizationId: string;
}

export class OrganizationDto {
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

  @ApiPropertyOptional({
    description: 'Image URL of the organization',
    example: 'https://example.com/organization-logo.jpg',
  })
  imageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Institute ID associated with the organization',
    example: '123',
  })
  instituteId?: string | null;
}
