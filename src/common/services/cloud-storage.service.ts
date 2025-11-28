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
    
    // Support Google Cloud Storage, AWS S3, and Local storage
    if (provider !== 'google' && provider !== 'gcs' && provider !== 'aws' && provider !== 's3' && provider !== 'local') {
      throw new InternalServerErrorException(
        `Unsupported STORAGE_PROVIDER: ${provider}. ` +
        `Supported values: google, gcs, aws, s3, local`
      );
    }
    
    // Initialize based on provider
    if (provider === 'aws' || provider === 's3') {
      // AWS S3 only - async initialization
      this.initializeAwsStorage().catch(error => {
        this.logger.error(`❌ AWS S3 initialization failed:`, error);
        throw new InternalServerErrorException(
          `AWS S3 initialization failed: ${error.message}. ` +
          `Check your AWS credentials and ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_REGION are set`
        );
      });
    } else if (provider === 'local') {
      // Local storage only
      this.initializeLocalStorage();
    } else {
      // Google Cloud Storage (default)
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

      // Try to load AWS SDK
      try {
        // Use require for AWS SDK (CommonJS module)
        AWS = require('aws-sdk');
        if (!AWS) {
          this.logger.error('⚠️ AWS SDK not installed. Install with: npm install aws-sdk');
          throw new Error('AWS SDK not available');
        }
        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
        
        if (!accessKeyId || !secretAccessKey) {
          this.logger.error('❌ AWS credentials not configured');
          this.logger.error('💡 Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
          this.s3 = null;
          return;
        }
        
        AWS.config.update({
          accessKeyId,
          secretAccessKey,
          region: this.s3Region
        });
        this.s3 = new AWS.S3({
          apiVersion: '2006-03-01',
          signatureVersion: 'v4',
        });
        this.logger.log(`✅ AWS S3 initialized successfully`);
        this.logger.log(`   Region: ${this.s3Region}`);
        this.logger.log(`   Bucket: ${this.s3BucketName}`);
        this.logger.log(`   Access Key: ${accessKeyId.substring(0, 8)}...`);
      } catch (importError) {
        this.logger.error('❌ AWS SDK import failed:', importError.message);
        this.logger.error('💡 Install AWS SDK: npm install aws-sdk');
        throw new Error('AWS SDK not available. Run: npm install aws-sdk');
      }
    } catch (error) {
      this.logger.error('❌ AWS S3 initialization failed:', error);
      this.logger.error('💡 Check AWS configuration in .env file');
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

  // ===========================================
  // 🔄 MIGRATION UTILITIES (GCS ↔ AWS S3)
  // ===========================================

  /**
   * 📦 Migrate file from Google Cloud Storage to AWS S3
   * 
   * @param relativePath - Relative path of the file (e.g., "user/profile/123.jpg")
   * @param targetBucket - Optional: AWS S3 bucket name (uses default if not provided)
   * @returns Success status and new location details
   */
  async migrateFromGcsToS3(
    relativePath: string,
    targetBucket?: string
  ): Promise<{
    success: boolean;
    source: string;
    destination: string;
    error?: string;
  }> {
    try {
      if (!this.bucket || !this.s3) {
        return {
          success: false,
          source: `gcs://${this.bucketName}/${relativePath}`,
          destination: `s3://${targetBucket || this.s3BucketName}/${relativePath}`,
          error: 'Both GCS and S3 must be configured for migration'
        };
      }

      this.logger.log(`🔄 Starting GCS → S3 migration: ${relativePath}`);

      // 1️⃣ Download from GCS
      const gcsFile = this.bucket.file(relativePath);
      const [fileBuffer] = await gcsFile.download();
      const [metadata] = await gcsFile.getMetadata();

      this.logger.log(`📥 Downloaded from GCS: ${fileBuffer.length} bytes`);

      // 2️⃣ Upload to S3
      const bucket = targetBucket || this.s3BucketName;
      const uploadParams = {
        Bucket: bucket,
        Key: relativePath,
        Body: fileBuffer,
        ContentType: metadata.contentType || 'application/octet-stream',
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000',
        Metadata: {
          'migrated-from': 'gcs',
          'migration-date': new Date().toISOString(),
          'original-bucket': this.bucketName
        }
      };

      const s3Result = await this.s3.upload(uploadParams).promise();

      this.logger.log(`📤 Uploaded to S3: ${s3Result.Location}`);

      return {
        success: true,
        source: `gcs://${this.bucketName}/${relativePath}`,
        destination: s3Result.Location
      };
    } catch (error) {
      this.logger.error(`❌ GCS → S3 migration failed: ${error.message}`);
      return {
        success: false,
        source: `gcs://${this.bucketName}/${relativePath}`,
        destination: `s3://${targetBucket || this.s3BucketName}/${relativePath}`,
        error: error.message
      };
    }
  }

  /**
   * 📦 Migrate file from AWS S3 to Google Cloud Storage
   * 
   * @param relativePath - Relative path of the file (e.g., "user/profile/123.jpg")
   * @param sourceBucket - Optional: AWS S3 bucket name (uses default if not provided)
   * @returns Success status and new location details
   */
  async migrateFromS3ToGcs(
    relativePath: string,
    sourceBucket?: string
  ): Promise<{
    success: boolean;
    source: string;
    destination: string;
    error?: string;
  }> {
    try {
      if (!this.s3 || !this.bucket) {
        return {
          success: false,
          source: `s3://${sourceBucket || this.s3BucketName}/${relativePath}`,
          destination: `gcs://${this.bucketName}/${relativePath}`,
          error: 'Both S3 and GCS must be configured for migration'
        };
      }

      this.logger.log(`🔄 Starting S3 → GCS migration: ${relativePath}`);

      // 1️⃣ Download from S3
      const bucket = sourceBucket || this.s3BucketName;
      const s3Params = {
        Bucket: bucket,
        Key: relativePath
      };

      const s3Object = await this.s3.getObject(s3Params).promise();
      const fileBuffer = s3Object.Body as Buffer;

      this.logger.log(`📥 Downloaded from S3: ${fileBuffer.length} bytes`);

      // 2️⃣ Upload to GCS
      const gcsFile = this.bucket.file(relativePath);
      const stream = gcsFile.createWriteStream({
        metadata: {
          contentType: s3Object.ContentType || 'application/octet-stream',
          cacheControl: 'public, max-age=31536000',
          metadata: {
            'migrated-from': 's3',
            'migration-date': new Date().toISOString(),
            'original-bucket': bucket
          }
        },
        resumable: false,
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', resolve);
        stream.end(fileBuffer);
      });

      // Make file public
      try {
        await gcsFile.makePublic();
      } catch (aclError) {
        this.logger.warn(`Could not set ACL (likely uniform access enabled): ${aclError.message}`);
      }

      const gcsUrl = `https://storage.googleapis.com/${this.bucketName}/${relativePath}`;

      this.logger.log(`📤 Uploaded to GCS: ${gcsUrl}`);

      return {
        success: true,
        source: `s3://${bucket}/${relativePath}`,
        destination: gcsUrl
      };
    } catch (error) {
      this.logger.error(`❌ S3 → GCS migration failed: ${error.message}`);
      return {
        success: false,
        source: `s3://${sourceBucket || this.s3BucketName}/${relativePath}`,
        destination: `gcs://${this.bucketName}/${relativePath}`,
        error: error.message
      };
    }
  }

  /**
   * 📋 Batch migrate multiple files
   * 
   * @param relativePaths - Array of relative paths to migrate
   * @param direction - Migration direction ('gcs-to-s3' or 's3-to-gcs')
   * @param deleteSource - Whether to delete source files after successful migration
   * @returns Migration results for each file
   */
  async batchMigrate(
    relativePaths: string[],
    direction: 'gcs-to-s3' | 's3-to-gcs',
    deleteSource: boolean = false
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      path: string;
      success: boolean;
      source?: string;
      destination?: string;
      error?: string;
    }>;
  }> {
    const results: Array<{
      path: string;
      success: boolean;
      source?: string;
      destination?: string;
      error?: string;
    }> = [];
    let successful = 0;
    let failed = 0;

    this.logger.log(`🚀 Starting batch migration: ${relativePaths.length} files (${direction})`);

    for (const relativePath of relativePaths) {
      try {
        const result = direction === 'gcs-to-s3' 
          ? await this.migrateFromGcsToS3(relativePath)
          : await this.migrateFromS3ToGcs(relativePath);

        if (result.success) {
          successful++;
          
          // Delete source file if requested
          if (deleteSource) {
            const deleted = direction === 'gcs-to-s3'
              ? await this.deleteFromGoogle(relativePath)
              : await this.deleteFromAws(relativePath);
            
            if (deleted) {
              this.logger.log(`🗑️  Deleted source file: ${relativePath}`);
            } else {
              this.logger.warn(`⚠️  Failed to delete source file: ${relativePath}`);
            }
          }
        } else {
          failed++;
        }

        results.push({
          path: relativePath,
          ...result
        });
      } catch (error) {
        failed++;
        results.push({
          path: relativePath,
          success: false,
          error: error.message
        });
      }
    }

    this.logger.log(`✅ Batch migration complete: ${successful} successful, ${failed} failed`);

    return {
      total: relativePaths.length,
      successful,
      failed,
      results
    };
  }

  /**
   * 🔍 Compare file between GCS and S3
   * Useful for verifying migrations
   */
  async compareFiles(relativePath: string): Promise<{
    gcs: { exists: boolean; size?: number; contentType?: string };
    s3: { exists: boolean; size?: number; contentType?: string };
    match: boolean;
  }> {
    const result: {
      gcs: { exists: boolean; size?: number; contentType?: string };
      s3: { exists: boolean; size?: number; contentType?: string };
      match: boolean;
    } = {
      gcs: { exists: false },
      s3: { exists: false },
      match: false
    };

    try {
      // Check GCS
      if (this.bucket) {
        const gcsFile = this.bucket.file(relativePath);
        const [exists] = await gcsFile.exists();
        result.gcs.exists = exists;
        
        if (exists) {
          const [metadata] = await gcsFile.getMetadata();
          const size = metadata.size ? parseInt(metadata.size.toString()) : undefined;
          result.gcs.size = size;
          result.gcs.contentType = metadata.contentType;
        }
      }

      // Check S3
      if (this.s3) {
        try {
          const s3Head = await this.s3.headObject({
            Bucket: this.s3BucketName,
            Key: relativePath
          }).promise();
          
          result.s3.exists = true;
          result.s3.size = s3Head.ContentLength;
          result.s3.contentType = s3Head.ContentType;
        } catch (error) {
          result.s3.exists = false;
        }
      }

      // Check if files match
      result.match = result.gcs.exists && 
                     result.s3.exists && 
                     result.gcs.size === result.s3.size;

      return result;
    } catch (error) {
      this.logger.error(`Error comparing files: ${error.message}`);
      return result;
    }
  }
}
