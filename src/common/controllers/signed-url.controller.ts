import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SignedUrlService } from '../services/signed-url.service';
import {
  GenerateSignedUrlDto,
  ProfileImageUploadDto,
  InstituteImageUploadDto,
  LectureDocumentUploadDto,
} from '../dto/signed-url.dto';

@ApiTags('Signed URL Uploads')
@Controller('signed-urls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SignedUrlController {
  constructor(private readonly signedUrlService: SignedUrlService) {}

  /**
   * 🔐 Generic signed URL generation (advanced users)
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate signed URL for direct upload',
    description: 'Returns a time-limited (10 min) private signed URL for direct client-side upload to GCS',
  })
  @ApiResponse({ status: 200, description: 'Signed URL generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or file extension' })
  async generateSignedUrl(@Body() dto: GenerateSignedUrlDto) {
    return this.signedUrlService.generateSignedUploadUrl({
      folder: dto.folder,
      fileName: dto.fileName,
      contentType: dto.contentType,
      maxSizeBytes: dto.maxSizeBytes,
    });
  }

  /**
   * ✅ Verify upload and make file public
   */
  @Post('verify/:uploadToken')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify uploaded file and make it public',
    description: 'After uploading to signed URL, call this to verify, validate, and make the file publicly accessible',
  })
  @ApiResponse({ status: 200, description: 'File verified and made public' })
  @ApiResponse({ status: 400, description: 'Verification failed (expired, invalid, or security violation)' })
  async verifyUpload(@Param('uploadToken') uploadToken: string) {
    return this.signedUrlService.verifyUpload(uploadToken);
  }

  // ============================================================================
  // SIMPLIFIED ENDPOINT-SPECIFIC METHODS
  // ============================================================================

  /**
   * 📸 Profile Image Upload
   */
  @Post('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get signed URL for profile image upload' })
  @ApiResponse({ status: 200, description: 'Signed URL for profile image' })
  async uploadProfileImage(@Body() dto: ProfileImageUploadDto) {
    const contentType = this.getContentTypeFromExtension(dto.fileExtension);
    const filename = `user-${dto.userId}${dto.fileExtension}`;
    
    return this.signedUrlService.generateSignedUploadUrl({
      folder: 'profile-images',
      fileName: filename,
      contentType,
    });
  }

  /**
   * 🏫 Institute Image Upload
   */
  @Post('institute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get signed URL for institute image upload' })
  async uploadInstituteImage(@Body() dto: InstituteImageUploadDto) {
    const contentType = this.getContentTypeFromExtension(dto.fileExtension);
    const filename = `institute-${dto.instituteId}${dto.fileExtension}`;
    
    return this.signedUrlService.generateSignedUploadUrl({
      folder: 'institute-images',
      fileName: filename,
      contentType,
    });
  }

  /**
   * 🏢 Organization Image Upload
   */
  @Post('organization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get signed URL for organization image upload' })
  async uploadOrganizationImage(@Body() dto: InstituteImageUploadDto) {
    const contentType = this.getContentTypeFromExtension(dto.fileExtension);
    const filename = `organization-${dto.instituteId}${dto.fileExtension}`;
    
    return this.signedUrlService.generateSignedUploadUrl({
      folder: 'organization-images',
      fileName: filename,
      contentType,
    });
  }

  /**
   * 📚 Lecture Document Upload
   */
  @Post('lecture')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get signed URL for lecture document/cover upload' })
  async uploadLectureDocument(@Body() dto: LectureDocumentUploadDto) {
    const contentType = this.getContentTypeFromExtension(dto.fileExtension);
    const folder = dto.documentType === 'cover' ? 'lecture-covers' : 'lecture-documents';
    const filename = `lecture-${dto.lectureId}-${dto.documentType}${dto.fileExtension}`;
    
    return this.signedUrlService.generateSignedUploadUrl({
      folder,
      fileName: filename,
      contentType,
    });
  }

  /**
   * 🆔 ID Document Upload
   */
  @Post('id-document')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get signed URL for ID document upload' })
  async uploadIdDocument(@Body() dto: ProfileImageUploadDto) {
    const contentType = this.getContentTypeFromExtension(dto.fileExtension);
    const filename = `id-${dto.userId}${dto.fileExtension}`;
    
    return this.signedUrlService.generateSignedUploadUrl({
      folder: 'id-documents',
      fileName: filename,
      contentType,
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getContentTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}
