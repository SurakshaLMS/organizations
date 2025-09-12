# 📚 Lecture Document Upload Fix & Testing Guide

## Issue Identified
The lecture document upload was returning null/empty results due to several issues:

1. **GCS Configuration**: Missing proper error handling and logging
2. **File Validation**: No validation for empty files or missing buffers
3. **Error Handling**: Silent failures that weren't being properly logged
4. **Response Format**: Documents might not be properly included in the response

## ✅ Fixed Issues

### 1. Enhanced GCS Service
- Added comprehensive error logging
- Better file validation
- Detailed upload process logging
- Improved error messages

### 2. Enhanced Lecture Service
- Added file buffer validation
- Better error handling for individual file uploads
- More detailed logging throughout the process
- Continues processing other files even if one fails

## 🧪 Testing the Fix

### Endpoint Information
- **URL**: `POST /organization/api/v1/lectures/with-files`
- **Content-Type**: `multipart/form-data`
- **File Field**: `documents` (can upload multiple files)

### Test Request Format

#### Using cURL:
```bash
curl -X POST http://localhost:3000/organization/api/v1/lectures/with-files \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "causeId=1" \
  -F "title=Test Lecture with Documents" \
  -F "description=Testing document upload functionality" \
  -F "isPublic=false" \
  -F "documents=@/path/to/your/document1.pdf" \
  -F "documents=@/path/to/your/document2.docx"
```

#### Using JavaScript/Fetch:
```javascript
const formData = new FormData();
formData.append('causeId', '1');
formData.append('title', 'Test Lecture with Documents');
formData.append('description', 'Testing document upload functionality');
formData.append('isPublic', 'false');

// Add multiple files
const fileInput = document.getElementById('fileInput'); // Your file input element
for (let i = 0; i < fileInput.files.length; i++) {
  formData.append('documents', fileInput.files[i]);
}

fetch('http://localhost:3000/organization/api/v1/lectures/with-files', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Success:', data);
  console.log('Documents uploaded:', data.documents);
})
.catch(error => console.error('Error:', error));
```

### Expected Successful Response:
```json
{
  "lectureId": "123",
  "causeId": "1",
  "title": "Test Lecture with Documents",
  "description": "Testing document upload functionality",
  "content": null,
  "venue": null,
  "mode": null,
  "timeStart": null,
  "timeEnd": null,
  "liveLink": null,
  "liveMode": null,
  "recordingUrl": null,
  "isPublic": false,
  "createdAt": "2025-09-12T16:00:00.000Z",
  "updatedAt": "2025-09-12T16:00:00.000Z",
  "documents": [
    {
      "documentationId": "456",
      "lectureId": "123",
      "title": "document1.pdf",
      "description": null,
      "content": null,
      "docUrl": "https://storage.googleapis.com/laas-file-storage/lectures/123/documents/uuid-generated-name.pdf",
      "originalFileName": "document1.pdf",
      "fileSize": 1024000,
      "mimeType": "application/octet-stream",
      "createdAt": "2025-09-12T16:00:00.000Z",
      "updatedAt": "2025-09-12T16:00:00.000Z"
    },
    {
      "documentationId": "457",
      "lectureId": "123",
      "title": "document2.docx",
      "description": null,
      "content": null,
      "docUrl": "https://storage.googleapis.com/laas-file-storage/lectures/123/documents/uuid-generated-name.docx",
      "originalFileName": "document2.docx",
      "fileSize": 2048000,
      "mimeType": "application/octet-stream",
      "createdAt": "2025-09-12T16:00:00.000Z",
      "updatedAt": "2025-09-12T16:00:00.000Z"
    }
  ]
}
```

## 🔧 Alternative Endpoints

### 1. Legacy Endpoint (Still Available):
```
POST /organization/api/v1/lectures/with-documents/{causeId}
```

### 2. Basic Lecture Creation (No Files):
```
POST /organization/api/v1/lectures
```

### 3. Update Lecture with Documents:
```
PUT /organization/api/v1/lectures/{id}/with-files
```

## 🚨 Troubleshooting

### If documents still show as null:

1. **Check GCS Configuration**:
   ```bash
   # Verify environment variables are set
   echo $GCS_PROJECT_ID
   echo $GCS_BUCKET_NAME
   echo $GCS_CLIENT_EMAIL
   ```

2. **Check Server Logs**:
   Look for these log messages:
   ```
   📁 Uploading X documents for lecture Y
   📄 Processing file: filename.pdf (size bytes)
   ✅ GCS upload successful: https://storage.googleapis.com/...
   📋 Documentation record created: documentationId
   ```

3. **Verify File Upload**:
   - Ensure files are being sent with field name `documents`
   - Check file sizes aren't too large
   - Verify Content-Type is `multipart/form-data`

4. **Check Database**:
   ```sql
   SELECT * FROM Documentation WHERE lectureId = 'your-lecture-id';
   ```

### Common Issues:

1. **Empty files**: Files with no content will be skipped
2. **GCS permissions**: Ensure service account has proper bucket permissions
3. **File field name**: Must use `documents` as the field name
4. **JWT token**: Must include valid JWT token in Authorization header

## 📝 File Upload Limits

- **Maximum files per upload**: 10 files
- **Supported file types**: All types (PDF, DOCX, PPTX, TXT, etc.)
- **File size limit**: Depends on your server configuration (typically 50MB)

## 🔍 Debug Mode

To enable detailed logging, check the server console for:
- GCS initialization messages
- File processing logs
- Upload success/failure messages
- Database record creation logs

The enhanced logging will help identify exactly where the upload process might be failing.

## ✅ Success Criteria

After applying the fix, you should see:
1. Non-null `documents` array in the response
2. Each document with a valid `docUrl` pointing to GCS
3. Successful log messages in the server console
4. Files accessible via the returned URLs

If you're still experiencing issues after these fixes, please check the server logs for specific error messages.