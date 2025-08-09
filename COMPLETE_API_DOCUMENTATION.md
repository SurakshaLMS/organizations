# 📚 Complete Organization Service API Documentation

## 📋 Overview

**Organization Service API** provides comprehensive organization and user management with role-based access control, JWT authentication, and advanced security features.

**Base URL:** `http://localhost:3003/organization/api/v1`

**Swagger UI:** `http://localhost:3003/api/docs`

---

## 🔐 Authentication System

### JWT Token Structure
```json
{
  "sub": "123456789",
  "email": "user@example.com",
  "name": "John Doe",
  "orgAccess": ["Porg-456", "Aorg-789", "Morg-101"],
  "isGlobalAdmin": true,
  "iat": 1692547200,
  "exp": 1692633600
}
```

### Organization Access Format
- **P**: PRESIDENT role
- **A**: ADMIN role  
- **M**: MODERATOR role
- **E**: MEMBER role
- Format: `{ROLE}org-{ORG_ID}`

### Role Hierarchy
```
PRESIDENT (Level 4) - Full organization control
    ↓
ADMIN (Level 3) - Organization management
    ↓
MODERATOR (Level 2) - Content moderation  
    ↓
MEMBER (Level 1) - Basic membership
```

---

## 🏢 Organizations API

### 1. Get All Organizations

**GET** `/organizations`

**Access Level:** Public (authenticated users see all, non-authenticated see only public)

**Rate Limit:** 50 requests/minute

**Query Parameters:**
```json
{
  "page": 1,
  "limit": 20,
  "search": "tech",
  "type": "INSTITUTE",
  "sortBy": "name",
  "sortOrder": "asc"
}
```

**Request Example:**
```http
GET /organizations?page=1&limit=10&search=tech&type=INSTITUTE
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "456",
      "name": "Tech Innovation Club",
      "type": "INSTITUTE",
      "isPublic": true,
      "instituteId": "123",
      "userRole": "ADMIN",
      "memberCount": 25,
      "causeCount": 8
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

**Error Responses:**
```json
// 400 - Invalid query parameters
{
  "statusCode": 400,
  "message": "Invalid page number",
  "error": "Bad Request"
}

// 429 - Rate limit exceeded
{
  "statusCode": 429,
  "message": "Too many requests",
  "error": "Too Many Requests"
}
```

---

### 2. Get Organization by ID

**GET** `/organizations/:id`

**Access Level:** Public (public orgs), Authenticated (private orgs)

**Rate Limit:** 100 requests/minute

**Path Parameters:**
- `id` (string, required): Organization ID

**Request Example:**
```http
GET /organizations/456
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "id": "456",
  "name": "Tech Innovation Club",
  "type": "INSTITUTE",
  "isPublic": true,
  "instituteId": "123",
  "description": "A club for technology enthusiasts",
  "userRole": "ADMIN",
  "memberCount": 25,
  "causeCount": 8
}
```

**Error Responses:**
```json
// 404 - Organization not found
{
  "statusCode": 404,
  "message": "Organization not found",
  "error": "Not Found"
}

