# Frontend File Upload Guide - S3 Signed URL Flow

## Overview
All file uploads in this system use **AWS S3 signed URLs**. Files are uploaded directly from the frontend to S3, then the returned URLs are sent to the backend API endpoints.

**❌ DO NOT** send files as `multipart/form-data` to lecture/cause endpoints  
**✅ DO** use the 3-step signed URL flow below

---

## 3-Step Upload Flow

### Step 1: Request Signed Upload URL

#### Option A: Use Specific Endpoint (Recommended)

**Endpoint:** `POST /organization/api/v1/signed-urls/lecture`  
**Auth:** Required (Bearer token)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "lectureId": "123",
  "fileExtension": ".pdf",
  "documentType": "document"
}
```

**Other Specific Endpoints:**
- `POST /organization/api/v1/signed-urls/lecture` - For lecture documents (documentType: "document" or "cover")
- `POST /organization/api/v1/signed-urls/cause` - For cause images (causeId, fileExtension)
- `POST /organization/api/v1/signed-urls/profile` - For profile images (userId, fileExtension)
- `POST /organization/api/v1/signed-urls/organization` - For organization images
- `POST /organization/api/v1/signed-urls/institute` - For institute images

#### Option B: Generic Endpoint (Advanced)

**Endpoint:** `POST /organization/api/v1/signed-urls/generate`  
**Auth:** Required (Bearer token)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "folder": "lecture-documents",
  "fileName": "my-lecture-doc.pdf",
  "contentType": "application/pdf",
  "maxSizeBytes": 10485760
}
```

**Available Folders:**
- `"cause-images"` - For cause/organization images
- `"lecture-documents"` - For lecture PDFs and documents
- `"lecture-covers"` - For lecture cover images
- `"profile-images"` - For user profile pictures
- `"organization-images"` - For organization images
- `"institute-images"` - For institute images
- `"id-documents"` - For ID verification documents

**Response (Both Options):**
```json
{
  "uploadToken": "encrypted_token_abc123",
  "signedUrl": "https://storage.suraksha.lk/lecture-documents/doc-abc123.pdf?X-Amz-Algorithm=...",
  "expiresAt": "2025-12-03T12:00:00.000Z",
  "expiresIn": 600,
  "expectedFilename": "doc-abc123.pdf",
  "relativePath": "lecture-documents/doc-abc123.pdf",
  "publicUrl": "https://storage.suraksha.lk/lecture-documents/doc-abc123.pdf",
  "maxFileSizeBytes": 10485760,
  "allowedExtensions": [".pdf", ".doc", ".docx"],
  "uploadInstructions": {
    "method": "PUT",
    "headers": {
      "Content-Type": "application/pdf"
    },
    "note": "Upload expires in 10 minutes"
  }
}
```

**Important:** 
- Use `signedUrl` to upload the file (Step 2)
- Use `publicUrl` in your API requests (Step 3)

---

### Step 2: Upload File to S3

**Endpoint:** Use `signedUrl` from Step 1  
**Method:** `PUT`  
**Content-Type:** Match the `contentType` from Step 1 (e.g., `application/pdf`, `image/jpeg`)  
**Body:** Raw file binary data

**Example (JavaScript):**
```javascript
const { signedUrl, publicUrl } = responseFromStep1;

const response = await fetch(signedUrl, {
  method: 'PUT',
  body: fileBlob,
  headers: {
    'Content-Type': 'application/pdf', // Must match contentType from step 1
  },
});

if (response.ok) {
  console.log('File uploaded successfully');
  // Now use publicUrl in step 3
}
```

