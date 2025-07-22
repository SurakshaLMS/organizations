import { IsString, IsOptional, IsBoolean, IsEnum, IsNotEmpty, Matches } from 'class-validator';

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
  @Matches(/^\d+$/, { message: 'userId must be a numeric string (e.g., "1", "123")' })
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'instituteId must be a numeric string (e.g., "1", "123")' })
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
  @Matches(/^\d+$/, { message: 'instituteId must be a numeric string (e.g., "1", "123")' })
  instituteId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'userId must be a numeric string (e.g., "1", "123")' })
  userId?: string;

  @IsOptional()
  @IsEnum(InstituteRole)
  role?: InstituteRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'assignedBy must be a numeric string (e.g., "1", "123")' })
  assignedBy?: string;
}
