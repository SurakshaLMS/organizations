import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum, Matches, Length } from 'class-validator';

export enum OrganizationType {
  INSTITUTE = 'INSTITUTE',
  GLOBAL = 'GLOBAL',
}

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(OrganizationType)
  type: OrganizationType;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;

  @IsString()
  @IsOptional()
  enrollmentKey?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d+$/, { message: 'instituteId must be a numeric string (e.g., "1", "123")' })
  instituteId?: string; // Optional institute assignment
}

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  enrollmentKey?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d+$/, { message: 'instituteId must be a numeric string (e.g., "1", "123")' })
  instituteId?: string; // Optional institute assignment
}

export class EnrollUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'organizationId must be a numeric string (e.g., "1", "123")' })
  organizationId: string;

  @IsString()
  @IsOptional()
  enrollmentKey?: string;
}

export class VerifyUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'userId must be a numeric string (e.g., "1", "123")' })
  userId: string;

  @IsBoolean()
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
