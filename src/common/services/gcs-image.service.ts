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
      // Validate image file
      this.validateImageFile(file);

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const key = `${folder}/${fileName}`;

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
      });

      // Generate the public URL
      const url = `https://storage.googleapis.com/${this.bucketName}/${key}`;

      this.logger.log(`Image uploaded successfully to GCS: ${key}`);

      return {
        url,
        key,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload image to GCS: ${error.message}`);
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
   * Validate image file type and size
   */
  private validateImageFile(file: Express.Multer.File, maxSizeInMB: number = 10): void {
    // Check file size (convert MB to bytes)
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new Error(`Image size must not exceed ${maxSizeInMB}MB`);
    }

    // Check file type (allow only images)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Image type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
    }

    // Additional validation for file extension
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      throw new Error(`Image extension .${fileExtension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
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
