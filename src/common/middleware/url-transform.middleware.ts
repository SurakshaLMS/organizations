import { transformUrl } from '../utils/url-transformer.util';

/**
 * Prisma Middleware for Automatic URL Transformation
 * 
 * This middleware intercepts all database read operations and automatically
 * transforms relative storage paths to full URLs.
 * 
 * Database stores: /images/file.jpg
 * API returns: https://storage.googleapis.com/bucket/images/file.jpg
 * 
 * Usage in prisma.service.ts:
 * ```
 * this.$use(urlTransformMiddleware);
 * ```
 */

// Define which models have which URL fields
// Only fields that store relative paths in DB (uploaded files)
// External URLs like introVideoUrl, recordingUrl, liveLink are NOT transformed
const URL_FIELD_MAP: Record<string, string[]> = {
  User: ['imageUrl', 'idUrl'],
  Institute: ['imageUrl'],
  Organization: ['imageUrl'],
  Cause: ['imageUrl'],  // introVideoUrl excluded (external link)
  Lecture: [],  // recordingUrl excluded (external link)
  Documentation: ['docUrl'],
};

/**
 * Transform URL fields in a result object
 */
function transformResultUrls(model: string, result: any): any {
  if (!result) return result;
  
  const urlFields = URL_FIELD_MAP[model];
  if (!urlFields) return result;
  
  // Handle single object
  if (!Array.isArray(result)) {
    const transformed = { ...result };
    for (const field of urlFields) {
      if (field in transformed && typeof transformed[field] === 'string') {
        transformed[field] = transformUrl(transformed[field]);
      }
    }
    return transformed;
  }
  
  // Handle array of objects
  return result.map((item: any) => {
    const transformed = { ...item };
    for (const field of urlFields) {
      if (field in transformed && typeof transformed[field] === 'string') {
        transformed[field] = transformUrl(transformed[field]);
      }
    }
    return transformed;
  });
}

/**
 * Transform nested relations in result
 */
function transformNestedUrls(result: any): any {
  if (!result || typeof result !== 'object') return result;
  
  // Handle arrays
  if (Array.isArray(result)) {
    return result.map(item => transformNestedUrls(item));
  }
  
  // Handle single objects
  const transformed = { ...result };
  
  // Check each property for nested relations
  for (const [key, value] of Object.entries(transformed)) {
    // Check if this property is a known model relation
    const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
    
    if (URL_FIELD_MAP[capitalizedKey] && value) {
      // Transform this nested relation
      if (Array.isArray(value)) {
        transformed[key] = value.map((item: any) => 
          transformResultUrls(capitalizedKey, item)
        );
      } else {
        transformed[key] = transformResultUrls(capitalizedKey, value);
      }
    } else if (value && typeof value === 'object') {
      // Recursively transform nested objects
      transformed[key] = transformNestedUrls(value);
    }
  }
  
  return transformed;
}

/**
 * Prisma middleware for automatic URL transformation
 */
export const urlTransformMiddleware = async (params: any, next: any) => {
  const result = await next(params);
  
  // Only transform on read operations
  const readOperations = ['findUnique', 'findFirst', 'findMany', 'findUniqueOrThrow', 'findFirstOrThrow'];
  
  if (!readOperations.includes(params.action)) {
    return result;
  }
  
  // Transform URLs in the result
  const model = params.model;
  if (!model) return result;
  
  // Transform main result
  let transformed = transformResultUrls(model, result);
  
  // Transform nested relations
  transformed = transformNestedUrls(transformed);
  
  return transformed;
};
