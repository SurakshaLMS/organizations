import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket, GetSignedUrlConfig } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as crypto from 'crypto';

// AWS SDK will be dynamically imported when needed
let AWS: any = null;

export interface SignedUrlRequest {
  folder: string;
  fileName: string;
  contentType: string;
  maxSizeBytes?: number;
}

export interface SignedUrlResponse {
  uploadToken: string;
  signedUrl: string | { url: string; fields: Record<string, string> };
  expiresAt: Date;
  expiresIn: number;
  expectedFilename: string;
  relativePath: string; // Relative path for saving to database
  publicUrl: string; // Full public URL (available after verification)
  maxFileSizeBytes: number;
  allowedExtensions: string[];
  uploadInstructions: {
    method: string;
    headers?: Record<string, string>;
    formFields?: Record<string, string>;
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
  private baseUrl: string; // Not readonly - can be set for AWS
  private readonly encryptionKey: string;
  private readonly provider: string;
  
  // AWS S3
  private s3: any;
  private s3BucketName: string;
  private s3Region: string;
  
  // Cost optimization settings (now configurable via .env)
  private readonly SIGNED_URL_TTL_MINUTES: number;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.provider = this.configService.get<string>('STORAGE_PROVIDER', 'google').toLowerCase();
    this.SIGNED_URL_TTL_MINUTES = this.configService.get<number>('SIGNED_URL_TTL_MINUTES', 10);
    this.encryptionKey = this.configService.get<string>('PASSWORD_ENCRYPTION_KEY') || 'default-key-change-me';
    
    // Initialize based on provider
    if (this.provider === 'aws' || this.provider === 's3') {
      this.initializeAwsStorage();
    } else {
      // Default to Google Cloud Storage
      this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || '';
      this.baseUrl = `https://storage.googleapis.com/${this.bucketName}`;
      
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
      this.logger.log(`💰 GCS Signed URL Service initialized (TTL: ${this.SIGNED_URL_TTL_MINUTES} min, No DB)`);
    }
  }

  private async initializeAwsStorage(): Promise<void> {
    try {
      this.s3BucketName = this.configService.get<string>('AWS_S3_BUCKET') || '';
      this.s3Region = this.configService.get<string>('AWS_REGION', 'us-east-1');
      
      // Check for custom base URL first (e.g., CloudFront, custom domain, or storage.suraksha.lk)
      const customAwsBaseUrl = this.configService.get<string>('AWS_S3_BASE_URL');
      this.baseUrl = customAwsBaseUrl || `https://${this.s3BucketName}.s3.${this.s3Region}.amazonaws.com`;
      
      if (!this.s3BucketName) {
        throw new Error('AWS S3 bucket name not configured');
      }

      // Try to dynamically import AWS SDK
      try {
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        const awsModule = await dynamicImport('aws-sdk').catch(() => null);
        if (!awsModule) {
          this.logger.error('⚠️ AWS SDK not installed. Install with: npm install aws-sdk');
          throw new Error('AWS SDK not available');
        }
        AWS = awsModule.default || awsModule;
        
        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
        
        if (!accessKeyId || !secretAccessKey) {
          throw new Error('AWS credentials not configured');
        }
        
        AWS.config.update({
          accessKeyId,
          secretAccessKey,
          region: this.s3Region
        });
        
        this.s3 = new AWS.S3({
          apiVersion: '2006-03-01',
          signatureVersion: 'v4'
        });
        
        this.logger.log(`💰 AWS S3 Signed URL Service initialized (TTL: ${this.SIGNED_URL_TTL_MINUTES} min, No DB)`);
      } catch (error) {
        this.logger.error('❌ AWS SDK initialization failed:', error.message);
        throw error;
      }
    } catch (error) {
      this.logger.error('❌ AWS S3 initialization failed:', error);
      throw error;
    }
  }

  /**
   * 📝 Generate signed URL for PRIVATE upload (10-minute TTL)
   * Metadata encrypted in token - no database needed
   */
  async generateSignedUploadUrl(request: SignedUrlRequest): Promise<SignedUrlResponse> {
    if (this.provider === 'aws' || this.provider === 's3') {
      return this.generateAwsSignedUploadUrl(request);
    } else {
      return this.generateGcsSignedUploadUrl(request);
    }
  }

