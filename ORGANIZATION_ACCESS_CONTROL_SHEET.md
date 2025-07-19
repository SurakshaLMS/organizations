# Organization-Based Access Control Sheet

## 📋 Overview

This document provides a comprehensive reference for the **Enhanced JWT-based Organization Access Control System** implemented in the Organization Service API. This system ensures that users can only access organizations they belong to and perform actions based on their specific roles within each organization.

---

## 🔐 JWT Token Structure

### Enhanced JWT Payload
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

### Key Fields
- **`organizationAccess`**: Array of all organizations user belongs to with their roles
- **`isGlobalAdmin`**: Boolean flag for system-wide access
- **`isVerified`**: Only verified memberships are included in JWT tokens

---

## 🏗️ Role Hierarchy

### Role Levels (Low to High)
| Role | Level | Description | Permissions |
|------|-------|-------------|-------------|
| **MEMBER** | 1 | Basic membership | View members, leave organization |
| **MODERATOR** | 2 | Content moderation | MEMBER + content management |
| **ADMIN** | 3 | Administrative tasks | MODERATOR + user verification, institute assignment |
| **PRESIDENT** | 4 | Full organization control | ADMIN + organization deletion, settings |
| **GLOBAL_ADMIN** | 5 | System-wide access | Access to ANY organization |

### Role Inheritance
- Higher roles inherit all permissions from lower roles
- **PRESIDENT** can perform all **ADMIN**, **MODERATOR**, and **MEMBER** actions
- **GLOBAL_ADMIN** bypasses all organization membership requirements

---

## 🛡️ Access Control Matrix

### API Endpoints and Required Roles

| Endpoint | Method | Required Role | Access Control | Global Admin |
|----------|---------|---------------|----------------|--------------|
| `/organizations` | GET | None | Public access | ✅ |
| `/organizations/:id` | GET | None | Public access | ✅ |
| `/organizations/:id/members` | GET | **MEMBER** | Must be member | ✅ |
| `/organizations/:id/causes` | GET | **MEMBER** | Must be member | ✅ |
| `/organizations` | POST | Authenticated | Create new org | ✅ |
| `/organizations/:id` | PUT | **ADMIN** | Must be admin+ | ✅ |
| `/organizations/:id` | DELETE | **PRESIDENT** | Must be president | ✅ |
| `/organizations/enroll` | POST | Authenticated | Join organization | ✅ |

### Access Control Rules
1. **Organization Membership**: User must be verified member of the organization
2. **Role Verification**: User must have required role level or higher
3. **Global Admin Override**: Users with `isGlobalAdmin: true` bypass all restrictions
4. **Automatic Validation**: Guards check access before every protected method

---

## 🔧 Implementation Components

### 1. OrganizationAccessService
```typescript
// Location: src/auth/organization-access.service.ts
class OrganizationAccessService {
  // Get user's organization access for JWT
  async getUserOrganizationAccess(userId: string)
  
  // Verify user has access to specific organization
  async verifyOrganizationAccess(userId: string, organizationId: string, requiredRole?: Role)
  
  // Check if user is global admin
  async isGlobalOrganizationAdmin(userId: string)
}
```

### 2. Access Control Decorators
```typescript
// Location: src/auth/decorators/organization-access.decorator.ts

@RequireOrganizationMember()    // Requires any membership
@RequireOrganizationAdmin()     // Requires ADMIN or PRESIDENT
@RequireOrganizationPresident() // Requires PRESIDENT only
```

### 3. OrganizationAccessGuard
```typescript
// Location: src/auth/guards/organization-access.guard.ts
// Automatically extracts organization ID from request parameters
// Validates user access before method execution
```

### 4. Enhanced AuthService
```typescript
// Location: src/auth/auth.service.ts
// login() - Enhanced to include organization access in JWT
// refreshUserToken() - Updates JWT with current organization access
// validateUser() - Validates JWT payload structure
```

---

## 🎯 Usage Examples

