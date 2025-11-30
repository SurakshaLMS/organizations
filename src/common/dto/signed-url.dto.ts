import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateSignedUrlDto {
  @ApiProperty({
    description: 'Folder/directory for the upload (e.g., profile-images, lecture-documents)',
    example: 'profile-images',
  })
  @IsString()
  @IsNotEmpty()
  folder: string;

  @ApiProperty({
    description: 'Original filename with extension',
    example: 'profile.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({
    description: 'Maximum file size in bytes (optional, defaults to folder limits)',
    example: 10485760,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(104857600) // 100MB max
  maxSizeBytes?: number;
}

export class VerifyUploadDto {
  @ApiProperty({
    description: 'Upload token returned from signed URL generation',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  uploadToken: string;
}

// Simplified endpoint-specific DTOs

export class ProfileImageUploadDto {
  @ApiProperty({
    description: 'User ID for profile image',
    example: '12345',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'File extension (e.g., .jpg, .png)',
    example: '.jpg',
    pattern: '/^\\.[a-z0-9]+$/',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\.[a-z0-9]+$/, { message: 'Invalid file extension format' })
  fileExtension: string;
}

export class InstituteImageUploadDto {
  @ApiProperty({
    description: 'Institute ID',
    example: '67890',
  })
  @IsString()
  @IsNotEmpty()
  instituteId: string;

  @ApiProperty({
    description: 'File extension',
    example: '.png',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\.[a-z0-9]+$/)
  fileExtension: string;
}

export class CauseImageUploadDto {
  @ApiProperty({
    description: 'Cause ID',
    example: '12345',
  })
  @IsString()
  @IsNotEmpty()
  causeId: string;

  @ApiProperty({
    description: 'File extension',
    example: '.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\.[a-z0-9]+$/)
  fileExtension: string;
}

export class LectureDocumentUploadDto {
  @ApiProperty({
    description: 'Lecture ID',
    example: '11111',
  })
  @IsString()
  @IsNotEmpty()
  lectureId: string;

  @ApiProperty({
    description: 'Document type: cover or document',
    example: 'document',
    enum: ['cover', 'document'],
  })
  @IsString()
  @IsNotEmpty()
  documentType: 'cover' | 'document';

  @ApiProperty({
    description: 'File extension',
    example: '.pdf',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\.[a-z0-9]+$/)
  fileExtension: string;
}
