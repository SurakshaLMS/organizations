import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GCSImageService {
  private readonly logger = new Logger(GCSImageService.name);
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
      
      this.logger.log(`GCS Image Service initialized with bucket: ${bucketName}`);
      
      // Test connection by checking if bucket exists (optional validation)
      this.validateBucketAccess().catch(error => {
        this.logger.warn(`Bucket access validation failed: ${error.message}. Service will continue but uploads may fail.`);
      });

      // Note: Bucket is kept private - only individual files are made public
    } catch (error) {
      this.logger.error(`Failed to initialize GCS service: ${error.message}`);
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
   * Upload an image to Google Cloud Storage
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'organization-images'
  ): Promise<{
    url: string;
    key: string;
    originalName: string;
    size: number;
    mimeType: string;
  }> {
    try {
      this.logger.log(`Starting image upload: ${file?.originalname || 'unknown'} (${file?.size || 0} bytes)`);

      // Validate image file with enhanced checks
      this.validateImageFile(file);

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const key = `${folder}/${fileName}`;

      this.logger.log(`Generated GCS key: ${key}`);

      // Validate buffer one more time before upload
      if (!file.buffer || file.buffer.length === 0) {
        throw new Error('File buffer is empty before upload');
      }

      this.logger.log(`Buffer validation passed, size: ${file.buffer.length} bytes`);

      // Additional buffer validation - ensure it's not corrupted
      if (!Buffer.isBuffer(file.buffer)) {
        throw new Error('File buffer is not a valid Buffer object');
      }

      // Create file in GCS bucket
      const gcsFile = this.bucket.file(key);

      // Use stream-based upload with proper error handling
      this.logger.log(`Uploading file to GCS: ${key}`);
      
      try {
        // Use direct save method only (more reliable than stream-based)
        this.logger.log(`🚀 Attempting direct upload for: ${key}`);
        await this.uploadWithSave(gcsFile, file, folder);
        this.logger.log(`✅ Direct upload successful for: ${key}`);
      } catch (uploadError) {
        this.logger.error(`❌ Upload failed for ${key}: ${uploadError.message}`);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      this.logger.log(`Upload successful: ${key}`);

      // Generate the public URL using custom base URL or default
      let url: string;
      if (this.fileBaseUrl.includes('storage.googleapis.com')) {
        // Using default Google Storage URL
        url = `${this.fileBaseUrl}/${key}`;
      } else {
        // Using custom base URL - append the key path
        url = `${this.fileBaseUrl}/${key}`;
      }

      this.logger.log(`Image uploaded successfully to GCS: ${key} -> ${url}`);

      return {
        url,
        key,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload image to GCS: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      
      // Log file details for debugging
      this.logger.error(`File details: name=${file?.originalname}, size=${file?.size}, type=${file?.mimetype}, bufferLength=${file?.buffer?.length}`);
      
      // Simple error message - no complex error handling
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Delete an image from Google Cloud Storage
   */
  async deleteImage(key: string): Promise<void> {
    try {
      const gcsFile = this.bucket.file(key);
      await gcsFile.delete();
      this.logger.log(`Image deleted successfully from GCS: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete image from GCS: ${error.message}`);
      // Don't throw error for delete failures - log and continue
      this.logger.warn(`Continuing despite image deletion failure: ${key}`);
    }
  }

  /**
   * Update organization image (delete old, upload new)
   */
  async updateOrganizationImage(
    file: Express.Multer.File,
    oldImageUrl?: string
  ): Promise<{
    url: string;
    key: string;
    originalName: string;
    size: number;
    mimeType: string;
  }> {
    try {
      // Upload new image first
      const uploadResult = await this.uploadImage(file, 'organization-images');

      // Delete old image if exists
      if (oldImageUrl) {
        const oldKey = this.extractKeyFromUrl(oldImageUrl);
        if (oldKey) {
          await this.deleteImage(oldKey);
        }
      }

      return uploadResult;
    } catch (error) {
      this.logger.error(`Failed to update organization image: ${error.message}`);
      throw new Error(`Image update failed: ${error.message}`);
    }
  }

  /**
   * Extract GCS key from public URL (handles both custom and default URLs)
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      if (url.includes('storage.googleapis.com')) {
        // Default Google Storage URL
        const urlParts = url.split(`https://storage.googleapis.com/${this.bucketName}/`);
        return urlParts.length > 1 ? urlParts[1] : null;
      } else {
        // Custom base URL - extract everything after the base URL
        const urlParts = url.split(this.fileBaseUrl + '/');
        return urlParts.length > 1 ? urlParts[1] : null;
      }
    } catch (error) {
      this.logger.warn(`Failed to extract key from URL: ${url}`);
      return null;
    }
  }

  /**
   * Upload using stream method
   */
  private async uploadWithStream(gcsFile: any, file: Express.Multer.File, folder: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const stream = gcsFile.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          cacheControl: 'public, max-age=31536000',
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
            folder: folder,
            fileType: 'organization-image'
          },
        },
        resumable: false,
        // File accessible via direct link but folder not browseable
      });

      // Handle stream events
      stream.on('error', (error) => {
        this.logger.error(`Stream upload error: ${error.message}`);
        reject(new Error(`Upload stream error: ${error.message}`));
      });

      stream.on('finish', async () => {
        try {
          // Make file accessible via direct permanent link
          await gcsFile.makePublic();
          this.logger.log(`Stream upload completed with permanent link access`);
          resolve();
        } catch (publicError) {
          this.logger.warn(`Upload successful: ${publicError.message}`);
          resolve(); // Still resolve as upload succeeded
        }
      });

      // Write the buffer to the stream
      try {
        stream.write(file.buffer);
        stream.end();
      } catch (writeError) {
        this.logger.error(`Stream write error: ${writeError.message}`);
        reject(new Error(`Stream write failed: ${writeError.message}`));
      }
    });
  }

  /**
   * Upload using direct save method (more reliable than streams)
   */
  private async uploadWithSave(gcsFile: any, file: Express.Multer.File, folder: string): Promise<void> {
    // Validate that we have a valid file and buffer
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new Error('Invalid file data provided for upload');
    }

    // Create a fresh buffer copy to avoid potential reference issues
    const bufferCopy = Buffer.from(file.buffer);
    this.logger.log(`📦 Uploading buffer of size: ${bufferCopy.length} bytes`);
    
    try {
      await gcsFile.save(bufferCopy, {
        metadata: {
          contentType: file.mimetype,
          cacheControl: 'public, max-age=31536000',
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
            folder: folder,
            fileType: 'organization-image'
          },
        },
        resumable: false
        // File accessible via direct link but folder not browseable
      });
      
      this.logger.log(`✅ File save completed, creating permanent access link...`);
      
      // Make file accessible via direct permanent link
      await gcsFile.makePublic();
      this.logger.log(`🌐 File accessible via permanent link`);
      
    } catch (error) {
      this.logger.error(`❌ Upload save error: ${error.message}`);
      throw new Error(`Failed to save file: ${error.message}`);
    }
  }

  /**
   * Validate image file type and size with enhanced buffer validation
   */
  private validateImageFile(file: Express.Multer.File, maxSizeInMB: number = 10): void {
    // Validate file exists
    if (!file) {
      throw new Error('No file provided for upload');
    }

    // Validate file buffer exists and is not empty
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('File buffer is empty or corrupted. Please try uploading a different image.');
    }

    // Validate file size exists
    if (!file.size || file.size === 0) {
      throw new Error('Invalid file size. Please try uploading a different image.');
    }

    // Check file size (convert MB to bytes)
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new Error(`Image size must not exceed ${maxSizeInMB}MB. Current size: ${Math.round(file.size / (1024 * 1024) * 100) / 100}MB`);
    }

    // Validate original filename exists
    if (!file.originalname || file.originalname.trim() === '') {
      throw new Error('Invalid filename. Please ensure the file has a proper name.');
    }

    // Check file type (allow only images) - be more strict about MIME types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
      // Removed SVG as it can cause decoder issues
    ];

    if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Image type '${file.mimetype}' is not supported. Supported types: JPEG, PNG, GIF, WebP`);
    }

    // Additional validation for file extension
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      throw new Error(`File extension '.${fileExtension}' is not supported. Supported extensions: ${allowedExtensions.join(', ')}`);
    }

    // Enhanced buffer validation - check for valid image headers
    try {
      this.validateImageBuffer(file.buffer, file.mimetype);
    } catch (error) {
      throw new Error(`Invalid image file format: ${error.message}. Please ensure you're uploading a valid image file.`);
    }

    this.logger.log(`Image validation passed: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
  }

  /**
   * Validate image buffer contains valid image data
   */
  private validateImageBuffer(buffer: Buffer, mimetype: string): void {
    if (!buffer || buffer.length < 10) {
      throw new Error('Image buffer too small or invalid');
    }

    // Check image format signatures (magic numbers)
    const signature = buffer.slice(0, 10);
    
    switch (mimetype) {
      case 'image/jpeg':
      case 'image/jpg':
        // JPEG files start with FF D8 FF
        if (signature[0] !== 0xFF || signature[1] !== 0xD8 || signature[2] !== 0xFF) {
          throw new Error('Invalid JPEG file signature');
        }
        break;
        
      case 'image/png':
        // PNG files start with 89 50 4E 47 0D 0A 1A 0A
        const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        for (let i = 0; i < pngSignature.length; i++) {
          if (signature[i] !== pngSignature[i]) {
            throw new Error('Invalid PNG file signature');
          }
        }
        break;
        
      case 'image/gif':
        // GIF files start with "GIF87a" or "GIF89a"
        const gifStart = signature.slice(0, 6).toString('ascii');
        if (gifStart !== 'GIF87a' && gifStart !== 'GIF89a') {
          throw new Error('Invalid GIF file signature');
        }
        break;
        
      case 'image/webp':
        // WebP files start with "RIFF" and contain "WEBP"
        const riff = signature.slice(0, 4).toString('ascii');
        if (riff !== 'RIFF') {
          throw new Error('Invalid WebP file signature (missing RIFF)');
        }
        // Check for WEBP at offset 8 (need to check more of the buffer)
        if (buffer.length >= 12) {
          const webp = buffer.slice(8, 12).toString('ascii');
          if (webp !== 'WEBP') {
            throw new Error('Invalid WebP file signature (missing WEBP marker)');
          }
        }
        break;
        
      default:
        throw new Error(`Unsupported image format: ${mimetype}`);
    }
  }

  /**
   * Get image metadata from GCS
   */
  async getImageMetadata(key: string): Promise<any> {
    try {
      const gcsFile = this.bucket.file(key);
      const [metadata] = await gcsFile.getMetadata();
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to get image metadata: ${error.message}`);
      return null;
    }
  }

  /**
   * Test GCS connection with a simple text file upload
   */
  async testGCSConnection(): Promise<{ success: boolean; message: string; url?: string }> {
    try {
      this.logger.log('Testing GCS connection...');
      
      const testContent = `GCS Test Upload - ${new Date().toISOString()}`;
      const testBuffer = Buffer.from(testContent, 'utf8');
      const fileName = `test-${Date.now()}.txt`;
      const key = `tests/${fileName}`;
      
      const gcsFile = this.bucket.file(key);
      
      await gcsFile.save(testBuffer, {
        metadata: {
          contentType: 'text/plain',
        },
        public: true,
        resumable: false,
        predefinedAcl: 'publicRead', // Explicitly set public read access
      });
      
      // Ensure test file is publicly readable
      await gcsFile.makePublic();
      
      // Generate URL using custom base URL or default
      let url: string;
      if (this.fileBaseUrl.includes('storage.googleapis.com')) {
        url = `${this.fileBaseUrl}/${key}`;
      } else {
        url = `${this.fileBaseUrl}/${key}`;
      }
      
      this.logger.log(`GCS test successful: ${url}`);
      
      return {
        success: true,
        message: 'GCS connection test successful',
        url,
      };
    } catch (error) {
      this.logger.error(`GCS connection test failed: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      return {
        success: false,
        message: `GCS connection test failed: ${error.message}`,
      };
    }
  }
}
