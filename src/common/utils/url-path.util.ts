/**
 * URL PATH EXTRACTION UTILITY
 * 
 * Extracts relative paths from full URLs for database storage
 * - Database should store: "cause-images/file.jpg" (relative path)
 * - Frontend may send: "https://storage.suraksha.lk/cause-images/file.jpg" (full URL)
 * - This utility extracts the path portion for consistent storage
 */

/**
 * Extract relative path from full URL or return as-is if already relative
 * 
 * Examples:
 * - "https://storage.suraksha.lk/cause-images/file.jpg" → "cause-images/file.jpg"
 * - "https://bucket.s3.amazonaws.com/path/file.jpg" → "path/file.jpg"
 * - "cause-images/file.jpg" → "cause-images/file.jpg" (unchanged)
 * - null/undefined → null/undefined (unchanged)
 * 
 * @param url - Full URL or relative path
 * @returns Relative path suitable for database storage
 */
export function extractRelativePath(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  
  // If it's already a relative path (doesn't start with http), return as-is
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }
  
  try {
    // Extract pathname from URL
    const urlObj = new URL(url);
    let path = urlObj.pathname;
    
    // Remove leading slash if present
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    
    return path;
  } catch (error) {
    // If URL parsing fails, return original value
    return url;
  }
}

/**
 * Extract relative paths from multiple URL fields in an object
 * 
 * @param data - Object containing URL fields
 * @param urlFields - Array of field names that contain URLs
 * @returns Object with relative paths extracted
 */
export function extractRelativePathsFromObject<T extends Record<string, any>>(
  data: T,
  urlFields: (keyof T)[]
): T {
  const result = { ...data };
  
  for (const field of urlFields) {
    if (result[field]) {
      result[field] = extractRelativePath(result[field] as any) as any;
    }
  }
  
  return result;
}
