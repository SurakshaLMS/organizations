# Organization Enrollment API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Enrollment Process](#enrollment-process)
4. [Organization Management APIs](#organization-management-apis)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

## Overview

This documentation covers the complete organization enrollment system and management APIs. The system supports both INSTITUTE and GLOBAL organizations with comprehensive user management features.

**Base URL:** `http://localhost:3000/organization/api/v1/organizations`

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### User Roles
- **MEMBER**: Basic organization member
- **MODERATOR**: Can moderate content and discussions
- **ADMIN**: Can manage members and organization settings
- **PRESIDENT**: Full organization control including deletion

## Enrollment Process

The enrollment process consists of several steps:

### 1. Discover Organizations

#### Get All Organizations
```http
GET /organizations
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | string | No | Page number (default: 1) |
| limit | string | No | Items per page (default: 10, max: 100) |
| sortBy | string | No | Sort field: name, createdAt, memberCount, causeCount |
| sortOrder | string | No | Sort order: asc, desc (default: desc) |
| search | string | No | Search organizations by name |

**Response:**
```json
{
  "data": [
    {
      "organizationId": "27",
      "name": "Computer Science Student Association",
      "type": "INSTITUTE",
      "isPublic": true,
      "enrollmentKey": "CS2024",
      "createdAt": "2025-07-30T10:30:00.000Z",
      "updatedAt": "2025-07-30T10:30:00.000Z",
      "memberCount": 15,
      "causeCount": 3,
      "institute": {
        "instituteId": "1",
        "name": "Harvard University",
        "imageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 10,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

#### Get Organizations by Institute
```http
GET /organizations/institute/{instituteId}
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| instituteId | string | Yes | Institute ID |

**Query Parameters:** Same as Get All Organizations

**Response:** Same structure as Get All Organizations

### 2. View Organization Details

#### Get Organization by ID
```http
GET /organizations/{id}
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Organization ID (UUID) |

**Response:**
```json
{
  "organizationId": "27",
  "name": "Computer Science Student Association",
  "type": "INSTITUTE",
  "description": "A community for computer science students to collaborate and learn",
  "isPublic": true,
  "enrollmentKey": "CS2024",
  "createdAt": "2025-07-30T10:30:00.000Z",
  "updatedAt": "2025-07-30T10:30:00.000Z",
  "memberCount": 15,
  "causeCount": 3,
  "userRole": "MEMBER", // Only if user is authenticated and is a member
  "institute": {
    "instituteId": "1",
    "name": "Harvard University",
    "imageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800"
  },
  "recentCauses": [
    {
      "causeId": "101",
      "title": "Climate Change Awareness",
      "description": "Educating students about climate science",
      "isPublic": true,
      "createdAt": "2025-07-30T10:30:00.000Z"
    }
  ]
}
```

### 3. Enroll in Organization

#### Enroll User
```http
POST /organizations/enroll
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "organizationId": "27",
  "enrollmentKey": "CS2024"
}
```

**Request Body Schema:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| organizationId | string | Yes | Organization ID to enroll in |
| enrollmentKey | string | Yes | Organization's enrollment key |

**Success Response (201):**
```json
{
  "message": "Successfully enrolled in organization",
  "enrollment": {
    "organizationId": "27",
    "userId": "15",
    "role": "MEMBER",
    "isVerified": false,
    "createdAt": "2025-07-30T12:00:00.000Z"
  },
  "organization": {
    "name": "Computer Science Student Association",
    "type": "INSTITUTE",
    "institute": {
      "name": "Harvard University"
    }
  },
  "nextSteps": {
    "verification": "Your enrollment is pending verification by an admin",
    "accessLevel": "Limited access until verified"
  }
}
```

**Error Responses:**

*Already Enrolled (400):*
```json
{
  "statusCode": 400,
  "message": "User is already enrolled in this organization",
  "error": "Bad Request",
  "details": {
    "currentRole": "MEMBER",
    "enrolledAt": "2025-07-29T10:00:00.000Z"
  }
}
```

*Invalid Enrollment Key (400):*
```json
{
  "statusCode": 400,
  "message": "Invalid enrollment key",
  "error": "Bad Request"
}
```

*Organization Not Found (404):*
```json
{
  "statusCode": 404,
  "message": "Organization not found",
  "error": "Not Found"
}
```

### 4. Verification Process

#### Verify User (Admin Only)
```http
PUT /organizations/{id}/verify
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Organization ID |

**Request Body:**
```json
{
  "userId": "15",
  "isVerified": true
}
```

**Request Body Schema:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | User ID to verify |
| isVerified | boolean | Yes | Verification status |

**Success Response (200):**
```json
{
  "message": "User verification updated successfully",
  "user": {
    "userId": "15",
    "name": "John Doe",
    "email": "john.doe@university.edu",
    "role": "MEMBER",
    "isVerified": true,
    "verifiedAt": "2025-07-30T12:30:00.000Z"
  }
}
```

### 5. Member Management

#### Get Organization Members
```http
GET /organizations/{id}/members
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Organization ID |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | string | No | Page number (default: 1) |
| limit | string | No | Items per page (default: 10) |
| sortBy | string | No | Sort field: name, role, createdAt, lastActive |
| sortOrder | string | No | Sort order: asc, desc |
| search | string | No | Search members by name or email |

**Response:**
```json
{
  "data": [
    {
      "userId": "15",
      "name": "John Doe",
      "email": "john.doe@university.edu",
      "role": "MEMBER",
      "isVerified": true,
      "isActive": true,
      "joinedAt": "2025-07-30T10:00:00.000Z",
      "lastActiveAt": "2025-07-30T11:45:00.000Z"
    },
    {
      "userId": "16",
      "name": "Jane Smith",
      "email": "jane.smith@university.edu",
      "role": "ADMIN",
      "isVerified": true,
      "isActive": true,
      "joinedAt": "2025-07-29T09:00:00.000Z",
      "lastActiveAt": "2025-07-30T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "summary": {
    "totalMembers": 15,
    "verifiedMembers": 12,
    "pendingVerification": 3,
    "roleDistribution": {
      "PRESIDENT": 1,
      "ADMIN": 2,
      "MODERATOR": 3,
      "MEMBER": 9
    }
  }
}
```

### 6. Leave Organization

#### Leave Organization
```http
DELETE /organizations/{id}/leave
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Organization ID |

**Success Response (200):**
```json
{
  "message": "Successfully left the organization",
  "organization": {
    "name": "Computer Science Student Association",
    "leftAt": "2025-07-30T13:00:00.000Z"
  }
}
```

## Organization Management APIs

### Create Organization

#### Create Organization
```http
POST /organizations
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "AI Research Group",
  "description": "Advanced AI research and development community",
  "type": "INSTITUTE",
  "isPublic": true,
  "enrollmentKey": "AI2024",
  "instituteId": "1"
}
```

**Request Body Schema:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Organization name (max 100 chars) |
| description | string | No | Organization description |
| type | string | Yes | INSTITUTE or GLOBAL |
| isPublic | boolean | No | Public visibility (default: true) |
| enrollmentKey | string | Yes | Unique enrollment key |
| instituteId | string | No | Required if type is INSTITUTE |

**Success Response (201):**
```json
{
  "organizationId": "37",
  "name": "AI Research Group",
  "description": "Advanced AI research and development community",
  "type": "INSTITUTE",
  "isPublic": true,
  "enrollmentKey": "AI2024",
  "createdAt": "2025-07-30T13:30:00.000Z",
  "creatorRole": "PRESIDENT",
  "institute": {
    "instituteId": "1",
    "name": "Harvard University"
  }
}
```

### Update Organization

#### Update Organization
```http
PUT /organizations/{id}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Advanced AI Research Group",
  "description": "Updated description",
  "isPublic": false,
  "enrollmentKey": "AI2024_NEW"
}
```

### Delete Organization

#### Delete Organization
```http
DELETE /organizations/{id}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "message": "Organization deleted successfully",
  "deletedAt": "2025-07-30T14:00:00.000Z"
}
```

### User Dashboard

#### Get User Dashboard
```http
GET /organizations/user/dashboard
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| search | string | No | Search organizations by name |

**Response:**
```json
{
  "organizations": [
    {
      "organizationId": "27",
      "userRole": "ADMIN",
      "compactFormat": "A27"
    },
    {
      "organizationId": "28",
      "userRole": "MEMBER",
      "compactFormat": "M28"
    }
  ],
  "compactAccess": ["A27", "M28"],
  "statistics": {
    "totalOrganizations": 2,
    "organizationsByRole": {
      "PRESIDENT": 0,
      "ADMIN": 1,
      "MODERATOR": 0,
      "MEMBER": 1
    },
    "compactTokenSize": 12,
    "tokenSizeReduction": "80-90%"
  },
  "performanceMetrics": {
    "source": "COMPACT_JWT_TOKEN",
    "databaseCalls": 0,
    "responseTime": "sub-5ms",
    "dataFreshness": "token_based",
    "tokenOptimization": {
      "compactFormat": true,
      "sizeReduction": "80-90%",
      "format": "RoleCodeOrganizationId",
      "example": "A27"
    }
  }
}
```

### Institute Management

#### Get Available Institutes
```http
GET /organizations/institutes/available
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | string | No | Page number |
| limit | string | No | Items per page |
| search | string | No | Search institutes by name |

**Response:**
```json
{
  "data": [
    {
      "instituteId": "1",
      "name": "Harvard University",
      "imageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800",
      "organizationCount": 5,
      "totalMembers": 250
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "totalPages": 1
  }
}
```

#### Assign Organization to Institute
```http
PUT /organizations/{id}/assign-institute
```

**Request Body:**
```json
{
  "instituteId": "2"
}
```

#### Remove Organization from Institute
```http
DELETE /organizations/{id}/remove-institute
```

### Organization Causes

#### Get Organization Causes
```http
GET /organizations/{id}/causes
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | string | No | Page number |
| limit | string | No | Items per page |
| search | string | No | Search causes by title |

**Response:**
```json
{
  "data": [
    {
      "causeId": "101",
      "title": "Climate Change Awareness",
      "description": "Educating students about climate science",
      "isPublic": true,
      "introVideoUrl": "https://videos.example.com/climate-change.mp4",
      "createdAt": "2025-07-30T10:30:00.000Z",
      "lectureCount": 3,
      "assignmentCount": 2
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3
  }
}
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "enrollmentKey",
      "message": "enrollmentKey must be a string"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required role: ADMIN",
  "error": "Forbidden",
  "requiredRole": "ADMIN",
  "userRole": "MEMBER"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Organization not found",
  "error": "Not Found"
}
```

#### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Please try again later.",
  "error": "Too Many Requests",
  "retryAfter": 60
}
```

#### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error",
  "timestamp": "2025-07-30T14:00:00.000Z",
  "path": "/organization/api/v1/organizations/enroll"
}
```

## Rate Limiting

### Rate Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| Create Organization | 5 requests | 1 minute |
| Enroll in Organization | 10 requests | 1 minute |
| Get Organizations | 50 requests | 1 minute |
| Update Organization | 10 requests | 1 minute |
| Delete Organization | 2 requests | 5 minutes |
| User Dashboard | 30 requests | 1 minute |
| Organization Details | 100 requests | 1 minute |

### Rate Limit Headers

When approaching rate limits, responses include headers:
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1627734000
```

## Enrollment Flow Examples

### Example 1: Student Enrolling in Computer Science Club

1. **Discover Organizations**
   ```http
   GET /organizations?search=computer&type=INSTITUTE
   ```

2. **View Organization Details**
   ```http
   GET /organizations/27
   ```

3. **Enroll**
   ```http
   POST /organizations/enroll
   {
     "organizationId": "27",
     "enrollmentKey": "CS2024"
   }
   ```

4. **Wait for Verification** (Admin approves)

5. **Access Organization Content**

### Example 2: Creating a New Research Group

1. **Create Organization**
   ```http
   POST /organizations
   {
     "name": "Quantum Computing Research",
     "type": "INSTITUTE",
     "instituteId": "1",
     "enrollmentKey": "QUANTUM2024"
   }
   ```

2. **Invite Members** (Share enrollment key)

3. **Verify Members**
   ```http
   PUT /organizations/38/verify
   {
     "userId": "20",
     "isVerified": true
   }
   ```

### Example 3: Managing Organization Members

1. **View Members**
   ```http
   GET /organizations/27/members?sortBy=role&sortOrder=desc
   ```

2. **Search for Specific Member**
   ```http
   GET /organizations/27/members?search=john.doe
   ```

This comprehensive documentation covers all aspects of the organization enrollment system, from discovery to management, with detailed request/response examples and error handling scenarios.