### 1. Controller Implementation
```typescript
@Controller('organizations')
export class OrganizationController {
  
  // Any verified member can view members
  @Get(':id/members')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationMember()
  async getMembers(@Param('id') id: string) {
    // User access automatically validated
  }
  
  // Only ADMIN or PRESIDENT can update
  @Put(':id')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationAdmin()
  async updateOrganization(@Param('id') id: string, @Body() dto: UpdateDto) {
    // User admin access automatically validated
  }
  
  // Only PRESIDENT can delete
  @Delete(':id')
  @UseGuards(JwtAuthGuard, OrganizationAccessGuard)
  @RequireOrganizationPresident()
  async deleteOrganization(@Param('id') id: string) {
    // User president access automatically validated
  }
}
```

### 2. Testing Access Control
```bash
# Login and get JWT with organization access
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Response includes organization access
{
  "access_token": "jwt_token_here",
  "organizationAccess": [
    {"organizationId": "org-123", "role": "PRESIDENT", "isVerified": true}
  ]
}

# Access organization members (requires membership)
curl -X GET http://localhost:3000/api/v1/organizations/org-123/members \
  -H "Authorization: Bearer jwt_token_here"

# Try unauthorized access (will fail with 403)
curl -X GET http://localhost:3000/api/v1/organizations/unauthorized-org/members \
  -H "Authorization: Bearer jwt_token_here"
```

---

## 🚨 Error Handling

### HTTP Status Codes
| Status | Meaning | When It Occurs |
|--------|---------|----------------|
| **200** | Success | User has required access |
| **401** | Unauthorized | Invalid/missing JWT token |
| **403** | Forbidden | Valid token but insufficient permissions |
| **404** | Not Found | Organization doesn't exist |

### Error Messages
```json
// User not a member of organization
{
  "message": "Access denied: User is not a member of this organization",
  "statusCode": 403
}

// User has wrong role
{
  "message": "Access denied: Required role(s): ADMIN, PRESIDENT, User role: MEMBER",
  "statusCode": 403
}

// User membership not verified
{
  "message": "Access denied: User membership is not verified",
  "statusCode": 403
}

// Invalid JWT token
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

---

## 🔄 Token Management

### Automatic Token Refresh
The system automatically refreshes JWT tokens in these scenarios:
1. **User joins new organization** → Token updated with new organization access
2. **User role changes** → Token updated with new role
3. **User leaves organization** → Token updated to remove organization access
4. **Manual refresh** → `/auth/refresh-token` endpoint

### Token Refresh Process
```typescript
// Automatic refresh after enrollment
@Post('enroll')
async enrollUser(@Body() dto: EnrollDto, @Request() req) {
  await this.organizationService.enrollUser(dto);
  
  // Automatically refresh user's JWT token
  const newToken = await this.authService.refreshUserToken(req.user.userId);
  
  return {
    message: "Enrolled successfully",
    newToken // Updated JWT with new organization access
  };
}
```

---

## 📊 Access Control Scenarios

### Scenario 1: User with Multiple Organization Roles
```json
{
  "userId": "user-123",
  "organizationAccess": [
    {"organizationId": "org-1", "role": "PRESIDENT", "isVerified": true},
    {"organizationId": "org-2", "role": "ADMIN", "isVerified": true},
    {"organizationId": "org-3", "role": "MEMBER", "isVerified": true}
  ]
}
```

**Access Results:**
- ✅ Can DELETE org-1 (PRESIDENT role)
- ✅ Can UPDATE org-2 (ADMIN role)
- ✅ Can VIEW MEMBERS of org-3 (MEMBER role)
- ❌ Cannot UPDATE org-3 (only MEMBER role, needs ADMIN)
- ❌ Cannot access org-4 (not a member)

### Scenario 2: Global Administrator
```json
{
  "userId": "admin-456",
  "isGlobalAdmin": true,
  "organizationAccess": []
}
```

**Access Results:**
- ✅ Can access ANY organization
- ✅ Can perform ANY action on ANY organization
- ✅ Bypasses all membership requirements
- ✅ Bypasses all role requirements

### Scenario 3: Regular User
```json
{
  "userId": "user-789",
  "organizationAccess": [
    {"organizationId": "org-5", "role": "MEMBER", "isVerified": true}
  ]
}
```

**Access Results:**
- ✅ Can VIEW MEMBERS of org-5 (MEMBER role)
- ❌ Cannot UPDATE org-5 (needs ADMIN role)
- ❌ Cannot DELETE org-5 (needs PRESIDENT role)
- ❌ Cannot access any other organization

---

## 🛠️ Configuration

### Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=your-database-url
```

