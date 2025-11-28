# Frontend AWS S3 Upload Integration Guide

## Overview

This guide shows how to integrate the AWS S3 presigned POST upload system into your frontend application. The backend generates secure presigned POST URLs with built-in validation and security.

---

## 📋 Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Upload Flow](#upload-flow)
3. [React/JavaScript Implementation](#reactjavascript-implementation)
4. [TypeScript Implementation](#typescript-implementation)
5. [File Validation](#file-validation)
6. [Error Handling](#error-handling)
7. [Complete Examples](#complete-examples)

---

## API Endpoints

### Authentication
```
POST /organization/api/v1/auth/login
Body: { "email": "user@example.com", "password": "password" }
Response: { "accessToken": "jwt_token..." }
```

### Upload Signed URL Endpoints

| Endpoint | Purpose | Required Fields |
|----------|---------|-----------------|
| `POST /organization/api/v1/signed-urls/profile` | User profile image | `userId`, `fileExtension` |
| `POST /organization/api/v1/signed-urls/institute` | Institute image | `instituteId`, `fileExtension` |
| `POST /organization/api/v1/signed-urls/organization` | Organization image | `organizationId`, `fileExtension` |
| `POST /organization/api/v1/signed-urls/cause` | Cause image | `causeId`, `fileExtension` |
| `POST /organization/api/v1/signed-urls/lecture/document` | Lecture document | `lectureId`, `documentType`, `fileExtension`, `fileName` |

### Verify Upload
```
POST /organization/api/v1/signed-urls/verify
Body: { "uploadToken": "encrypted_token..." }
Response: { "publicUrl": "https://...", "metadata": {...} }
```

---

## Upload Flow

```
1. User selects file
2. Validate file (size, type, extension)
3. Request signed URL from backend
4. Upload file directly to S3 using presigned POST
5. Verify upload with backend
6. Display success/error message
```

---

## React/JavaScript Implementation

### 1. Basic Upload Hook

```javascript
import { useState } from 'react';

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const uploadFile = async (file, signedUrlEndpoint, requestData) => {
    try {
      setUploading(true);
      setError(null);
      setProgress(0);

      // Step 1: Get signed URL from backend
      const token = localStorage.getItem('accessToken');
      const signedUrlResponse = await fetch(signedUrlEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!signedUrlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { signedUrl, uploadToken, maxFileSizeBytes } = await signedUrlResponse.json();

      // Step 2: Validate file size
      if (file.size > maxFileSizeBytes) {
        throw new Error(`File size exceeds limit of ${maxFileSizeBytes / (1024 * 1024)}MB`);
      }

      setProgress(25);

      // Step 3: Upload to S3 using presigned POST
      const formData = new FormData();
      
      // Add all fields from signedUrl.fields
      Object.entries(signedUrl.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      // Add file LAST
      formData.append('file', file);

      setProgress(50);

      const uploadResponse = await fetch(signedUrl.url, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload to S3 failed');
      }

      setProgress(75);

      // Step 4: Verify upload with backend
      const verifyResponse = await fetch('/organization/api/v1/signed-urls/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uploadToken }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Upload verification failed');
      }

      const verifyData = await verifyResponse.json();
      setProgress(100);

      return verifyData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, progress, error };
};
```

### 2. Profile Image Upload Component

```jsx
import React, { useState } from 'react';
import { useFileUpload } from './useFileUpload';

export const ProfileImageUpload = ({ userId }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const { uploadFile, uploading, progress, error } = useFileUpload();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please select a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
      
      const result = await uploadFile(
        selectedFile,
        'http://localhost:8080/organization/api/v1/signed-urls/profile',
        { userId, fileExtension }
      );

      setUploadedUrl(result.publicUrl);
      alert('Upload successful!');
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div className="profile-upload">
      <h3>Upload Profile Image</h3>
      
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {preview && (
        <div className="preview">
          <img src={preview} alt="Preview" style={{ maxWidth: '200px' }} />
        </div>
      )}

      {selectedFile && (
        <button onClick={handleUpload} disabled={uploading}>
          {uploading ? `Uploading... ${progress}%` : 'Upload'}
        </button>
      )}

      {error && <div className="error">{error}</div>}
      
      {uploadedUrl && (
        <div className="success">
          <p>File uploaded successfully!</p>
          <img src={uploadedUrl} alt="Uploaded" style={{ maxWidth: '200px' }} />
        </div>
      )}
    </div>
  );
};
```

### 3. Lecture Document Upload Component

```jsx
import React, { useState } from 'react';
import { useFileUpload } from './useFileUpload';

export const LectureDocumentUpload = ({ lectureId }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('PRESENTATION');
  const { uploadFile, uploading, progress, error } = useFileUpload();

  const documentTypes = [
    'PRESENTATION',
    'ASSIGNMENT',
    'READING_MATERIAL',
    'VIDEO',
    'AUDIO',
    'OTHER'
  ];

  const allowedExtensions = {
    PRESENTATION: ['.ppt', '.pptx', '.pdf'],
    ASSIGNMENT: ['.pdf', '.doc', '.docx'],
    READING_MATERIAL: ['.pdf', '.doc', '.docx', '.txt'],
    VIDEO: ['.mp4', '.mov', '.avi', '.webm'],
    AUDIO: ['.mp3', '.wav', '.ogg'],
    OTHER: ['.pdf', '.doc', '.docx', '.zip']
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    const allowed = allowedExtensions[documentType];

    if (!allowed.includes(fileExt)) {
      alert(`Invalid file type. Allowed: ${allowed.join(', ')}`);
      return;
    }

    // 50MB limit for documents
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
      
      const result = await uploadFile(
        selectedFile,
        'http://localhost:8080/organization/api/v1/signed-urls/lecture/document',
        {
          lectureId,
          documentType,
          fileExtension,
          fileName: selectedFile.name
        }
      );

      alert('Document uploaded successfully!');
      setSelectedFile(null);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div className="lecture-upload">
      <h3>Upload Lecture Document</h3>
      
      <div>
        <label>Document Type:</label>
        <select 
          value={documentType} 
          onChange={(e) => setDocumentType(e.target.value)}
          disabled={uploading}
        >
          {documentTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div>
        <label>File:</label>
        <input
          type="file"
          accept={allowedExtensions[documentType].join(',')}
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>

      {selectedFile && (
        <div>
          <p>Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)</p>
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? `Uploading... ${progress}%` : 'Upload'}
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

---

## TypeScript Implementation

### Types

```typescript
// types/upload.ts

export interface SignedUrlRequest {
  userId?: string;
  instituteId?: string;
  organizationId?: string;
  causeId?: string;
  lectureId?: string;
  documentType?: DocumentType;
  fileExtension: string;
  fileName?: string;
}

export interface SignedUrlResponse {
  signedUrl: {
    url: string;
    fields: Record<string, string>;
  };
  uploadToken: string;
  expiresIn: number;
  maxFileSizeBytes: number;
}

export interface VerifyUploadRequest {
  uploadToken: string;
}

export interface VerifyUploadResponse {
  publicUrl: string;
  metadata: {
    fileSize: number;
    contentType: string;
    uploadedAt: string;
  };
}

export type DocumentType = 
  | 'PRESENTATION'
  | 'ASSIGNMENT'
  | 'READING_MATERIAL'
  | 'VIDEO'
  | 'AUDIO'
  | 'OTHER';
```

### Upload Service

```typescript
// services/uploadService.ts

import type { 
  SignedUrlRequest, 
  SignedUrlResponse, 
  VerifyUploadRequest,
  VerifyUploadResponse 
} from '../types/upload';

export class UploadService {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('accessToken');
  }

  async getSignedUrl(
    endpoint: string,
    data: SignedUrlRequest
  ): Promise<SignedUrlResponse> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get signed URL');
    }

    return response.json();
  }

  async uploadToS3(
    file: File,
    signedUrl: SignedUrlResponse['signedUrl']
  ): Promise<void> {
    const formData = new FormData();

    // Add all fields from signedUrl.fields in order
    Object.entries(signedUrl.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Add file LAST
    formData.append('file', file);

    const response = await fetch(signedUrl.url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`S3 upload failed: ${text}`);
    }
  }

  async verifyUpload(
    data: VerifyUploadRequest
  ): Promise<VerifyUploadResponse> {
    const response = await fetch(`${this.baseUrl}/signed-urls/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload verification failed');
    }

    return response.json();
  }

  async uploadFile(
    file: File,
    endpoint: string,
    requestData: SignedUrlRequest,
    onProgress?: (progress: number) => void
  ): Promise<VerifyUploadResponse> {
    try {
      // Step 1: Get signed URL
      onProgress?.(10);
      const signedResponse = await this.getSignedUrl(endpoint, requestData);

      // Step 2: Validate file size
      if (file.size > signedResponse.maxFileSizeBytes) {
        throw new Error(
          `File size exceeds limit of ${signedResponse.maxFileSizeBytes / (1024 * 1024)}MB`
        );
      }

      onProgress?.(30);

      // Step 3: Upload to S3
      await this.uploadToS3(file, signedResponse.signedUrl);
      onProgress?.(70);

      // Step 4: Verify upload
      const verifyResponse = await this.verifyUpload({
        uploadToken: signedResponse.uploadToken,
      });
      onProgress?.(100);

      return verifyResponse;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Upload failed');
    }
  }
}
```

---

## File Validation

### Client-Side Validation

```javascript
// utils/fileValidation.js

export const FILE_CONSTRAINTS = {
  PROFILE_IMAGE: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  },
  INSTITUTE_IMAGE: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  },
  LECTURE_DOCUMENT: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'video/mp4',
      'audio/mpeg'
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.mp4', '.mp3']
  }
};

export const validateFile = (file, constraints) => {
  const errors = [];

  // Check file size
  if (file.size > constraints.maxSize) {
    errors.push(`File size must be less than ${constraints.maxSize / (1024 * 1024)}MB`);
  }

  // Check file type
  if (!constraints.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  // Check extension
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!constraints.allowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`);
  }

  // Check for double extensions (security)
  const parts = file.name.split('.');
  if (parts.length > 2) {
    errors.push('Files with multiple extensions are not allowed');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
```

---

## Error Handling

### Error Handler

```javascript
// utils/errorHandler.js

export const handleUploadError = (error) => {
  if (error.message.includes('size exceeds')) {
    return {
      title: 'File Too Large',
      message: error.message,
      type: 'warning'
    };
  }

  if (error.message.includes('Invalid file type')) {
    return {
      title: 'Invalid File',
      message: error.message,
      type: 'warning'
    };
  }

  if (error.message.includes('S3 upload failed')) {
    return {
      title: 'Upload Failed',
      message: 'Failed to upload file to storage. Please try again.',
      type: 'error'
    };
  }

  if (error.message.includes('verification failed')) {
    return {
      title: 'Verification Failed',
      message: 'File uploaded but verification failed. Please contact support.',
      type: 'error'
    };
  }

  return {
    title: 'Upload Error',
    message: 'An unexpected error occurred. Please try again.',
    type: 'error'
  };
};
```

---

## Complete Examples

### Vue.js Example

```vue
<template>
  <div class="upload-container">
    <h3>Upload Profile Image</h3>
    
    <input
      type="file"
      ref="fileInput"
      accept="image/jpeg,image/png,image/gif,image/webp"
      @change="handleFileSelect"
      :disabled="uploading"
    />

    <div v-if="preview" class="preview">
      <img :src="preview" alt="Preview" />
    </div>

    <button 
      v-if="selectedFile" 
      @click="handleUpload"
      :disabled="uploading"
    >
      {{ uploading ? `Uploading... ${progress}%` : 'Upload' }}
    </button>

    <div v-if="error" class="error">{{ error }}</div>
    
    <div v-if="uploadedUrl" class="success">
      <p>Upload successful!</p>
      <img :src="uploadedUrl" alt="Uploaded" />
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { UploadService } from '@/services/uploadService';

export default {
  props: {
    userId: String
  },
  setup(props) {
    const uploadService = new UploadService('http://localhost:8080/organization/api/v1');
    
    const selectedFile = ref(null);
    const preview = ref(null);
    const uploading = ref(false);
    const progress = ref(0);
    const error = ref(null);
    const uploadedUrl = ref(null);

    const handleFileSelect = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Validate
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        error.value = 'Invalid file type';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        error.value = 'File too large (max 5MB)';
        return;
      }

      selectedFile.value = file;
      error.value = null;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.value = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
      if (!selectedFile.value) return;

      try {
        uploading.value = true;
        error.value = null;

        const fileExtension = '.' + selectedFile.value.name.split('.').pop();
        
        const result = await uploadService.uploadFile(
          selectedFile.value,
          '/signed-urls/profile',
          {
            userId: props.userId,
            fileExtension
          },
          (p) => { progress.value = p; }
        );

        uploadedUrl.value = result.publicUrl;
      } catch (err) {
        error.value = err.message;
      } finally {
        uploading.value = false;
      }
    };

    return {
      selectedFile,
      preview,
      uploading,
      progress,
      error,
      uploadedUrl,
      handleFileSelect,
      handleUpload
    };
  }
};
</script>

<style scoped>
.preview img {
  max-width: 200px;
  margin: 10px 0;
}
.error {
  color: red;
  margin: 10px 0;
}
.success {
  color: green;
}
</style>
```

### Angular Example

```typescript
// profile-upload.component.ts

import { Component } from '@angular/core';
import { UploadService } from './upload.service';

@Component({
  selector: 'app-profile-upload',
  template: `
    <div class="upload-container">
      <h3>Upload Profile Image</h3>
      
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        (change)="onFileSelect($event)"
        [disabled]="uploading"
      />

      <div *ngIf="preview" class="preview">
        <img [src]="preview" alt="Preview" />
      </div>

      <button 
        *ngIf="selectedFile" 
        (click)="upload()"
        [disabled]="uploading"
      >
        {{ uploading ? 'Uploading... ' + progress + '%' : 'Upload' }}
      </button>

      <div *ngIf="error" class="error">{{ error }}</div>
      
      <div *ngIf="uploadedUrl" class="success">
        <p>Upload successful!</p>
        <img [src]="uploadedUrl" alt="Uploaded" />
      </div>
    </div>
  `
})
export class ProfileUploadComponent {
  selectedFile: File | null = null;
  preview: string | null = null;
  uploading = false;
  progress = 0;
  error: string | null = null;
  uploadedUrl: string | null = null;

  constructor(
    private uploadService: UploadService,
    @Inject('userId') private userId: string
  ) {}

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.error = 'Invalid file type';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.error = 'File too large (max 5MB)';
      return;
    }

    this.selectedFile = file;
    this.error = null;

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      this.preview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async upload(): Promise<void> {
    if (!this.selectedFile) return;

    try {
      this.uploading = true;
      this.error = null;

      const fileExtension = '.' + this.selectedFile.name.split('.').pop();
      
      const result = await this.uploadService.uploadFile(
        this.selectedFile,
        '/signed-urls/profile',
        {
          userId: this.userId,
          fileExtension
        },
        (progress) => { this.progress = progress; }
      );

      this.uploadedUrl = result.publicUrl;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Upload failed';
    } finally {
      this.uploading = false;
    }
  }
}
```

---

## Security Best Practices

1. **Always validate files on the client side before uploading**
2. **Never trust client-side validation alone** - backend validates again
3. **Use the provided upload token** - it contains encryption and validation
4. **Always verify uploads** - call the verify endpoint after S3 upload
5. **Handle errors gracefully** - inform users of specific issues
6. **Implement upload progress** - improve UX with progress indicators
7. **Set appropriate CORS** - ensure your frontend domain is allowed
8. **Store tokens securely** - use httpOnly cookies or secure storage

---

## Testing

### Test with cURL

```bash
# 1. Login
curl -X POST http://localhost:8080/organization/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# 2. Get signed URL
curl -X POST http://localhost:8080/organization/api/v1/signed-urls/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"2","fileExtension":".jpg"}'

# 3. Upload to S3 (use fields from response)
curl -X POST "PRESIGNED_URL" \
  -F "key=VALUE" \
  -F "Content-Type=VALUE" \
  -F "x-amz-server-side-encryption=AES256" \
  -F "bucket=VALUE" \
  -F "X-Amz-Algorithm=VALUE" \
  -F "X-Amz-Credential=VALUE" \
  -F "X-Amz-Date=VALUE" \
  -F "Policy=VALUE" \
  -F "X-Amz-Signature=VALUE" \
  -F "file=@image.jpg"

# 4. Verify upload
curl -X POST http://localhost:8080/organization/api/v1/signed-urls/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uploadToken":"UPLOAD_TOKEN"}'
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error | Add your domain to backend CORS whitelist |
| 403 Forbidden | Check token expiration, re-login if needed |
| File too large | Check `maxFileSizeBytes` from signed URL response |
| Invalid signature | Ensure all form fields are added BEFORE the file |
| Upload succeeds but verify fails | File may be corrupted or wrong content-type |

---

## Support

For issues or questions:
- Check backend logs for detailed error messages
- Verify AWS credentials are configured correctly
- Ensure `STORAGE_PROVIDER=aws` in backend .env
- Test with Postman first to isolate frontend issues

**Backend Repository**: https://github.com/SurakshaLMS/organizations
