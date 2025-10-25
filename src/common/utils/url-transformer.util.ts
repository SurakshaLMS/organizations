/**
 * URL Transformation Utility
 * 
 * Transforms relative storage paths to full URLs for API responses.
 * Database stores relative paths (e.g., /images/file.jpg)
 * API returns full URLs (e.g., https://storage.googleapis.com/bucket/images/file.jpg)
 */

/**
 * Get the base storage URL from environment variables
 */
export function getStorageBaseUrl(): string {
  return process.env.GCS_BASE_URL || process.env.STORAGE_BASE_URL || '';
}

/**
 * Transform a single URL field from relative to full URL
 * @param url - The relative URL from database (e.g., /images/file.jpg)
 * @returns Full URL or original value if not transformable
 */
export function transformUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  
  const baseUrl = getStorageBaseUrl();
  
  // Only transform if:
  // 1. URL starts with / (relative path)
  // 2. Base URL is configured
  if (url.startsWith('/') && baseUrl) {
    return `${baseUrl}${url}`;
  }
  
  return url;
}

/**
 * Transform multiple URL fields in an object
 * @param obj - Object with URL fields
 * @param urlFields - Array of field names that contain URLs
 * @returns New object with transformed URLs
 */
export function transformUrls<T extends Record<string, any>>(
  obj: T | null | undefined,
  urlFields: (keyof T)[]
): T | null | undefined {
  if (!obj) return obj;
  
  const transformed = { ...obj };
  
  for (const field of urlFields) {
    if (field in transformed) {
      const value = transformed[field];
      if (typeof value === 'string') {
        transformed[field] = transformUrl(value) as any;
      }
    }
  }
  
  return transformed;
}

/**
 * Transform URLs in an array of objects
 * @param items - Array of objects with URL fields
 * @param urlFields - Array of field names that contain URLs
 * @returns New array with transformed URLs
 */
export function transformUrlsInArray<T extends Record<string, any>>(
  items: T[] | null | undefined,
  urlFields: (keyof T)[]
): T[] | null | undefined {
  if (!items) return items;
  
  return items.map(item => transformUrls(item, urlFields) as T);
}

/**
 * Specific transformers for each model
 * Only transform fields that store relative paths (uploaded files)
 * External URLs (introVideoUrl, recordingUrl, liveLink) are NOT transformed
 */

export function transformOrganizationUrls<T extends { imageUrl?: string | null }>(
  org: T | null | undefined
): T | null | undefined {
  return transformUrls(org, ['imageUrl']);
}

export function transformCauseUrls<T extends { imageUrl?: string | null }>(
  cause: T | null | undefined
): T | null | undefined {
  return transformUrls(cause, ['imageUrl']);  // introVideoUrl excluded (external link)
}

export function transformLectureUrls<T extends Record<string, any>>(
  lecture: T | null | undefined
): T | null | undefined {
  // Lecture has no uploaded files, only external links (recordingUrl, liveLink)
  // Return as-is, no transformation needed
  return lecture;
}

export function transformDocumentationUrls<T extends { docUrl?: string | null }>(
  doc: T | null | undefined
): T | null | undefined {
  return transformUrls(doc, ['docUrl']);
}

export function transformUserUrls<T extends { imageUrl?: string | null; idUrl?: string | null }>(
  user: T | null | undefined
): T | null | undefined {
  return transformUrls(user, ['imageUrl', 'idUrl']);
}

export function transformInstituteUrls<T extends { imageUrl?: string | null }>(
  institute: T | null | undefined
): T | null | undefined {
  return transformUrls(institute, ['imageUrl']);
}

/**
 * Transform nested objects with URLs
 * Example: lecture with documentation array
 */
export function transformLectureWithDocsUrls<
  T extends {
    documentations?: Array<{ docUrl?: string | null }>;
  }
>(lecture: T | null | undefined): T | null | undefined {
  if (!lecture) return lecture;
  
  // Lecture itself has no uploaded files (recordingUrl is external link)
  const transformed = { ...lecture };
  
  if (transformed.documentations) {
    transformed.documentations = transformed.documentations.map(doc =>
      transformDocumentationUrls(doc)
    ) as any;
  }
  
  return transformed;
}

/**
 * Transform cause with nested lectures and their documentation
 */
export function transformCauseWithLecturesUrls<
  T extends {
    imageUrl?: string | null;
    lectures?: Array<{ 
      documentations?: Array<{ docUrl?: string | null }> 
    }>;
  }
>(cause: T | null | undefined): T | null | undefined {
  if (!cause) return cause;
  
  const transformed = transformCauseUrls(cause);  // Transform cause imageUrl
  
  if (transformed && transformed.lectures) {
    transformed.lectures = transformed.lectures.map(lecture =>
      transformLectureWithDocsUrls(lecture)  // Transform lecture's documentation
    ) as any;
  }
  
  return transformed;
}
