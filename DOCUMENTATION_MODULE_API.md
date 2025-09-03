# Documentation Module API Reference

## Overview
The Documentation module provides enterprise-grade document management functionality for lectures. It allows users to create, manage, and organize documentation related to specific lectures within organizations.

## Features
- **JWT-based Authentication**: All endpoints require valid JWT tokens
- **Role-based Access Control**: Different operations require different permission levels
- **Organization-scoped Access**: Users can only access documentation from their organization
- **Advanced Search**: Full-text search across title, description, and content
- **Pagination Support**: Efficient pagination for large datasets
- **File URL Management**: Support for external document URLs

## API Endpoints

### 1. Create Documentation
**POST** `/documentation`

Creates new documentation for a lecture.

**Authentication**: Required (JWT)
**Required Role**: Member or higher

**Request Body**:
```typescript
{
  lectureId: string;     // Required: Numeric string (e.g., "123")
  title: string;         // Required: Documentation title
  description?: string;  // Optional: Brief description
  content?: string;      // Optional: Full content/body
  docUrl?: string;       // Optional: URL to external document
}
```

**Response**:
```typescript
{
  id: string;
  lectureId: string;
  title: string;
  description?: string;
  content?: string;
  docUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lecture?: {
    id: string;
    title: string;
    causeId: string;
  };
}
```

**Status Codes**:
- `201`: Documentation created successfully
- `401`: Unauthorized - JWT token required
- `403`: Forbidden - Insufficient permissions
- `404`: Lecture not found

---

### 2. Get All Documentation
**GET** `/documentation`

Retrieves all documentation accessible to the authenticated user with pagination and filtering.

**Authentication**: Required (JWT)
**Required Role**: Member or higher

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order - "asc" or "desc" (default: desc)
- `search` (optional): Search term for title, description, or content
- `lectureId` (optional): Filter by specific lecture ID

**Response**:
```typescript
{
  data: DocumentationResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta: {
    sortBy: string;
    sortOrder: string;
    search?: string;
  };
}
```

---

### 3. Get Documentation by ID
**GET** `/documentation/:id`

Retrieves a specific documentation by ID.

**Authentication**: Required (JWT)
**Required Role**: Member or higher

**Parameters**:
- `id`: Documentation ID

**Response**: Same as Create Documentation response

**Status Codes**:
- `200`: Documentation retrieved successfully
- `401`: Unauthorized - JWT token required
- `403`: Forbidden - Insufficient permissions
- `404`: Documentation not found

---

### 4. Update Documentation
**PUT** `/documentation/:id`

Updates existing documentation.

**Authentication**: Required (JWT)
**Required Role**: Moderator or higher

**Parameters**:
- `id`: Documentation ID

**Request Body**:
```typescript
{
  title?: string;
  description?: string;
  content?: string;
  docUrl?: string;
}
```

**Response**: Same as Create Documentation response

**Status Codes**:
- `200`: Documentation updated successfully
- `401`: Unauthorized - JWT token required
- `403`: Forbidden - Moderator access required
- `404`: Documentation not found

---

### 5. Delete Documentation
**DELETE** `/documentation/:id`

Deletes documentation permanently.

**Authentication**: Required (JWT)
**Required Role**: Admin or higher

**Parameters**:
- `id`: Documentation ID

**Response**:
```typescript
{
  message: string;
}
```

**Status Codes**:
- `200`: Documentation deleted successfully
- `401`: Unauthorized - JWT token required
- `403`: Forbidden - Admin access required
- `404`: Documentation not found

---

### 6. Get Documentation by Lecture
**GET** `/documentation/lecture/:lectureId`

Retrieves all documentation for a specific lecture.

**Authentication**: Required (JWT)
**Required Role**: Member or higher

**Parameters**:
- `lectureId`: Lecture ID

**Query Parameters**:
- `page` (optional): Page number
- `limit` (optional): Items per page
- `sortBy` (optional): Sort field
- `sortOrder` (optional): Sort order

**Response**: Same as Get All Documentation response

**Status Codes**:
- `200`: Documentation retrieved successfully
- `401`: Unauthorized - JWT token required
- `403`: Forbidden - Insufficient permissions
- `404`: Lecture not found

---

## Access Control

### Role Hierarchy
1. **Member**: Can view and create documentation
2. **Moderator**: Can view, create, and update documentation
3. **Admin**: Can view, create, update, and delete documentation
4. **President**: Full access to all operations

### Organization Scope
- Users can only access documentation from lectures within their organization
- All operations are automatically scoped to the user's accessible organizations
- Cross-organization access is strictly forbidden

---

## Error Handling

### Common Error Responses

**401 Unauthorized**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**403 Forbidden**:
```json
{
  "statusCode": 403,
  "message": "Access denied: You do not have permission to perform this action",
  "error": "Forbidden"
}
```

**404 Not Found**:
```json
{
  "statusCode": 404,
  "message": "Documentation with ID 123 not found",
  "error": "Not Found"
}
```

**400 Bad Request**:
```json
{
  "statusCode": 400,
  "message": ["lectureId must be a numeric string"],
  "error": "Bad Request"
}
```

---

## Usage Examples

### Creating Documentation
```bash
curl -X POST /documentation \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lectureId": "123",
    "title": "Lecture Notes - Introduction to APIs",
    "description": "Comprehensive notes covering API fundamentals",
    "content": "# API Fundamentals\n\nThis lecture covers...",
    "docUrl": "https://example.com/lecture-notes.pdf"
  }'
```

### Searching Documentation
```bash
curl -X GET "/documentation?search=API&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Getting Lecture Documentation
```bash
curl -X GET "/documentation/lecture/123?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Database Schema

### Documentation Table (`org_documentation`)
```sql
CREATE TABLE org_documentation (
  documentationId BIGINT PRIMARY KEY AUTO_INCREMENT,
  lectureId BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  description TEXT,
  docUrl VARCHAR(500),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lectureId) REFERENCES org_lectures(lectureId) ON DELETE CASCADE,
  INDEX idx_lecture_id (lectureId)
);
```

### Relationships
- **Documentation** → **Lecture** (Many-to-One)
- **Lecture** → **Cause** (Many-to-One)
- **Cause** → **Organization** (Many-to-One)

---

## Security Features

1. **JWT Token Validation**: All endpoints validate JWT tokens
2. **Organization Access Control**: Users can only access their organization's data
3. **Role-based Permissions**: Different operations require different role levels
4. **Input Validation**: All inputs are validated using DTOs
5. **SQL Injection Prevention**: Using Prisma ORM with parameterized queries
6. **Cross-organization Protection**: Automatic filtering by organization membership

---

## Performance Optimizations

1. **Minimal Database Joins**: Only necessary relations are included
2. **Efficient Pagination**: Database-level pagination with limits
3. **Organization Filtering**: Pre-filtered queries based on JWT token
4. **Index Usage**: Proper database indexes for fast lookups
5. **Caching Ready**: Service layer designed for easy caching integration
