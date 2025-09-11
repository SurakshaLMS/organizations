# 📚 Lecture API - Comprehensive Documentation

## Overview
The Lecture API provides comprehensive management of educational lectures with document uploads, S3 integration, and role-based access control. All endpoints support cross-origin requests and work with any proxy configuration.

**Base URL**: `http://localhost:3001/organization/api/v1/lectures`  
**API Documentation**: `http://localhost:3001/organization/api/v1/docs`

## Authentication & Authorization

### Authentication Status
- **Current Setup**: Open access (no authentication required)
- **JWT Infrastructure**: Available but not enforced
- **Future Enhancement**: Can easily re-enable JWT authentication

### Authorization Levels (when JWT is enabled)
- **Organization Admin**: Full access to all lectures in organization
- **Organization Moderator**: Can create, read, update lectures in organization
- **Organization Member**: Read-only access to public lectures
- **Teacher**: Can only delete lectures they created

---

## 📋 API Endpoints

### 1. Create Lecture
**Endpoint**: `POST /lectures`

#### Request
```http
POST /organization/api/v1/lectures
Content-Type: application/json

{
  "causeId": "1",
  "title": "Introduction to Machine Learning",
  "description": "Comprehensive overview of ML concepts",
  "content": "Detailed lecture content here...",
  "venue": "Room 101",
  "mode": "physical",
  "timeStart": "2025-09-10T10:00:00Z",
  "timeEnd": "2025-09-10T12:00:00Z",
  "liveLink": "https://meet.google.com/abc-def-ghi",
  "liveMode": "meet",
  "recordingUrl": "https://youtube.com/watch?v=xyz",
  "isPublic": true
}
```

#### Response
```json
{
  "lectureId": "123",
  "causeId": "1",
  "title": "Introduction to Machine Learning",
  "description": "Comprehensive overview of ML concepts",
  "content": "Detailed lecture content here...",
  "venue": "Room 101",
  "mode": "physical",
  "timeStart": "2025-09-10T10:00:00.000Z",
  "timeEnd": "2025-09-10T12:00:00.000Z",
  "liveLink": "https://meet.google.com/abc-def-ghi",
  "liveMode": "meet",
  "recordingUrl": "https://youtube.com/watch?v=xyz",
  "isPublic": true,
  "createdAt": "2025-09-05T21:47:48.000Z",
  "updatedAt": "2025-09-05T21:47:48.000Z"
}
```

---

### 2. Create Lecture with Documents
**Endpoint**: `POST /lectures/with-documents/:causeId`

#### Request
```http
POST /organization/api/v1/lectures/with-documents/1
Content-Type: multipart/form-data

Form Data:
- title: "Advanced Machine Learning"
- description: "Deep dive into ML algorithms"
- content: "Lecture content..."
- venue: "Online"
- mode: "online"
- timeStart: "2025-09-15T14:00:00Z"
- timeEnd: "2025-09-15T16:00:00Z"
- liveLink: "https://zoom.us/j/123456789"
- liveMode: "zoom"
- isPublic: true
- documents: [file1.pdf, file2.pptx, file3.docx] (up to 10 files)
```

#### Response
```json
{
  "lecture": {
    "lectureId": "124",
    "causeId": "1",
    "title": "Advanced Machine Learning",
    "description": "Deep dive into ML algorithms",
    "venue": "Online",
    "mode": "online",
    "timeStart": "2025-09-15T14:00:00.000Z",
    "timeEnd": "2025-09-15T16:00:00.000Z",
    "liveLink": "https://zoom.us/j/123456789",
    "liveMode": "zoom",
    "isPublic": true,
    "createdAt": "2025-09-05T21:47:48.000Z",
    "updatedAt": "2025-09-05T21:47:48.000Z"
  },
  "uploadedDocuments": [
    {
      "documentationId": "1",
      "title": "file1.pdf",
      "url": "https://mysurakshabucket.s3.us-east-1.amazonaws.com/lectures/124/documents/file1.pdf",
      "fileName": "file1.pdf",
      "size": 2048576
    },
    {
      "documentationId": "2", 
      "title": "file2.pptx",
      "url": "https://mysurakshabucket.s3.us-east-1.amazonaws.com/lectures/124/documents/file2.pptx",
      "fileName": "file2.pptx",
      "size": 5120000
    }
  ],
  "documentsCount": 2,
  "message": "Lecture created successfully with 2 documents uploaded"
}
```

