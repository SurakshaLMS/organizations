import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * ENHANCED GCS SERVICE FOR SERVERLESS
 * 
 * Enterprise-grade Google Cloud Storage service with:
 * - Environment-based file size and type limits
 * - Comprehensive security validation  
 * - Serverless-optimized (no local storage)
 * - MIME type whitelist validation
 * - Multiple file upload support
 * - Proper error handling and logging
 */

export interface SecureUploadResult {
  url: string;
  key: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  fileId: string;
}

@Injectable()
export class GCSService {
  private readonly logger = new Logger('GCSService');
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly bucket: any;
  private readonly fileBaseUrl: string;
  
  // Security Configuration from Environment
  private readonly MAX_FILE_SIZE: number;
  private readonly MAX_FILES_PER_UPLOAD: number;
  private readonly ALLOWED_MIME_TYPES: string[];
  private readonly ALLOWED_EXTENSIONS: string[];
  private readonly ENABLE_FILE_VALIDATION: boolean;

  constructor(private configService: ConfigService) {
    // Environment-based security configuration
    this.MAX_FILE_SIZE = this.configService.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB default
    this.MAX_FILES_PER_UPLOAD = this.configService.get<number>('MAX_FILES_PER_UPLOAD', 5);
    
    // Secure MIME type whitelist - ONLY IMAGES AND PDFs
    this.ALLOWED_MIME_TYPES = this.configService.get<string>('ALLOWED_MIME_TYPES', 
      'image/jpeg,image/jpg,image/png,image/gif,image/heic,image/heif,application/pdf'
    ).split(',').map(type => type.trim());

    // File extension whitelist - ONLY IMAGES AND PDFs
    this.ALLOWED_EXTENSIONS = this.configService.get<string>('ALLOWED_EXTENSIONS',
      '.jpg,.jpeg,.png,.gif,.heic,.heif,.pdf'
    ).split(',').map(ext => ext.trim().toLowerCase());

    this.ENABLE_FILE_VALIDATION = this.configService.get<boolean>('ENABLE_FILE_VALIDATION', true);

    // GCS Configuration
    const projectId = this.configService.get<string>('GCS_PROJECT_ID');
    const bucketName = this.configService.get<string>('GCS_BUCKET_NAME');
    const privateKeyId = this.configService.get<string>('GCS_PRIVATE_KEY_ID');
    const privateKey = this.configService.get<string>('GCS_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('GCS_CLIENT_EMAIL');
    const clientId = this.configService.get<string>('GCS_CLIENT_ID');
    const fileBaseUrl = this.configService.get<string>('FILE_BASE_URL');

    if (!projectId || !bucketName || !privateKey || !clientEmail) {
      this.logger.error('Missing required Google Cloud Storage configuration');
      this.logger.error(`Project ID: ${projectId ? 'SET' : 'MISSING'}`);
      this.logger.error(`Bucket Name: ${bucketName ? 'SET' : 'MISSING'}`);
      this.logger.error(`Private Key: ${privateKey ? 'SET' : 'MISSING'}`);
      this.logger.error(`Client Email: ${clientEmail ? 'SET' : 'MISSING'}`);
      throw new Error('Missing required Google Cloud Storage configuration. Please check your environment variables.');
    }

    // Set custom base URL or default to Google Storage
    this.fileBaseUrl = fileBaseUrl?.trim() || `https://storage.googleapis.com/${bucketName}`;

    this.logger.log(`🔐 Enhanced GCS Service initialized with security configuration:`);
    this.logger.log(`   📏 Max File Size: ${this.formatBytes(this.MAX_FILE_SIZE)}`);
    this.logger.log(`   📊 Max Files per Upload: ${this.MAX_FILES_PER_UPLOAD}`);
    this.logger.log(`   🔒 MIME Type Validation: ${this.ENABLE_FILE_VALIDATION ? 'ENABLED' : 'DISABLED'}`);
    this.logger.log(`   🌐 File Base URL: ${this.fileBaseUrl}`);
    this.logger.log(`   🪣 GCS Bucket: ${bucketName}`);

    try {
      // Initialize Google Cloud Storage with service account credentials
      this.storage = new Storage({
        projectId,
        credentials: {
          type: 'service_account',
          project_id: projectId,
          private_key_id: privateKeyId,
          private_key: privateKey.replace(/\\n/g, '\n'), // Handle newlines in private key
          client_email: clientEmail,
          client_id: clientId,
        }
      });

      this.bucketName = bucketName;
      this.bucket = this.storage.bucket(bucketName);
      
      this.logger.log(`✅ Google Cloud Storage initialized with bucket: ${bucketName}`);
      
      // Test connection by checking if bucket exists (optional validation)
      this.validateBucketAccess().catch(error => {
        this.logger.warn(`Bucket access validation failed: ${error.message}. Service will continue but uploads may fail.`);
      });

      // Note: Bucket is kept private - only individual files are made public
    } catch (error) {
      this.logger.error('Failed to initialize Google Cloud Storage:', error);
      throw new Error(`GCS initialization failed: ${error.message}`);
    }
  }

  /**
   * Validate bucket access (optional validation during startup)
   */
  private async validateBucketAccess(): Promise<void> {
    try {
      const [exists] = await this.bucket.exists();
      if (!exists) {
        throw new Error(`Bucket ${this.bucketName} does not exist or is not accessible`);
      }
      this.logger.log(`Bucket access validated: ${this.bucketName}`);
    } catch (error) {
      throw new Error(`Bucket validation failed: ${error.message}`);
    }
  }

  /**
   * SECURE FILE UPLOAD WITH ENVIRONMENT-BASED VALIDATION
   * 
   * Enterprise security features:
   * - File size validation against environment limits
   * - MIME type validation with whitelist
   * - Extension validation with double-check
   * - Serverless-optimized (direct GCS upload)
   * - Comprehensive logging and error handling
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'documents'
  ): Promise<SecureUploadResult> {
    try {
      this.logger.log(`📤 Starting secure file upload: ${file.originalname} (${this.formatBytes(file.size)})`);

      // SECURITY STEP 1: Basic file validation
      if (!file) {
        throw new BadRequestException('No file provided for upload');
      }

      if (!file.buffer || file.buffer.length === 0) {
        throw new BadRequestException('File buffer is empty or invalid');
      }

      // SECURITY STEP 2: File size validation
      if (file.size > this.MAX_FILE_SIZE) {
        throw new BadRequestException(
          `File size ${this.formatBytes(file.size)} exceeds maximum allowed size of ${this.formatBytes(this.MAX_FILE_SIZE)}`
        );
      }

      // SECURITY STEP 3: MIME type validation
      if (this.ENABLE_FILE_VALIDATION && !this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          `File type '${file.mimetype}' is not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`
        );
      }

      // SECURITY STEP 4: File extension validation
      const fileExtension = this.getFileExtension(file.originalname);
      if (this.ENABLE_FILE_VALIDATION && !this.ALLOWED_EXTENSIONS.includes(fileExtension)) {
        throw new BadRequestException(
          `File extension '${fileExtension}' is not allowed. Allowed extensions: ${this.ALLOWED_EXTENSIONS.join(', ')}`
        );
      }

      // SECURITY STEP 5: Generate secure filename
      const fileId = uuidv4().replace(/-/g, '');
      const sanitizedFileName = this.generateSecureFileName(file.originalname, fileId);
      const key = this.generateSecurePath(folder, sanitizedFileName);

      this.logger.log(`🔐 Generated secure GCS key: ${key}`);

      // Additional buffer validation - ensure it's not corrupted
      if (!Buffer.isBuffer(file.buffer)) {
        throw new BadRequestException('File buffer is not a valid Buffer object');
      }

      // Create a fresh buffer copy to avoid potential reference issues
      const bufferCopy = Buffer.from(file.buffer);
      this.logger.log(`📋 Created buffer copy, size: ${bufferCopy.length} bytes`);

      // Create file in GCS bucket
      const gcsFile = this.bucket.file(key);

      // Secure upload with metadata
      this.logger.log(`☁️ Uploading file to GCS: ${key}`);
      
      await gcsFile.save(bufferCopy, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
            folder: folder,
            fileType: 'document',
            fileId: fileId,
            securityValidated: 'true',
            maxFileSize: this.MAX_FILE_SIZE.toString(),
          },
        },
        public: true, // Make file publicly accessible
        resumable: false, // Use simple upload for serverless
        predefinedAcl: 'publicRead', // Explicitly set public read access
      });
      
      // Ensure file is publicly readable
      await gcsFile.makePublic();
      
      this.logger.log(`✅ Upload successful: ${key}`);

      // Generate the public URL using custom base URL or default
      const url = this.generatePublicUrl(key);

      const result: SecureUploadResult = {
        url,
        key,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
        fileId,
      };

      this.logger.log(`🎉 File uploaded successfully: ${file.originalname} -> ${url}`);
      return result;

    } catch (error) {
      this.logger.error(`❌ Failed to upload file: ${file?.originalname}`, error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Log file details for debugging
      this.logger.error(`File details: name=${file?.originalname}, size=${file?.size}, type=${file?.mimetype}`);
      
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * SECURE MULTIPLE FILE UPLOAD
   * 
   * Validates file count and total size before uploading
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'documents'
  ): Promise<SecureUploadResult[]> {
    this.logger.log(`📤 Starting secure multiple file upload: ${files.length} files`);

    // Validate file count
    if (files.length > this.MAX_FILES_PER_UPLOAD) {
      throw new BadRequestException(
        `Too many files. Maximum allowed: ${this.MAX_FILES_PER_UPLOAD}, provided: ${files.length}`
      );
    }

    // Validate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = this.MAX_FILE_SIZE * files.length;
    if (totalSize > maxTotalSize) {
      throw new BadRequestException(
        `Total file size ${this.formatBytes(totalSize)} exceeds maximum allowed total size of ${this.formatBytes(maxTotalSize)}`
      );
    }

    const results: SecureUploadResult[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, folder);
        results.push(result);
      } catch (error) {
        const errorMsg = `Failed to upload ${file.originalname}: ${error.message}`;
        errors.push(errorMsg);
        this.logger.error(errorMsg);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new BadRequestException(`All file uploads failed: ${errors.join(', ')}`);
    }

    this.logger.log(`✅ Multiple file upload completed: ${results.length}/${files.length} successful`);
    return results;
  }

  /**
   * Delete a file from Google Cloud Storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const gcsFile = this.bucket.file(key);
      await gcsFile.delete();
      this.logger.log(`🗑️ File deleted successfully from GCS: ${key}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete file from GCS: ${error.message}`);
      throw new BadRequestException(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * SECURITY HELPER METHODS
   */

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.')) || '';
  }

