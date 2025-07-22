import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUrl, IsDateString, IsIn, Matches } from 'class-validator';

export class CreateLectureDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'causeId must be a numeric string (e.g., "1", "123")' })
  causeId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsString()
  @IsOptional()
  @IsIn(['online', 'physical'])
  mode?: 'online' | 'physical';

  @IsDateString()
  @IsOptional()
  timeStart?: string;

  @IsDateString()
  @IsOptional()
  timeEnd?: string;

  @IsUrl()
  @IsOptional()
  liveLink?: string;

  @IsString()
  @IsOptional()
  @IsIn(['youtube', 'meet', 'zoom', 'teams'])
  liveMode?: 'youtube' | 'meet' | 'zoom' | 'teams';

  @IsUrl()
  @IsOptional()
  recordingUrl?: string;

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
  description?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsString()
  @IsOptional()
  @IsIn(['online', 'physical'])
  mode?: 'online' | 'physical';

  @IsDateString()
  @IsOptional()
  timeStart?: string;

  @IsDateString()
  @IsOptional()
  timeEnd?: string;

  @IsUrl()
  @IsOptional()
  liveLink?: string;

  @IsString()
  @IsOptional()
  @IsIn(['youtube', 'meet', 'zoom', 'teams'])
  liveMode?: 'youtube' | 'meet' | 'zoom' | 'teams';

  @IsUrl()
  @IsOptional()
  recordingUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
