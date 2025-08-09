# INSTITUTE MANAGEMENT API DOCUMENTATION

## 🏢 **COMPLETE INSTITUTE & ROLE ASSIGNMENT API SPECIFICATION**

> **Migration Notice**: These APIs should be implemented in the main backend service where user management is handled.

---

## 📋 **API ENDPOINTS OVERVIEW**

### **Institute Management**
- `POST /institutes` - Create new institute
- `GET /institutes` - Get institutes with pagination
- `GET /institutes/:id` - Get institute by ID
- `PUT /institutes/:id` - Update institute
- `DELETE /institutes/:id` - Delete institute

### **Institute Assignment** 
- `PUT /organizations/:id/assign-institute` - Assign organization to institute
- `DELETE /organizations/:id/remove-institute` - Remove organization from institute
- `GET /institutes/:id/organizations` - Get organizations by institute

### **Role Management**
- `PUT /organizations/:orgId/users/:userId/role` - Assign/update user role
- `GET /organizations/:orgId/users` - Get organization members
- `POST /organizations/:orgId/users/:userId/verify` - Verify user membership

---

## 🏛️ **INSTITUTE MANAGEMENT APIS**

### **1. Create Institute**

```http
POST /api/v1/institutes
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "name": "Harvard University",
  "description": "Prestigious university in Massachusetts",
  "address": "Cambridge, MA 02138, USA",
  "website": "https://harvard.edu",
  "imageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800",
  "contactEmail": "admin@harvard.edu",
  "contactPhone": "+1-617-495-1000",
  "isPublic": true,
  "establishedYear": 1636
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Institute created successfully",
  "institute": {
    "instituteId": "47",
    "name": "Harvard University",
    "description": "Prestigious university in Massachusetts",
    "address": "Cambridge, MA 02138, USA",
    "website": "https://harvard.edu",
    "imageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800",
    "contactEmail": "admin@harvard.edu",
    "contactPhone": "+1-617-495-1000",
    "isPublic": true,
    "establishedYear": 1636,
    "createdAt": "2025-07-30T03:45:00.000Z",
    "updatedAt": "2025-07-30T03:45:00.000Z"
  }
}
```

### **2. Get Institutes (Paginated)**

```http
GET /api/v1/institutes?page=1&limit=10&search=harvard&sortBy=name&sortOrder=asc
Authorization: Bearer <jwt-token> (optional)
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "instituteId": "47",
      "name": "Harvard University",
      "description": "Prestigious university in Massachusetts",
      "imageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800",
      "isPublic": true,
      "establishedYear": 1636,
      "organizationCount": 15,
      "createdAt": "2025-07-30T03:45:00.000Z"
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

### **3. Get Institute by ID**

```http
GET /api/v1/institutes/47
Authorization: Bearer <jwt-token> (optional)
```

**Response (200 OK):**
```json
{
  "instituteId": "47",
  "name": "Harvard University",
  "description": "Prestigious university in Massachusetts",
  "address": "Cambridge, MA 02138, USA",
  "website": "https://harvard.edu",
  "imageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800",
  "contactEmail": "admin@harvard.edu",
  "contactPhone": "+1-617-495-1000",
  "isPublic": true,
  "establishedYear": 1636,
  "organizationCount": 15,
  "organizations": [
    {
      "organizationId": "29",
      "name": "Physics Innovation Lab",
      "type": "INSTITUTE"
    }
  ],
  "createdAt": "2025-07-30T03:45:00.000Z",
  "updatedAt": "2025-07-30T03:45:00.000Z"
}
```

---

## 🔗 **INSTITUTE ASSIGNMENT APIS**

### **1. Assign Organization to Institute**

```http
PUT /api/v1/organizations/29/assign-institute
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "instituteId": "47"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Organization successfully assigned to institute",
  "timestamp": "2025-07-30T03:45:00.000Z",
  "operation": "ASSIGN_INSTITUTE",
  "organizationId": "29",
  "instituteId": "47",
  "performedBy": {
    "userId": "123",
    "role": "ADMIN"
  }
}
```

### **2. Remove Organization from Institute**

```http
DELETE /api/v1/organizations/29/remove-institute
Authorization: Bearer <admin-jwt-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Organization successfully removed from institute",
  "timestamp": "2025-07-30T03:45:00.000Z",
  "operation": "REMOVE_INSTITUTE",
  "organizationId": "29",
  "performedBy": {
    "userId": "123",
    "role": "ADMIN"
  }
}
```

### **3. Get Organizations by Institute**

```http
GET /api/v1/institutes/47/organizations?page=1&limit=10
Authorization: Bearer <jwt-token> (optional)
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "organizationId": "29",
      "name": "Physics Innovation Lab",
      "type": "INSTITUTE",
      "isPublic": false,
      "memberCount": 8,
      "createdAt": "2025-07-30T03:45:00.000Z"
    }
  ],
  "institute": {
    "instituteId": "47",
    "name": "Harvard University"
  },
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

