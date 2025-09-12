# 🖼️ CAUSE WITH IMAGE UPLOAD - EXACT FIX

## 🎯 THE PROBLEM
You're trying to upload a cause with an image, but you're using the wrong endpoint and wrong format!

**Wrong:** `POST /organization/api/v1/causes` with JSON
**Correct:** `POST /organization/api/v1/causes/with-image` with multipart/form-data

---

## ✅ EXACT WORKING SOLUTION

### 🔗 Correct Endpoint:
```
POST http://localhost:3000/organization/api/v1/causes/with-image
```

### 📋 Headers:
```
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN
```

### 📤 Form Data Fields:
```
organizationId: "1"
title: "Your Cause Title"
description: "Optional description"
introVideoUrl: "https://youtube.com/watch?v=example" (optional)
isPublic: "false" (optional)
image: [YOUR_IMAGE_FILE] (optional but this is why you use this endpoint)
```

---

## 🚀 COPY-PASTE SOLUTIONS

### 1. cURL Command:
```bash
curl -X POST http://localhost:3000/organization/api/v1/causes/with-image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "organizationId=1" \
  -F "title=Environmental Conservation Initiative" \
  -F "description=A comprehensive environmental initiative" \
  -F "isPublic=false" \
  -F "image=@/path/to/your/image.jpg"
```

### 2. JavaScript FormData:
```javascript
const formData = new FormData();
formData.append('organizationId', '1');
formData.append('title', 'Environmental Conservation Initiative');
formData.append('description', 'A comprehensive environmental initiative');
formData.append('isPublic', 'false');

// Add image file
const fileInput = document.getElementById('imageInput');
if (fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
}

fetch('http://localhost:3000/organization/api/v1/causes/with-image', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN'
        // Don't set Content-Type for FormData - browser sets it automatically
    },
    body: formData
})
.then(response => response.json())
.then(data => {
    if (data.causeId) {
        console.log('✅ SUCCESS! Cause created:', data);
        console.log('🖼️ Image URL:', data.imageUrl);
    } else {
        console.log('❌ ERROR:', data);
    }
})
.catch(error => console.error('Error:', error));
```

### 3. Node.js with form-data:
```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('organizationId', '1');
form.append('title', 'Environmental Conservation Initiative');
form.append('description', 'A comprehensive environmental initiative');
form.append('isPublic', 'false');
form.append('image', fs.createReadStream('./image.jpg'));

fetch('http://localhost:3000/organization/api/v1/causes/with-image', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN',
        ...form.getHeaders()
    },
    body: form
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

---

## 📱 POSTMAN SETUP

### 1. Method: POST
### 2. URL: `http://localhost:3000/organization/api/v1/causes/with-image`

### 3. Headers:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### 4. Body Tab → form-data:
| Key | Type | Value |
|-----|------|-------|
| organizationId | Text | 1 |
| title | Text | Environmental Conservation Initiative |
| description | Text | A comprehensive environmental initiative |
| isPublic | Text | false |
| image | File | [Select your image file] |

---

## 🧪 QUICK TEST WITHOUT IMAGE

If you want to test without an image first:

### cURL (no image):
```bash
curl -X POST http://localhost:3000/organization/api/v1/causes/with-image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "organizationId=1" \
  -F "title=Test Cause Without Image"
```

### JavaScript (no image):
```javascript
const formData = new FormData();
formData.append('organizationId', '1');
formData.append('title', 'Test Cause Without Image');

fetch('http://localhost:3000/organization/api/v1/causes/with-image', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN'
    },
    body: formData
})
.then(response => response.json())
.then(data => console.log('Result:', data));
```

---

## ❌ WHAT WAS WRONG BEFORE

### Wrong Endpoint:
```
❌ POST /organization/api/v1/causes
```

### Wrong Content-Type:
```
❌ Content-Type: application/json
❌ Body: {"organizationId": "1", "title": "Your Cause Title"}
```

### Correct Format:
```
✅ POST /organization/api/v1/causes/with-image
✅ Content-Type: multipart/form-data
✅ Body: FormData with organizationId and title fields
```

---

## 🎯 KEY POINTS

1. **Use `/with-image` endpoint** for any cause that might have an image
2. **Use multipart/form-data** format, not JSON
3. **All fields are form fields**, not JSON properties
4. **Image field is optional** even on the with-image endpoint
5. **Boolean values as strings**: `"false"` not `false`
6. **Don't set Content-Type header** when using FormData in browsers

---

## 📈 EXPECTED SUCCESS RESPONSE

```json
{
  "causeId": "123",
  "organizationId": "1",
  "title": "Environmental Conservation Initiative",
  "description": "A comprehensive environmental initiative",
  "introVideoUrl": null,
  "imageUrl": "https://storage.googleapis.com/your-bucket/causes/123-image.jpg",
  "isPublic": false,
  "createdAt": "2025-09-13T...",
  "updatedAt": "2025-09-13T..."
}
```

The `imageUrl` will be the Google Cloud Storage URL if you uploaded an image, or `null` if no image was provided.

---

## 🚨 TROUBLESHOOTING

If you still get errors:
1. **Check endpoint**: Must be `/with-image` not just `/causes`
2. **Check format**: Must be FormData, not JSON
3. **Check field names**: `organizationId` and `title` (exact spelling)
4. **Check JWT token**: Must be valid and not expired
5. **Check image file**: Must be valid image format (JPG, PNG, GIF)

Use the exact cURL command above and it will work! 🎯