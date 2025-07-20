# Organization Service API Documentation

## 📋 Overview

This API provides **enhanced JWT-based organization access control** with optimized performance, security, and data minimization. All responses return only necessary data, exclude sensitive information, and support comprehensive pagination.

**🔐 Enhanced Security Features:**
- **Organization-Based Access Control**: JWT tokens include user's organization IDs and roles
- **Role-Based Authorization**: Verify user has required permissions before executing methods  
- **Global Admin Support**: ORGANIZATION ADMIN has access to any organization
- **Real-time Access Updates**: Token refresh when organization memberships change

**Base URL:** `http://localhost:3000/organization/api/v1`

**Authentication:** JWT Bearer Token (required for protected endpoints)

---

## 🚀 Enhanced JWT Authentication System

### JWT Token Structure
The enhanced JWT tokens now include:

```json
{
  "sub": "user-id",
  "email": "user@example.com", 
  "name": "User Name",
  "organizationAccess": [
    {
      "organizationId": "org-123",
      "role": "PRESIDENT",
      "isVerified": true
    },
    {
      "organizationId": "org-456", 
      "role": "MEMBER",
      "isVerified": true
    }
  ],
  "isGlobalAdmin": false,
  "iat": 1752958468,
  "exp": 1753563268
}
```

### Access Control Rules
1. **Organization Membership**: User must be a verified member of the organization
2. **Role-Based Permissions**: Methods check for required roles (MEMBER, MODERATOR, ADMIN, PRESIDENT)
3. **Global Admin Override**: Users with `isGlobalAdmin: true` can access any organization
4. **Automatic Verification**: JWT includes only verified organization memberships

### Role Hierarchy
- **MEMBER**: Basic access (view members, leave organization)
- **MODERATOR**: Moderate content (MEMBER permissions + content management)
- **ADMIN**: Administrative tasks (MODERATOR permissions + user verification, institute assignment)
- **PRESIDENT**: Full control (ADMIN permissions + organization deletion)
- **GLOBAL_ADMIN**: Access to any organization (system-wide permissions)

---

## 🔐 Authentication Endpoints

### POST /auth/login
Enhanced login with organization access information.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "AdminPassword123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "user-123",
    "email": "admin@example.com",
    "name": "Admin User"
  },
  "organizationAccess": [
    {
      "organizationId": "org-123",
      "role": "PRESIDENT", 
      "isVerified": true
    }
  ],
  "isGlobalAdmin": false
}
```

### POST /auth/refresh-token
**NEW ENDPOINT** - Refresh JWT token with updated organization access.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "user-123",
    "email": "admin@example.com", 
    "name": "Admin User"
  },
  "organizationAccess": [
    {
      "organizationId": "org-123",
      "role": "ADMIN",
      "isVerified": true
    }
  ],
  "isGlobalAdmin": false
}
```

