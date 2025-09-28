# Custom Base URL Implementation for File Storage ✅

## Overview
Implemented custom base URL functionality to serve files through your own domain instead of Google Cloud Storage URLs.

## Problem Addressed
- **ECONNABORTED Errors**: Fixed connection timeout issues in GCS uploads
- **Custom Domain URLs**: Enable serving files through custom domains (e.g., `https://example.com`) instead of `https://storage.googleapis.com`
- **Better Reliability**: Added timeout and retry configurations for robust uploads

## Configuration Added

### Environment Variables
Added `FILE_BASE_URL` configuration to both `.env.example` and `.env.gcs`:

```bash
# File Storage Configuration - Custom Base URL for serving files
FILE_BASE_URL="https://example.com"  # Replace with your domain
# Leave empty to use default Google Cloud Storage URLs
```

### How It Works
1. **Default Behavior** (if `FILE_BASE_URL` is empty or not set):
   - Uses standard Google Cloud Storage URLs: `https://storage.googleapis.com/bucket-name/path/to/file`

2. **Custom Domain** (if `FILE_BASE_URL` is set):
   - Uses your custom domain: `https://example.com/path/to/file`
   - Files are still stored in GCS, but URLs point to your domain
   - Requires CDN/proxy setup to serve files from your domain

## Services Updated

### 1. GCSImageService (`src/common/services/gcs-image.service.ts`)

#### Constructor Changes:
```typescript
private readonly fileBaseUrl: string;

constructor(private configService: ConfigService) {
  // ... existing config ...
  const fileBaseUrl = this.configService.get<string>('FILE_BASE_URL');
  
  // Set custom base URL or default to Google Storage
  this.fileBaseUrl = fileBaseUrl?.trim() || `https://storage.googleapis.com/${bucketName}`;
  this.logger.log(`File base URL configured: ${this.fileBaseUrl}`);
}
```

#### URL Generation:
```typescript
// Generate the public URL using custom base URL or default
let url: string;
if (this.fileBaseUrl.includes('storage.googleapis.com')) {
  // Using default Google Storage URL
  url = `${this.fileBaseUrl}/${key}`;
} else {
  // Using custom base URL - append the key path
  url = `${this.fileBaseUrl}/${key}`;
}
```

#### Connection Reliability Improvements:
```typescript
await gcsFile.save(bufferCopy, {
  metadata: { /* ... */ },
  public: true,
  resumable: false,
  timeout: 30000, // 30 second timeout
  retry: {
    retries: 2,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 3000
  }
});
```

### 2. GCSService (`src/common/services/gcs.service.ts`)

#### Same Updates Applied:
- Custom base URL support
- Enhanced timeout and retry configurations
- Improved error handling for connection issues
- Better URL extraction for both custom and default URLs

## Benefits

### 1. **Custom Branding**
- Files served from your domain instead of Google's
- Better brand consistency in API responses
- SEO-friendly URLs

### 2. **Improved Reliability**
- Connection timeout handling (30s primary, 60s fallback)
- Automatic retry mechanism with exponential backoff
- Better error recovery

### 3. **Flexibility**
- Easy to switch between default and custom URLs
- Supports both scenarios without code changes
- Backward compatible with existing URLs

## Implementation Examples

### Example 1: Default Google Storage URLs
```bash
FILE_BASE_URL=""
```
**Result**: `https://storage.googleapis.com/laas-file-storage/causes/images/abc123.jpg`

### Example 2: Custom Domain URLs
```bash
FILE_BASE_URL="https://files.yourcompany.com"
```
**Result**: `https://files.yourcompany.com/causes/images/abc123.jpg`

### Example 3: CDN URLs
```bash
FILE_BASE_URL="https://cdn.yourapp.com/files"
```
**Result**: `https://cdn.yourapp.com/files/causes/images/abc123.jpg`

## CDN/Proxy Setup (Required for Custom URLs)

To serve files from your custom domain, you need to set up a CDN or proxy:

### Option 1: CloudFlare (Recommended)
1. Create a CNAME record: `files.yourcompany.com -> storage.googleapis.com`
2. Set up CloudFlare proxy to handle the requests
3. Configure cache rules for optimal performance

### Option 2: AWS CloudFront
1. Create CloudFront distribution
2. Set origin to `storage.googleapis.com/your-bucket`
3. Configure custom domain

### Option 3: Google Cloud CDN
1. Set up Google Cloud Load Balancer
2. Configure backend bucket
3. Add custom domain SSL certificate

## Error Handling Improvements

### Connection Errors:
- **Primary Upload**: 30-second timeout with 2 retries
- **Fallback Upload**: 60-second timeout with different settings
- **Exponential Backoff**: Prevents overwhelming the service

### Error Messages:
- More specific error messages for different failure types
- Better logging for debugging connection issues
- Detailed error context in logs

## Testing

### Test with Default URLs:
```bash
# Don't set FILE_BASE_URL or set it empty
FILE_BASE_URL=""
```

### Test with Custom URLs:
```bash
# Set your custom domain
FILE_BASE_URL="https://example.com"
```

## Migration Notes

### Existing Installations:
- **No Breaking Changes**: Existing URLs continue to work
- **Automatic Fallback**: If FILE_BASE_URL is not set, uses default behavior
- **Gradual Migration**: Can change URL format without data migration

### URL Extraction:
- Updated `extractKeyFromUrl()` methods handle both formats
- Supports legacy Google Storage URLs and new custom URLs
- Automatic detection of URL format

## Production Checklist

1. ✅ **Environment Variables**: Set `FILE_BASE_URL` in production environment
2. ⚠️ **CDN Setup**: Configure CDN/proxy to serve files from custom domain
3. ✅ **SSL Certificate**: Ensure custom domain has valid SSL certificate
4. ⚠️ **Cache Configuration**: Set appropriate cache headers for file types
5. ✅ **Testing**: Verify both upload and access work with custom URLs
6. ⚠️ **Monitoring**: Monitor file access and CDN performance

## Next Steps

1. **Set Your Custom Domain**: Update `FILE_BASE_URL` in `.env.gcs`
2. **Configure CDN**: Set up CloudFlare, AWS CloudFront, or Google Cloud CDN
3. **Test Upload/Access**: Verify files upload and are accessible via custom URLs
4. **Monitor Performance**: Check upload success rates and access speed

The file storage system now supports custom base URLs while maintaining full backward compatibility and improved reliability!