  private generateSecureFileName(originalName: string, fileId: string): string {
    const extension = this.getFileExtension(originalName);
    const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    
    // Sanitize original filename - only allow alphanumeric, dots, dashes, underscores
    const sanitizedBaseName = baseName
      .replace(/[^a-zA-Z0-9.-_]/g, '_')
      .substring(0, 50);
    
    return `${fileId}_${sanitizedBaseName}${extension}`;
  }

  private generateSecurePath(folder: string, fileName: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Sanitize folder input
    const sanitizedFolder = folder.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    return `${sanitizedFolder}/${year}/${month}/${fileName}`;
  }

  private generatePublicUrl(key: string): string {
    if (this.fileBaseUrl.includes('storage.googleapis.com')) {
      // Using default Google Storage URL
      return `${this.fileBaseUrl}/${key}`;
    } else {
      // Using custom base URL - append the key path
      return `${this.fileBaseUrl}/${key}`;
    }
  }

  /**
   * LEGACY VALIDATION METHODS (Deprecated - use built-in validation)
   */
  validateFile(file: Express.Multer.File, maxSizeInMB: number = 5): void {
    // This method is deprecated - validation is now handled in uploadFile
    this.logger.warn('validateFile method is deprecated - use uploadFile with built-in validation');
    
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new BadRequestException(`File size must not exceed ${maxSizeInMB}MB`);
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
  }

  validateFiles(files: Express.Multer.File[], maxSizeInMB: number = 5): void {
    // This method is deprecated - validation is now handled in uploadMultipleFiles
    this.logger.warn('validateFiles method is deprecated - use uploadMultipleFiles with built-in validation');
    files.forEach(file => this.validateFile(file, maxSizeInMB));
  }
}
