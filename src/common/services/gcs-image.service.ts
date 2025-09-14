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

  constructor(private configService: ConfigService) {
    const projectId = this.configService.get<string>('GCS_PROJECT_ID');
    const bucketName = this.configService.get<string>('GCS_BUCKET_NAME');
    const privateKeyId = this.configService.get<string>('GCS_PRIVATE_KEY_ID');
    const privateKey = this.configService.get<string>('GCS_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('GCS_CLIENT_EMAIL');
    const clientId = this.configService.get<string>('GCS_CLIENT_ID');

    if (!projectId || !bucketName || !privateKey || !clientEmail) {
      throw new Error('Missing required Google Cloud Storage configuration. Please check your environment variables.');
    }

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

      // Create file in GCS bucket
      const gcsFile = this.bucket.file(key);

      // Upload buffer to GCS with image optimization
      await gcsFile.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          cacheControl: 'public, max-age=31536000', // Cache for 1 year
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
            folder: folder,
            fileType: 'organization-image'
          },
        },
        public: true, // Make file publicly accessible
        resumable: false, // Use simple upload for better error handling
      });

      // Generate the public URL
      const url = `https://storage.googleapis.com/${this.bucketName}/${key}`;

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
      
      // Provide more specific error messages
      if (error.message.includes('DECODER')) {
        throw new Error(`Image processing failed: The uploaded file appears to be corrupted or in an unsupported format. Please try uploading a different image file.`);
      } else if (error.message.includes('buffer')) {
        throw new Error(`Image upload failed: Invalid file data. Please try uploading the image again.`);
      } else if (error.message.includes('signature')) {
        throw new Error(`Image upload failed: ${error.message}`);
      } else if (error.message.includes('size')) {
        throw new Error(`Image upload failed: ${error.message}`);
      } else if (error.message.includes('type') || error.message.includes('format')) {
        throw new Error(`Image upload failed: ${error.message}`);
      } else {
        throw new Error(`Image upload failed: ${error.message}`);
      }
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
   * Extract GCS key from public URL
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlParts = url.split(`https://storage.googleapis.com/${this.bucketName}/`);
      return urlParts.length > 1 ? urlParts[1] : null;
    } catch (error) {
      this.logger.warn(`Failed to extract key from URL: ${url}`);
      return null;
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
   * Check if image exists in GCS
   */
  async imageExists(key: string): Promise<boolean> {
    try {
      const gcsFile = this.bucket.file(key);
      const [exists] = await gcsFile.exists();
      return exists;
    } catch (error) {
      this.logger.error(`Failed to check image existence: ${error.message}`);
      return false;
    }
  }
}
