# Lecture API Quick Reference

## 🚀 Server Information
- **Base URL**: `http://localhost:3000/organization/api/v1/lectures`
- **Authentication**: JWT Bearer Token Required
- **Swagger UI**: `http://localhost:3000/api/docs`

## 📋 Quick Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/` | Create lecture |
| `POST` | `/with-documents/:causeId` | Create lecture with S3 documents |
| `GET` | `/` | Get lectures (with filtering) |
| `GET` | `/:id` | Get lecture by ID |
| `PUT` | `/:id` | Update lecture |
| `DELETE` | `/:id` | Delete lecture |
| `GET` | `/:id/documents` | Get lecture documents |

## 🔐 Authentication

All endpoints require JWT token:
```bash
Authorization: Bearer <your-jwt-token>
```

Get token from:
```bash
POST /organization/api/v1/auth/login
```

## 📄 Key Features

### ✅ Enhanced Lecture Creation with Documents
- Upload up to 10 files per lecture
- Automatic S3 storage with organized structure
- Support for multiple file types (PDF, DOC, images, etc.)
- Maximum 10MB per file, 50MB total per request

### ✅ JWT-Based Security
- Role-based access control (MEMBER, MODERATOR, ADMIN, PRESIDENT)
- Organization-level access validation
- No mock data - direct database integration

### ✅ Advanced Filtering & Pagination
- Filter by cause ID
- Pagination support (page, limit)
- Optimized database queries

## 🧪 Quick Test

### 1. Create Simple Lecture
```bash
curl -X POST http://localhost:3000/organization/api/v1/lectures \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "causeId": "1",
    "title": "Test Lecture",
    "description": "A test lecture",
    "isPublic": true
  }'
```

### 2. Create Lecture with Documents
```bash
curl -X POST http://localhost:3000/organization/api/v1/lectures/with-documents/1 \
  -H "Authorization: Bearer <token>" \
  -F "title=Lecture with Docs" \
  -F "description=Test with files" \
  -F "isPublic=true" \
  -F "documents=@./file1.pdf" \
  -F "documents=@./file2.txt"
```

### 3. Get Lectures
```bash
curl -X GET "http://localhost:3000/organization/api/v1/lectures?causeId=1&page=1&limit=5" \
  -H "Authorization: Bearer <token>"
```

## 🗂️ File Upload Details

### S3 Structure
```
lectures/{lectureId}/documents/{filename}-{timestamp}.{extension}
```

### Supported Types
- Documents: PDF, DOC, DOCX, TXT, MD
- Images: JPG, JPEG, PNG, GIF  
- Archives: ZIP, RAR
- Presentations: PPT, PPTX

## 📊 Response Examples

### Lecture Object
```json
{
  "lectureId": "1",
  "causeId": "1", 
  "title": "JavaScript Basics",
  "description": "Introduction to JS",
  "venue": "Room 101",
  "mode": "physical",
  "timeStart": "2025-09-05T10:00:00.000Z",
  "timeEnd": "2025-09-05T12:00:00.000Z",
  "isPublic": true,
  "createdAt": "2025-09-04T18:30:45.123Z",
  "updatedAt": "2025-09-04T18:30:45.123Z"
}
```

### Document Object
```json
{
  "documentationId": "1",
  "lectureId": "1",
  "title": "slides.pdf",
  "docUrl": "https://mysurakshabucket.s3.us-east-1.amazonaws.com/lectures/1/documents/slides-123456789.pdf",
  "originalFileName": "slides.pdf",
  "fileSize": 2048576,
  "mimeType": "application/pdf",
  "createdAt": "2025-09-04T18:35:12.789Z"
}
```

## ⚠️ Common Error Codes

- `401` - JWT token required/invalid
- `403` - Access denied to organization/cause  
- `404` - Lecture/cause not found
- `400` - Invalid input data
- `429` - Rate limit exceeded

## 🔧 Environment Variables

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_s3_bucket_name

# Database
LAAS_DATABASE_URL="mysql://..."

# JWT
JWT_SECRET="your-secret"
JWT_EXPIRES_IN="7d"
```

---

📚 **Full Documentation**: See `LECTURE_API_DOCUMENTATION.md` for complete details
