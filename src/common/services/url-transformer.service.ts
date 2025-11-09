import { Injectable, Logger } from '@nestjs/common';
import { CloudStorageService } from './cloud-storage.service';

/**
 * URL TRANSFORMER SERVICE
 * 
 * Centralized OOP service for transforming URLs in responses ONLY
 * - Detects if URL is relative path or full URL
 * - Converts relative paths to public URLs automatically
 * - Leaves full URLs unchanged (YouTube, external links, etc.)
 * 
 * Usage: Inject into any service and call transformUrl() or transformUrlFields()
 */
@Injectable()
export class UrlTransformerService {
  private readonly logger = new Logger(UrlTransformerService.name);

  constructor(private readonly cloudStorageService: CloudStorageService) {}

  /**
   * Transform a single URL field for response
   * - If URL starts with http:// or https://, return as-is (full URL)
   * - Otherwise, treat as relative path and convert to public URL
   * 
   * @param url - The URL or relative path
   * @returns Full URL (either original or public storage URL)
   */
  transformUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    // Check if it's already a full URL (YouTube, external links, etc.)
    if (this.isFullUrl(url)) {
      return url;
    }

    // It's a relative path - convert to full public URL
    try {
      return this.cloudStorageService.getFullUrl(url);
    } catch (error) {
      this.logger.warn(`Failed to transform URL: ${url}`, error.message);
      return url;
    }
  }

  /**
   * Transform multiple URL fields in an object
   * 
   * @param data - Object containing URL fields
   * @param urlFields - Array of field names to transform
   * @returns Object with transformed URLs
   */
  transformUrlFields<T extends Record<string, any>>(
    data: T,
    urlFields: (keyof T)[]
  ): T {
    if (!data) return data;

    const transformed = { ...data };

    for (const field of urlFields) {
      if (field in transformed) {
        transformed[field] = this.transformUrl(transformed[field] as any) as any;
      }
    }

    return transformed;
  }

  /**
   * Transform URL fields in an array of objects
   * 
   * @param dataArray - Array of objects containing URL fields
   * @param urlFields - Array of field names to transform
   * @returns Array with transformed URLs
   */
  transformUrlFieldsArray<T extends Record<string, any>>(
    dataArray: T[],
    urlFields: (keyof T)[]
  ): T[] {
    if (!dataArray || dataArray.length === 0) return dataArray;

    return dataArray.map(item => this.transformUrlFields(item, urlFields));
  }

  /**
   * Check if string is a full URL (starts with http:// or https://)
   * 
   * @param url - String to check
   * @returns true if full URL, false if relative path
   */
  private isFullUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  /**
   * Transform common entity URL fields (imageUrl, videoUrl, etc.)
   * Convenience method for most common use case
   * 
   * @param data - Entity object
   * @returns Entity with transformed URLs
   */
  transformCommonFields<T extends Record<string, any>>(data: T): T {
    const commonFields = [
      'imageUrl',
      'introVideoUrl', 
      'liveLink',
      'recordingUrl',
      'docUrl',
      'pdfUrl',
      'idUrl'
    ] as (keyof T)[];

    return this.transformUrlFields(data, commonFields);
  }

  /**
   * Transform common entity URL fields for array
   * 
   * @param dataArray - Array of entities
   * @returns Array with transformed URLs
   */
  transformCommonFieldsArray<T extends Record<string, any>>(
    dataArray: T[]
  ): T[] {
    const commonFields = [
      'imageUrl',
      'introVideoUrl',
      'liveLink', 
      'recordingUrl',
      'docUrl',
      'pdfUrl',
      'idUrl'
    ] as (keyof T)[];

    return this.transformUrlFieldsArray(dataArray, commonFields);
  }
}
