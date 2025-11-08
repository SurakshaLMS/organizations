import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';

// AWS SDK will be dynamically imported when needed
let AWS: any = null;

export interface FileUploadResult {
  success: boolean;
  fullUrl: string;           // Complete URL for immediate use: "https://googleapis.com/bucket/suraksha.lk/user/profile.jpg"
  relativePath: string;      // Store this in database: "suraksha.lk/user/profile.jpg" 
  fileName: string;
  fileSize: number;
  mimeType: string;
  provider: 'google' | 'aws' | 'local';
  metadata?: any;
  error?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  contentType: string;
  lastModified: Date;
  isPublic: boolean;
}

@Injectable()
export class CloudStorageService {
  private readonly logger = new Logger(CloudStorageService.name);
  private readonly baseUrl: string;
  private readonly provider: string;
  
  // Google Cloud Storage
  private storage: Storage;
  private bucket: Bucket;
  private bucketName: string;
  
  // AWS S3
  private s3: any;
  private s3BucketName: string;
  private s3Region: string;
  
  // Local Storage
  private localStoragePath: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('STORAGE_PROVIDER', 'google');
    this.baseUrl = this.getBaseUrl();
    this.initializeProviders();
    this.logger.log(`🌐 Initialized ${this.provider} storage with base URL: ${this.baseUrl}`);
  }

  private initializeProviders(): void {
    const provider = this.provider.toLowerCase();
    
    // SECURITY: Force Google Cloud Storage only - no local fallback
    if (provider !== 'google' && provider !== 'gcs') {
      throw new InternalServerErrorException(
        `Only Google Cloud Storage is supported. Current STORAGE_PROVIDER: ${provider}. ` +
        `Set STORAGE_PROVIDER=google in your .env file.`
      );
    }
    
    try {
      this.initializeGoogleStorage();
      
      if (!this.bucket) {
        throw new InternalServerErrorException(
          'Google Cloud Storage initialization failed. ' +
          'Ensure all GCS environment variables are configured correctly.'
        );
      }
    } catch (error) {
      this.logger.error(`❌ Google Cloud Storage initialization failed:`, error);
      throw new InternalServerErrorException(
        `Google Cloud Storage initialization failed: ${error.message}. ` +
        `Check your GCS credentials and ensure STORAGE_PROVIDER=google`
      );
    }
  }

  private getBaseUrl(): string {
    const provider = this.provider.toLowerCase();
    
    switch (provider) {
      case 'google':
      case 'gcs':
        const bucket = this.configService.get<string>('GCS_BUCKET_NAME') || 
                      this.configService.get<string>('GOOGLE_STORAGE_BUCKET');
        return `https://storage.googleapis.com/${bucket}`;
        
      case 'aws':
      case 's3':
        const awsBucket = this.configService.get<string>('AWS_S3_BUCKET');
        const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
        return `https://${awsBucket}.s3.${region}.amazonaws.com`;
        
      case 'local':
        return this.configService.get<string>('LOCAL_STORAGE_BASE_URL', 'http://localhost:3000/uploads');
        
      default:
        // Fallback to Google
        const fallbackBucket = this.configService.get<string>('GCS_BUCKET_NAME') || 
                              this.configService.get<string>('GOOGLE_STORAGE_BUCKET');
        return `https://storage.googleapis.com/${fallbackBucket}`;
    }
  }

  private initializeGoogleStorage(): void {
    try {
      this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || 
                       this.configService.get<string>('GOOGLE_STORAGE_BUCKET') || '';
      const projectId = this.configService.get<string>('GCS_PROJECT_ID');
      
      if (!this.bucketName || !projectId) {
        throw new InternalServerErrorException(
          'Google Cloud Storage credentials not configured. ' +
          'Required: GCS_BUCKET_NAME, GCS_PROJECT_ID, GCS_PRIVATE_KEY, GCS_CLIENT_EMAIL'
        );
      }

      const clientEmail = this.configService.get<string>('GCS_CLIENT_EMAIL') || '';
      const privateKey = this.configService.get<string>('GCS_PRIVATE_KEY');
      
      if (!privateKey || !clientEmail) {
        throw new InternalServerErrorException(
          'Google Cloud Storage credentials incomplete. ' +
          'Missing GCS_PRIVATE_KEY or GCS_CLIENT_EMAIL'
        );
      }
      
      const credentials = {
        type: "service_account",
        project_id: projectId,
        private_key_id: this.configService.get<string>('GCS_PRIVATE_KEY_ID'),
        private_key: privateKey.replace(/\\n/g, '\n'),
        client_email: clientEmail,
        client_id: this.configService.get<string>('GCS_CLIENT_ID'),
        auth_uri: this.configService.get<string>('GCS_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
        token_uri: this.configService.get<string>('GCS_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
        auth_provider_x509_cert_url: this.configService.get<string>('GCS_AUTH_PROVIDER_X509_CERT_URL', 'https://www.googleapis.com/oauth2/v1/certs'),
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
        universe_domain: this.configService.get<string>('GCS_UNIVERSE_DOMAIN', 'googleapis.com')
      };

      this.storage = new Storage({
        projectId,
        credentials
      });
      
      this.bucket = this.storage.bucket(this.bucketName);
      this.logger.log(`✅ Google Cloud Storage initialized - Bucket: ${this.bucketName}`);
    } catch (error) {
      this.logger.error('❌ Google Cloud Storage initialization failed:', error);
      throw error; // Don't catch - let it propagate
    }
  }

  private async initializeAwsStorage(): Promise<void> {
    try {
      this.s3BucketName = this.configService.get<string>('AWS_S3_BUCKET') || '';
      this.s3Region = this.configService.get<string>('AWS_REGION', 'us-east-1');
      
      if (!this.s3BucketName) {
        throw new Error('AWS S3 bucket name not configured');
      }

      // Try to dynamically import AWS SDK
      try {
        // SECURITY: Safe dynamic import using Function constructor (safer than eval)
        // This code path never executes since STORAGE_PROVIDER=google is enforced
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        const awsModule = await dynamicImport('aws-sdk').catch(() => null);
        if (!awsModule) {
          this.logger.warn('⚠️ AWS SDK not installed. To enable AWS support, install with: npm install aws-sdk');
          this.s3 = null;
          return;
        }
        AWS = awsModule.default || awsModule;
        AWS.config.update({
          accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
          region: this.s3Region
        });
        this.s3 = new AWS.S3();
        this.logger.log(`✅ AWS S3 initialized - Bucket: ${this.s3BucketName}, Region: ${this.s3Region}`);
      } catch (importError) {
        this.logger.warn('⚠️ AWS SDK not installed. To enable AWS support, install with: npm install aws-sdk');
        this.s3 = null; // Set to null to indicate AWS is not available
      }
    } catch (error) {
      this.logger.error('❌ AWS S3 initialization failed:', error);
      throw error;
    }
  }

  private initializeLocalStorage(): void {
    try {
      this.localStoragePath = this.configService.get<string>('LOCAL_STORAGE_PATH', './uploads');
      this.logger.log(`✅ Local storage initialized - Path: ${this.localStoragePath}`);
    } catch (error) {
      this.logger.error('❌ Local storage initialization failed:', error);
      throw error;
    }
  }

  /**
   * 🎯 MAIN METHOD: Convert relative path to full URL
   * Database stores: "organization-images/org-123.jpg"
   * Returns: "https://storage.googleapis.com/bucket/organization-images/org-123.jpg"
   */
  getFullUrl(relativePath: string): string {
    if (!relativePath) return '';
    
    // Remove leading slash if present
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    
    return `${this.baseUrl}/${cleanPath}`;
  }

  /**
   * 📤 Upload file and return both full URL and relative path
   */
  async uploadFile(
    file: Buffer,
    relativePath: string,  // e.g., "organization-images/org-123.jpg"
    mimeType: string
  ): Promise<FileUploadResult> {
    try {
      this.logger.log(`📤 Uploading to: ${relativePath} (${file.length} bytes)`);
      
      const uploadResult = await this.performUpload(file, relativePath, mimeType);
      
      if (uploadResult.success) {
        const fullUrl = this.getFullUrl(relativePath);
        
        this.logger.log(`✅ Upload successful: ${fullUrl}`);
        
        return {
          success: true,
          fullUrl,
          relativePath,
          fileName: this.extractFileName(relativePath),
          fileSize: file.length,
          mimeType,
          provider: this.provider as any,
          metadata: uploadResult.metadata
        };
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
      
    } catch (error) {
      this.logger.error(`❌ Upload failed for ${relativePath}:`, error);
      
      return {
        success: false,
        fullUrl: '',
        relativePath,
        fileName: this.extractFileName(relativePath),
        fileSize: file.length,
        mimeType,
        provider: this.provider as any,
        error: error.message
      };
    }
  }

  /**
   * 📤 Upload file (compatible with existing GCS service)
   * Returns relative path for database storage
   * 
   * @deprecated Use signed URL flow instead - kept for backward compatibility
   */
  async uploadMulterFile(
    file: any,
    folder: string,
    filename?: string
  ): Promise<{ url: string; key: string; filename?: string }> {
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = filename || `${uuidv4()}${fileExtension}`;
    const relativePath = `${folder}/${uniqueFilename}`;

    const result = await this.uploadFile(file.buffer, relativePath, file.mimetype);
    
    if (result.success) {
      // Return RELATIVE PATH for database storage (e.g., "organization-images/org-123.png")
      return {
        url: result.relativePath,  // Store relative path in database
        key: result.relativePath,
        filename: uniqueFilename
      };
    } else {
      throw new InternalServerErrorException(`Upload failed: ${result.error}`);
    }
  }

  /**
   * 📤 Upload image - Simplified method compatible with GCSImageService
   * 
   * @deprecated Use signed URL flow instead - kept for backward compatibility
   */
  async uploadImage(file: any, folder: string): Promise<{ url: string }> {
    const result = await this.uploadMulterFile(file, folder);
    return { url: result.url };
  }

  /**
   * 🔄 Update organization image - Compatible with GCSImageService
   * 
   * @deprecated Use signed URL flow instead - kept for backward compatibility
   */
  async updateOrganizationImage(
    file: any,
    currentImageUrl?: string
  ): Promise<{ url: string }> {
    // Delete old image if exists
    if (currentImageUrl) {
      await this.deleteFile(currentImageUrl);
    }
    
    // Upload new image
    return this.uploadImage(file, 'organization-images');
  }

  /**
   * 🗑️ Delete file using relative path
   */
  async deleteFile(relativePath: string): Promise<boolean> {
    try {
      if (!relativePath) return false;
      
      this.logger.log(`🗑️ Deleting: ${relativePath}`);
      
      const success = await this.performDeletion(relativePath);
      
      if (success) {
        this.logger.log(`✅ Deleted successfully: ${relativePath}`);
      } else {
        this.logger.warn(`⚠️ Deletion failed: ${relativePath}`);
      }
      
      return success;
    } catch (error) {
      this.logger.error(`💥 Deletion error for ${relativePath}:`, error);
      return false;
    }
  }

  /**
   * 🔐 Generate secure unpredictable token for file URLs
   */
  private generateSecureToken(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomArray = new Uint8Array(length);
    
    if (typeof require !== 'undefined') {
      const crypto = require('crypto');
      const randomBytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        randomArray[i] = randomBytes[i];
      }
    }
    
    for (let i = 0; i < length; i++) {
      result += chars[randomArray[i] % chars.length];
    }
    
    return result;
  }

  /**
   * 🔗 Get public URL from relative path
   */
  getPublicUrl(relativePath: string): string {
    return this.getFullUrl(relativePath);
  }

  /**
   * 🔐 Sanitize path to prevent directory traversal attacks
   */
  private sanitizePath(relativePath: string): string {
    // Remove any directory traversal attempts
    return relativePath.replace(/\.\./g, '').replace(/^\/+/, '');
  }

  private extractFileName(relativePath: string): string {
    return relativePath.split('/').pop() || '';
  }

  private async performUpload(file: Buffer, relativePath: string, mimeType: string): Promise<{ success: boolean; metadata?: any; error?: string }> {
    // SECURITY: Only Google Cloud Storage is supported
    return this.uploadToGoogle(file, relativePath, mimeType);
  }

  private async performDeletion(relativePath: string): Promise<boolean> {
    // SECURITY: Only Google Cloud Storage is supported
    return this.deleteFromGoogle(relativePath);
  }

  // 🌐 Google Cloud Storage Implementation
  private async uploadToGoogle(file: Buffer, relativePath: string, mimeType: string): Promise<{ success: boolean; metadata?: any; error?: string }> {
    try {
      if (!this.bucket) {
        return { success: false, error: 'Google Cloud Storage not initialized' };
      }

      const gcsFile = this.bucket.file(relativePath);
      
      const stream = gcsFile.createWriteStream({
        metadata: {
          contentType: mimeType,
          cacheControl: 'public, max-age=31536000',
        },
        resumable: false,
        public: true,
      });

      return new Promise((resolve) => {
        stream.on('error', (error) => {
          this.logger.error(`GCS upload error: ${error.message}`);
          resolve({ success: false, error: error.message });
        });

        stream.on('finish', async () => {
          try {
            await gcsFile.makePublic();
            const [metadata] = await gcsFile.getMetadata();
            resolve({ 
              success: true, 
              metadata: {
                size: metadata.size,
                updated: metadata.updated,
                contentType: metadata.contentType
              }
            });
          } catch (error) {
            this.logger.warn(`File uploaded but public access may be limited: ${error.message}`);
            resolve({ success: true });
          }
        });

        stream.end(file);
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 🪣 AWS S3 Implementation
  private async uploadToAws(file: Buffer, relativePath: string, mimeType: string): Promise<{ success: boolean; metadata?: any; error?: string }> {
    try {
      if (!this.s3) {
        return { success: false, error: 'AWS S3 not initialized or SDK not available' };
      }

      const params = {
        Bucket: this.s3BucketName,
        Key: relativePath,
        Body: file,
        ContentType: mimeType,
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000',
      };

      const result = await this.s3.upload(params).promise();
      
      return {
        success: true,
        metadata: {
          location: result.Location,
          etag: result.ETag,
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 💾 Local Storage Implementation
  private async uploadToLocal(file: Buffer, relativePath: string, mimeType: string): Promise<{ success: boolean; metadata?: any; error?: string }> {
    try {
      const sanitizedPath = this.sanitizePath(relativePath);
      const fullPath = path.join(this.localStoragePath, sanitizedPath);
      const dir = path.dirname(fullPath);
      
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, file);
      
      const stats = await fs.stat(fullPath);
      
      return {
        success: true,
        metadata: {
          size: stats.size,
          path: fullPath
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 🗑️ Deletion implementations
  private async deleteFromGoogle(relativePath: string): Promise<boolean> {
    try {
      if (!this.bucket) return false;
      const file = this.bucket.file(relativePath);
      await file.delete();
      return true;
    } catch (error) {
      this.logger.error(`GCS delete error: ${error.message}`);
      return false;
    }
  }

  private async deleteFromAws(relativePath: string): Promise<boolean> {
    try {
      if (!this.s3) return false;
      await this.s3.deleteObject({ Bucket: this.s3BucketName, Key: relativePath }).promise();
      return true;
    } catch (error) {
      this.logger.error(`S3 delete error: ${error.message}`);
      return false;
    }
  }

  private async deleteFromLocal(relativePath: string): Promise<boolean> {
    try {
      const sanitizedPath = this.sanitizePath(relativePath);
      const fullPath = path.join(this.localStoragePath, sanitizedPath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      this.logger.error(`Local delete error: ${error.message}`);
      return false;
    }
  }
}
