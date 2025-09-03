# Lecture Management API Documentation

## Overview

The Lecture Management API provides comprehensive functionality for creating, managing, and organizing lectures with optional document uploads to AWS S3. This API uses JWT-based authentication and role-based access control to ensure secure operations.

## Base URL

```
http://localhost:3000/organization/api/v1/lectures
```

## Authentication

All endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Lecture

Create a new lecture within a cause.

**Endpoint:** `POST /`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "causeId": "1",
  "title": "Introduction to JavaScript",
  "description": "A comprehensive introduction to JavaScript programming",
  "content": "This lecture covers variables, functions, and control structures",
  "venue": "Room 101",
  "mode": "physical",
  "timeStart": "2025-09-05T10:00:00Z",
  "timeEnd": "2025-09-05T12:00:00Z",
  "liveLink": "https://meet.google.com/example",
  "liveMode": "meet",
  "recordingUrl": "https://youtube.com/watch?v=example",
  "isPublic": true
}
```

**Response (201 Created):**
```json
{
  "lectureId": "1",
  "causeId": "1",
  "title": "Introduction to JavaScript",
  "description": "A comprehensive introduction to JavaScript programming",
  "content": "This lecture covers variables, functions, and control structures",
  "venue": "Room 101",
  "mode": "physical",
  "timeStart": "2025-09-05T10:00:00.000Z",
  "timeEnd": "2025-09-05T12:00:00.000Z",
  "liveLink": "https://meet.google.com/example",
  "liveMode": "meet",
  "recordingUrl": "https://youtube.com/watch?v=example",
  "isPublic": true,
  "createdAt": "2025-09-04T18:30:45.123Z",
  "updatedAt": "2025-09-04T18:30:45.123Z"
}
```

**Error Responses:**
- `401 Unauthorized` - JWT token required
- `403 Forbidden` - Access denied to this organization/cause
- `404 Not Found` - Cause not found
- `400 Bad Request` - Invalid input data

---

### 2. Create Lecture with Documents

Create a new lecture with multiple document uploads to AWS S3.

**Endpoint:** `POST /with-documents/:causeId`

**Authentication:** Required (JWT)

**Content-Type:** `multipart/form-data`

**Parameters:**
- `causeId` (path parameter) - ID of the cause to create lecture for

**Form Data Fields:**
- `title` (required) - Lecture title
- `description` (optional) - Lecture description
- `content` (optional) - Lecture content
- `venue` (optional) - Lecture venue
- `mode` (optional) - Lecture mode ("online" or "physical")
- `timeStart` (optional) - Start time (ISO 8601 format)
- `timeEnd` (optional) - End time (ISO 8601 format)
- `liveLink` (optional) - Live streaming link
- `liveMode` (optional) - Live mode ("youtube", "meet", "zoom", "teams")
- `recordingUrl` (optional) - Recording URL
- `isPublic` (optional) - Whether lecture is public (boolean)
- `documents` (optional) - Multiple files (up to 10 files)

**Example with curl:**
```bash
curl -X POST \
  http://localhost:3000/organization/api/v1/lectures/with-documents/1 \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "title=Advanced JavaScript Concepts" \
  -F "description=Deep dive into advanced JavaScript features" \
  -F "content=This lecture covers closures, prototypes, and async programming" \
  -F "venue=Online" \
  -F "mode=online" \
  -F "timeStart=2025-09-05T14:00:00Z" \
  -F "timeEnd=2025-09-05T16:00:00Z" \
  -F "liveLink=https://meet.google.com/advanced-js" \
  -F "liveMode=meet" \
  -F "isPublic=true" \
  -F "documents=@./slides.pdf" \
  -F "documents=@./exercises.txt" \
  -F "documents=@./resources.md"
