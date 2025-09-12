# 📋 Cause Management API Documentation

## Overview
The Cause Management API provides endpoints for creating, updating, retrieving, and managing causes within organizations. It supports both basic cause operations and enhanced features with image uploads to Google Cloud Storage.

## Base URL
```
http://localhost:3000/organization/api/v1
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🎯 API Endpoints

### 1. Create Cause (Basic - No Image)

**POST** `/causes`

Creates a new cause without image upload.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "organizationId": "1",
  "title": "Environmental Conservation Initiative",
  "description": "A comprehensive initiative to promote environmental awareness and conservation practices",
  "introVideoUrl": "https://youtube.com/watch?v=example",
  "isPublic": false
}
```

**Response (201):**
```json
{
  "causeId": "123",
  "organizationId": "1",
  "title": "Environmental Conservation Initiative",
  "description": "A comprehensive initiative to promote environmental awareness and conservation practices",
  "introVideoUrl": "https://youtube.com/watch?v=example",
  "imageUrl": null,
  "isPublic": false,
  "createdAt": "2025-09-12T15:48:38.782Z",
  "updatedAt": "2025-09-12T15:48:38.782Z"
}
```

**Validation Requirements:**
- `organizationId`: Required, must be numeric string (e.g., "1", "123")
- `title`: Required, non-empty string
- `description`: Optional string
- `introVideoUrl`: Optional, must be valid URL
- `isPublic`: Optional boolean, defaults to false

---

### 2. Create Cause with Image Upload (Enhanced)

**POST** `/causes/with-image`

