# Upload Testing Guide

## Test APIs Fixed

### 1. Cause Image Upload (Fixed)
- **Endpoint**: `POST {{base_url}}/organization/api/v1/causes/with-image`
- **Fixed Issue**: "Cannot call write after a stream was destroyed" error
- **Service**: GCSImageService (src/common/services/gcs-image.service.ts)

### 2. Lecture File Upload (Fixed)
- **Endpoint**: `POST {{base_url}}/organization/api/v1/lectures/with-documents/11`
- **Fixed Issue**: File uploads returning null URLs
- **Service**: GCSService (src/common/services/gcs.service.ts)

## Changes Applied

### Stream-Based Upload Implementation
1. **Replaced problematic `gcsFile.save()` with stream-based approach**
2. **Added proper error handling and timeouts**
3. **Added fallback mechanism using original method if stream fails**
4. **Enhanced logging for debugging**

### Key Fixes in Both Services:
- Stream creation with proper event handling
- 30-second timeout protection
- Buffer validation and copying to avoid reference issues  
- Enhanced error messages for different failure types
- Bucket access validation during initialization

## Testing Steps

### Test Cause Image Upload:
```bash
curl -X POST "{{base_url}}/organization/api/v1/causes/with-image" \
  -H "Content-Type: multipart/form-data" \
  -F "organizationId=11" \
  -F "title=Test Cause with Image" \
  -F "description=Testing image upload fix" \
  -F "isPublic=true" \
  -F "image=@path/to/your/image.jpg"
```

### Test Lecture File Upload:
```bash
curl -X POST "{{base_url}}/organization/api/v1/lectures/with-documents/11" \
  -H "Content-Type: multipart/form-data" \
  -F "title=Test Lecture with Files" \
  -F "description=Testing file upload fix" \
  -F "content=Lecture content here" \
  -F "isPublic=true" \
  -F "documents=@path/to/your/file.pdf"
```

## Expected Results
- ✅ Files upload successfully without stream errors
- ✅ Image/file URLs are returned properly (not null)
- ✅ Files are accessible via returned URLs
- ✅ Detailed logging shows upload progress

## Server Status
- ✅ Both GCS services initialized successfully
- ✅ Bucket access validated: `laas-file-storage`
- ✅ Stream-based upload with fallback implemented
- ✅ Server running on: http://localhost:3001/organization/api/v1