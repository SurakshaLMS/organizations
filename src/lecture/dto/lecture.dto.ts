import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateLectureDto {
  @IsString()
  @IsNotEmpty()
  causeId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;
}

export class UpdateLectureDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
