import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '8080', 10), // Default to 8080 for Cloud Run
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // CORS Configuration
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  corsMethods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  corsCredentials: process.env.CORS_CREDENTIALS === 'true',
  corsMaxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10), // 24 hours
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Request Size Limits
  requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '10mb',
  maxFilesPerRequest: parseInt(process.env.MAX_FILES_PER_REQUEST || '10', 10),
  
  // Pagination Limits (DoS Protection)
  maxPaginationLimit: parseInt(process.env.MAX_PAGINATION_LIMIT || '100', 10),
  maxPageNumber: parseInt(process.env.MAX_PAGE_NUMBER || '1000', 10),
  maxSearchLength: parseInt(process.env.MAX_SEARCH_LENGTH || '200', 10),
  maxOffset: parseInt(process.env.MAX_OFFSET || '100000', 10),
  
  // Signed URL Configuration
  signedUrlTtlMinutes: parseInt(process.env.SIGNED_URL_TTL_MINUTES || '10', 10),
}));