  /**
   * 📝 Generate GCS signed URL for PRIVATE upload
   */
  private async generateGcsSignedUploadUrl(request: SignedUrlRequest): Promise<SignedUrlResponse> {
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
      
      this.logger.log(`✅ Generated GCS signed URL - File: ${secureFilename}, TTL: ${this.SIGNED_URL_TTL_MINUTES}min`);
      
      // Calculate the future public URL (after verification)
      const futurePublicUrl = `${this.baseUrl}/${relativePath}`;
      
      return {
        uploadToken,
        signedUrl,
        expiresAt,
        expiresIn: this.SIGNED_URL_TTL_MINUTES * 60,
        expectedFilename: secureFilename,
        relativePath, // For saving to database
        publicUrl: futurePublicUrl, // Full public URL (available after verification)
        maxFileSizeBytes: maxSizeBytes,
        allowedExtensions,
        uploadInstructions: {
          method: 'PUT',
          headers: {
            'Content-Type': request.contentType,
            'x-goog-content-length-range': `0,${maxSizeBytes}`,
          },
          note: `Upload the file directly to the signed URL using PUT method. The URL expires in ${this.SIGNED_URL_TTL_MINUTES} minutes. After upload, call /signed-urls/verify/{token} to make the file public.`,
        },
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to generate GCS signed URL:`, error);
      throw error;
    }
  }

  /**
   * 📝 Generate AWS S3 presigned POST for PRIVATE upload
   */
  private async generateAwsSignedUploadUrl(request: SignedUrlRequest): Promise<SignedUrlResponse> {
    try {
      if (!this.s3) {
        throw new BadRequestException('AWS S3 not initialized');
      }

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
      const expiresInSeconds = this.SIGNED_URL_TTL_MINUTES * 60;
      
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
      
      // Create presigned PUT URL for AWS S3 (simpler and more reliable than POST)
      // Note: ACL and encryption should be set via bucket policies, not in signed URL
      // to avoid signature mismatch issues
      const params = {
        Bucket: this.s3BucketName,
        Key: relativePath,
        ContentType: request.contentType,
        Expires: expiresInSeconds,
        // Don't set ACL here - use bucket policy or default bucket permissions
        // Don't set ServerSideEncryption - use default bucket encryption
      };
      
      const signedUrl = await new Promise<string>((resolve, reject) => {
        this.s3.getSignedUrl('putObject', params, (err: any, url: string) => {
          if (err) reject(err);
          else resolve(url);
        });
      });
      
      this.logger.log(`✅ Generated AWS S3 presigned PUT URL - File: ${secureFilename}, TTL: ${this.SIGNED_URL_TTL_MINUTES}min, Max: ${maxSizeBytes}B (ACL via bucket policy)`);
      
      // Calculate the public URL (available immediately after upload since ACL is public-read)
      const publicUrl = `${this.baseUrl}/${relativePath}`;
      
      return {
        uploadToken,
        signedUrl, // Direct PUT URL string
        expiresAt,
        expiresIn: expiresInSeconds,
        expectedFilename: secureFilename,
        relativePath,
        publicUrl,
        maxFileSizeBytes: maxSizeBytes,
        allowedExtensions,
        uploadInstructions: {
          method: 'PUT',
          headers: {
            'Content-Type': request.contentType,
          },
          note: `Upload using HTTP PUT with the file as the request body. Set Content-Type header to "${request.contentType}". Max size: ${maxSizeBytes} bytes. URL expires in ${this.SIGNED_URL_TTL_MINUTES} minutes. File will be publicly accessible immediately.`,
        },
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to generate AWS S3 presigned POST:`, error);
      throw error;
    }
  }

  /**
   * ✅ Verify upload and make file PUBLIC
   * Decrypts token to get metadata - no database needed
   */
  async verifyUpload(uploadToken: string): Promise<VerificationResult> {
    if (this.provider === 'aws' || this.provider === 's3') {
      return this.verifyUploadS3(uploadToken);
    } else {
      return this.verifyUploadGcs(uploadToken);
    }
  }

  /**
   * ✅ Verify GCS upload and make file PUBLIC
   */
  private async verifyUploadGcs(uploadToken: string): Promise<VerificationResult> {
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
      this.logger.error(`❌ GCS verification failed:`, error);
      return {
        success: false,
        message: `Verification failed: ${error.message}`,
      };
    }
  }

  /**
   * ✅ Verify AWS S3 upload and make file PUBLIC
   */
  private async verifyUploadS3(uploadToken: string): Promise<VerificationResult> {
    try {
      if (!this.s3) {
        return {
          success: false,
          message: 'AWS S3 not initialized',
        };
      }

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
      
      // Verify file exists in S3
      try {
        const headParams = {
          Bucket: this.s3BucketName,
          Key: metadata.relativePath
        };
        
        const headResult = await this.s3.headObject(headParams).promise();
        const fileSize = headResult.ContentLength;
        
        // Validate file size
        if (fileSize > metadata.maxSizeBytes) {
          // Delete oversized file
          await this.s3.deleteObject(headParams).promise();
          return {
            success: false,
            message: `File too large (${fileSize} bytes). Max: ${metadata.maxSizeBytes} bytes`,
          };
        }
        
        // Validate content type
        if (headResult.ContentType !== metadata.contentType) {
          await this.s3.deleteObject(headParams).promise();
          return {
            success: false,
            message: `Invalid content type. Expected: ${metadata.contentType}, Got: ${headResult.ContentType}`,
          };
        }
        
        // SECURITY: Validate no double extensions
        const filename = metadata.fileName;
        const extension = path.extname(filename).toLowerCase();
        const baseWithoutExt = path.basename(filename, extension);
        
        if (baseWithoutExt.includes('.')) {
          await this.s3.deleteObject(headParams).promise();
          return {
            success: false,
            message: 'Security violation: Double extensions not allowed (e.g., .mysql.jpg)',
          };
        }
        
        // Validate extension is allowed for folder
        try {
          this.validateFileExtension(extension, metadata.folder);
        } catch (error) {
          await this.s3.deleteObject(headParams).promise();
          return {
            success: false,
            message: error.message,
          };
        }
        
        // 🔓 MAKE FILE PUBLIC by setting ACL
        const aclParams = {
          Bucket: this.s3BucketName,
          Key: metadata.relativePath,
          ACL: 'public-read'
        };
        
        await this.s3.putObjectAcl(aclParams).promise();
        
        // Set cache control for performance
        const copyParams = {
          Bucket: this.s3BucketName,
          Key: metadata.relativePath,
          CopySource: `${this.s3BucketName}/${metadata.relativePath}`,
          MetadataDirective: 'REPLACE',
          CacheControl: 'public, max-age=31536000', // 1 year
          ContentType: metadata.contentType,
          ServerSideEncryption: 'AES256'
        };
        
        await this.s3.copyObject(copyParams).promise();
        
        const publicUrl = this.getPublicUrl(metadata.relativePath);
        
        this.logger.log(`✅ S3 upload verified - File: ${metadata.fileName}, Size: ${fileSize} bytes`);
        
        return {
          success: true,
          publicUrl,
          relativePath: metadata.relativePath,
          filename: metadata.fileName,
          message: 'Upload verified successfully',
        };
        
      } catch (error) {
        if (error.code === 'NotFound') {
          return {
            success: false,
            message: 'File not found in storage. Upload may have failed or timed out.',
          };
        }
        throw error;
      }
      
    } catch (error) {
      this.logger.error(`❌ S3 verification failed:`, error);
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
    
    // Sanitize: replace special chars with single hyphen, remove consecutive hyphens
    const sanitizedBase = baseName
      .replace(/[^a-z0-9-]/gi, '-')  // Replace special chars with hyphen
      .replace(/-+/g, '-')            // Replace multiple hyphens with single hyphen (prevents -- SQL comment trigger)
      .replace(/^-+|-+$/g, '')        // Remove leading/trailing hyphens
      .substring(0, 50);
    
    return `${sanitizedBase}_${token}_${timestamp}${extension}`;  // Use underscore separator instead of hyphen
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
    // Get from environment or use defaults (with radix 10 for proper parsing)
    const sizeMap: Record<string, number> = {
      'profile-images': parseInt(this.configService.get('MAX_PROFILE_IMAGE_SIZE', '5242880'), 10), // 5MB (match .env)
      'institute-images': parseInt(this.configService.get('MAX_INSTITUTE_IMAGE_SIZE', '10485760'), 10), // 10MB
      'organization-images': parseInt(this.configService.get('MAX_INSTITUTE_IMAGE_SIZE', '10485760'), 10), // 10MB
      'student-images': parseInt(this.configService.get('MAX_STUDENT_IMAGE_SIZE', '5242880'), 10), // 5MB
      'advertisement-media': parseInt(this.configService.get('MAX_ADVERTISEMENT_SIZE', '104857600'), 10), // 100MB
      'lecture-documents': parseInt(this.configService.get('MAX_LECTURE_DOCUMENT_SIZE', '52428800'), 10), // 50MB
      'lecture-covers': parseInt(this.configService.get('MAX_LECTURE_COVER_SIZE', '5242880'), 10), // 5MB
      'homework-submissions': parseInt(this.configService.get('MAX_HOMEWORK_SIZE', '20971520'), 10), // 20MB
      'teacher-corrections': parseInt(this.configService.get('MAX_CORRECTION_SIZE', '20971520'), 10), // 20MB
    };
    
    const maxSize = sizeMap[folder] || 10485760; // 10MB default
    this.logger.debug(`Max file size for ${folder}: ${maxSize} bytes (${(maxSize / 1048576).toFixed(2)} MB)`);
    return maxSize;
  }
}
