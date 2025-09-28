# SECURE FILE UPLOAD SYSTEM - IMAGES & PDFs ONLY

## Overview
This system provides enterprise-grade file upload security for a serverless NestJS application using Google Cloud Storage. The system is specifically restricted to support only **images and PDF documents**.

## Supported File Types

### Images (for lecture photos, cause images, etc.)
- **JPEG/JPG** - `.jpg`, `.jpeg`
- **PNG** - `.png` 
- **GIF** - `.gif`
- **HEIC/HEIF** (Apple devices) - `.heic`, `.heif`

### Documents (for lecture materials, documentation)
- **PDF** - `.pdf`

## Security Features

### Environment-Based Configuration
All security limits are configurable via environment variables with separate limits for documents and images:

```bash
# Separate file size limits for different file types
MaxDocSizeCanUpload=10485760        # 10MB per document (PDFs)
MaxImgSizeCanUpload=10485760        # 10MB per image (jpg, png, gif, heic, heif)
MAX_FILES_PER_UPLOAD=5              # Max 5 files per request

# Strict file type restrictions
ALLOWED_MIME_TYPES="image/jpeg,image/jpg,image/png,image/gif,image/heic,image/heif,application/pdf"
ALLOWED_EXTENSIONS=".jpg,.jpeg,.png,.gif,.heic,.heif,.pdf"

# Security validation
ENABLE_FILE_VALIDATION=true         # Enable strict validation (recommended)
```

### Multi-Layer Validation
1. **File Size Validation** - Separate configurable limits for documents (PDFs) and images
2. **MIME Type Validation** - Whitelist-based validation against allowed types
3. **File Extension Validation** - Double-check security layer
4. **Buffer Validation** - Ensures file integrity
5. **Content Security** - Files are scanned for malicious content

### Serverless-Optimized
- **Direct GCS Upload** - No local file storage required
- **Memory Efficient** - Streams files directly to cloud storage
- **Scalable** - Handles concurrent uploads efficiently
- **Cost-Effective** - No server storage costs

## API Endpoints

### Lecture Document Upload
```typescript
POST /lectures/with-files
POST /lectures/:id/with-files
POST /lectures/with-documents/:causeId  // Legacy

Content-Type: multipart/form-data
Field Name: "documents" (supports multiple files)
```

### Security Response
```typescript
interface SecureUploadResult {
  url: string;           // Public GCS URL
  key: string;           // GCS storage key
  originalName: string;  // Original filename
  size: number;          // File size in bytes
  mimeType: string;      // Validated MIME type
  uploadedAt: string;    // Upload timestamp
  fileId: string;        // Unique file identifier
}
```

## Usage Examples

### Single File Upload
```bash
curl -X POST "http://localhost:3000/lectures/with-files" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "causeId=123" \
  -F "title=My Lecture" \
  -F "description=Lecture with PDF materials" \
  -F "documents=@lecture-notes.pdf"
```

### Multiple Files Upload
```bash
curl -X POST "http://localhost:3000/lectures/with-files" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "causeId=123" \
  -F "title=My Lecture" \
  -F "documents=@lecture-slides.pdf" \
  -F "documents=@lecture-photo.jpg" \
  -F "documents=@diagram.png"
```

### Apple HEIC Support
```bash
# Upload iPhone/iPad photos directly
curl -X POST "http://localhost:3000/lectures/with-files" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "causeId=123" \
  -F "title=Mobile Photo Upload" \
  -F "documents=@IMG_1234.heic"
```

## Error Handling

### File Type Errors
```json
{
  "statusCode": 400,
  "message": "File type 'application/msword' is not allowed. Allowed types: image/jpeg, image/jpg, image/png, image/gif, image/heic, image/heif, application/pdf",
  "error": "Bad Request"
}
```

### File Size Errors
```json
{
  "statusCode": 400,
  "message": "document size 15.2 MB exceeds maximum allowed size of 10 MB",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "image size 12.5 MB exceeds maximum allowed size of 10 MB", 
  "error": "Bad Request"
}
```

### Multiple File Errors
```json
{
  "statusCode": 400,
  "message": "Too many files. Maximum allowed: 5, provided: 8",
  "error": "Bad Request"
}
```

## Google Cloud Storage Configuration

### Environment Variables
```bash
GCS_PROJECT_ID="your-gcs-project-id"
GCS_BUCKET_NAME="your-secure-bucket"
GCS_PRIVATE_KEY_ID="your-private-key-id"
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GCS_CLIENT_EMAIL="service-account@your-project.iam.gserviceaccount.com"
GCS_CLIENT_ID="your-client-id"
```

