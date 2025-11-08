# 🚀 Signed URL Upload System - Quick Start

## ✅ System Status: READY

The signed URL upload system is fully configured and ready to use!

---

## 📋 How It Works

```
1. Client                     2. Upload         3. Verify           4. Create/Update
   │                             │                │                   │
   ├─ POST /signed-urls/org ─►  │                │                   │
   │                             │                │                   │
   │◄─ {uploadToken, url} ──────┤                │                   │
   │                             │                │                   │
   │─ PUT {url} + file ─────────►│                │                   │
   │                             │                │                   │
   │◄─ 200 OK ──────────────────┘                │                   │
   │                                              │                   │
   │─ POST /signed-urls/verify/{token} ─────────►│                   │
   │                                              │                   │
   │◄─ {publicUrl} ─────────────────────────────┘                   │
   │                                                                  │
   │─ POST /organizations {imageUrl: publicUrl} ─────────────────────►│
   │                                                                  │
   │◄─ {organization created} ───────────────────────────────────────┘
```

---

## 🎯 Available Endpoints

| Endpoint | Purpose | Body Example |
|----------|---------|--------------|
| `POST /signed-urls/organization` | Organization images | `{ "instituteId": "123", "fileExtension": ".jpg" }` |
| `POST /signed-urls/institute` | Institute images | `{ "instituteId": "456", "fileExtension": ".png" }` |
| `POST /signed-urls/profile` | Profile images | `{ "userId": "789", "fileExtension": ".jpg" }` |
| `POST /signed-urls/cause` | Cause images | `{ "causeId": "999", "fileExtension": ".webp" }` |
| `POST /signed-urls/lecture-document` | Lecture PDFs/docs | `{ "lectureId": "111", "documentType": "document", "fileExtension": ".pdf" }` |
| `POST /signed-urls/lecture-cover` | Lecture covers | `{ "lectureId": "111", "documentType": "cover", "fileExtension": ".jpg" }` |
| `POST /signed-urls/verify/:token` | Verify & make public | No body (token in URL) |

---

## 💻 Frontend Implementation

### React/TypeScript Example

```typescript
async function uploadOrganizationImage(file: File, instituteId: string, token: string) {
  // Step 1: Get signed URL
  const signedUrlRes = await fetch('http://localhost:8080/signed-urls/organization', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      instituteId,
      fileExtension: '.' + file.name.split('.').pop(),
    }),
  });

  const { uploadToken, signedUrl, maxFileSizeBytes } = await signedUrlRes.json();

  // Validate size
  if (file.size > maxFileSizeBytes) {
    throw new Error(`File too large. Max: ${maxFileSizeBytes / 1024 / 1024}MB`);
  }

  // Step 2: Upload to GCS
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error('Upload failed');
  }

  // Step 3: Verify upload
  const verifyRes = await fetch(
    `http://localhost:8080/signed-urls/verify/${uploadToken}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const { success, publicUrl, message } = await verifyRes.json();

  if (!success) {
    throw new Error(message);
  }

  // Step 4: Create organization with image
  const orgRes = await fetch('http://localhost:8080/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'My Organization',
      type: 'INSTITUTE',
      isPublic: true,
      imageUrl: publicUrl, // Use the verified URL
      instituteId,
    }),
  });

  return await orgRes.json();
}
```

### Vue.js Example

```javascript
async function uploadWithSignedUrl(file, endpoint, bodyData, jwtToken) {
  try {
    // Step 1: Request signed URL
    const { data: signedData } = await axios.post(
      `http://localhost:8080/signed-urls/${endpoint}`,
      bodyData,
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
      }
    );

    // Step 2: Upload file
    await axios.put(signedData.signedUrl, file, {
      headers: { 'Content-Type': file.type },
    });

    // Step 3: Verify
    const { data: verifyData } = await axios.post(
      `http://localhost:8080/signed-urls/verify/${signedData.uploadToken}`,
      {},
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
      }
    );

    return verifyData.publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Usage
const imageUrl = await uploadWithSignedUrl(
  file,
  'organization',
  { instituteId: '123', fileExtension: '.jpg' },
  jwtToken
);
```

---

## 🧪 Testing

### Using cURL

```bash
# 1. Get JWT token
TOKEN=$(curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.access_token')

# 2. Get signed URL
RESPONSE=$(curl -X POST http://localhost:8080/signed-urls/organization \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"instituteId":"123","fileExtension":".jpg"}')

UPLOAD_TOKEN=$(echo $RESPONSE | jq -r '.uploadToken')
SIGNED_URL=$(echo $RESPONSE | jq -r '.signedUrl')

# 3. Upload file
curl -X PUT "$SIGNED_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@test-image.jpg"

# 4. Verify upload
curl -X POST "http://localhost:8080/signed-urls/verify/$UPLOAD_TOKEN" \
  -H "Authorization: Bearer $TOKEN"
```

### Using test-upload-flow.js

```bash
# 1. Get JWT token from login
# 2. Edit test-upload-flow.js and set JWT_TOKEN
# 3. Run test
node test-upload-flow.js
```

### Using test-signed-url.http

Open `test-signed-url.http` in VS Code with REST Client extension.

---

## 📊 File Size Limits

| File Type | Max Size | Environment Variable |
|-----------|----------|---------------------|
| Profile Images | 5MB | MAX_PROFILE_IMAGE_SIZE |
| Student Images | 5MB | MAX_STUDENT_IMAGE_SIZE |
| Institute Images | 5MB | MAX_INSTITUTE_IMAGE_SIZE |
| Lecture Documents | 5MB | MAX_LECTURE_DOCUMENT_SIZE |
| Lecture Covers | 5MB | MAX_LECTURE_COVER_SIZE |
| Homework | 5MB | MAX_HOMEWORK_SIZE |
| Corrections | 5MB | MAX_CORRECTION_SIZE |
| Advertisements | 10MB | MAX_ADVERTISEMENT_SIZE |

---

## 🔐 Security Features

✅ **10-minute TTL** - Signed URLs expire after 10 minutes  
✅ **Private upload** - Files are private until verified  
✅ **Double extension check** - Blocks `.php.jpg`, `.mysql.png`  
✅ **Size validation** - Enforced before making public  
✅ **Extension whitelist** - Only allowed file types  
✅ **Encrypted tokens** - Metadata encrypted with AES-256  
✅ **No database** - Stateless, zero DB overhead  

---

## 🚨 Common Errors

### "Upload token expired"
- Signed URL valid for 10 minutes only
- Upload file within 10 minutes of getting URL

### "File not found"
- Upload to GCS failed
- Check network, signed URL validity

### "Double extensions not allowed"
- File named like `image.php.jpg`
- Rename to single extension

### "File too large"
- Exceeds max size for type
- Compress file or use different endpoint

---

## ✅ Checklist

- [x] CommonModule imported in app.module.ts
- [x] SignedUrlService implemented
- [x] SignedUrlController registered
- [x] Environment variables configured
- [x] GCS credentials set
- [x] File size limits defined
- [x] Build successful

**Status: FULLY OPERATIONAL** ✅

---

## 📞 Support

Questions? Check:
- `docs/SIGNED_URL_UPLOAD_SYSTEM.md` - Full documentation
- `docs/MULTER_REMOVAL_COMPLETE.md` - Migration guide
- `test-signed-url.http` - Example requests
- `test-upload-flow.js` - JavaScript test