## 👥 **ROLE MANAGEMENT APIS**

### **1. Assign/Update User Role**

```http
PUT /api/v1/organizations/29/users/85/role
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "role": "ADMIN",
  "isVerified": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User role updated successfully",
  "userRole": {
    "userId": "85",
    "organizationId": "29",
    "role": "ADMIN",
    "isVerified": true,
    "updatedAt": "2025-07-30T03:45:00.000Z"
  },
  "performedBy": {
    "userId": "123",
    "role": "PRESIDENT"
  }
}
```

### **2. Get Organization Members**

```http
GET /api/v1/organizations/29/users?page=1&limit=10&role=ADMIN&isVerified=true
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "userId": "85",
      "email": "85@university.edu",
      "name": "Sarah Williams",
      "role": "ADMIN",
      "isVerified": true,
      "joinedAt": "2025-07-30T03:45:00.000Z"
    }
  ],
  "organization": {
    "organizationId": "29",
    "name": "Physics Innovation Lab"
  },
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

### **3. Verify User Membership**

```http
POST /api/v1/organizations/29/users/87/verify
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "isVerified": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User membership verified successfully",
  "userMembership": {
    "userId": "87",
    "organizationId": "29",
    "role": "MEMBER",
    "isVerified": true,
    "verifiedAt": "2025-07-30T03:45:00.000Z"
  },
  "performedBy": {
    "userId": "123",
    "role": "ADMIN"
  }
}
```

---

## 📝 **DATA TRANSFER OBJECTS (DTOs)**

### **Institute DTOs**

```typescript
// Create Institute DTO
export class CreateInstituteDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  address?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[\d\s\-\(\)]+$/)
  contactPhone?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = true;

  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(new Date().getFullYear())
  establishedYear?: number;
}

// Update Institute DTO
export class UpdateInstituteDto {
  @IsString()
  @IsOptional()
  @Length(2, 100)
  name?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  address?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[\d\s\-\(\)]+$/)
  contactPhone?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(new Date().getFullYear())
  establishedYear?: number;
}

// Institute Query DTO
export class InstituteQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['name', 'createdAt', 'establishedYear'])
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string;

  @IsOptional()
  @IsString()
  @IsIn(['true', 'false', 'all'])
  isPublic?: string;
}
```

### **Assignment DTOs**

```typescript
// Assign Institute DTO
export class AssignInstituteDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { 
    message: 'Institute ID must be a valid numeric string (e.g., "1", "123", "456")' 
  })
  @Length(1, 15, { 
    message: 'Institute ID must be between 1 and 15 digits long' 
  })
  instituteId: string;
}

// User Role Assignment DTO
export class AssignUserRoleDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['MEMBER', 'MODERATOR', 'ADMIN', 'PRESIDENT'])
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN' | 'PRESIDENT';

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean = false;
}