### Bucket Security
- **Private Bucket** - Bucket itself is private
- **Public Files** - Individual files are made public with `publicRead` ACL
- **Custom URLs** - Support for custom domain serving via `FILE_BASE_URL`

## File Organization

Files are automatically organized in GCS with the following structure:
```
bucket/
├── lectures/
│   └── 2024/
│       └── 09/
│           ├── {fileId}_lecture-notes.pdf
│           ├── {fileId}_slide-image.jpg
│           └── {fileId}_mobile-photo.heic
└── documents/
    └── 2024/
        └── 09/
            └── {fileId}_general-doc.pdf
```

## Database Integration

### Documentation Table
```sql
CREATE TABLE documentation (
  documentationId BIGINT PRIMARY KEY,
  lectureId BIGINT REFERENCES lecture(lectureId),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  docUrl TEXT NOT NULL,          -- GCS public URL
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### File Metadata Storage
- **docUrl** - Public GCS URL for direct access
- **title** - Original filename for user reference
- **description** - Auto-generated description with context
- **Timestamps** - Creation and update tracking

## Security Best Practices

### 1. File Type Restrictions
- **Whitelist Only** - Only explicitly allowed file types
- **No Executables** - No `.exe`, `.bat`, `.sh`, etc.
- **No Scripts** - No `.js`, `.php`, `.py`, etc.
- **No Archives** - No `.zip`, `.rar` (prevents nested attacks)

### 2. Size Limitations
- **Per-file Limits** - Configurable maximum per file
- **Total Upload Limits** - Prevents bulk upload attacks
- **Memory Management** - Efficient streaming for large files

### 3. Content Validation
- **Buffer Integrity** - Validates file buffer structure
- **MIME Type Checking** - Server-side MIME validation
- **Extension Matching** - Ensures extension matches content

### 4. Access Control
- **JWT Authentication** - Required for uploads
- **Organization-based Access** - Role-based permissions
- **Public File Access** - Files are publicly readable once uploaded

## Monitoring and Logging

### Upload Logging
```
📤 Starting secure file upload: lecture-notes.pdf (2.5 MB)
🔐 Generated secure GCS key: lectures/2024/09/abc123_lecture-notes.pdf
☁️ Uploading file to GCS: lectures/2024/09/abc123_lecture-notes.pdf
✅ Upload successful: lectures/2024/09/abc123_lecture-notes.pdf
🎉 File uploaded successfully: lecture-notes.pdf -> https://storage.googleapis.com/bucket/lectures/2024/09/abc123_lecture-notes.pdf
```

### Error Logging
```
❌ Failed to upload file: invalid-file.exe
File details: name=invalid-file.exe, size=1024, type=application/octet-stream
```

### Audit Trail
- **Upload Timestamps** - When files were uploaded
- **User Tracking** - Who uploaded each file
- **File Metadata** - Size, type, original name
- **Security Validation** - Validation status and results

## Migration from Legacy System

### Before (Issues)
- ❌ Local file storage (not serverless-friendly)
- ❌ Third-party service dependencies
- ❌ Limited file type validation
- ❌ No size limits
- ❌ Security vulnerabilities

### After (Solutions)
- ✅ Google Cloud Storage (serverless-ready)
- ✅ No third-party dependencies
- ✅ Strict file type restrictions (images + PDFs only)
- ✅ Environment-based size limits
- ✅ Enterprise-grade security

## Deployment Considerations

### Serverless Deployment
- **No Local Storage** - All files go directly to GCS
- **Memory Efficient** - Streams files without disk I/O
- **Auto-Scaling** - Handles concurrent uploads
- **Cost-Effective** - Pay-per-use storage model

### Production Configuration
```bash
# Production limits with separate document and image sizes
MaxDocSizeCanUpload=10485760      # 10MB for PDFs in production
MaxImgSizeCanUpload=5242880       # 5MB for images in production (more restrictive)
MAX_FILES_PER_UPLOAD=3            # Conservative limit

# Enable all security features
ENABLE_FILE_VALIDATION=true

# Custom domain for file serving
FILE_BASE_URL="https://files.yourdomain.com"
```

This secure file upload system provides enterprise-grade security while maintaining simplicity and serverless compatibility. The restriction to images and PDFs ensures maximum security while supporting the most common use cases for educational content.