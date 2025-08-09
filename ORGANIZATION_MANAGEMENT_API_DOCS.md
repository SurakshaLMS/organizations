# Organization Management API Documentation

## Overview

This API provides comprehensive organization management capabilities with role-based access control. The system supports a hierarchical role structure with fine-grained permissions for different operations.

## Authentication

All endpoints require JWT authentication with Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## JWT Token Structure

JWT tokens include organization roles in a compact format:

```json
{
  "sub": "123",
  "email": "user@example.com", 
  "name": "John Doe",
  "orgAccess": ["Porg-456", "Aorg-789", "Morg-101"],
  "isGlobalAdmin": true,
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Organization Access Format

- `P` = PRESIDENT (Full organization control)
- `A` = ADMIN (Organization management)  
- `O` = MODERATOR (Content moderation)
- `M` = MEMBER (Basic membership)

Example: `"Porg-456"` means user is PRESIDENT of organization 456.

## Role Hierarchy

```
PRESIDENT (Level 4) - Full organization control
    ↓
ADMIN (Level 3) - Organization management
    ↓  
MODERATOR (Level 2) - Content moderation
    ↓
MEMBER (Level 1) - Basic membership
```

## API Endpoints

### Organization Management (Manager APIs)

Base URL: `/organizations/:id/management`

#### 1. Create Organization

**POST** `/organizations/:id/management/create`

Creates a new organization. User automatically becomes PRESIDENT.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Tech Innovation Club",
  "type": "INSTITUTE",
  "isPublic": false,
  "enrollmentKey": "tech-club-2024",
  "instituteId": "123"
}
```

**Response (201):**
```json
{
  "id": "456",
  "name": "Tech Innovation Club",
  "type": "INSTITUTE", 
  "isPublic": false,
  "instituteId": "123"
}
```

**Rate Limit:** 5 organizations per minute per user

---

#### 2. Update Organization

**PUT** `/organizations/:id/management`

Updates organization details. Requires ADMIN or PRESIDENT role.

**Parameters:**
- `id` (path): Organization ID

**Request Body:**
```json
{
  "name": "Tech Innovation Club Updated",
  "isPublic": true,
  "enrollmentKey": "new-key-2024"
}
```

**Response (200):**
```json
{
  "id": "456",
  "name": "Tech Innovation Club Updated",
  "type": "INSTITUTE",
  "isPublic": true,
  "instituteId": "123"
}
```

**Required Role:** ADMIN or PRESIDENT
**Rate Limit:** 20 updates per minute per user

---

#### 3. Delete Organization

**DELETE** `/organizations/:id/management`

Permanently deletes organization. Only PRESIDENT can delete.

**Parameters:**
- `id` (path): Organization ID

**Response (204):** No content

**Required Role:** PRESIDENT only
**Rate Limit:** 3 deletions per minute per user

---

#### 4. Get Organization Members

**GET** `/organizations/:id/management/members`

Retrieves list of organization members with roles.

