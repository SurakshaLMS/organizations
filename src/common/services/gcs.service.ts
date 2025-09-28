import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GCSService {
  private readonly logger = new Logger('GCSService');
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly bucket: any;
  private readonly fileBaseUrl: string;

  constructor(private configService: ConfigService) {
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
    this.logger.log(`File base URL configured: ${this.fileBaseUrl}`);

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
      
      this.logger.log(`Google Cloud Storage initialized with bucket: ${bucketName}`);
      
      // Test connection by checking if bucket exists (optional validation)
      this.validateBucketAccess().catch(error => {
        this.logger.warn(`Bucket access validation failed: ${error.message}. Service will continue but uploads may fail.`);
      });
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
   * Upload a file to Google Cloud Storage
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'documents'
  ): Promise<{
    url: string;
    key: string;
    originalName: string;
    size: number;
    mimeType: string;
  }> {
    try {
      if (!file) {
        throw new Error('No file provided for upload');
      }

      if (!file.buffer || file.buffer.length === 0) {
        throw new Error('File buffer is empty or invalid');
      }

      this.logger.log(`Starting file upload: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);

      // Additional buffer validation - ensure it's not corrupted
      if (!Buffer.isBuffer(file.buffer)) {
        throw new Error('File buffer is not a valid Buffer object');
      }

      // Create a fresh buffer copy to avoid potential reference issues
      const bufferCopy = Buffer.from(file.buffer);
      this.logger.log(`Created buffer copy, original size: ${file.buffer.length}, copy size: ${bufferCopy.length}`);

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop() || 'bin';
      const fileName = `${uuidv4()}.${fileExtension}`;
      const key = `${folder}/${fileName}`;

      this.logger.log(`Generated GCS key: ${key}`);

      // Create file in GCS bucket
      const gcsFile = this.bucket.file(key);

      // Use simple approach with better error handling
      try {
        this.logger.log(`Attempting direct upload with gcsFile.save() for: ${key}`);
        
        await gcsFile.save(bufferCopy, {
          metadata: {
            contentType: file.mimetype,
            metadata: {
              originalName: file.originalname,
              uploadedAt: new Date().toISOString(),
              folder: folder,
              fileType: 'document'
            },
          },
          public: true, // Make file publicly accessible
          resumable: false, // Use simple upload for better reliability
          timeout: 30000, // 30 second timeout
          retry: {
            retries: 2,
            factor: 2,
            minTimeout: 1000,
            maxTimeout: 3000
          }
        });
        
        this.logger.log(`Direct upload successful for: ${key}`);
      } catch (saveError) {
        this.logger.error(`Direct upload failed, trying with different settings: ${saveError.message}`);
        
        // Try with different settings
        await gcsFile.save(bufferCopy, {
          metadata: {
            contentType: file.mimetype || 'application/octet-stream',
          },
          public: true,
          resumable: true, // Try resumable if simple fails
          validation: false, // Disable validation that might cause issues
          timeout: 60000, // Longer timeout for fallback
          retry: {
            retries: 1,
            factor: 2,
            minTimeout: 2000,
            maxTimeout: 5000
          }
        });
        
        this.logger.log(`Resumable upload successful for: ${key}`);
      }

      // Generate the public URL using custom base URL or default
      let url: string;
      if (this.fileBaseUrl.includes('storage.googleapis.com')) {
        // Using default Google Storage URL
        url = `${this.fileBaseUrl}/${key}`;
      } else {
        // Using custom base URL - append the key path
        url = `${this.fileBaseUrl}/${key}`;
      }

      this.logger.log(`File uploaded successfully to GCS: ${key} -> ${url}`);

      return {
        url,
        key,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to GCS: ${error.message}`, error.stack);
      this.logger.error(`Error details: ${JSON.stringify(error, null, 2)}`);
      
      // Log more details about the file
      this.logger.error(`File details: name=${file?.originalname}, size=${file?.size}, type=${file?.mimetype}, bufferLength=${file?.buffer?.length}`);
      
      // Provide more specific error messages
      if (error.message.includes('stream')) {
        throw new Error(`File upload failed: Stream processing error. Please try uploading the file again.`);
      } else if (error.message.includes('buffer')) {
        throw new Error(`File upload failed: Invalid file data. Please try uploading the file again.`);
      } else if (error.message.includes('forbidden') || error.message.includes('permission') || error.message.includes('unauthorized')) {
        throw new Error(`File upload failed: Permission denied. Please check GCS bucket permissions.`);
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        throw new Error(`File upload failed: Network error. Please try again.`);
      } else {
        throw new Error(`File upload failed: ${error.message}`);
      }
    }
  }

  /**
   * Upload multiple files to Google Cloud Storage
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'documents'
  ): Promise<Array<{
    url: string;
    key: string;
    originalName: string;
    size: number;
    mimeType: string;
  }>> {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from Google Cloud Storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const gcsFile = this.bucket.file(key);
      await gcsFile.delete();
      this.logger.log(`File deleted successfully from GCS: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from GCS: ${error.message}`);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Validate file type and size
   */
  validateFile(file: Express.Multer.File, maxSizeInMB: number = 5): void {
    // Check file size (convert MB to bytes)
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new Error(`File size must not exceed ${maxSizeInMB}MB`);
    }

    // Check file type (allow common document types)
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }
  }

  /**
   * Validate multiple files
   */
  validateFiles(files: Express.Multer.File[], maxSizeInMB: number = 5): void {
    files.forEach(file => this.validateFile(file, maxSizeInMB));
  }
}