// 403 - Private organization access denied
{
  "statusCode": 403,
  "message": "Access denied to private organization",
  "error": "Forbidden"
}
```

---

### 3. Get Organization Members

**GET** `/organizations/:id/members`

**Access Level:** ADMIN/PRESIDENT

**Rate Limit:** 50 requests/minute

**Query Parameters:**
```json
{
  "page": 1,
  "limit": 20,
  "search": "john",
  "role": "ADMIN",
  "sortBy": "joinedAt",
  "sortOrder": "desc"
}
```

**Request Example:**
```http
GET /organizations/456/members?page=1&limit=10&role=ADMIN
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "data": [
    {
      "userId": "789",
      "name": "John Smith",
      "email": "john@example.com",
      "role": "ADMIN",
      "joinedAt": "2025-01-15T10:30:00Z",
      "isVerified": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### 4. Get Organization Causes

**GET** `/organizations/:id/causes`

**Access Level:** MEMBER or higher

**Rate Limit:** 50 requests/minute

**Query Parameters:**
```json
{
  "page": 1,
  "limit": 20,
  "search": "environment",
  "status": "ACTIVE",
  "sortBy": "createdAt",
  "sortOrder": "desc"
}
```

**Request Example:**
```http
GET /organizations/456/causes?page=1&limit=10&status=ACTIVE
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "101",
      "title": "Environmental Awareness",
      "description": "Promoting environmental consciousness",
      "status": "ACTIVE",
      "createdAt": "2025-01-10T14:20:00Z",
      "createdByUserId": "789"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### 5. Create Organization

**POST** `/organizations`

**Access Level:** Authenticated

**Rate Limit:** 5 requests/minute

**Request Body:**
```json
{
  "name": "Innovation Hub",
  "type": "INSTITUTE",
  "isPublic": true,
  "description": "A hub for innovation and creativity",
  "enrollmentKey": "TECH2025"
}
```

**Request Example:**
```http
POST /organizations
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "name": "Innovation Hub",
  "type": "INSTITUTE",
  "isPublic": true,
  "description": "A hub for innovation and creativity",
  "enrollmentKey": "TECH2025"
}
```

**Response (201):**
```json
{
  "id": "567",
  "name": "Innovation Hub",
  "type": "INSTITUTE",
  "isPublic": true,
  "description": "A hub for innovation and creativity",
  "instituteId": "123",
  "createdAt": "2025-08-10T15:30:00Z",
  "userRole": "PRESIDENT"
}
```

**Error Responses:**
```json
// 400 - Validation error
{
  "statusCode": 400,
  "message": [
    "name must be between 3 and 100 characters",
    "type must be a valid organization type"
  ],
  "error": "Bad Request"
}

// 409 - Organization name already exists
{
  "statusCode": 409,
  "message": "Organization name already exists",
  "error": "Conflict"
}
```

---

### 6. Update Organization

**PUT** `/organizations/:id`

**Access Level:** ADMIN/PRESIDENT

**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
  "name": "Updated Innovation Hub",
  "description": "Updated description",
  "isPublic": false,
  "enrollmentKey": "NEWKEY2025"
}
```

**Request Example:**
```http
PUT /organizations/567
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "name": "Updated Innovation Hub",
  "description": "Updated description",
  "isPublic": false
}
```

**Response (200):**
```json
{
  "id": "567",
  "name": "Updated Innovation Hub",
  "type": "INSTITUTE",
  "isPublic": false,
  "description": "Updated description",
  "instituteId": "123",
  "updatedAt": "2025-08-10T16:00:00Z"
}
```

---

### 7. Delete Organization

**DELETE** `/organizations/:id`

**Access Level:** PRESIDENT only

**Rate Limit:** 2 requests/minute

**Request Example:**
```http
DELETE /organizations/567
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "message": "Organization deleted successfully",
  "deletedAt": "2025-08-10T16:30:00Z"
}
```

**Error Responses:**
```json
// 403 - Insufficient permissions
{
  "statusCode": 403,
  "message": "Only organization president can delete organization",
  "error": "Forbidden",
  "requiredRole": "PRESIDENT",
  "userRole": "ADMIN"
}
```

---

### 8. Enroll in Organization

**POST** `/organizations/enroll`

**Access Level:** Authenticated

**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
  "enrollmentKey": "TECH2025"
}
```

**Request Example:**
```http
POST /organizations/enroll
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "enrollmentKey": "TECH2025"
}
```

**Response (200):**
```json
{
  "message": "Successfully enrolled in organization",
  "organization": {
    "id": "456",
    "name": "Tech Innovation Club",
    "role": "MEMBER"
  },
  "enrolledAt": "2025-08-10T17:00:00Z"
}
```

---

## 🔧 Organization Management API

### Base Path: `/organizations/:id/management`

---

### 1. Get Organization Members (Management)

**GET** `/organizations/:id/management/members`

**Access Level:** ADMIN/PRESIDENT

**Rate Limit:** 50 requests/minute

**Query Parameters:**
```json
{
  "page": 1,
  "limit": 20,
  "search": "john",
  "role": "ADMIN",
  "sortBy": "joinedAt",
  "sortOrder": "desc"
}
```

**Request Example:**
```http
GET /organizations/456/management/members?page=1&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "data": [
    {
      "userId": "789",
      "name": "John Smith",
      "email": "john@example.com",
      "role": "ADMIN",
      "joinedAt": "2025-01-15T10:30:00Z",
      "isVerified": true,
      "lastActiveAt": "2025-08-10T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "summary": {
    "totalMembers": 25,
    "roleDistribution": {
      "PRESIDENT": 1,
      "ADMIN": 3,
      "MODERATOR": 5,
      "MEMBER": 16
    }
  }
}
```

---

### 2. Create Organization (Management)

**POST** `/organizations/:id/management/create`

**Access Level:** Authenticated

**Rate Limit:** 5 requests/minute

**Request Body:**
```json
{
  "name": "Research Society",
  "type": "INSTITUTE",
  "isPublic": true,
  "description": "Academic research and collaboration",
  "enrollmentKey": "RESEARCH2025"
}
```

**Request Example:**
```http
POST /organizations/456/management/create
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "name": "Research Society",
  "type": "INSTITUTE",
  "isPublic": true,
  "description": "Academic research and collaboration",
  "enrollmentKey": "RESEARCH2025"
}
```

**Response (201):**
```json
{
  "id": "678",
  "name": "Research Society",
  "type": "INSTITUTE",
  "isPublic": true,
  "description": "Academic research and collaboration",
  "instituteId": "123",
  "createdAt": "2025-08-10T18:00:00Z",
  "createdBy": "789",
  "userRole": "PRESIDENT"
}
```

---

### 3. Update Organization (Management)

**PUT** `/organizations/:id/management`

**Access Level:** ADMIN/PRESIDENT

**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
  "name": "Updated Research Society",
  "description": "Updated description for research society",
  "isPublic": false,
  "enrollmentKey": "RESEARCH2025_NEW"
}
```

