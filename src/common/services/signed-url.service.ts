import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket, GetSignedUrlConfig } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as crypto from 'crypto';

export interface SignedUrlRequest {
  folder: string;
  fileName: string;
  contentType: string;
  maxSizeBytes?: number;
}

export interface SignedUrlResponse {
  uploadToken: string;
  signedUrl: string;
  expiresAt: Date;
  expiresIn: number;
  expectedFilename: string;
  maxFileSizeBytes: number;
  allowedExtensions: string[];
  uploadInstructions: {
    method: string;
    headers: Record<string, string>;
    note: string;
  };
}

export interface VerificationResult {
  success: boolean;
  publicUrl?: string;
  relativePath?: string;
  filename?: string;
  message: string;
}

/**
 * 💰 COST-OPTIMIZED SIGNED URL SERVICE (NO DATABASE)
 * 
 * How it works:
 * 1. Generate 10-min PRIVATE signed URL with encrypted metadata
 * 2. User uploads directly to GCS/S3
 * 3. If backend receives verification within 10 min:
 *    - Decrypt & validate metadata (double extension check, size, etc.)
 *    - Make file PUBLIC
 *    - Return long-term public URL
 * 4. If NO verification within 10 min:
 *    - GCS/S3 auto-deletes via lifecycle policy (TTL expired)
 * 
 * Why this is cheaper:
 * ✅ No database queries
 * ✅ Short TTL = lower signed URL costs
 * ✅ Auto-cleanup via GCS lifecycle (no cron jobs)
 * ✅ Only verified files become public
 */
@Injectable()
export class SignedUrlService {
  private readonly logger = new Logger(SignedUrlService.name);
  private readonly storage: Storage;
  private readonly bucket: Bucket;
  private readonly bucketName: string;
  private readonly baseUrl: string;
  private readonly encryptionKey: string;
  
  // Cost optimization settings
  private readonly SIGNED_URL_TTL_MINUTES = 10; // Short TTL for cost savings

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || '';
    this.baseUrl = `https://storage.googleapis.com/${this.bucketName}`;
    this.encryptionKey = this.configService.get<string>('PASSWORD_ENCRYPTION_KEY') || 'default-key-change-me';
    