**Example (Axios):**
```javascript
const { signedUrl, publicUrl } = responseFromStep1;

await axios.put(signedUrl, fileBlob, {
  headers: {
    'Content-Type': 'application/pdf',
  },
### Step 3: Send File URL to Backend

Now use the `publicUrl` from Step 1 in your API requests.

---

### Step 3: Send File URL to Backend

Now use the `fileUrl` from Step 1 in your API requests.

#### **Example: Create Lecture with Documents**

**Endpoint:** `POST /organization/api/v1/lectures/with-documents/:causeId`  
**Auth:** Required (Bearer token)  
**Content-Type:** `application/json` ← **Important: JSON, not multipart!**

**Request Body:**
```json
{
  "title": "Introduction to Programming",
  "description": "Learn the basics of programming",
  "content": "Full lecture content here...",
  "venue": "Online",
  "mode": "virtual",
  "timeStart": "2025-12-10T10:00:00Z",
  "timeEnd": "2025-12-10T12:00:00Z",
  "isPublic": true,
  "documents": [
    {
      "title": "Lecture Slides",
      "description": "Introduction slides",
      "docUrl": "https://storage.suraksha.lk/lecture-documents/doc-abc123.pdf"
    },
    {
      "title": "Exercise Sheet",
      "description": "Practice problems",
      "docUrl": "https://storage.suraksha.lk/lecture-documents/doc-xyz789.pdf"
    }
  ]
}
```

**Response:**
```json
{
  "lectureId": "123",
  "title": "Introduction to Programming",
  "documents": [
    {
      "documentationId": "456",
      "title": "Lecture Slides",
      "docUrl": "https://storage.suraksha.lk/lecture-documents/doc-abc123.pdf"
    }
  ],
  "message": "Lecture created successfully with 2 documents"
}
```

---

## Complete Frontend Example

### React/TypeScript Example

```typescript
// 2. Upload file to S3
const uploadToS3 = async (file: File, signedUrl: string) => {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload file to S3');
  }
};

// 1. Request signed URL (using specific endpoint)
const requestSignedUrl = async (file: File, lectureId: string) => {
  const fileExtension = '.' + file.name.split('.').pop();
  
  const response = await fetch('/organization/api/v1/signed-urls/lecture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      lectureId: lectureId,
      fileExtension: fileExtension,
      documentType: 'document',
    }),
  });
  
  return await response.json();
};

