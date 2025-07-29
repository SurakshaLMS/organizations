import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum, Matches } from 'class-validator';

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

  @IsBoolean()
  @IsOptional()
  shouldVerifyEnrollment?: boolean = true;

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

  @IsBoolean()
  @IsOptional()
  shouldVerifyEnrollment?: boolean;

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

export class AssignInstituteDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'instituteId must be a numeric string (e.g., "1", "123")' })
  instituteId: string;
}

export class RemoveInstituteDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'organizationId must be a numeric string (e.g., "1", "123")' })
  organizationId: string;
}