**Parameters:**
- `id` (path): Organization ID
- `page` (query, optional): Page number (default: 1)
- `limit` (query, optional): Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "members": [
    {
      "userId": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "ADMIN",
      "isVerified": true,
      "joinedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "totalMembers": 25,
  "roleBreakdown": {
    "PRESIDENT": 1,
    "ADMIN": 2,
    "MODERATOR": 4,
    "MEMBER": 18
  }
}
```

**Required Role:** ADMIN or PRESIDENT
**Rate Limit:** 50 requests per minute per user

---

#### 5. Assign User Role

**POST** `/organizations/:id/management/assign-role`

Assigns role to a user in the organization.

**Parameters:**
- `id` (path): Organization ID

**Request Body:**
```json
{
  "userId": "123",
  "role": "ADMIN"
}
```

**Response (201):**
```json
{
  "message": "User role assigned successfully",
  "userId": "123",
  "organizationId": "456",
  "role": "ADMIN",
  "assignedAt": "2024-01-15T10:30:00Z"
}
```

**Required Role:** ADMIN or PRESIDENT
**Rate Limit:** 30 assignments per minute per user
**Note:** Cannot assign PRESIDENT role directly. Use transfer presidency.

---

#### 6. Change User Role

**PUT** `/organizations/:id/management/change-role`

Changes existing member's role.

**Parameters:**
- `id` (path): Organization ID

**Request Body:**
```json
{
  "userId": "123",
  "newRole": "MODERATOR"
}
```

**Response (200):**
```json
{
  "message": "User role changed successfully",
  "userId": "123",
  "organizationId": "456",
  "role": "MODERATOR",
  "assignedAt": "2024-01-15T10:30:00Z"
}
```

**Required Role:** ADMIN or PRESIDENT
**Rate Limit:** 20 changes per minute per user
**Note:** Cannot change PRESIDENT role.

---

#### 7. Remove User from Organization

**DELETE** `/organizations/:id/management/remove-user`

Removes user from organization.

**Parameters:**
- `id` (path): Organization ID

**Request Body:**
```json
{
  "userId": "123"
}
```

**Response (204):** No content

**Required Role:** ADMIN or PRESIDENT
**Rate Limit:** 15 removals per minute per user
**Note:** Cannot remove PRESIDENT.

---

#### 8. Transfer Presidency

**PUT** `/organizations/:id/management/transfer-presidency`

Transfers PRESIDENT role to another user. Current PRESIDENT becomes ADMIN.

**Parameters:**
- `id` (path): Organization ID

**Request Body:**
```json
{
  "newPresidentUserId": "123"
}
```

**Response (200):**
```json
{
  "message": "Presidency transferred successfully",
  "newPresidentUserId": "123",
  "previousPresidentUserId": "456",
  "transferredAt": "2024-01-15T10:30:00Z"
}
```

**Required Role:** PRESIDENT only
**Rate Limit:** 5 transfers per minute per user

---

### Regular Organization APIs

#### 1. Get Organization by ID

**GET** `/organizations/:id`

Public endpoint to get organization details.

**Parameters:**
- `id` (path): Organization ID

**Response (200):**
```json
{
  "id": "456",
  "name": "Tech Innovation Club",
  "type": "INSTITUTE",
  "isPublic": true,
  "instituteId": "123"
}
```

**Authentication:** Optional (public orgs), Required (private orgs)

---

#### 2. Enroll in Organization

**POST** `/organizations/enroll`

Join an organization as a member.

**Request Body:**
```json
{
  "organizationId": "456",
  "enrollmentKey": "tech-club-2024"
}
```

**Response (201):**
```json
{
  "message": "Enrollment successful",
  "organizationId": "456",
  "userId": "123",
  "status": "pending_verification"
}
```

**Authentication:** Required
**Rate Limit:** 10 enrollments per minute per user

---

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized access",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required role: ADMIN or PRESIDENT",
  "error": "Forbidden",
  "requiredRoles": ["ADMIN", "PRESIDENT"],
  "userRole": "MEMBER"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Organization not found",
  "error": "Not Found"
}
```

### 429 Rate Limit Exceeded
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "error": "Too Many Requests"
}
```

## Security Features

### Rate Limiting
- Different limits for different operations
- More restrictive limits for destructive operations (delete, transfer)
- Per-user rate limiting

### Role-Based Access Control
- Hierarchical role system
- Automatic role inheritance (higher roles can perform lower role actions)
- Global admin bypass option

### Input Validation
- Strict validation on all inputs
- SQL injection prevention
- XSS protection
- CSRF protection

### Audit Logging
- All management operations are logged
- User activity tracking
- Security event monitoring

## Best Practices

### JWT Token Management
1. Store tokens securely (HTTP-only cookies recommended)
2. Implement token refresh mechanism
3. Validate token on every request
4. Handle token expiration gracefully

### Error Handling
1. Always check response status codes
2. Implement proper error handling for all scenarios
3. Display user-friendly error messages
4. Log errors for debugging

### Performance Optimization
1. Use pagination for large datasets
2. Implement caching where appropriate
3. Respect rate limits
4. Use efficient query patterns

## Code Examples

### JavaScript/TypeScript

```typescript
// Authentication header setup
const authHeaders = {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
};

// Create organization
const createOrganization = async (orgData) => {
  const response = await fetch('/organizations/management/create', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(orgData)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};

// Get organization members
const getMembers = async (orgId, page = 1, limit = 20) => {
  const response = await fetch(
    `/organizations/${orgId}/management/members?page=${page}&limit=${limit}`,
    { headers: authHeaders }
  );
  
  return await response.json();
};

// Assign role
const assignRole = async (orgId, userId, role) => {
  const response = await fetch(`/organizations/${orgId}/management/assign-role`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ userId, role })
  });
  
  return await response.json();
};
```

### cURL Examples

```bash
# Create organization
curl -X POST "/organizations/management/create" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Club",
    "type": "INSTITUTE",
    "isPublic": false,
    "enrollmentKey": "tech-2024"
  }'

# Get members
curl -X GET "/organizations/456/management/members?page=1&limit=20" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Assign role
curl -X POST "/organizations/456/management/assign-role" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123",
    "role": "ADMIN"
  }'
```

## Deployment Notes

### Environment Variables
```
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
DATABASE_URL=mysql://user:pass@localhost:3306/db
BCRYPT_PEPPER=your-pepper-value
```

### Database Configuration
- Ensure proper indexes on organization and user tables
- Configure connection pooling
- Set up read replicas for better performance

### Monitoring
- Monitor API response times
- Track error rates
- Monitor JWT token usage patterns
- Set up alerts for suspicious activity

## Support

For technical support or questions about the API, please:
1. Check this documentation first
2. Review the Swagger UI documentation at `/api/docs`
3. Contact the development team
4. Submit issues through the appropriate channels