// User Verification DTO
export class VerifyUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'User ID must be a numeric string' })
  userId: string;

  @IsBoolean()
  isVerified: boolean;
}
```

---

## 🔒 **SECURITY & ACCESS CONTROL**

### **Access Control Matrix**

| Operation | Required Role | Rate Limit | Notes |
|-----------|---------------|------------|--------|
| Create Institute | GLOBAL_ADMIN | 5/hour | System administrators only |
| Update Institute | GLOBAL_ADMIN | 10/hour | System administrators only |
| Delete Institute | GLOBAL_ADMIN | 2/day | Very restrictive |
| Assign Institute | ORG_ADMIN | 5/minute | Organization managers only |
| Remove Institute | ORG_ADMIN | 5/minute | Organization managers only |
| Assign Role | ORG_ADMIN+ | 10/minute | Admin or higher |
| Verify User | ORG_ADMIN+ | 20/minute | Admin or higher |

### **JWT Token Requirements**

```typescript
// JWT Payload Structure
interface JwtPayload {
  sub: string; // userId
  email: string;
  name: string;
  orgAccess: string[]; // Compact format ["Aorg-123", "Porg-456"]
  isGlobalAdmin: boolean;
  iat: number;
  exp: number;
}

// Organization Access Format
// Format: RoleCodeOrganizationId
// P = PRESIDENT, A = ADMIN, O = MODERATOR, M = MEMBER
// Example: ["A123", "P456", "M789"]
```

---

## 🚦 **ERROR HANDLING**

### **Standard Error Responses**

```typescript
// Validation Error (400)
{
  "statusCode": 400,
  "message": [
    "Institute ID must be a valid numeric string",
    "Name must be between 2 and 100 characters"
  ],
  "error": "Bad Request"
}

// Unauthorized (401)
{
  "statusCode": 401,
  "message": "Invalid or expired JWT token",
  "error": "Unauthorized"
}

// Forbidden (403)
{
  "statusCode": 403,
  "message": "Access denied. ADMIN role required for institute assignment.",
  "error": "Forbidden"
}

// Not Found (404)
{
  "statusCode": 404,
  "message": "Institute with ID 999 not found",
  "error": "Not Found"
}

// Rate Limit (429)
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "Rate limit exceeded. Try again in 60 seconds."
}
```

---

## 📊 **DATABASE SCHEMA**

### **Institute Table**
```sql
CREATE TABLE institute (
  instituteId BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  address VARCHAR(255),
  website VARCHAR(500),
  imageUrl VARCHAR(500),
  contactEmail VARCHAR(255),
  contactPhone VARCHAR(50),
  isPublic BOOLEAN DEFAULT TRUE,
  establishedYear INT,
  createdAt DATETIME DEFAULT NOW(),
  updatedAt DATETIME DEFAULT NOW() ON UPDATE NOW(),
  
  INDEX idx_name (name),
  INDEX idx_public (isPublic),
  INDEX idx_established (establishedYear)
);
```

### **Organization-Institute Relationship**
```sql
-- Add institute reference to organization table
ALTER TABLE organization 
ADD COLUMN instituteId BIGINT,
ADD FOREIGN KEY (instituteId) REFERENCES institute(instituteId);

-- Index for performance
CREATE INDEX idx_organization_institute ON organization(instituteId);
```

---

## 🎯 **MIGRATION CHECKLIST**

### **Files to Migrate**
- ✅ **DTOs**: All institute and role assignment DTOs
- ✅ **Controllers**: Institute management controller
- ✅ **Services**: Institute service with business logic
- ✅ **Guards**: Access control guards
- ✅ **Pipes**: Numeric ID validation pipes
- ✅ **Database**: Institute table schema

### **Dependencies**
- ✅ **JWT Service**: For token validation
- ✅ **Prisma/TypeORM**: For database operations  
- ✅ **Validation**: class-validator decorators
- ✅ **Security**: Rate limiting, CORS, helmet

### **Environment Variables**
```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/main_db"

# JWT
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

This complete API documentation provides everything needed to migrate the institute management functionality to the main backend service!