### Module Setup
```typescript
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
    }),
  ],
  providers: [
    OrganizationAccessService,
    OrganizationAccessGuard,
    JwtStrategy,
  ],
})
export class AuthModule {}
```

---

## 🧪 Testing Checklist

### ✅ Basic Access Control
- [ ] User can access organizations they belong to
- [ ] User cannot access organizations they don't belong to
- [ ] Global admin can access any organization
- [ ] JWT token contains correct organization access data

### ✅ Role-Based Permissions
- [ ] MEMBER can view members but not update organization
- [ ] ADMIN can update organization but not delete
- [ ] PRESIDENT can delete organization
- [ ] Role hierarchy properly enforced

### ✅ Token Management
- [ ] JWT tokens include organization access
- [ ] Token refresh works correctly
- [ ] Organization changes trigger token updates
- [ ] Expired tokens are rejected

### ✅ Error Handling
- [ ] Proper 403 errors for insufficient permissions
- [ ] Proper 401 errors for invalid tokens
- [ ] Clear error messages for access denials
- [ ] Correct HTTP status codes

---

## 📈 Performance Considerations

### Optimizations
1. **JWT Organization Data**: All organization access included in token (no DB queries per request)
2. **Verified Memberships Only**: Only verified memberships included to reduce token size
3. **Role Hierarchy**: Fast role comparison using enum values
4. **Cached User Data**: User validation cached for token lifetime

### Database Impact
- **Reduced Queries**: Organization access checked via JWT, not database
- **Efficient Lookups**: Only token refresh requires organization membership queries
- **Indexed Access**: Organization membership queries use proper database indexes

---

## 🔒 Security Features

### Security Measures
1. **JWT Signature Verification**: All tokens cryptographically signed
2. **Organization Isolation**: Users can only access their organizations
3. **Role Verification**: Actions restricted by user role
4. **Verified Memberships**: Only verified memberships included in tokens
5. **Token Expiration**: Automatic token expiration for security

### Best Practices
- **Regular Token Refresh**: Refresh tokens when organization access changes
- **Minimal Token Data**: Include only necessary organization access data
- **Secure Token Storage**: Store JWT tokens securely on client side
- **HTTPS Only**: Always use HTTPS in production

---

## 📝 Quick Reference

### Common Decorators
```typescript
@RequireOrganizationMember()    // Any role (MEMBER+)
@RequireOrganizationAdmin()     // Admin role (ADMIN+ or PRESIDENT)
@RequireOrganizationPresident() // President role only
```

### JWT Structure Check
```typescript
// Check if user has access to organization
const hasAccess = user.organizationAccess.some(
  access => access.organizationId === orgId && access.isVerified
);

// Check if user has required role
const hasRole = user.organizationAccess.some(
  access => access.organizationId === orgId && 
           access.role === 'PRESIDENT' && 
           access.isVerified
);

// Check if global admin
const isGlobalAdmin = user.isGlobalAdmin === true;
```

### Endpoint Protection Template
```typescript
@Get(':id/protected-action')
@UseGuards(JwtAuthGuard, OrganizationAccessGuard)
@RequireOrganizationAdmin() // or @RequireOrganizationMember() or @RequireOrganizationPresident()
async protectedAction(@Param('id') organizationId: string, @Request() req) {
  // User access automatically validated by guards
  // req.user contains JWT payload with organization access
  return this.service.performAction(organizationId, req.user);
}
```

---

**Last Updated:** July 2025  
**System Status:** Production Ready ✅  
**Security Level:** Enterprise Grade 🔒  

## 📋 Summary

This organization-based access control system provides:

- ✅ **Complete Organization Isolation**: Users can only access their organizations
- ✅ **Role-Based Authorization**: Actions restricted by user role within each organization  
- ✅ **JWT-Based Authentication**: All access data included in secure JWT tokens
- ✅ **Global Admin Support**: System administrators can access any organization
- ✅ **Automatic Validation**: Guards check access before every protected method
- ✅ **Real-time Updates**: Tokens refresh when organization memberships change
- ✅ **Comprehensive Error Handling**: Clear error messages for access violations
- ✅ **High Performance**: Minimal database queries through JWT-based access control