---

### 3. Get Lectures with Filtering
**Endpoint**: `GET /lectures`

#### Query Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Text search in title/description
- `causeId`: Filter by specific cause
- `causeIds`: Comma-separated cause IDs (e.g., "1,2,3")
- `organizationId`: Filter by organization
- `organizationIds`: Comma-separated organization IDs
- `mode`: Filter by mode ("online" | "physical")
- `status`: Filter by status ("upcoming" | "live" | "completed" | "all")
- `isPublic`: Filter by visibility ("true" | "false" | "all")
- `fromDate`: Start date filter (ISO string)
- `toDate`: End date filter (ISO string)
- `sortBy`: Sort field ("createdAt" | "updatedAt" | "timeStart" | "timeEnd" | "title")
- `sortOrder`: Sort direction ("asc" | "desc")

#### Request Examples
```http
GET /organization/api/v1/lectures
GET /organization/api/v1/lectures?causeId=1
GET /organization/api/v1/lectures?page=2&limit=20
GET /organization/api/v1/lectures?search=machine%20learning
GET /organization/api/v1/lectures?mode=online&status=upcoming
GET /organization/api/v1/lectures?causeIds=1,2,3&sortBy=timeStart&sortOrder=asc
```

#### Response
```json
{
  "data": [
    {
      "lectureId": "123",
      "title": "Introduction to Machine Learning",
      "description": "Comprehensive overview of ML concepts",
      "mode": "physical",
      "timeStart": "2025-09-10T10:00:00.000Z",
      "timeEnd": "2025-09-10T12:00:00.000Z",
      "isPublic": true,
      "createdAt": "2025-09-05T21:47:48.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 42,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### 4. Get Lecture by ID
**Endpoint**: `GET /lectures/:id`

#### Request
```http
GET /organization/api/v1/lectures/123
```

#### Response
```json
{
  "lectureId": "123",
  "causeId": "1",
  "title": "Introduction to Machine Learning",
  "description": "Comprehensive overview of ML concepts",
  "content": "Detailed lecture content here...",
  "venue": "Room 101",
  "mode": "physical",
  "timeStart": "2025-09-10T10:00:00.000Z",
  "timeEnd": "2025-09-10T12:00:00.000Z",
  "liveLink": "https://meet.google.com/abc-def-ghi",
  "liveMode": "meet",
  "recordingUrl": "https://youtube.com/watch?v=xyz",
  "isPublic": true,
  "createdAt": "2025-09-05T21:47:48.000Z",
  "updatedAt": "2025-09-05T21:47:48.000Z"
}
```

---

### 5. Update Lecture (Basic)
**Endpoint**: `PUT /lectures/:id`

#### Request
```http
PUT /organization/api/v1/lectures/123
Content-Type: application/json

{
  "title": "Updated: Introduction to Machine Learning",
  "description": "Updated comprehensive overview of ML concepts",
  "venue": "Room 102",
  "mode": "online",
  "liveLink": "https://zoom.us/j/987654321",
  "liveMode": "zoom"
}
```

#### Response
```json
{
  "lectureId": "123",
  "title": "Updated: Introduction to Machine Learning",
  "description": "Updated comprehensive overview of ML concepts",
  "venue": "Room 102",
  "mode": "online",
  "liveLink": "https://zoom.us/j/987654321",
  "liveMode": "zoom",
  "updatedAt": "2025-09-05T22:15:30.000Z"
}
```

---

### 6. Update Lecture with Documents
**Endpoint**: `PUT /lectures/:id/with-documents`

#### Request
```http
PUT /organization/api/v1/lectures/123/with-documents
Content-Type: multipart/form-data

