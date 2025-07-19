# 🔐 Organization Access Control - Quick Reference Card

## JWT Token Structure
```json
{
  "organizationAccess": [
    {"organizationId": "org-123", "role": "PRESIDENT", "isVerified": true}
  ],
  "isGlobalAdmin": false
}
```

## Role Hierarchy (Low → High)
```
MEMBER → MODERATOR → ADMIN → PRESIDENT → GLOBAL_ADMIN
   1         2         3        4           5
```

## Access Control Rules

| Endpoint | Method | Required Role | Global Admin |
|----------|--------|---------------|--------------|
| `/organizations/:id/members` | GET | MEMBER+ | ✅ |
| `/organizations/:id` | PUT | ADMIN+ | ✅ |
| `/organizations/:id` | DELETE | PRESIDENT | ✅ |

## Decorators
```typescript
@RequireOrganizationMember()    // Any role
@RequireOrganizationAdmin()     // ADMIN or PRESIDENT
@RequireOrganizationPresident() // PRESIDENT only
```

## Controller Template
```typescript
@Get(':id/action')
@UseGuards(JwtAuthGuard, OrganizationAccessGuard)
@RequireOrganizationAdmin()
async action(@Param('id') orgId: string) {
  // Access automatically validated
}
```

## HTTP Status Codes
- **200** ✅ Success (has access)
- **401** ❌ Unauthorized (invalid token)  
- **403** ❌ Forbidden (insufficient role)
- **404** ❌ Not Found (org doesn't exist)

## Testing Examples
```bash
# Login
curl -X POST /auth/login -d '{"email":"user@email.com","password":"pass"}'

# Access with token
curl -X GET /organizations/org-123/members \
  -H "Authorization: Bearer <token>"

# Expected errors
403 Forbidden - Wrong role or not a member
401 Unauthorized - Invalid/missing token
```

## Key Components
- **OrganizationAccessService** - Core access logic
- **OrganizationAccessGuard** - Request validation
- **JWT Strategy** - Token validation
- **Access Decorators** - Role requirements

## Security Features
✅ Organization isolation  
✅ Role-based permissions  
✅ JWT-based authentication  
✅ Global admin override  
✅ Automatic validation  
✅ Real-time token updates  

---
*System Status: Production Ready | Last Updated: July 2025*
