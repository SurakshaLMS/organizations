# Organization Service API Documentation

## 📋 Overview

This API provides a comprehensive organization management system with **enhanced password encryption** using AES-256-CBC encryption keys. The system supports multi-layer security with backward compatibility.

**Base URL:** `http://localhost:3000/api/v1`

**Authentication:** JWT Bearer Token (where specified)

---

## 🔐 Enhanced Security Features

- **Dual-Layer Password Security**: AES-256-CBC encryption + bcrypt hashing
- **Password Encryption Key**: 32-character encryption key for enhanced security
- **Backward Compatibility**: Supports existing bcrypt-only passwords
- **JWT Authentication**: Secure token-based authentication

---

## 🚀 Authentication Endpoints

### 1. User Login
**POST** `/auth/login`

Authenticates user credentials and returns JWT token with enhanced password validation.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "AdminPassword123!"
}
```

**Response (Success - 200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "cmd97yg5f0000v6b0woyhoxhx",
    "email": "admin@example.com",
    "name": "Admin User"
  }
}
```

**Response (Error - 401):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123!"
  }'
```

---

### 2. Setup Password
**POST** `/auth/setup-password`

Sets up password for first-time users with enhanced encryption.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (Success - 200):**
```json
{
  "message": "Password setup successful",
  "userId": "cmd97yg5f0000v6b0woyhoxhx"
}
```

**Response (Error - 409):**
```json
{
  "statusCode": 409,
  "message": "Password already set up. Use change password instead."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/setup-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "newPassword": "NewSecurePassword123!"
  }'
```

---

### 3. Change Password
**POST** `/auth/change-password`

Changes password for authenticated users with enhanced encryption.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewEnhancedPassword123!"
}
```

**Response (Success - 200):**
```json
{
  "message": "Password changed successfully"
}
```

**Response (Error - 401):**
```json
{
  "statusCode": 401,
  "message": "Current password is incorrect"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "currentPassword": "CurrentPassword123!",
    "newPassword": "NewEnhancedPassword123!"
  }'
```

---

### 4. Get User Profile
**POST** `/auth/profile`