**Response (200):**
```json
{
  "id": "678",
  "name": "Updated Research Society",
  "description": "Updated description for research society",
  "isPublic": false,
  "updatedAt": "2025-08-10T18:30:00Z",
  "updatedBy": "789"
}
```

---

### 4. Delete Organization (Management)

**DELETE** `/organizations/:id/management`

**Access Level:** PRESIDENT only

**Rate Limit:** 2 requests/minute

**Request Example:**
```http
DELETE /organizations/678/management
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "message": "Organization deleted successfully",
  "organizationId": "678",
  "deletedAt": "2025-08-10T19:00:00Z",
  "deletedBy": "789",
  "membersNotified": 25
}
```

---

### 5. Assign User Role

**POST** `/organizations/:id/management/assign-role`

**Access Level:** ADMIN/PRESIDENT

**Rate Limit:** 20 requests/minute

**Request Body:**
```json
{
  "userId": "890",
  "role": "ADMIN"
}
```

**Request Example:**
```http
POST /organizations/456/management/assign-role
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "userId": "890",
  "role": "ADMIN"
}
```

**Response (200):**
```json
{
  "message": "User role assigned successfully",
  "userId": "890",
  "organizationId": "456",
  "role": "ADMIN",
  "assignedBy": "789",
  "assignedAt": "2025-08-10T19:30:00Z"
}
```

**Error Responses:**
```json
// 400 - Invalid role assignment
{
  "statusCode": 400,
  "message": "Cannot assign PRESIDENT role. Use transfer-presidency endpoint.",
  "error": "Bad Request"
}

// 403 - Insufficient permissions
{
  "statusCode": 403,
  "message": "Cannot assign role higher than your own",
  "error": "Forbidden",
  "userRole": "ADMIN",
  "attemptedRole": "PRESIDENT"
}

// 404 - User not found
{
  "statusCode": 404,
  "message": "User not found or not a member of organization",
  "error": "Not Found"
}
```

