import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUrl, Matches } from 'class-validator';

export class CreateCauseDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'organizationId must be a numeric string (e.g., "1", "123")' })
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  introVideoUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;
}

export class UpdateCauseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  introVideoUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
