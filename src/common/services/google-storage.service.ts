import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GoogleStorageService {
  private readonly logger = new Logger(GoogleStorageService.name);
  private storage: Storage;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    // Initialize Google Cloud Storage
    this.bucketName = this.configService.get<string>('GOOGLE_CLOUD_BUCKET_NAME') || 'organization-images';
    
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const keyFilename = this.configService.get<string>('GOOGLE_CLOUD_KEY_FILE');
    
    if (projectId && keyFilename) {
      this.storage = new Storage({
        projectId,
        keyFilename,
      });
    } else {
      // Use environment-based authentication (service account key in environment)
      this.storage = new Storage();
    }

    this.logger.log(`🗄️ Google Cloud Storage initialized for bucket: ${this.bucketName}`);
  }

  /**
   * Upload organization image to Google Cloud Storage
   */
  async uploadOrganizationImage(
    file: Express.Multer.File,
    organizationId?: string
  ): Promise<string> {
    try {
      const timestamp = Date.now();
      const uuid = uuidv4();
      const fileExtension = this.getFileExtension(file.originalname);
      
      // Generate unique filename
      const fileName = organizationId 
        ? `organizations/${organizationId}/image_${timestamp}_${uuid}${fileExtension}`
        : `organizations/temp/image_${timestamp}_${uuid}${fileExtension}`;

      this.logger.log(`📤 Uploading image: ${fileName}`);

      // Get bucket reference
      const bucket = this.storage.bucket(this.bucketName);
      const fileUpload = bucket.file(fileName);

      // Upload file with metadata
      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
            organizationId: organizationId || 'temp',
            fileSize: file.size.toString(),
          },
        },
        resumable: false, // For small files, disable resumable uploads
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          this.logger.error(`❌ Image upload failed: ${error.message}`, error.stack);
          reject(error);
        });

        stream.on('finish', async () => {
          try {
            // Make file publicly readable
            await fileUpload.makePublic();
            
            // Generate public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
            
            this.logger.log(`✅ Image uploaded successfully: ${publicUrl}`);
            resolve(publicUrl);
          } catch (error) {
            this.logger.error(`❌ Failed to make file public: ${error.message}`, error.stack);
            reject(error);
          }
        });

        // Write file buffer to stream
        stream.end(file.buffer);
      });

    } catch (error) {
      this.logger.error(`❌ Image upload error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete organization image from Google Cloud Storage
   */
  async deleteOrganizationImage(imageUrl: string): Promise<boolean> {
    try {
      // Extract file path from URL
      const fileName = this.extractFileNameFromUrl(imageUrl);
      if (!fileName) {
        this.logger.warn(`⚠️ Could not extract filename from URL: ${imageUrl}`);
        return false;
      }

      this.logger.log(`🗑️ Deleting image: ${fileName}`);

      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        this.logger.warn(`⚠️ File not found: ${fileName}`);
        return false;
      }

      // Delete file
      await file.delete();
      this.logger.log(`✅ Image deleted successfully: ${fileName}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ Image deletion error: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Update organization image - deletes old and uploads new
   */
  async updateOrganizationImage(
    file: Express.Multer.File,
    organizationId: string,
    oldImageUrl?: string
  ): Promise<string> {
    try {
      // Upload new image first
      const newImageUrl = await this.uploadOrganizationImage(file, organizationId);

      // Delete old image if exists
      if (oldImageUrl) {
        await this.deleteOrganizationImage(oldImageUrl);
      }

      return newImageUrl;
    } catch (error) {
      this.logger.error(`❌ Image update error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate image file
   */
  validateImageFile(file: Express.Multer.File): { isValid: boolean; error?: string } {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'File size must be less than 5MB' };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return { isValid: false, error: 'File type must be JPEG, PNG, GIF, or WebP' };
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = this.getFileExtension(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return { isValid: false, error: 'Invalid file extension' };
    }

    return { isValid: true };
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }

  /**
   * Extract filename from Google Cloud Storage URL
   */
  private extractFileNameFromUrl(url: string): string | null {
    try {
      // Format: https://storage.googleapis.com/bucket-name/path/to/file.ext
      const urlParts = url.split(`${this.bucketName}/`);
      return urlParts.length > 1 ? urlParts[1] : null;
    } catch (error) {
      this.logger.error(`❌ URL parsing error: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate signed URL for temporary access (if needed)
   */
  async generateSignedUrl(fileName: string, expirationMinutes: number = 60): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000,
      });

      return signedUrl;
    } catch (error) {
      this.logger.error(`❌ Signed URL generation error: ${error.message}`, error.stack);
      throw error;
    }
  }
}