---

### 6. Change User Role

**PUT** `/organizations/:id/management/change-role`

**Access Level:** ADMIN/PRESIDENT

**Rate Limit:** 20 requests/minute

**Request Body:**
```json
{
  "userId": "890",
  "newRole": "MODERATOR"
}
```

**Request Example:**
```http
PUT /organizations/456/management/change-role
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "userId": "890",
  "newRole": "MODERATOR"
}
```

**Response (200):**
```json
{
  "message": "User role changed successfully",
  "userId": "890",
  "organizationId": "456",
  "previousRole": "ADMIN",
  "newRole": "MODERATOR",
  "changedBy": "789",
  "changedAt": "2025-08-10T20:00:00Z"
}
```

---

### 7. Remove User from Organization

**DELETE** `/organizations/:id/management/remove-user`

**Access Level:** ADMIN/PRESIDENT

**Rate Limit:** 20 requests/minute

**Request Body:**
```json
{
  "userId": "890",
  "reason": "Violation of organization policies"
}
```

**Request Example:**
```http
DELETE /organizations/456/management/remove-user
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "userId": "890",
  "reason": "Violation of organization policies"
}
```

**Response (200):**
```json
{
  "message": "User removed from organization successfully",
  "userId": "890",
  "organizationId": "456",
  "removedBy": "789",
  "removedAt": "2025-08-10T20:30:00Z",
  "reason": "Violation of organization policies"
}
```

**Error Responses:**
```json
// 403 - Cannot remove higher role
{
  "statusCode": 403,
  "message": "Cannot remove user with higher or equal role",
  "error": "Forbidden",
  "userRole": "ADMIN",
  "targetUserRole": "PRESIDENT"
}

// 400 - Cannot remove president
{
  "statusCode": 400,
  "message": "Cannot remove organization president. Transfer presidency first.",
  "error": "Bad Request"
}
```

---

### 8. Transfer Presidency

**PUT** `/organizations/:id/management/transfer-presidency`

**Access Level:** PRESIDENT only

**Rate Limit:** 5 requests/minute

**Request Body:**
```json
{
  "newPresidentUserId": "890"
}
```

**Request Example:**
```http
PUT /organizations/456/management/transfer-presidency
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "newPresidentUserId": "890"
}
```

**Response (200):**
```json
{
  "message": "Presidency transferred successfully",
  "organizationId": "456",
  "previousPresidentId": "789",
  "newPresidentId": "890",
  "transferredAt": "2025-08-10T21:00:00Z",
  "previousPresidentNewRole": "ADMIN"
}
```

**Error Responses:**
```json
// 403 - Only president can transfer
{
  "statusCode": 403,
  "message": "Only organization president can transfer presidency",
  "error": "Forbidden",
  "requiredRole": "PRESIDENT",
  "userRole": "ADMIN"
}

// 400 - Cannot transfer to self
{
  "statusCode": 400,
  "message": "Cannot transfer presidency to yourself",
  "error": "Bad Request"
}

// 404 - Target user not found
{
  "statusCode": 404,
  "message": "Target user not found or not a member of organization",
  "error": "Not Found"
}
```

---

## 🎯 Causes API

### 1. Get All Causes

**GET** `/causes`

**Access Level:** Public

**Rate Limit:** 50 requests/minute

**Query Parameters:**
```json
{
  "page": 1,
  "limit": 20,
  "search": "environment",
  "organizationId": "456",
  "status": "ACTIVE",
  "sortBy": "createdAt",
  "sortOrder": "desc"
}
```

