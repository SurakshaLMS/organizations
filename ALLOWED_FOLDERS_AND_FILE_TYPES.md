# 📁 Allowed Folders and File Types - Complete Reference

## 🎯 Overview
This document lists all allowed folder names and their configurations for the signed URL file upload system.

---

## 📊 Complete Folder Configuration Table

| Folder Name | Max Size | Size (MB) | Allowed Extensions | Use Case |
|-------------|----------|-----------|-------------------|----------|
| `profile-images` | 5,242,880 bytes | 5 MB | `.jpg`, `.jpeg`, `.png`, `.gif` | User profile pictures |
| `institute-images` | 10,485,760 bytes | 10 MB | `.jpg`, `.jpeg`, `.png`, `.webp` | Institute logos/banners |
| `organization-images` | 10,485,760 bytes | 10 MB | `.jpg`, `.jpeg`, `.png`, `.webp` | Organization logos/covers |
| `cause-images` | 10,485,760 bytes | 10 MB | `.jpg`, `.jpeg`, `.png`, `.webp` | Cause cover images |
| `student-images` | 5,242,880 bytes | 5 MB | `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` | Student profile photos |
| `bookhire-images` | 10,485,760 bytes | 10 MB | `.jpg`, `.jpeg`, `.png`, `.webp` | Book rental images |
| `advertisement-media` | 104,857,600 bytes | 100 MB | `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.mp4`, `.webm`, `.pdf` | Advertisement content |
| `lecture-documents` | 52,428,800 bytes | 50 MB | `.pdf`, `.doc`, `.docx`, `.ppt`, `.pptx` | Lecture materials/slides |
| `lecture-covers` | 5,242,880 bytes | 5 MB | `.jpg`, `.jpeg`, `.png`, `.webp` | Lecture thumbnail images |
| `id-documents` | 10,485,760 bytes | 10 MB | `.pdf`, `.jpg`, `.jpeg`, `.png` | Identity verification docs |
| `payment-receipts` | 10,485,760 bytes | 10 MB | `.pdf`, `.jpg`, `.jpeg`, `.png` | Payment proof/receipts |
| `homework-submissions` | 20,971,520 bytes | 20 MB | `.pdf`, `.doc`, `.docx`, `.jpg`, `.jpeg`, `.png` | Student homework uploads |
| `teacher-corrections` | 20,971,520 bytes | 20 MB | `.pdf`, `.jpg`, `.jpeg`, `.png` | Teacher feedback/corrections |

---

## 🔧 Environment Variables Configuration

Add these to your `.env` file to customize file size limits:

```bash
# Image Sizes
MAX_PROFILE_IMAGE_SIZE=5242880          # 5MB - User profiles
MAX_INSTITUTE_IMAGE_SIZE=10485760       # 10MB - Institute/Organization images
MAX_STUDENT_IMAGE_SIZE=5242880          # 5MB - Student photos

# Document Sizes
MAX_LECTURE_DOCUMENT_SIZE=52428800      # 50MB - Lecture materials
MAX_LECTURE_COVER_SIZE=5242880          # 5MB - Lecture thumbnails
MAX_ADVERTISEMENT_SIZE=104857600        # 100MB - Advertisements (can include videos)

# Submission Sizes
MAX_HOMEWORK_SIZE=20971520              # 20MB - Student homework
MAX_CORRECTION_SIZE=20971520            # 20MB - Teacher corrections
```

---

## 📝 API Usage Examples

### 1. Profile Image Upload

```bash
POST /signed-urls/generate
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "folder": "profile-images",
  "fileName": "my-photo.jpg",
  "contentType": "image/jpeg"
}
```

**Response:**
```json
{
  "uploadToken": "encrypted_token",
  "signedUrl": "https://storage.googleapis.com/bucket/profile-images/photo_abc123.jpg?signature=...",
  "relativePath": "profile-images/photo_abc123.jpg",
  "publicUrl": "https://storage.googleapis.com/bucket/profile-images/photo_abc123.jpg",
  "maxFileSizeBytes": 5242880,
  "allowedExtensions": [".jpg", ".jpeg", ".png", ".gif"],
  "uploadInstructions": {
    "method": "PUT",
    "headers": {
      "Content-Type": "image/jpeg",
      "x-goog-content-length-range": "0,5242880"
    }
  }
}
```

---

### 2. Lecture Document Upload

```bash
POST /signed-urls/generate
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "folder": "lecture-documents",
  "fileName": "lecture-slides.pdf",
  "contentType": "application/pdf"
}
```

**Response:**
```json
{
  "uploadToken": "encrypted_token",
  "signedUrl": "https://storage.googleapis.com/bucket/lecture-documents/slides_xyz789.pdf?signature=...",
  "relativePath": "lecture-documents/slides_xyz789.pdf",
  "publicUrl": "https://storage.googleapis.com/bucket/lecture-documents/slides_xyz789.pdf",
  "maxFileSizeBytes": 52428800,
  "allowedExtensions": [".pdf", ".doc", ".docx", ".ppt", ".pptx"]
}
```

---

### 3. Advertisement Video Upload

```bash
POST /signed-urls/generate
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "folder": "advertisement-media",
  "fileName": "promo-video.mp4",
  "contentType": "video/mp4"
}
```

**Response:**
```json
{
  "uploadToken": "encrypted_token",
  "signedUrl": "https://storage.googleapis.com/bucket/advertisement-media/video_def456.mp4?signature=...",
  "relativePath": "advertisement-media/video_def456.mp4",
  "publicUrl": "https://storage.googleapis.com/bucket/advertisement-media/video_def456.mp4",
  "maxFileSizeBytes": 104857600,
  "allowedExtensions": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".pdf"]
}
```