// Alternative: Generic endpoint
const requestSignedUrlGeneric = async (file: File, folder: string) => {
  const response = await fetch('/organization/api/v1/signed-urls/generate', {
// 3. Create lecture with document URLs
const createLectureWithDocuments = async (
  causeId: string,
  lectureData: any, 
  documents: Array<{file: File, title: string, description?: string}>
) => {
  // Upload all documents first
  const uploadedDocs = [];
  
  for (const doc of documents) {
    // Step 1: Get signed URL
    const { signedUrl, publicUrl } = await requestSignedUrl(doc.file, lectureData.lectureId || 'temp');
    
    // Step 2: Upload to S3
    await uploadToS3(doc.file, signedUrl);
    
    // Store the publicUrl for step 3
    uploadedDocs.push({
      title: doc.title,
      description: doc.description || '',
      docUrl: publicUrl, // Use publicUrl, NOT signedUrl
    });
  }onst uploadedDocs = [];
  
  for (const doc of documents) {
    // Step 1: Get signed URL
    const { uploadUrl, fileUrl } = await requestSignedUrl(doc.file, 'lecture-documents');
    
    // Step 2: Upload to S3
    await uploadToS3(doc.file, uploadUrl);
    
    // Store the fileUrl for step 3
    uploadedDocs.push({
      title: doc.title,
      description: doc.description || '',
      docUrl: fileUrl, // Use fileUrl from step 1, NOT uploadUrl
    });
  }
  
  // Step 3: Create lecture with document URLs
  const response = await fetch(`/organization/api/v1/lectures/with-documents/${causeId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // ← MUST be application/json
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      ...lectureData,
      documents: uploadedDocs,
    }),
  });
  
  return await response.json();
};
```

---

## Common Mistakes to Avoid

### ❌ Wrong: Sending multipart/form-data
```javascript
// DON'T DO THIS
const formData = new FormData();
formData.append('title', 'My Lecture');
formData.append('file', fileBlob);

await fetch('/lectures/with-documents/10', {
  method: 'POST',
  body: formData, // ← WRONG! Backend will receive empty body {}
});
```

### ✅ Correct: Use signed URL flow with JSON
```javascript
// Step 1 & 2: Upload to S3 first
const { publicUrl } = await uploadFileToS3(file);

// Step 3: Send JSON with URL
await fetch('/organization/api/v1/lectures/with-documents/10', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json', // ← CORRECT
  },
  body: JSON.stringify({
    title: 'My Lecture',
    documents: [{ title: 'Doc', docUrl: publicUrl }],
  }),
});
```

---

## Other Endpoints Using This Flow

### Create Cause with Image
**Endpoint:** `POST /organization/api/v1/causes/with-image`

```json
{
  "title": "Climate Action",
  "description": "Fight climate change",
  "organizationId": "123",
  "imageUrl": "https://storage.suraksha.lk/cause-images/img-abc123.jpg"
}
```

### Update Lecture with New Documents
**Endpoint:** `PUT /organization/api/v1/lectures/:id/with-documents`

```json
{
  "title": "Updated Lecture Title",
  "documents": [
    {
      "title": "New Document",
      "docUrl": "https://storage.suraksha.lk/lecture-documents/doc-new.pdf"
    }
  ]
}
```

---

## URL Format After Upload

After successful upload, URLs will have this format:

- **Relative path in database:** `lecture-documents/doc-abc123.pdf`
- **Full URL in API responses:** `https://storage.suraksha.lk/lecture-documents/doc-abc123.pdf`

The backend automatically:
- ✅ Extracts relative paths before storing in database
- ✅ Transforms to full URLs when sending API responses
- ✅ Keeps external URLs (YouTube, Zoom) unchanged

---

## Supported File Types

### Documents (lecture-documents folder)
- PDF: `application/pdf`
- Word: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Text: `text/plain`

### Images (cause-images, user-profiles folders)
- JPEG: `image/jpeg`
- PNG: `image/png`
- WebP: `image/webp`
- GIF: `image/gif`

---

## Error Handling

### Common Errors and Solutions

**Error:** `title is required and cannot be empty`
- **Cause:** Frontend sending `multipart/form-data` instead of JSON
- **Solution:** Use `Content-Type: application/json` and send data as JSON

**Error:** `Invalid PDF URL format`
- **Cause:** Sending signedUrl instead of publicUrl, or missing docUrl
- **Solution:** Use `publicUrl` from Step 1 response, not `signedUrl`within 15 minutes

**Error:** `Invalid PDF URL format`
- **Cause:** Sending uploadUrl instead of publicUrl, or missing docUrl
- **Solution:** Use `publicUrl` from Step 1 response, not `uploadUrl`

**Error:** `Cannot POST /signed-urls/generate` or `404 Not Found`
- **Cause:** Missing global prefix `/organization/api/v1`
- **Solution:** Use full path: `/organization/api/v1/signed-urls/lecture` or `/organization/api/v1/signed-urls/generate`

**Error:** `Cannot POST /organization/api/v1/signed-url/generate-upload-url`
- **Cause:** Wrong endpoint path (singular "url" instead of plural "urls")
- **Solution:** Use `/organization/api/v1/signed-urls/lecture` (note: plural "urls")

---

## Testing with Postman/curl

### Step 1: Get Signed URL
```bash
# Option A: Specific endpoint (recommended)
curl -X POST http://localhost:8080/organization/api/v1/signed-urls/lecture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "lectureId": "123",
    "fileExtension": ".pdf",
    "documentType": "document"
  }'

# Option B: Generic endpoint
curl -X POST http://localhost:8080/organization/api/v1/signed-urls/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "folder": "lecture-documents",
    "fileName": "test.pdf",
    "contentType": "application/pdf"
  }'
```

### Step 2: Upload to S3
```bash
curl -X PUT "SIGNED_URL_FROM_STEP_1" \
  -H "Content-Type: application/pdf" \
  --data-binary @test.pdf
```

### Step 3: Create Lecture
```bash
curl -X POST http://localhost:8080/organization/api/v1/lectures/with-documents/10 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Lecture",
    "description": "Test",
    "documents": [{
      "title": "Test Doc",
      "docUrl": "https://storage.suraksha.lk/lecture-documents/test.pdf"
    }]
  }'
## Summary Checklist

- [ ] Use full API path: `/organization/api/v1/signed-urls/...`
- [ ] Request signed URL from `/organization/api/v1/signed-urls/lecture` (note: plural "urls"!)
- [ ] Upload file to S3 using `signedUrl` with correct Content-Type (PUT method)
- [ ] Use `publicUrl` (NOT signedUrl) in subsequent API calls
- [ ] Send lecture/cause data as `application/json`, not multipart/form-data
- [ ] Include documents array with `docUrl` fields pointing to uploaded files
- [ ] Verify full URLs are returned in API responsesct Content-Type
- [ ] Use `publicUrl` (not uploadUrl) in subsequent API calls
- [ ] Send lecture/cause data as `application/json`, not multipart/form-data
- [ ] Include documents array with `docUrl` fields pointing to uploaded files
- [ ] Verify full URLs are returned in API responses

## Quick Reference - Correct Endpoints

| Purpose | Endpoint | Body Fields |
|---------|----------|-------------|
| Lecture Documents | `POST /organization/api/v1/signed-urls/lecture` | `lectureId`, `fileExtension`, `documentType` |
| Cause Images | `POST /organization/api/v1/signed-urls/cause` | `causeId`, `fileExtension` |
| Profile Images | `POST /organization/api/v1/signed-urls/profile` | `userId`, `fileExtension` |
| Generic Upload | `POST /organization/api/v1/signed-urls/generate` | `folder`, `fileName`, `contentType` |
| Create Lecture | `POST /organization/api/v1/lectures/with-documents/:causeId` | `title`, `documents[]` with `docUrl` |

**Remember:** Files go to S3, URLs go to backend! 🚀

---

## Complete API Reference

### Create Lecture with Documents DTO

**Full Request Body Schema:**

```typescript
interface CreateLectureWithDocumentsDto {
  // Required fields
  title: string;                    // Min 3, Max 200 characters
  
  // Optional lecture details
  description?: string;             // Lecture description
  content?: string;                 // Full lecture content/notes
  venue?: string;                   // Physical location or "Online"
  mode?: 'online' | 'physical';    // Delivery mode
  
  // Scheduling
  timeStart?: string;               // ISO 8601 date string (e.g., "2025-12-10T10:00:00Z")
  timeEnd?: string;                 // ISO 8601 date string
  
  // Live session links
  liveLink?: string;                // YouTube, Zoom, Meet, Teams link
  liveMode?: 'youtube' | 'meet' | 'zoom' | 'teams';
  
  // Recordings
  recordingUrl?: string;            // Link to recorded session
  
  // Access control
  isPublic?: boolean;               // Default: false (private)
  
  // Cover images (optional)
  coverImage?: string;              // Cover image URL (use signed URL flow)
  coverImageUrl?: string;           // Alternative cover image URL
  imageUrl?: string;                // Legacy image URL field
  
  // Documents array (uploaded via signed URL flow)
  documents?: Array<{
    title: string;                  // Required: Document title
    description?: string;           // Optional: Document description
    content?: string;               // Optional: Document text content
    docUrl?: string;                // Required: Document URL from signed upload
  }>;
}
```

**Complete Example Request:**

```json
{
  "title": "Introduction to TypeScript",
  "description": "Learn the fundamentals of TypeScript programming",
  "content": "## Topics Covered\n1. Types\n2. Interfaces\n3. Generics",
  "venue": "Online",
  "mode": "online",
  "timeStart": "2025-12-15T14:00:00Z",
  "timeEnd": "2025-12-15T16:00:00Z",
  "liveLink": "https://meet.google.com/abc-defg-hij",
  "liveMode": "meet",
  "recordingUrl": "",
  "isPublic": true,
  "coverImageUrl": "https://storage.suraksha.lk/lecture-covers/cover-123.jpg",
  "documents": [
    {
      "title": "Lecture Slides",
      "description": "Main presentation slides",
      "docUrl": "https://storage.suraksha.lk/lecture-documents/slides-123.pdf"
    },
    {
      "title": "Exercise Sheet",
      "description": "Practice problems",
      "docUrl": "https://storage.suraksha.lk/lecture-documents/exercises-456.pdf"
    },
    {
      "title": "Additional Reading",
      "description": "Supplementary materials",
      "content": "Additional text content here...",
      "docUrl": "https://storage.suraksha.lk/lecture-documents/reading-789.pdf"
    }
  ]
}
```

---

### Update Lecture with Documents DTO

**Full Request Body Schema:**

```typescript
interface UpdateLectureDto {
  // All fields are optional for partial updates
  title?: string;
  description?: string;
  content?: string;
  venue?: string;
  mode?: 'online' | 'physical';
  timeStart?: string;               // ISO 8601 date string
  timeEnd?: string;                 // ISO 8601 date string
  liveLink?: string;
  liveMode?: 'youtube' | 'meet' | 'zoom' | 'teams';
  recordingUrl?: string;
  isPublic?: boolean;
  
  // Add new documents (keeps existing ones)
  documents?: Array<{
    title: string;
    description?: string;
    content?: string;
    docUrl?: string;
  }>;
}
```

**Update Example - Add New Documents:**

```bash
curl -X PUT http://localhost:8080/organization/api/v1/lectures/123/with-documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Updated Lecture Title",
    "description": "Updated description",
    "documents": [
      {
        "title": "New Supplementary Material",
        "description": "Additional resources",
        "docUrl": "https://storage.suraksha.lk/lecture-documents/new-doc-999.pdf"
      }
    ]
  }'
```

**Update Example - Change Schedule Only:**

```bash
curl -X PUT http://localhost:8080/organization/api/v1/lectures/123/with-documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "timeStart": "2025-12-20T10:00:00Z",
    "timeEnd": "2025-12-20T12:00:00Z",
    "venue": "Room 405"
  }'
```

**Update Example - Add Recording After Session:**

```bash
curl -X PUT http://localhost:8080/organization/api/v1/lectures/123/with-documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recordingUrl": "https://youtube.com/watch?v=abc123",
    "liveMode": "youtube"
  }'
```

---

### Response Format

**Successful Lecture Creation Response:**

```json
{
  "lectureId": "123",
  "title": "Introduction to TypeScript",
  "description": "Learn the fundamentals of TypeScript programming",
  "venue": "Online",
  "mode": "online",
  "timeStart": "2025-12-15T14:00:00.000Z",
  "timeEnd": "2025-12-15T16:00:00.000Z",
  "liveLink": "https://meet.google.com/abc-defg-hij",
  "liveMode": "meet",
  "recordingUrl": null,
  "isPublic": true,
  "createdAt": "2025-12-03T10:00:00.000Z",
  "updatedAt": "2025-12-03T10:00:00.000Z",
  "causeId": "10",
  "documents": [
    {
      "documentationId": "456",
      "title": "Lecture Slides",
      "description": "Main presentation slides",
      "docUrl": "https://storage.suraksha.lk/lecture-documents/slides-123.pdf",
      "createdAt": "2025-12-03T10:00:00.000Z",
      "updatedAt": "2025-12-03T10:00:00.000Z"
    },
    {
      "documentationId": "457",
      "title": "Exercise Sheet",
      "description": "Practice problems",
      "docUrl": "https://storage.suraksha.lk/lecture-documents/exercises-456.pdf",
      "createdAt": "2025-12-03T10:00:00.000Z",
      "updatedAt": "2025-12-03T10:00:00.000Z"
    }
  ],
  "documentCount": 2,
  "message": "Lecture created successfully with 2 documents"
}
```

---

### Field Validation Rules

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `title` | string | ✅ Yes | Min 3, Max 200 chars | Trimmed automatically |
| `description` | string | ❌ No | Any length | Lecture summary |
| `content` | string | ❌ No | Any length | Full lecture notes (Markdown supported) |
| `venue` | string | ❌ No | Any text | Physical location or "Online" |
| `mode` | string | ❌ No | `'online'` or `'physical'` | Delivery method |
| `timeStart` | string | ❌ No | ISO 8601 date | Start time in UTC |
| `timeEnd` | string | ❌ No | ISO 8601 date | End time in UTC |
| `liveLink` | string | ❌ No | Valid URL | YouTube/Zoom/Meet/Teams link |
| `liveMode` | string | ❌ No | `'youtube'`, `'meet'`, `'zoom'`, `'teams'` | Platform identifier |
| `recordingUrl` | string | ❌ No | Valid URL | Link to recorded session |
| `isPublic` | boolean | ❌ No | `true` or `false` | Default: `false` |
| `documents` | array | ❌ No | Array of document objects | Pre-uploaded via signed URL |
| `documents[].title` | string | ✅ Yes | Required if documents array present | Document name |
| `documents[].description` | string | ❌ No | Any text | Document description |
| `documents[].docUrl` | string | ❌ No | Valid URL from signed upload | S3 storage URL |

---

### Complete Working Example - Frontend

```typescript
import { useState } from 'react';

interface LectureFormData {
  title: string;
  description: string;
  content: string;
  venue: string;
  mode: 'online' | 'physical';
  timeStart: string;
  timeEnd: string;
  liveLink: string;
  liveMode: 'youtube' | 'meet' | 'zoom' | 'teams';
  isPublic: boolean;
}

interface DocumentFile {
  file: File;
  title: string;
  description: string;
}

const CreateLectureForm = () => {
  const [lectureData, setLectureData] = useState<LectureFormData>({
    title: '',
    description: '',
    content: '',
    venue: 'Online',
    mode: 'online',
    timeStart: '',
    timeEnd: '',
    liveLink: '',
    liveMode: 'meet',
    isPublic: false,
  });
  
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const authToken = 'YOUR_AUTH_TOKEN'; // From your auth system
  const causeId = '10'; // From route params or props

  // Step 1: Get signed URL
  const getSignedUrl = async (file: File) => {
    const fileExtension = '.' + file.name.split('.').pop();
    
    const response = await fetch('/organization/api/v1/signed-urls/lecture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        lectureId: 'temp', // Or actual lectureId if updating
        fileExtension: fileExtension,
        documentType: 'document',
      }),
    });
    
    return await response.json();
  };

  // Step 2: Upload to S3
  const uploadToS3 = async (file: File, signedUrl: string) => {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
  };

  // Step 3: Create lecture with all data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Upload all documents first
      const uploadedDocs = [];
      
      for (const doc of documents) {
        console.log(`Uploading ${doc.file.name}...`);
        
        // Get signed URL
        const { signedUrl, publicUrl } = await getSignedUrl(doc.file);
        
        // Upload to S3
        await uploadToS3(doc.file, signedUrl);
        
        // Store document metadata
        uploadedDocs.push({
          title: doc.title,
          description: doc.description,
          docUrl: publicUrl, // Use publicUrl, NOT signedUrl
        });
        
        console.log(`✅ Uploaded ${doc.file.name}`);
      }
      
      // Create lecture with all data
      const response = await fetch(`/organization/api/v1/lectures/with-documents/${causeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...lectureData,
          documents: uploadedDocs,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create lecture');
      }
      
      const result = await response.json();
      console.log('✅ Lecture created:', result);
      alert(`Lecture created successfully with ${result.documentCount} documents!`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields here */}
      <button type="submit">Create Lecture</button>
    </form>
  );
};
```

---

**Remember:** Files go to S3, URLs go to backend! 🚀