    const projectId = this.configService.get<string>('GCS_PROJECT_ID');
    const clientEmail = this.configService.get<string>('GCS_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('GCS_PRIVATE_KEY');
    
    this.storage = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey?.replace(/\\n/g, '\n'),
      }
    });
    
    this.bucket = this.storage.bucket(this.bucketName);
    this.logger.log(`💰 Cost-Optimized Signed URL Service initialized (TTL: ${this.SIGNED_URL_TTL_MINUTES} min, No DB)`);
  }

  /**
   * 📝 Generate signed URL for PRIVATE upload (10-minute TTL)
   * Metadata encrypted in token - no database needed
   */
  async generateSignedUploadUrl(request: SignedUrlRequest): Promise<SignedUrlResponse> {
    try {
      // Validate file extension
      const extension = path.extname(request.fileName).toLowerCase();
      this.validateFileExtension(extension, request.folder);
      
      // Get max size from environment or request
      const maxSizeBytes = request.maxSizeBytes || this.getMaxFileSizeForType(request.folder);
      const allowedExtensions = this.getAllowedExtensions(request.folder);
      
      // Generate secure filename
      const timestamp = Date.now();
      const secureToken = this.generateSecureToken(16);
      const secureFilename = this.generateSecureFilename(request.fileName, secureToken, timestamp);
      const relativePath = `${request.folder}/${secureFilename}`;
      
      // Calculate expiry
      const expiresAt = new Date(Date.now() + this.SIGNED_URL_TTL_MINUTES * 60 * 1000);
      
      // Encrypt metadata to embed in token
      const metadata = {
        relativePath,
        fileName: secureFilename,
        folder: request.folder,
        contentType: request.contentType,
        maxSizeBytes,
        expiresAt: expiresAt.getTime(),
      };
      const uploadToken = this.encryptMetadata(metadata);
      
      // Create signed URL for PRIVATE upload (NOT public yet)
      const file = this.bucket.file(relativePath);
      
      const options: GetSignedUrlConfig = {
        version: 'v4',
        action: 'write',
        expires: expiresAt,
        contentType: request.contentType,
        extensionHeaders: {
          'x-goog-content-length-range': `0,${maxSizeBytes}`, // Enforce size limit
        },
      };
      
      const [signedUrl] = await file.getSignedUrl(options);
      
      this.logger.log(`✅ Generated signed URL - File: ${secureFilename}, TTL: ${this.SIGNED_URL_TTL_MINUTES}min`);
      
      return {
        uploadToken,
        signedUrl,
        expiresAt,
        expiresIn: this.SIGNED_URL_TTL_MINUTES * 60,
        expectedFilename: secureFilename,
        maxFileSizeBytes: maxSizeBytes,
        allowedExtensions,
        uploadInstructions: {
          method: 'PUT',
          headers: {
            'Content-Type': request.contentType,
          },
          note: `Upload the file directly to the signed URL using PUT method. The URL expires in ${this.SIGNED_URL_TTL_MINUTES} minutes. After upload, call /signed-urls/verify/{token} to make the file public.`,
        },
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to generate signed URL:`, error);
      throw error;
    }
  }

  /**
   * ✅ Verify upload and make file PUBLIC
   * Decrypts token to get metadata - no database needed
   */
  async verifyUpload(uploadToken: string): Promise<VerificationResult> {
    try {
      // Decrypt metadata from token
      const metadata = this.decryptMetadata(uploadToken);
      
      if (!metadata) {
        return {
          success: false,
          message: 'Invalid or expired upload token',
        };
      }
      
      // Check if expired
      if (Date.now() > metadata.expiresAt) {
        return {
          success: false,
          message: `Upload window expired (${this.SIGNED_URL_TTL_MINUTES} minutes). Please request a new signed URL.`,
        };
      }
      
      // Verify file exists in storage
      const file = this.bucket.file(metadata.relativePath);
      const [exists] = await file.exists();
      
      if (!exists) {
        return {
          success: false,
          message: 'File not found in storage. Upload may have failed or timed out.',
        };
      }
      
      // Get file metadata
      const [fileMetadata] = await file.getMetadata();
      const fileSize = parseInt(fileMetadata.size as string, 10);
      
      // Validate file size
      if (fileSize > metadata.maxSizeBytes) {
        await file.delete(); // Delete oversized file
        return {
          success: false,
          message: `File too large (${fileSize} bytes). Max: ${metadata.maxSizeBytes} bytes`,
        };
      }
      
      // SECURITY: Validate no double extensions (e.g., .mysql.jpg)
      const filename = metadata.fileName;
      const extension = path.extname(filename).toLowerCase();
      const baseWithoutExt = path.basename(filename, extension);
      
      if (baseWithoutExt.includes('.')) {
        await file.delete(); // Delete file with double extension
        return {
          success: false,
          message: 'Security violation: Double extensions not allowed (e.g., .mysql.jpg)',
        };
      }
      
      // Validate extension is allowed for folder
      try {
        this.validateFileExtension(extension, metadata.folder);
      } catch (error) {
        await file.delete(); // Delete file with invalid extension
        return {
          success: false,
          message: error.message,
        };
      }
      
      // 🔓 MAKE FILE PUBLIC (long-term access)
      await file.makePublic();
      
      // Set cache control for performance
      await file.setMetadata({
        cacheControl: 'public, max-age=31536000', // 1 year
      });
      
      const publicUrl = this.getPublicUrl(metadata.relativePath);
      
      this.logger.log(`✅ Upload verified - File: ${metadata.fileName}, Size: ${fileSize} bytes`);
      
      return {
        success: true,
        publicUrl,
        relativePath: metadata.relativePath,
        filename: metadata.fileName,
        message: 'Upload verified successfully',
      };
      
    } catch (error) {
      this.logger.error(`❌ Verification failed:`, error);
      return {
        success: false,
        message: `Verification failed: ${error.message}`,
      };
    }
  }

  // 🔐 Encryption/Decryption for stateless tokens

  private encryptMetadata(metadata: any): string {
    const json = JSON.stringify(metadata);
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(json, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data (base64url safe)
    return Buffer.from(iv.toString('hex') + ':' + encrypted).toString('base64url');
  }

  private decryptMetadata(token: string): any | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const [ivHex, encrypted] = decoded.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.warn('Failed to decrypt token:', error.message);
      return null;
    }
  }

  // 🛠️ Helper Methods

  private getPublicUrl(relativePath: string): string {
    return `${this.baseUrl}/${relativePath}`;
  }

  private generateSecureToken(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
  }

  private generateSecureFilename(originalName: string, token: string, timestamp: number): string {
    const extension = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, extension);
    const sanitizedBase = baseName.replace(/[^a-z0-9-]/gi, '-').substring(0, 50);
    
    return `${sanitizedBase}-${token}-${timestamp}${extension}`;
  }

  private validateFileExtension(extension: string, folder: string): void {
    const allowedExtensions = this.getAllowedExtensions(folder);
    
    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `File extension ${extension} not allowed for ${folder}. Allowed: ${allowedExtensions.join(', ')}`
      );
    }
    
    // SECURITY: Reject double extensions (e.g., .mysql.jpg)
    const parts = extension.split('.');
    if (parts.length > 2) {
      throw new BadRequestException(
        'Invalid file extension format. Only single extensions allowed (e.g., .jpg, not .mysql.jpg)'
      );
    }
  }

  private getAllowedExtensions(folder: string): string[] {
    const extensionMap: Record<string, string[]> = {
      'profile-images': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      'institute-images': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      'organization-images': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      'student-images': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      'bookhire-images': ['.jpg', '.jpeg', '.png', '.webp'],
      'advertisement-media': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.pdf'],
      'lecture-documents': ['.pdf', '.doc', '.docx', '.ppt', '.pptx'],
      'lecture-covers': ['.jpg', '.jpeg', '.png', '.webp'],
      'id-documents': ['.pdf', '.jpg', '.jpeg', '.png'],
      'payment-receipts': ['.pdf', '.jpg', '.jpeg', '.png'],
      'homework-submissions': ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
      'teacher-corrections': ['.pdf', '.jpg', '.jpeg', '.png'],
    };
    
    return extensionMap[folder] || ['.jpg', '.jpeg', '.png', '.pdf'];
  }

  private getMaxFileSizeForType(folder: string): number {
    // Get from environment or use defaults
    const sizeMap: Record<string, number> = {
      'profile-images': parseInt(this.configService.get('MAX_PROFILE_IMAGE_SIZE', '10485760')), // 10MB
      'institute-images': parseInt(this.configService.get('MAX_INSTITUTE_IMAGE_SIZE', '10485760')), // 10MB
      'organization-images': parseInt(this.configService.get('MAX_INSTITUTE_IMAGE_SIZE', '10485760')), // 10MB
      'student-images': parseInt(this.configService.get('MAX_STUDENT_IMAGE_SIZE', '5242880')), // 5MB
      'advertisement-media': parseInt(this.configService.get('MAX_ADVERTISEMENT_SIZE', '104857600')), // 100MB
      'lecture-documents': parseInt(this.configService.get('MAX_LECTURE_DOCUMENT_SIZE', '52428800')), // 50MB
      'lecture-covers': parseInt(this.configService.get('MAX_LECTURE_COVER_SIZE', '5242880')), // 5MB
      'homework-submissions': parseInt(this.configService.get('MAX_HOMEWORK_SIZE', '20971520')), // 20MB
      'teacher-corrections': parseInt(this.configService.get('MAX_CORRECTION_SIZE', '20971520')), // 20MB
    };
    
    return sizeMap[folder] || 10485760; // 10MB default
  }
}
