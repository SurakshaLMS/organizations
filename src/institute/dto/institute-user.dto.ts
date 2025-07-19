import { IsString, IsOptional, IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';

export enum InstituteRole {
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
  DIRECTOR = 'DIRECTOR',
}

export class AssignUserToInstituteDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  instituteId: string;

  @IsEnum(InstituteRole)
  role: InstituteRole;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateInstituteUserDto {
  @IsOptional()
  @IsEnum(InstituteRole)
  role?: InstituteRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class InstituteUserFilterDto {
  @IsOptional()
  @IsString()
  instituteId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(InstituteRole)
  role?: InstituteRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  assignedBy?: string;
}