Form Data:
- title: "Updated: Introduction to Machine Learning"
- description: "Updated with new materials"
- venue: "Hybrid: Room 102 + Online"
- mode: "online"
- documents: [updated-syllabus.pdf, new-slides.pptx] (up to 10 files)
```

#### Response
```json
{
  "lectureId": "123",
  "title": "Updated: Introduction to Machine Learning",
  "description": "Updated with new materials",
  "venue": "Hybrid: Room 102 + Online",
  "mode": "online",
  "updatedAt": "2025-09-05T22:15:30.000Z",
  "uploadedDocuments": [
    {
      "documentationId": "5",
      "title": "updated-syllabus.pdf",
      "url": "https://mysurakshabucket.s3.us-east-1.amazonaws.com/lectures/123/documents/updated-syllabus.pdf",
      "fileName": "updated-syllabus.pdf",
      "size": 1024000
    },
    {
      "documentationId": "6",
      "title": "new-slides.pptx", 
      "url": "https://mysurakshabucket.s3.us-east-1.amazonaws.com/lectures/123/documents/new-slides.pptx",
      "fileName": "new-slides.pptx",
      "size": 3072000
    }
  ],
  "documentsCount": 2,
  "message": "Lecture updated successfully with 2 new documents"
}
```

---

### 7. Delete Lecture
**Endpoint**: `DELETE /lectures/:id`

#### Authorization Requirements
- **Organization Admin**: Can delete any lecture in organization
- **Organization Moderator**: Can delete lectures they have access to
- **Teacher**: Can only delete lectures they created (future enhancement)

#### Request
```http
DELETE /organization/api/v1/lectures/123
```

#### Response
```json
{
  "message": "Lecture 'Introduction to Machine Learning' deleted successfully",
  "lectureId": "123",
  "documentsDeleted": 3,
  "s3FilesDeleted": 3,
  "deletedAt": "2025-09-05T22:30:15.000Z"
}
```

#### What Gets Deleted
1. **Lecture record** from database
2. **All associated documents** from database
3. **All document files** from S3 storage
4. **Cascading deletion** maintains data integrity

---

### 8. Get Lecture Documents
**Endpoint**: `GET /lectures/:id/documents`

#### Request
```http
GET /organization/api/v1/lectures/123/documents
```

#### Response
```json
{
  "lectureId": "123",
  "documents": [
    {
      "documentationId": "1",
      "title": "Lecture Slides",
      "description": "Main presentation slides",
      "docUrl": "https://mysurakshabucket.s3.us-east-1.amazonaws.com/lectures/123/documents/slides.pdf",
      "createdAt": "2025-09-05T21:47:48.000Z",
      "updatedAt": "2025-09-05T21:47:48.000Z"
    },
    {
      "documentationId": "2",
      "title": "Assignment Sheet",
      "description": "Weekly assignment instructions",
      "docUrl": "https://mysurakshabucket.s3.us-east-1.amazonaws.com/lectures/123/documents/assignment.docx",
      "createdAt": "2025-09-05T21:47:48.000Z",
      "updatedAt": "2025-09-05T21:47:48.000Z"
    }
  ],
  "totalDocuments": 2
}
```

---

## 🔧 Technical Specifications

### File Upload Constraints
- **Maximum files per request**: 10
- **Supported file types**: PDF, DOCX, PPTX, TXT, images (configurable)
- **Maximum file size**: As per S3 configuration
- **Storage**: AWS S3 bucket (`mysurakshabucket`)
- **Path structure**: `lectures/{lectureId}/documents/{filename}`

### Database Schema
```sql
-- Lecture table
lectures (
  lectureId BIGINT PRIMARY KEY AUTO_INCREMENT,
  causeId BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  venue VARCHAR(255),
  mode ENUM('online', 'physical'),
  timeStart DATETIME,
  timeEnd DATETIME,
  liveLink VARCHAR(500),
  liveMode ENUM('youtube', 'meet', 'zoom', 'teams'),
  recordingUrl VARCHAR(500),
  isPublic BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT NOW(),
  updatedAt DATETIME DEFAULT NOW()
)