---

## 🎨 Frontend Implementation

### React/TypeScript Example

```typescript
interface UploadConfig {
  folder: 'profile-images' | 'institute-images' | 'organization-images' | 
          'cause-images' | 'student-images' | 'bookhire-images' | 
          'advertisement-media' | 'lecture-documents' | 'lecture-covers' | 
          'id-documents' | 'payment-receipts' | 'homework-submissions' | 
          'teacher-corrections';
  maxSizeMB: number;
  allowedExtensions: string[];
}

const UPLOAD_CONFIGS: Record<string, UploadConfig> = {
  'profile-images': {
    folder: 'profile-images',
    maxSizeMB: 5,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif']
  },
  'lecture-documents': {
    folder: 'lecture-documents',
    maxSizeMB: 50,
    allowedExtensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx']
  },
  'advertisement-media': {
    folder: 'advertisement-media',
    maxSizeMB: 100,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.pdf']
  },
  // ... add others as needed
};

async function uploadFile(file: File, folderType: string) {
  const config = UPLOAD_CONFIGS[folderType];
  
  // Client-side validation
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > config.maxSizeMB) {
    throw new Error(`File too large. Max: ${config.maxSizeMB}MB`);
  }
  
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!config.allowedExtensions.includes(ext)) {
    throw new Error(`Invalid file type. Allowed: ${config.allowedExtensions.join(', ')}`);
  }
  
  // Step 1: Get signed URL
  const response = await fetch('/signed-urls/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      folder: config.folder,
      fileName: file.name,
      contentType: file.type
    })
  });
  
  const data = await response.json();
  
  // Step 2: Upload to GCS
  await fetch(data.signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': data.uploadInstructions.headers['Content-Type'],
      'x-goog-content-length-range': data.uploadInstructions.headers['x-goog-content-length-range']
    },
    body: file
  });
  
  // Step 3: Verify upload
  const verifyResponse = await fetch(`/signed-urls/verify/${data.uploadToken}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const verifyData = await verifyResponse.json();
  
  return {
    relativePath: data.relativePath, // Save to database
    publicUrl: verifyData.publicUrl  // Display to users
  };
}
```

---

## 🔒 Security Features

### 1. Double Extension Prevention
❌ Blocked: `malicious.php.jpg`, `virus.exe.png`
✅ Allowed: `document.pdf`, `photo.jpg`

### 2. File Size Enforcement
- **Client-side**: JavaScript validation before upload
- **Server-side**: `x-goog-content-length-range` header in signed URL
- **Cloud-side**: GCS rejects oversized files automatically

### 3. Content Type Validation
- Validates file extension matches content type
- Prevents MIME type spoofing

---

## 📋 Database Schema Recommendations

### Store Relative Paths Only

```typescript
// ✅ CORRECT: Store relative path
{
  imageUrl: "profile-images/photo_abc123.jpg"
}

// ❌ WRONG: Don't store full URL
{
  imageUrl: "https://storage.googleapis.com/bucket/profile-images/photo_abc123.jpg"
}
```

### Why?
1. **Flexibility**: Easy to change storage provider or bucket
2. **Efficiency**: Shorter strings = less database storage
3. **Security**: API controls URL transformation logic

---

## 🎯 Common Use Cases

### User Profile Picture
```
Folder: profile-images
Max Size: 5MB
Extensions: .jpg, .jpeg, .png, .gif
```

### Organization Logo
```
Folder: organization-images
Max Size: 10MB
Extensions: .jpg, .jpeg, .png, .webp
```

### Lecture Slides
```
Folder: lecture-documents
Max Size: 50MB
Extensions: .pdf, .doc, .docx, .ppt, .pptx
```

### Homework Submission
```
Folder: homework-submissions
Max Size: 20MB
Extensions: .pdf, .doc, .docx, .jpg, .jpeg, .png
```

### Advertisement Video
```
Folder: advertisement-media
Max Size: 100MB
Extensions: .jpg, .jpeg, .png, .webp, .gif, .mp4, .webm, .pdf
```

---

## ⚠️ Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `400: Invalid folder type` | Folder name not in allowed list | Use one of the documented folder names |
| `400: File extension not allowed` | File type not supported for folder | Check allowed extensions table |
| `413: Request Entity Too Large` | File exceeds max size | Compress file or use correct folder type |
| `SignatureDoesNotMatch` | Missing or wrong header | Include `x-goog-content-length-range` header |
| `Upload token expired` | Verification > 10 minutes after upload | Request new signed URL and re-upload |

---

## 🚀 Quick Reference

**Most Common Folders:**
- `profile-images` - User avatars (5MB, images only)
- `organization-images` - Org logos (10MB, images only)
- `lecture-documents` - Course materials (50MB, docs only)
- `advertisement-media` - Marketing (100MB, images + videos + PDFs)

**Upload Flow:**
1. Generate signed URL → Get `relativePath`, `publicUrl`, `signedUrl`, `uploadToken`
2. Upload file → PUT to `signedUrl` with required headers
3. Verify upload → POST to `/signed-urls/verify/{uploadToken}`
4. Save to DB → Store `relativePath` only
5. Display → API returns full `publicUrl` automatically

---

## 📞 Support

For folder type additions or size limit changes, update:
1. `getAllowedExtensions()` method in `signed-url.service.ts`
2. `getMaxFileSizeForType()` method in `signed-url.service.ts`
3. Environment variables in `.env` file
4. This documentation

**File Location:** `src/common/services/signed-url.service.ts`
