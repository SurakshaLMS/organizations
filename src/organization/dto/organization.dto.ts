import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum } from 'class-validator';

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
  instituteId?: string; // Optional institute assignment
}

export class EnrollUserDto {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsOptional()
  enrollmentKey?: string;
}

export class VerifyUserDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsBoolean()
  isVerified: boolean;
}

export class AssignInstituteDto {
  @IsString()
  @IsNotEmpty()
  instituteId: string;
}

export class RemoveInstituteDto {
  @IsString()
  @IsNotEmpty()
  organizationId: string;
}