-- Documentation table  
org_documentation (
  documentationId BIGINT PRIMARY KEY AUTO_INCREMENT,
  lectureId BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  description TEXT,
  docUrl VARCHAR(500),
  createdAt DATETIME DEFAULT NOW(),
  updatedAt DATETIME DEFAULT NOW(),
  FOREIGN KEY (lectureId) REFERENCES lectures(lectureId) ON DELETE CASCADE
)
```

### CORS Configuration
- **Allowed Origins**: All origins (`*`)
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: All standard headers + custom headers
- **Credentials**: Supported
- **Proxy Headers**: `ngrok-skip-browser-warning` and others

---

## 🚨 Error Responses

### Standard Error Format
```json
{
  "statusCode": 400,
  "message": "Detailed error message",
  "error": "Bad Request",
  "timestamp": "2025-09-05T22:30:15.021Z",
  "path": "/organization/api/v1/lectures"
}
```

### Common Error Codes
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid JWT token (when enabled)
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Lecture or cause not found
- **409 Conflict**: Duplicate or conflicting data
- **500 Internal Server Error**: Server-side error

---

## 📊 Performance Features

### Optimization Strategies
- **Minimal Database Joins**: Only fetch required data
- **JWT-based Access Control**: Zero additional auth queries
- **Efficient Filtering**: Optimized cause ID filtering
- **Pagination**: Built-in pagination for large datasets
- **S3 Integration**: Parallel file uploads for better performance
- **Connection Pooling**: MySQL connection pool (10 connections)

### Caching Considerations
- **Future Enhancement**: Redis caching for frequently accessed lectures
- **S3 CDN**: CloudFront integration for document delivery
- **Database Indexing**: Optimized indexes on causeId, organizationId

---

## 🔄 Migration & Deployment

### Environment Variables
```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/db"

# AWS S3 (DEPRECATED - Replaced with Google Cloud Storage)
AWS_ACCESS_KEY_ID="AKIA******* (removed for security)"
AWS_SECRET_ACCESS_KEY="****** (removed for security)"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="mysurakshabucket"

# Server
PORT=3001
CORS_ORIGIN="*"

# JWT (when enabled)
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="24h"
```

### Database Migrations
```bash
# Run Prisma migrations
npx prisma migrate dev --name lecture-enhancements

# Generate Prisma client
npx prisma generate

# Reset database (development only)
npx prisma migrate reset --force
```

---

## 🧪 Testing Examples

### Postman Collection
```javascript
// Create lecture with documents
pm.test("Create lecture with documents", function () {
    const formData = {
        'title': 'Test Lecture',
        'description': 'Test description',
        'causeId': '1',
        'mode': 'online',
        'isPublic': 'true'
    };
    
    pm.sendRequest({
        url: '{{base_url}}/lectures/with-documents/1',
        method: 'POST',
        header: {
            'Content-Type': 'multipart/form-data'
        },
        body: {
            mode: 'formdata',
            formdata: Object.entries(formData).map(([key, value]) => ({
                key: key,
                value: value
            }))
        }
    });
});
```

### cURL Examples
```bash
# Create basic lecture
curl -X POST "http://localhost:3001/organization/api/v1/lectures" \
  -H "Content-Type: application/json" \
  -d '{
    "causeId": "1",
    "title": "Test Lecture",
    "description": "Test description",
    "mode": "online",
    "isPublic": true
  }'

# Get lectures with filtering
curl -X GET "http://localhost:3001/organization/api/v1/lectures?causeId=1&mode=online&page=1&limit=10"

# Update lecture
curl -X PUT "http://localhost:3001/organization/api/v1/lectures/123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Lecture Title",
    "venue": "New Venue"
  }'

# Delete lecture
curl -X DELETE "http://localhost:3001/organization/api/v1/lectures/123"
```

---

## 🚀 Future Enhancements

### Planned Features
1. **Creator Tracking**: Add `createdBy` field to track lecture creators
2. **JWT Re-enablement**: Easy toggle for authentication requirements
3. **Bulk Operations**: Bulk create, update, delete lectures
4. **Advanced Search**: Full-text search across content
5. **Version Control**: Track lecture content versions
6. **Analytics**: Lecture view and engagement metrics
7. **Live Streaming**: Integration with streaming platforms
8. **Collaborative Editing**: Real-time collaborative lecture editing

### Security Enhancements
1. **Rate Limiting**: API rate limiting for abuse prevention
2. **Input Sanitization**: Enhanced XSS protection
3. **File Scanning**: Virus scanning for uploaded documents
4. **Audit Logging**: Comprehensive action logging
5. **Permission Granularity**: Fine-grained permission system

---

## 📞 Support & Contact

**API Status**: Fully operational ✅  
**Last Updated**: September 5, 2025  
**Documentation Version**: 2.0  

For technical support or feature requests, please refer to the development team.