**Request Example:**
```http
GET /causes?page=1&limit=10&organizationId=456&status=ACTIVE
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "101",
      "title": "Environmental Awareness Campaign",
      "description": "Promoting sustainable practices",
      "status": "ACTIVE",
      "organizationId": "456",
      "organizationName": "Tech Innovation Club",
      "createdAt": "2025-08-01T10:00:00Z",
      "createdByUserId": "789",
      "createdByName": "John Smith"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### 2. Get Cause by ID

**GET** `/causes/:id`

**Access Level:** Public

**Rate Limit:** 100 requests/minute

**Request Example:**
```http
GET /causes/101
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "id": "101",
  "title": "Environmental Awareness Campaign",
  "description": "Promoting sustainable practices and environmental consciousness among students",
  "status": "ACTIVE",
  "organizationId": "456",
  "organizationName": "Tech Innovation Club",
  "createdAt": "2025-08-01T10:00:00Z",
  "updatedAt": "2025-08-05T14:30:00Z",
  "createdByUserId": "789",
  "createdByName": "John Smith",
  "lectureCount": 5,
  "canEdit": true
}
```

---

### 3. Create Cause

**POST** `/causes`

**Access Level:** MODERATOR or higher

**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
  "title": "Digital Literacy Initiative",
  "description": "Teaching digital skills to underserved communities",
  "organizationId": "456"
}
```

**Request Example:**
```http
POST /causes
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "title": "Digital Literacy Initiative",
  "description": "Teaching digital skills to underserved communities",
  "organizationId": "456"
}
```

**Response (201):**
```json
{
  "id": "102",
  "title": "Digital Literacy Initiative",
  "description": "Teaching digital skills to underserved communities",
  "status": "ACTIVE",
  "organizationId": "456",
  "createdAt": "2025-08-10T22:00:00Z",
  "createdByUserId": "789"
}
```

---

### 4. Update Cause

**PUT** `/causes/:id`

**Access Level:** MODERATOR or higher (or cause creator)

**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
  "title": "Updated Digital Literacy Initiative",
  "description": "Enhanced program for teaching digital skills",
  "status": "ACTIVE"
}
```

**Response (200):**
```json
{
  "id": "102",
  "title": "Updated Digital Literacy Initiative",
  "description": "Enhanced program for teaching digital skills",
  "status": "ACTIVE",
  "updatedAt": "2025-08-10T22:30:00Z",
  "updatedByUserId": "789"
}
```

---

### 5. Delete Cause

**DELETE** `/causes/:id`

**Access Level:** ADMIN or higher (or cause creator)

**Rate Limit:** 5 requests/minute

**Response (200):**
```json
{
  "message": "Cause deleted successfully",
  "causeId": "102",
  "deletedAt": "2025-08-10T23:00:00Z"
}
```

---

## 🔐 Authentication API

### 1. User Login

**POST** `/auth/login`

**Access Level:** Public

**Rate Limit:** 20 requests/minute

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Request Example:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "789",
    "email": "user@example.com",
    "name": "John Smith",
    "organizationAccess": ["Porg-456", "Aorg-789"],
    "isGlobalAdmin": false
  },
  "expiresIn": 86400
}
```

**Error Responses:**
```json
// 401 - Invalid credentials
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}

// 423 - Account locked
{
  "statusCode": 423,
  "message": "Account locked due to multiple failed login attempts",
  "error": "Locked",
  "unlockAt": "2025-08-10T23:30:00Z"
}
```

---

### 2. Refresh Token

**POST** `/auth/refresh-token`

**Access Level:** Authenticated

**Rate Limit:** 30 requests/minute

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

---

### 3. Get User Profile

**GET** `/auth/profile`

**Access Level:** Authenticated

**Rate Limit:** 50 requests/minute

**Request Example:**
```http
GET /auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "id": "789",
  "email": "user@example.com",
  "name": "John Smith",
  "instituteId": "123",
  "organizationMemberships": [
    {
      "organizationId": "456",
      "organizationName": "Tech Innovation Club",
      "role": "PRESIDENT",
      "joinedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "isGlobalAdmin": false,
  "lastLoginAt": "2025-08-10T20:00:00Z"
}
```

---

## 🏛️ Institute Users API

### 1. Get Institute Users

**GET** `/institute-users`

**Access Level:** ADMIN or higher

**Rate Limit:** 30 requests/minute