```

**Response (201 Created):**
```json
{
  "lectureId": "2",
  "causeId": "1",
  "title": "Advanced JavaScript Concepts",
  "description": "Deep dive into advanced JavaScript features",
  "content": "This lecture covers closures, prototypes, and async programming",
  "venue": "Online",
  "mode": "online",
  "timeStart": "2025-09-05T14:00:00.000Z",
  "timeEnd": "2025-09-05T16:00:00.000Z",
  "liveLink": "https://meet.google.com/advanced-js",
  "liveMode": "meet",
  "recordingUrl": null,
  "isPublic": true,
  "createdAt": "2025-09-04T18:35:12.456Z",
  "updatedAt": "2025-09-04T18:35:12.456Z",
  "documents": [
    {
      "documentationId": "1",
      "lectureId": "2",
      "title": "slides.pdf",
      "description": null,
      "content": null,
      "docUrl": "https://mysurakshabucket.s3.us-east-1.amazonaws.com/lectures/2/documents/slides-1693867512456.pdf",
      "originalFileName": "slides.pdf",
      "fileSize": 2048576,
      "mimeType": "application/pdf",
      "createdAt": "2025-09-04T18:35:12.789Z",
      "updatedAt": "2025-09-04T18:35:12.789Z"
    },
    {
      "documentationId": "2",
      "lectureId": "2",
      "title": "exercises.txt",
      "description": null,
      "content": null,
      "docUrl": "https://mysurakshabucket.s3.us-east-1.amazonaws.com/lectures/2/documents/exercises-1693867512890.txt",
      "originalFileName": "exercises.txt",
      "fileSize": 4096,
      "mimeType": "text/plain",
      "createdAt": "2025-09-04T18:35:12.890Z",
      "updatedAt": "2025-09-04T18:35:12.890Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - JWT token required
- `403 Forbidden` - Access denied to this cause
- `404 Not Found` - Cause not found
- `400 Bad Request` - Invalid input data or file upload failed

---

### 3. Get Lectures with Filtering

Retrieve lectures with optional filtering and pagination.

**Endpoint:** `GET /`

**Authentication:** Required (JWT)

**Query Parameters:**
- `causeId` (optional) - Filter by cause ID
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10, max: 100)

**Example:**
```
GET /lectures?causeId=1&page=1&limit=5
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "lectureId": "1",
      "causeId": "1",
      "title": "Introduction to JavaScript",
      "description": "A comprehensive introduction to JavaScript programming",
      "content": "This lecture covers variables, functions, and control structures",
      "venue": "Room 101",
      "mode": "physical",
      "timeStart": "2025-09-05T10:00:00.000Z",
      "timeEnd": "2025-09-05T12:00:00.000Z",
      "liveLink": "https://meet.google.com/example",
      "liveMode": "meet",
      "recordingUrl": "https://youtube.com/watch?v=example",
      "isPublic": true,
      "createdAt": "2025-09-04T18:30:45.123Z",
      "updatedAt": "2025-09-04T18:30:45.123Z"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 5,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Error Responses:**
- `401 Unauthorized` - JWT token required
- `400 Bad Request` - Invalid query parameters

---

### 4. Get Lecture by ID

Retrieve a specific lecture by its ID.

**Endpoint:** `GET /:id`

**Authentication:** Required (JWT)

**Parameters:**
- `id` (path parameter) - Lecture ID

**Response (200 OK):**
```json
{
  "lectureId": "1",
  "causeId": "1",
  "title": "Introduction to JavaScript",
  "description": "A comprehensive introduction to JavaScript programming",
  "content": "This lecture covers variables, functions, and control structures",
  "venue": "Room 101",
  "mode": "physical",
  "timeStart": "2025-09-05T10:00:00.000Z",
  "timeEnd": "2025-09-05T12:00:00.000Z",
  "liveLink": "https://meet.google.com/example",
  "liveMode": "meet",
  "recordingUrl": "https://youtube.com/watch?v=example",
  "isPublic": true,
  "createdAt": "2025-09-04T18:30:45.123Z",
  "updatedAt": "2025-09-04T18:30:45.123Z"
}
```

**Error Responses:**
- `401 Unauthorized` - JWT token required
- `403 Forbidden` - Access denied to this lecture
- `404 Not Found` - Lecture not found

---

### 5. Update Lecture

Update an existing lecture.

**Endpoint:** `PUT /:id`

**Authentication:** Required (JWT)

**Parameters:**
- `id` (path parameter) - Lecture ID

**Request Body:**
```json
{
  "title": "Updated JavaScript Introduction",
  "description": "An updated comprehensive introduction to JavaScript programming",
  "content": "This updated lecture covers variables, functions, control structures, and objects",
  "venue": "Room 102",
  "mode": "physical",
  "timeStart": "2025-09-05T11:00:00Z",
  "timeEnd": "2025-09-05T13:00:00Z",
  "liveLink": "https://meet.google.com/updated-example",
  "liveMode": "meet",
  "recordingUrl": "https://youtube.com/watch?v=updated-example",
  "isPublic": false
}
```

**Response (200 OK):**
```json
{
  "lectureId": "1",
  "causeId": "1",
  "title": "Updated JavaScript Introduction",
  "description": "An updated comprehensive introduction to JavaScript programming",
  "content": "This updated lecture covers variables, functions, control structures, and objects",
  "venue": "Room 102",
  "mode": "physical",
  "timeStart": "2025-09-05T11:00:00.000Z",
  "timeEnd": "2025-09-05T13:00:00.000Z",
  "liveLink": "https://meet.google.com/updated-example",
  "liveMode": "meet",
  "recordingUrl": "https://youtube.com/watch?v=updated-example",
  "isPublic": false,
  "createdAt": "2025-09-04T18:30:45.123Z",
  "updatedAt": "2025-09-04T18:45:30.789Z"
}
```

**Error Responses:**
- `401 Unauthorized` - JWT token required
- `403 Forbidden` - Access denied to this lecture
- `404 Not Found` - Lecture not found
- `400 Bad Request` - Invalid input data

---

### 6. Delete Lecture

Delete a lecture and its associated documents from S3.

**Endpoint:** `DELETE /:id`

**Authentication:** Required (JWT)

**Parameters:**
- `id` (path parameter) - Lecture ID

**Response (200 OK):**
```json
{
  "message": "Lecture deleted successfully",
  "lectureId": "1",
  "documentsDeleted": 3
}
```

**Error Responses:**
- `401 Unauthorized` - JWT token required
- `403 Forbidden` - Access denied to this lecture
- `404 Not Found` - Lecture not found

---

### 7. Get Lecture Documents

Retrieve all documents associated with a lecture.

**Endpoint:** `GET /:id/documents`

**Authentication:** Required (JWT)

**Parameters:**
- `id` (path parameter) - Lecture ID

**Response (200 OK):**
```json
{
  "lectureId": "2",
  "documents": [
    {
      "documentationId": "1",
      "lectureId": "2",
      "title": "slides.pdf",
      "description": "Lecture slides for Advanced JavaScript Concepts",
      "content": null,
      "docUrl": "https://mysurakshabucket.s3.us-east-1.amazonaws.com/lectures/2/documents/slides-1693867512456.pdf",
      "originalFileName": "slides.pdf",
      "fileSize": 2048576,
      "mimeType": "application/pdf",
      "createdAt": "2025-09-04T18:35:12.789Z",
      "updatedAt": "2025-09-04T18:35:12.789Z"
    },
    {
      "documentationId": "2",
      "lectureId": "2",
      "title": "exercises.txt",
      "description": "Practice exercises for JavaScript",
      "content": null,
      "docUrl": "https://mysurakshabucket.s3.us-east-1.amazonaws.com/lectures/2/documents/exercises-1693867512890.txt",
      "originalFileName": "exercises.txt",
      "fileSize": 4096,
      "mimeType": "text/plain",
      "createdAt": "2025-09-04T18:35:12.890Z",
      "updatedAt": "2025-09-04T18:35:12.890Z"
    }
  ],
  "totalDocuments": 2
}
```

**Error Responses:**
- `401 Unauthorized` - JWT token required
- `403 Forbidden` - Access denied to this lecture
- `404 Not Found` - Lecture not found

---

## Data Models

### Lecture Object

```json
{
  "lectureId": "string",
  "causeId": "string",
  "title": "string",
  "description": "string | null",
  "content": "string | null",
  "venue": "string | null",
  "mode": "string | null", // "online" | "physical"
  "timeStart": "string | null", // ISO 8601 datetime
  "timeEnd": "string | null", // ISO 8601 datetime
  "liveLink": "string | null",
  "liveMode": "string | null", // "youtube" | "meet" | "zoom" | "teams"
  "recordingUrl": "string | null",
  "isPublic": "boolean",
  "createdAt": "string", // ISO 8601 datetime
  "updatedAt": "string" // ISO 8601 datetime
}
```

### Document Object

```json
{
  "documentationId": "string",
  "lectureId": "string",
  "title": "string",
  "description": "string | null",
  "content": "string | null",
  "docUrl": "string",
  "originalFileName": "string",
  "fileSize": "number",
  "mimeType": "string",
  "createdAt": "string", // ISO 8601 datetime
  "updatedAt": "string" // ISO 8601 datetime
}
```

---

## File Upload Specifications

### Supported File Types
- Documents: PDF, DOC, DOCX, TXT, MD
- Images: JPG, JPEG, PNG, GIF
- Archives: ZIP, RAR
- Presentations: PPT, PPTX
- Spreadsheets: XLS, XLSX

### File Size Limits
- Maximum file size: 10 MB per file
- Maximum files per request: 10 files
- Total request size limit: 50 MB

### S3 Storage Structure
Files are stored in AWS S3 with the following structure:
```
lectures/{lectureId}/documents/{filename}-{timestamp}.{extension}
```

Example:
```
lectures/123/documents/slides-1693867512456.pdf
lectures/123/documents/exercises-1693867512890.txt
```

---

## Authentication & Authorization

### JWT Token Requirements
- Valid JWT token must be included in Authorization header
- Token must contain user information and organization access rights
- Token expiration is enforced

### Role-Based Access Control
- **MEMBER**: Can view public lectures and lectures from their organizations
- **MODERATOR**: Can create, edit lectures in their organizations
- **ADMIN**: Can manage all aspects of lectures in their organizations
- **PRESIDENT**: Full control over organization lectures and settings

### Organization Access
Users can only access lectures from causes that belong to their authorized organizations. Access is validated through:
1. JWT token organization access claims
2. Cause-to-organization relationship validation
3. Role-based permission checking

---

## Error Handling

### Common HTTP Status Codes
- `200 OK` - Successful operation
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2025-09-04T18:30:45.123Z",
  "path": "/organization/api/v1/lectures"
}
```

---

## Rate Limiting
- 100 requests per 15-minute window per user
- File upload endpoints have stricter limits
- Exceeded limits return `429 Too Many Requests`

---

## CORS Configuration
- Allowed origins: Configurable (default: localhost:3000)
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Credentials: Enabled for authenticated requests

---

## API Testing

### Using curl

1. **Get JWT Token** (from auth endpoint):
```bash
curl -X POST http://localhost:3000/organization/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

2. **Create Simple Lecture**:
```bash
curl -X POST http://localhost:3000/organization/api/v1/lectures \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "causeId": "1",
    "title": "Test Lecture",
    "description": "A test lecture",
    "isPublic": true
  }'
```

3. **Create Lecture with Documents**:
```bash
curl -X POST http://localhost:3000/organization/api/v1/lectures/with-documents/1 \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "title=Test Lecture with Docs" \
  -F "description=A test lecture with documents" \
  -F "isPublic=true" \
  -F "documents=@./test-document.pdf"
```

### Using Postman

1. Set up Authorization header with Bearer token
2. For file uploads, use form-data body type
3. Add files using the file selection in Postman
4. Include other form fields as text values

---

## Production Considerations

### Security
- Always use HTTPS in production
- Implement proper JWT token validation
- Validate file types and sizes on server side
- Sanitize file names to prevent path traversal attacks
- Use signed URLs for S3 access when needed

### Performance
- Implement caching for frequently accessed lectures
- Use CDN for static document delivery
- Optimize database queries with proper indexing
- Monitor S3 usage and costs

### Monitoring
- Log all API requests and responses
- Monitor file upload success/failure rates
- Track S3 storage usage and costs
- Set up alerts for error rates and response times

---

## Change Log

### Version 1.0.0
- Initial API implementation
- Basic CRUD operations for lectures
- File upload to S3 integration
- JWT-based authentication
- Role-based access control
- Comprehensive error handling

---

## Support

For API support and questions:
- Development Team: [dev@suraksha.com]
- Documentation: Available at `/api/docs` (Swagger UI)
- Status Page: [status.suraksha.com]