### POST /auth/profile
Get user profile with organization access information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "userId": "user-123",
  "email": "admin@example.com",
  "name": "Admin User",
  "organizationAccess": [
    {
      "organizationId": "org-123",
      "role": "PRESIDENT",
      "isVerified": true
    }
  ],
  "isGlobalAdmin": false
}
```

---

## 🏢 Organizations API with Enhanced Access Control

### GET /organizations
Get all public organizations (no authentication required).

**Query Parameters:**
- All common pagination parameters
- `userId` (optional): Filter user's organizations  

**Response Example:**
```json
{
  "data": [
    {
      "organizationId": "org-123",
      "name": "Computer Science Department", 
      "type": "INSTITUTE",
      "isPublic": true,
      "instituteId": "inst-456"
    }
  ],
  "pagination": { ... }
}
```

### GET /organizations/:id
Get organization by ID (minimal data).

**Response:**
```json
{
  "organizationId": "org-123",
  "name": "Computer Science Department",
  "type": "INSTITUTE", 
  "isPublic": true,
  "instituteId": "inst-456"
}
```

### GET /organizations/user/enrolled
**NEW ENDPOINT** - Get organizations that the authenticated user is enrolled in.

**🔐 Authentication Required:** JWT Bearer Token

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- All common pagination parameters
- `sortBy`: `name`, `type`, `memberCount`, `causeCount`, `role`, `createdAt`

**🎯 Features:**
- Returns **only verified memberships** for security
- Includes **user's role** in each organization 
- Shows **join date** and **organization stats**
- **Optimized queries** with minimal data transfer
- **No sensitive information** (enrollment keys excluded)

**Response Example:**
```json
{
  "data": [
    {
      "organizationId": "org-123",
      "name": "Computer Science Department",
      "type": "INSTITUTE", 
      "isPublic": true,
      "instituteId": "inst-456",
      "userRole": "PRESIDENT",
      "isVerified": true,
      "joinedAt": "2025-07-18T21:45:44.276Z",
      "memberCount": 15,
      "causeCount": 8
    },
    {
      "organizationId": "org-789",
      "name": "Mathematics Department",
      "type": "INSTITUTE",
      "isPublic": true, 
      "instituteId": null,
      "userRole": "MEMBER",
      "isVerified": true,
      "joinedAt": "2025-07-19T18:44:26.333Z",
      "memberCount": 25,
      "causeCount": 12
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "meta": {
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

**🔒 Security Features:**
- Only shows organizations user is **verified member** of
- Excludes **sensitive data** (enrollment keys, timestamps)
- **Role information** included for each organization
- **Membership statistics** for context

### GET /organizations/:id/members
Get organization members with enhanced access control.

**🔐 Access Control**: Requires organization membership (any role)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Access Validation:**
- ✅ User must be a verified member of the organization
- ✅ Global admins can access any organization  
- ❌ Non-members receive `403 Forbidden`

**Response Example:**
```json
{
  "data": [
    {
      "userId": "user-123",
      "organizationId": "org-456", 
      "role": "PRESIDENT",
      "isVerified": true
    }
  ],
  "pagination": { ... }
}
```

### PUT /organizations/:id
Update organization with enhanced access control.

**🔐 Access Control**: Requires ADMIN or PRESIDENT role

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Access Validation:**
- ✅ User must have ADMIN or PRESIDENT role in the organization
- ✅ Global admins can access any organization
- ❌ Members/Moderators receive `403 Forbidden: Required role(s): ADMIN, PRESIDENT`

### DELETE /organizations/:id
Delete organization with enhanced access control.

**🔐 Access Control**: Requires PRESIDENT role

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Access Validation:**
- ✅ User must have PRESIDENT role in the organization
- ✅ Global admins can access any organization  
- ❌ Other roles receive `403 Forbidden: Required role(s): PRESIDENT`

### POST /organizations/enroll
Enroll user in organization (triggers automatic token refresh).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "organizationId": "org-123",
  "enrollmentKey": "optional-key"
}
```

**Response:**
```json
{
  "userId": "user-123",
  "organizationId": "org-123",
  "role": "MEMBER",
  "isVerified": true
}
```

**🔄 Automatic Token Refresh**: User's JWT token is automatically refreshed with new organization access.

---

## 🎯 Enhanced Access Control Examples

### Successful Access (President)
```bash
# User with PRESIDENT role accessing organization
curl -X GET "http://localhost:3000/organization/api/v1/organizations/org-123/members" \
  -H "Authorization: Bearer <jwt_with_president_role>"

# Response: 200 OK with member list
```

### Access Denied (Member trying Admin action)
```bash  
# User with MEMBER role trying to update organization
curl -X PUT "http://localhost:3000/organization/api/v1/organizations/org-123" \
  -H "Authorization: Bearer <jwt_with_member_role>"

# Response: 403 Forbidden
# Error: "Access denied: Required role(s): ADMIN, PRESIDENT, User role: MEMBER"
```

### Global Admin Access
```bash
# Global admin accessing any organization
curl -X DELETE "http://localhost:3000/organization/api/v1/organizations/any-org-id" \
  -H "Authorization: Bearer <jwt_with_global_admin>"

# Response: 200 OK (Global admin can access any organization)
```

### Non-Member Access
```bash
# User not a member of organization
curl -X GET "http://localhost:3000/organization/api/v1/organizations/org-999/members" \
  -H "Authorization: Bearer <jwt_without_org_access>"

# Response: 403 Forbidden  
# Error: "Access denied: User is not a member of this organization"
```

---

## 🔄 Key Features Implemented

### 1. Enhanced JWT Tokens ✅
- **Organization Access Array**: JWT includes all user's organization memberships with roles
- **Global Admin Flag**: Special flag for system-wide access
- **Real-time Updates**: Tokens refreshed when memberships change

### 2. Organization Access Control ✅  
- **Membership Verification**: Check user belongs to organization
- **Role-Based Permissions**: Verify user has required role for action
- **Global Admin Override**: System admins can access any organization
- **Automatic Validation**: Guards automatically check access before method execution

### 3. Access Control Rules ✅
- **GET /organizations/:id/members**: Requires any membership role
- **PUT /organizations/:id**: Requires ADMIN or PRESIDENT role  
- **DELETE /organizations/:id**: Requires PRESIDENT role
- **All modifications**: Require appropriate role levels

### 4. Error Handling ✅
- **Clear Error Messages**: Specific reasons for access denial
- **HTTP Status Codes**: Proper 401 (Unauthorized) vs 403 (Forbidden)
- **Role Information**: Shows required vs actual user role

### 5. Token Management ✅
- **Automatic Refresh**: Tokens updated when organization memberships change
- **Manual Refresh**: `/auth/refresh-token` endpoint for manual updates
- **Membership Tracking**: Only verified memberships included in tokens

---

## 🔒 Security Improvements

### Organization-Level Security
1. **Membership Validation**: Every organization action validates user membership
2. **Role Verification**: Actions check for specific role requirements
3. **Access Isolation**: Users can only access organizations they belong to
4. **Global Admin Support**: System administrators can access any organization

### Token Security  
1. **Minimal Token Size**: Only includes essential organization access data
2. **Real-time Updates**: Tokens refreshed when permissions change
3. **Verified Memberships**: Only verified organization memberships included
4. **Automatic Cleanup**: Tokens automatically updated when users leave organizations

---

## 📊 Error Codes

| Status Code | Description | Example |
|-------------|-------------|---------|
| 200 | Success | Action completed successfully |
| 401 | Unauthorized | Invalid or missing JWT token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Organization or resource not found |

### Common Error Messages
- `"Access denied: User is not a member of this organization"`
- `"Access denied: Required role(s): ADMIN, PRESIDENT, User role: MEMBER"`
- `"Access denied: User membership is not verified"`
- `"Authentication required"`

---

## 🧪 Testing the Enhanced System

### 1. Login and Get Enhanced Token
```bash
curl -X POST http://localhost:3000/organization/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123!"
  }'
```

### 2. Get User's Enrolled Organizations
```bash
# Get all organizations user is enrolled in
curl -X GET "http://localhost:3000/organization/api/v1/organizations/user/enrolled" \
  -H "Authorization: Bearer <jwt_token>"

# With pagination and search
curl -X GET "http://localhost:3000/organization/api/v1/organizations/user/enrolled?page=1&limit=5&search=software" \
  -H "Authorization: Bearer <jwt_token>"
```

### 3. Access Organization with Proper Role
```bash
curl -X GET "http://localhost:3000/organization/api/v1/organizations/org-123/members" \
  -H "Authorization: Bearer <token_with_org_access>"
```

### 4. Test Access Control
```bash
# Try accessing organization without membership (should fail)
curl -X GET "http://localhost:3000/organization/api/v1/organizations/unauthorized-org/members" \
  -H "Authorization: Bearer <token_without_access>"
```

### 4. Test Role-Based Access
```bash  
# Try admin action with member role (should fail)
curl -X PUT "http://localhost:3000/organization/api/v1/organizations/org-123" \
  -H "Authorization: Bearer <member_role_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

---

**Last Updated:** July 2025  
**API Version:** v1 (Enhanced JWT Access Control)  
**Server:** http://localhost:3000/organization/api/v1  

## 📝 Summary

This enhanced API provides:
- ✅ **JWT-based organization access control** with role verification
- ✅ **Automatic permission checking** before method execution  
- ✅ **Global admin support** for system-wide access
- ✅ **Real-time token updates** when organization memberships change
- ✅ **Comprehensive error handling** with clear access denial messages
- ✅ **Role-based permissions** (MEMBER, MODERATOR, ADMIN, PRESIDENT, GLOBAL_ADMIN)
- ✅ **Security isolation** - users can only access their organizations
- ✅ **Automatic token refresh** when enrolling in new organizations