Creates a new cause with optional image upload to Google Cloud Storage.

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token>
```

**Form Data:**
```
organizationId: "1"
title: "Environmental Conservation Initiative"
description: "A comprehensive initiative to promote environmental awareness"
introVideoUrl: "https://youtube.com/watch?v=example"
isPublic: false
image: <file> (optional - JPEG, PNG, GIF, WebP, max 5MB)
```

**Response (201):**
```json
{
  "causeId": "123",
  "organizationId": "1", 
  "title": "Environmental Conservation Initiative",
  "description": "A comprehensive initiative to promote environmental awareness",
  "introVideoUrl": "https://youtube.com/watch?v=example",
  "imageUrl": "https://storage.googleapis.com/laas-file-storage/causes/123/image.jpg",
  "isPublic": false,
  "createdAt": "2025-09-12T15:48:38.782Z",
  "updatedAt": "2025-09-12T15:48:38.782Z"
}
```

---

### 3. Get All Causes

**GET** `/causes`

Retrieves all causes with pagination and filtering.

**Query Parameters:**
- `page`: Page number (optional, default: 1)
- `limit`: Items per page (optional, default: 10)
- `sortBy`: Sort field (optional, default: 'createdAt')
- `sortOrder`: Sort direction - 'asc' or 'desc' (optional, default: 'desc')
- `search`: Search term (optional)

**Example Request:**
```
GET /organization/api/v1/causes?page=1&limit=10&search=environment
```

**Response (200):**
```json
{
  "data": [
    {
      "causeId": "123",
      "organizationId": "1",
      "title": "Environmental Conservation Initiative",
      "description": "A comprehensive initiative...",
      "imageUrl": "https://storage.googleapis.com/laas-file-storage/causes/123/image.jpg",
      "isPublic": false,
      "createdAt": "2025-09-12T15:48:38.782Z",
      "updatedAt": "2025-09-12T15:48:38.782Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### 4. Get Cause by ID

**GET** `/causes/{id}`

Retrieves a specific cause by ID.

**Parameters:**
- `id`: Cause ID (path parameter)

**Response (200):**
```json
{
  "causeId": "123",
  "organizationId": "1",
  "title": "Environmental Conservation Initiative",
  "description": "A comprehensive initiative...",
  "imageUrl": "https://storage.googleapis.com/laas-file-storage/causes/123/image.jpg",
  "isPublic": false,
  "createdAt": "2025-09-12T15:48:38.782Z",
  "updatedAt": "2025-09-12T15:48:38.782Z"
}
```

---

### 5. Update Cause (Basic)

**PUT** `/causes/{id}`

Updates a cause without image upload.

**Request Body:**
```json
{
  "title": "Updated Environmental Initiative",
  "description": "Updated description",
  "introVideoUrl": "https://youtube.com/watch?v=updated",
  "isPublic": true
}
```

---

### 6. Update Cause with Image

**PUT** `/causes/{id}/with-image`

Updates a cause with optional image upload.

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token>
```

**Form Data:**
```
title: "Updated Environmental Initiative"
description: "Updated description"
image: <file> (optional - replaces existing image)
```

---

### 7. Delete Cause

**DELETE** `/causes/{id}`

Deletes a cause and associated image from Google Cloud Storage.

**Response (204):**
No content

---

### 8. Get Causes by Organization

**GET** `/causes/organization/{organizationId}`

Retrieves all causes for a specific organization.

**Parameters:**
- `organizationId`: Organization ID (path parameter)

---

## 🚨 Error Responses

### Validation Error (400)
```json
{
  "statusCode": 400,
  "message": [
    "organizationId must be a numeric string (e.g., \"1\", \"123\")",
    "organizationId should not be empty",
    "title should not be empty",
    "title must be a string"
  ],
  "error": "Bad Request",
  "timestamp": "2025-09-12T15:48:38.782Z",
  "path": "/organization/api/v1/causes"
}
```

### Not Found (404)
```json
{
  "statusCode": 404,
  "message": "Cause not found",
  "error": "Not Found",
  "timestamp": "2025-09-12T15:48:38.782Z",
  "path": "/organization/api/v1/causes/999"
}
```

### Unauthorized (401)
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized",
  "timestamp": "2025-09-12T15:48:38.782Z",
  "path": "/organization/api/v1/causes"
}
```

---

## 🛠️ Example Requests

### Using cURL

**Create Basic Cause:**
```bash
curl -X POST http://localhost:3000/organization/api/v1/causes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "organizationId": "1",
    "title": "Environmental Conservation Initiative",
    "description": "A comprehensive initiative to promote environmental awareness",
    "isPublic": false
  }'
```

**Create Cause with Image:**
```bash
curl -X POST http://localhost:3000/organization/api/v1/causes/with-image \
  -H "Authorization: Bearer your-jwt-token" \
  -F "organizationId=1" \
  -F "title=Environmental Conservation Initiative" \
  -F "description=A comprehensive initiative" \
  -F "isPublic=false" \
  -F "image=@/path/to/your/image.jpg"
```

### Using JavaScript/Fetch

**Create Basic Cause:**
```javascript
const response = await fetch('http://localhost:3000/organization/api/v1/causes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    organizationId: "1",
    title: "Environmental Conservation Initiative",
    description: "A comprehensive initiative to promote environmental awareness",
    isPublic: false
  })
});

const result = await response.json();
console.log(result);
```

**Create Cause with Image:**
```javascript
const formData = new FormData();
formData.append('organizationId', '1');
formData.append('title', 'Environmental Conservation Initiative');
formData.append('description', 'A comprehensive initiative');
formData.append('isPublic', 'false');
formData.append('image', fileInput.files[0]); // File from input element

const response = await fetch('http://localhost:3000/organization/api/v1/causes/with-image', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

---

## 🔍 Troubleshooting

### Common Issues

1. **Validation Error: "organizationId must be a numeric string"**
   - Ensure organizationId is passed as a string, not a number
   - Correct: `"organizationId": "1"`
   - Incorrect: `"organizationId": 1`

2. **Missing Title Error**
   - The title field is required and cannot be empty
   - Ensure you include: `"title": "Your Cause Title"`

3. **Image Upload Issues**
   - Use `/causes/with-image` endpoint for image uploads
   - Ensure Content-Type is `multipart/form-data`
   - Maximum image size: 5MB
   - Supported formats: JPEG, PNG, GIF, WebP

4. **Authentication Issues**
   - Ensure JWT token is included in Authorization header
   - Format: `Authorization: Bearer <your-token>`

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- Image uploads are automatically processed and stored in Google Cloud Storage
- Old images are automatically cleaned up when updating with new images
- The API supports both synchronous and asynchronous operations
- Rate limiting may apply to prevent abuse