**Query Parameters:**
```json
{
  "page": 1,
  "limit": 20,
  "search": "john",
  "role": "STUDENT",
  "sortBy": "name",
  "sortOrder": "asc"
}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "123",
      "name": "John Doe",
      "email": "john.doe@university.edu",
      "role": "STUDENT",
      "instituteId": "456",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### 2. Assign Institute User

**POST** `/institute-users/assign`

**Access Level:** ADMIN or higher

**Rate Limit:** 20 requests/minute

**Request Body:**
```json
{
  "userId": "123",
  "organizationId": "456",
  "role": "MEMBER"
}
```

**Response (200):**
```json
{
  "message": "User assigned to organization successfully",
  "userId": "123",
  "organizationId": "456",
  "role": "MEMBER",
  "assignedAt": "2025-08-10T23:30:00Z"
}
```

---

## 📊 Error Response Format

All error responses follow this consistent format:

```json
{
  "statusCode": 400,
  "message": "Detailed error message or array of validation errors",
  "error": "HTTP Error Name",
  "timestamp": "2025-08-10T23:45:00Z",
  "path": "/organizations/456/management/assign-role",
  "details": {
    "field": "Additional context about the error",
    "requiredRole": "ADMIN",
    "userRole": "MEMBER"
  }
}
```

### Common HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## 🔒 Security Features

### Rate Limiting
- **Global Limits**: 1000 requests/hour per IP
- **Authenticated Users**: Higher limits with JWT token
- **Endpoint-Specific**: Different limits for different operations
- **Sliding Window**: Advanced rate limiting algorithm

### Input Validation
- **DTO Validation**: Comprehensive request body validation
- **Query Parameter Validation**: Type and range checking
- **SQL Injection Prevention**: Prisma ORM protection
- **XSS Protection**: Input sanitization

### Security Headers
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **CSRF Protection**: Token-based CSRF prevention
- **Content Security Policy**: XSS prevention

### Audit Logging
- **Request Logging**: All API requests logged
- **Security Events**: Failed logins, permission denied
- **Data Changes**: Organization and user modifications
- **Performance Monitoring**: Response times and errors

---

## 🧪 Testing Examples

### Using curl

```bash
# Get organizations
curl -X GET "http://localhost:3003/organizations?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create organization
curl -X POST "http://localhost:3003/organizations/456/management/create" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Organization",
    "type": "INSTITUTE",
    "isPublic": true,
    "description": "Test description"
  }'

# Assign user role
curl -X POST "http://localhost:3003/organizations/456/management/assign-role" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "789",
    "role": "ADMIN"
  }'
```

### Using JavaScript/Fetch

```javascript
// Get organization members
const response = await fetch('/organizations/456/management/members?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const members = await response.json();

// Change user role
const roleResponse = await fetch('/organizations/456/management/change-role', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: '789',
    newRole: 'MODERATOR'
  })
});
```

---

## 🚀 Deployment Information

### Environment Variables
```env
DATABASE_URL=mysql://user:password@localhost:3306/db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d
RATE_LIMIT_TTL=60000
RATE_LIMIT_LIMIT=100
```

### Production Considerations
- **HTTPS Only**: Enforce SSL/TLS in production
- **Environment Secrets**: Use secure secret management
- **Database Connection**: Use connection pooling
- **Monitoring**: Implement health checks and metrics
- **Backup Strategy**: Regular database backups
- **Load Balancing**: Distribute traffic across instances

---

## 📞 Support

### API Documentation
- **Swagger UI**: http://localhost:3003/api/docs
- **OpenAPI Spec**: http://localhost:3003/api/docs-json

### Development Resources
- **Repository**: SurakshaLMS/organizations
- **Issue Tracking**: GitHub Issues
- **API Changes**: CHANGELOG.md

### Contact Information
- **Email**: support@surakshalms.com
- **Documentation**: https://docs.surakshalms.com
- **Status Page**: https://status.surakshalms.com

---

**Last Updated:** August 10, 2025  
**API Version:** v1.0.0  
**Documentation Version:** 2.0.0