Retrieves current user profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{}
```

**Response (Success - 200):**
```json
{
  "userId": "cmd97yg5f0000v6b0woyhoxhx",
  "email": "admin@example.com",
  "name": "Admin User"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{}'
```

---

## 🏢 Organization Management Endpoints

### 5. Create Organization
**POST** `/organizations`

Creates a new organization.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "Computer Science Department",
  "type": "INSTITUTE",
  "isPublic": true,
  "enrollmentKey": "CS2024"
}
```

**Response (Success - 201):**
```json
{
  "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
  "name": "Computer Science Department",
  "type": "INSTITUTE",
  "isPublic": true,
  "enrollmentKey": "CS2024",
  "createdAt": "2025-07-19T01:30:30.000Z"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Computer Science Department",
    "type": "INSTITUTE",
    "isPublic": true,
    "enrollmentKey": "CS2024"
  }'
```

---

### 6. Get Organizations
**GET** `/organizations`

Retrieves all organizations (public or user's organizations).

**Query Parameters:**
- `userId` (optional): Filter by user ID

**Response (Success - 200):**
```json
[
  {
    "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
    "name": "Computer Science Department",
    "type": "INSTITUTE",
    "isPublic": true,
    "memberCount": 25,
    "createdAt": "2025-07-19T01:30:30.000Z"
  }
]
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/organizations?userId=cmd97yg5f0000v6b0woyhoxhx"
```

---

### 7. Get Organization by ID
**GET** `/organizations/:id`

Retrieves specific organization details.

**Path Parameters:**
- `id`: Organization ID

**Query Parameters:**
- `userId` (optional): User ID for membership check

**Response (Success - 200):**
```json
{
  "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
  "name": "Computer Science Department",
  "type": "INSTITUTE",
  "isPublic": true,
  "enrollmentKey": "CS2024",
  "memberCount": 25,
  "userRole": "ADMIN",
  "createdAt": "2025-07-19T01:30:30.000Z"
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/organizations/cmd97yg5f0000v6b0woyhoxhx?userId=cmd97yg5f0000v6b0woyhoxhx"
```

---

### 8. Update Organization
**PUT** `/organizations/:id`

Updates organization details (Admin/President only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id`: Organization ID

**Request Body:**
```json
{
  "name": "Updated Computer Science Department",
  "isPublic": false,
  "enrollmentKey": "CS2025"
}
```

**Response (Success - 200):**
```json
{
  "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
  "name": "Updated Computer Science Department",
  "type": "INSTITUTE",
  "isPublic": false,
  "enrollmentKey": "CS2025",
  "updatedAt": "2025-07-19T01:30:30.000Z"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/v1/organizations/cmd97yg5f0000v6b0woyhoxhx \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Updated Computer Science Department",
    "isPublic": false,
    "enrollmentKey": "CS2025"
  }'
```

---

### 9. Delete Organization
**DELETE** `/organizations/:id`

Deletes organization (President only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id`: Organization ID

**Response (Success - 200):**
```json
{
  "message": "Organization deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/organizations/cmd97yg5f0000v6b0woyhoxhx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 10. Enroll User in Organization
**POST** `/organizations/enroll`

Enrolls user in an organization.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
  "enrollmentKey": "CS2024"
}
```

**Response (Success - 200):**
```json
{
  "message": "Successfully enrolled in organization",
  "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
  "role": "MEMBER"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/organizations/enroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
    "enrollmentKey": "CS2024"
  }'
```

---

### 11. Verify User in Organization
**PUT** `/organizations/:id/verify`

Verifies user membership in organization (Admin/President only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id`: Organization ID

**Request Body:**
```json
{
  "userId": "cmd97yg5f0000v6b0woyhoxhx",
  "role": "ADMIN"
}
```

**Response (Success - 200):**
```json
{
  "message": "User verified successfully",
  "userId": "cmd97yg5f0000v6b0woyhoxhx",
  "role": "ADMIN"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/v1/organizations/cmd97yg5f0000v6b0woyhoxhx/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userId": "cmd97yg5f0000v6b0woyhoxhx",
    "role": "ADMIN"
  }'
```

---

### 12. Get Organization Members
**GET** `/organizations/:id/members`

Retrieves organization members (Admin/President only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id`: Organization ID

**Response (Success - 200):**
```json
[
  {
    "userId": "cmd97yg5f0000v6b0woyhoxhx",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "ADMIN",
    "isVerified": true,
    "joinedAt": "2025-07-19T01:30:30.000Z"
  }
]
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/v1/organizations/cmd97yg5f0000v6b0woyhoxhx/members \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 13. Leave Organization
**DELETE** `/organizations/:id/leave`

Allows user to leave organization.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id`: Organization ID

**Response (Success - 200):**
```json
{
  "message": "Successfully left organization"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/organizations/cmd97yg5f0000v6b0woyhoxhx/leave \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🎯 Cause Management Endpoints

### 14. Create Cause
**POST** `/causes`

Creates a new cause within an organization.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
  "title": "Environmental Awareness Campaign",
  "description": "Promoting environmental consciousness and sustainable practices",
  "isPublic": true
}
```

**Response (Success - 201):**
```json
{
  "causeId": "cmd97yg5f0000v6b0woyhoxhx",
  "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
  "title": "Environmental Awareness Campaign",
  "description": "Promoting environmental consciousness and sustainable practices",
  "isPublic": true,
  "createdAt": "2025-07-19T01:30:30.000Z"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/causes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
    "title": "Environmental Awareness Campaign",
    "description": "Promoting environmental consciousness and sustainable practices",
    "isPublic": true
  }'
```

---

### 15. Get Causes
**GET** `/causes`

Retrieves all causes.

**Query Parameters:**
- `userId` (optional): Filter by user ID

**Response (Success - 200):**
```json
[
  {
    "causeId": "cmd97yg5f0000v6b0woyhoxhx",
    "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
    "title": "Environmental Awareness Campaign",
    "description": "Promoting environmental consciousness and sustainable practices",
    "isPublic": true,
    "lectureCount": 5,
    "createdAt": "2025-07-19T01:30:30.000Z"
  }
]
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/causes?userId=cmd97yg5f0000v6b0woyhoxhx"
```

---

### 16. Get Cause by ID
**GET** `/causes/:id`

Retrieves specific cause details.

**Path Parameters:**
- `id`: Cause ID

**Query Parameters:**
- `userId` (optional): User ID for access check

**Response (Success - 200):**
```json
{
  "causeId": "cmd97yg5f0000v6b0woyhoxhx",
  "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
  "title": "Environmental Awareness Campaign",
  "description": "Promoting environmental consciousness and sustainable practices",
  "isPublic": true,
  "lectureCount": 5,
  "organization": {
    "name": "Computer Science Department",
    "type": "INSTITUTE"
  },
  "createdAt": "2025-07-19T01:30:30.000Z"
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/causes/cmd97yg5f0000v6b0woyhoxhx?userId=cmd97yg5f0000v6b0woyhoxhx"
```

---

### 17. Update Cause
**PUT** `/causes/:id`

Updates cause details.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id`: Cause ID

**Request Body:**
```json
{
  "title": "Updated Environmental Awareness Campaign",
  "description": "Enhanced environmental consciousness and sustainable practices program",
  "isPublic": false
}
```

**Response (Success - 200):**
```json
{
  "causeId": "cmd97yg5f0000v6b0woyhoxhx",
  "title": "Updated Environmental Awareness Campaign",
  "description": "Enhanced environmental consciousness and sustainable practices program",
  "isPublic": false,
  "updatedAt": "2025-07-19T01:30:30.000Z"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/v1/causes/cmd97yg5f0000v6b0woyhoxhx \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "Updated Environmental Awareness Campaign",
    "description": "Enhanced environmental consciousness and sustainable practices program",
    "isPublic": false
  }'
```

---

### 18. Delete Cause
**DELETE** `/causes/:id`

Deletes a cause.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id`: Cause ID

**Response (Success - 200):**
```json
{
  "message": "Cause deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/causes/cmd97yg5f0000v6b0woyhoxhx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 19. Get Causes by Organization
**GET** `/causes/organization/:organizationId`

Retrieves causes for a specific organization.

**Path Parameters:**
- `organizationId`: Organization ID

**Response (Success - 200):**
```json
[
  {
    "causeId": "cmd97yg5f0000v6b0woyhoxhx",
    "title": "Environmental Awareness Campaign",
    "description": "Promoting environmental consciousness and sustainable practices",
    "isPublic": true,
    "lectureCount": 5,
    "createdAt": "2025-07-19T01:30:30.000Z"
  }
]
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/v1/causes/organization/cmd97yg5f0000v6b0woyhoxhx
```

---

## 📚 Lecture Management Endpoints

### 20. Create Lecture
**POST** `/lectures`

Creates a new lecture within a cause.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "causeId": "cmd97yg5f0000v6b0woyhoxhx",
  "title": "Introduction to Sustainable Development",
  "content": "This lecture covers the fundamentals of sustainable development and its importance in modern society.",
  "isPublic": true
}
```

**Response (Success - 201):**
```json
{
  "lectureId": "cmd97yg5f0000v6b0woyhoxhx",
  "causeId": "cmd97yg5f0000v6b0woyhoxhx",
  "title": "Introduction to Sustainable Development",
  "content": "This lecture covers the fundamentals of sustainable development and its importance in modern society.",
  "isPublic": true,
  "createdAt": "2025-07-19T01:30:30.000Z"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/lectures \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "causeId": "cmd97yg5f0000v6b0woyhoxhx",
    "title": "Introduction to Sustainable Development",
    "content": "This lecture covers the fundamentals of sustainable development and its importance in modern society.",
    "isPublic": true
  }'
```

---

### 21. Get Lectures
**GET** `/lectures`

Retrieves all lectures.

**Query Parameters:**
- `userId` (optional): Filter by user ID

**Response (Success - 200):**
```json
[
  {
    "lectureId": "cmd97yg5f0000v6b0woyhoxhx",
    "causeId": "cmd97yg5f0000v6b0woyhoxhx",
    "title": "Introduction to Sustainable Development",
    "content": "This lecture covers the fundamentals of sustainable development and its importance in modern society.",
    "isPublic": true,
    "cause": {
      "title": "Environmental Awareness Campaign",
      "organizationId": "cmd97yg5f0000v6b0woyhoxhx"
    },
    "createdAt": "2025-07-19T01:30:30.000Z"
  }
]
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/lectures?userId=cmd97yg5f0000v6b0woyhoxhx"
```

---

### 22. Get Lecture by ID
**GET** `/lectures/:id`

Retrieves specific lecture details.

**Path Parameters:**
- `id`: Lecture ID

**Query Parameters:**
- `userId` (optional): User ID for access check

**Response (Success - 200):**
```json
{
  "lectureId": "cmd97yg5f0000v6b0woyhoxhx",
  "causeId": "cmd97yg5f0000v6b0woyhoxhx",
  "title": "Introduction to Sustainable Development",
  "content": "This lecture covers the fundamentals of sustainable development and its importance in modern society.",
  "isPublic": true,
  "cause": {
    "title": "Environmental Awareness Campaign",
    "organizationId": "cmd97yg5f0000v6b0woyhoxhx",
    "organization": {
      "name": "Computer Science Department",
      "type": "INSTITUTE"
    }
  },
  "createdAt": "2025-07-19T01:30:30.000Z"
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/lectures/cmd97yg5f0000v6b0woyhoxhx?userId=cmd97yg5f0000v6b0woyhoxhx"
```

---

### 23. Update Lecture
**PUT** `/lectures/:id`

Updates lecture details.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id`: Lecture ID

**Request Body:**
```json
{
  "title": "Advanced Sustainable Development Concepts",
  "content": "This updated lecture covers advanced concepts in sustainable development, including economic, social, and environmental aspects.",
  "isPublic": false
}
```

**Response (Success - 200):**
```json
{
  "lectureId": "cmd97yg5f0000v6b0woyhoxhx",
  "title": "Advanced Sustainable Development Concepts",
  "content": "This updated lecture covers advanced concepts in sustainable development, including economic, social, and environmental aspects.",
  "isPublic": false,
  "updatedAt": "2025-07-19T01:30:30.000Z"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/v1/lectures/cmd97yg5f0000v6b0woyhoxhx \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "Advanced Sustainable Development Concepts",
    "content": "This updated lecture covers advanced concepts in sustainable development, including economic, social, and environmental aspects.",
    "isPublic": false
  }'
```

---

### 24. Delete Lecture
**DELETE** `/lectures/:id`

Deletes a lecture.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id`: Lecture ID

**Response (Success - 200):**
```json
{
  "message": "Lecture deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/lectures/cmd97yg5f0000v6b0woyhoxhx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔧 Debug Endpoints (Development Only)

### 25. Get User Debug Info
**GET** `/debug/user/:email`

Retrieves debug information for a user.

**Path Parameters:**
- `email`: User email

**Response (Success - 200):**
```json
{
  "user": {
    "email": "admin@example.com",
    "name": "Admin User",
    "hasUserAuth": true,
    "passwordHash": "$2b$12$vzHkecsDkTYO9p7Qcm3XQ.1e2l/svg90w2dLEt6otfU7GHAi6WgTK"
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/v1/debug/user/admin@example.com
```

---

### 26. Test Password Validation
**POST** `/debug/test-password`

Tests password validation against a provided hash.

**Request Body:**
```json
{
  "password": "AdminPassword123!",
  "hash": "$2b$12$vzHkecsDkTYO9p7Qcm3XQ.1e2l/svg90w2dLEt6otfU7GHAi6WgTK"
}
```

**Response (Success - 201):**
```json
{
  "directBcrypt": true,
  "enhanced": true,
  "passwordLength": 17,
  "hashLength": 60
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/debug/test-password \
  -H "Content-Type: application/json" \
  -d '{
    "password": "AdminPassword123!",
    "hash": "$2b$12$vzHkecsDkTYO9p7Qcm3XQ.1e2l/svg90w2dLEt6otfU7GHAi6WgTK"
  }'
```

---

### 27. Test User Password
**POST** `/debug/test-user-password`

Tests password validation for a specific user.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "AdminPassword123!"
}
```

**Response (Success - 201):**
```json
{
  "directBcrypt": true,
  "enhanced": true,
  "passwordLength": 60
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/debug/test-user-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123!"
  }'
```

---

## 🔐 Security & Authentication

### JWT Token Format
```
Authorization: Bearer <jwt_token>
```

### Password Requirements
- Minimum 6 characters for login
- Minimum 8 characters for setup/change
- Must contain letters, numbers, and special characters (recommended)

### Enhanced Password Security
- **AES-256-CBC encryption** applied before bcrypt hashing
- **32-character encryption key** for additional security
- **Backward compatibility** with existing bcrypt-only passwords

### Environment Variables
```env
PASSWORD_ENCRYPTION_KEY=12345678901234567890123456789012
BCRYPT_SALT_ROUNDS=12
JWT_SECRET=your-secret-key
```

---

## 📊 Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

---

## 🧪 Sample Test Data

### Test Users
```json
{
  "admin": {
    "email": "admin@example.com",
    "password": "AdminPassword123!"
  },
  "student": {
    "email": "student@example.com",
    "password": "StudentPassword123!"
  },
  "teacher": {
    "email": "teacher@example.com",
    "password": "TeacherPassword123!"
  }
}
```

### Test Organizations
```json
{
  "public": {
    "name": "Computer Science Department",
    "type": "INSTITUTE",
    "isPublic": true
  },
  "private": {
    "name": "Global Tech Community",
    "type": "GLOBAL",
    "isPublic": false,
    "enrollmentKey": "GLOBAL2024"
  }
}
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- IDs are generated using nanoid for security
- Enhanced password encryption uses AES-256-CBC + bcrypt
- JWT tokens have configurable expiration times
- Rate limiting is applied to prevent abuse
- CORS is configured for cross-origin requests

---

**Last Updated:** July 19, 2025  
**API Version:** v1  
**Server:** http://localhost:3000/api/v1  
**Documentation:** http://localhost:3000/api/v1/docs
