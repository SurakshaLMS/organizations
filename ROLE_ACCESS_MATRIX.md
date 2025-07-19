# 🎭 Role-Based Access Control Matrix

## 📋 Overview

This document provides a comprehensive **Role Access Matrix** for the Organization Service API, detailing exactly what each role can and cannot do within the system.

---

## 🏗️ Role Definitions

### Role Hierarchy Structure
```
GLOBAL_ADMIN (Level 5) - System Administrator
    ↓
PRESIDENT (Level 4) - Organization Owner
    ↓  
ADMIN (Level 3) - Organization Administrator
    ↓
MODERATOR (Level 2) - Content Moderator
    ↓
MEMBER (Level 1) - Basic Member
```

### Role Descriptions

| Role | Level | Description | Scope |
|------|-------|-------------|-------|
| **MEMBER** | 1 | Basic organization member | Single organization |
| **MODERATOR** | 2 | Content and discussion moderator | Single organization |
| **ADMIN** | 3 | Organization administrator | Single organization |
| **PRESIDENT** | 4 | Organization owner/president | Single organization |
| **GLOBAL_ADMIN** | 5 | System administrator | All organizations |

---

## 🔐 Access Control Matrix

### Organization Management

| Action | MEMBER | MODERATOR | ADMIN | PRESIDENT | GLOBAL_ADMIN |
|--------|---------|-----------|-------|-----------|--------------|
| **View Organization Details** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Organization Members** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Join Organization** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Leave Organization** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Update Organization Info** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Delete Organization** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Manage Enrollment Keys** | ❌ | ❌ | ✅ | ✅ | ✅ |

### Member Management

| Action | MEMBER | MODERATOR | ADMIN | PRESIDENT | GLOBAL_ADMIN |
|--------|---------|-----------|-------|-----------|--------------|
| **View Member List** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Member Profiles** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Invite New Members** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Verify Members** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Remove Members** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Assign Member Roles** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Assign Admin Role** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Change President** | ❌ | ❌ | ❌ | ✅ | ✅ |

### Content Management

| Action | MEMBER | MODERATOR | ADMIN | PRESIDENT | GLOBAL_ADMIN |
|--------|---------|-----------|-------|-----------|--------------|
| **View Content** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create Content** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit Own Content** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit Others' Content** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Delete Own Content** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Delete Others' Content** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Moderate Discussions** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Pin/Feature Content** | ❌ | ✅ | ✅ | ✅ | ✅ |

### System Administration

| Action | MEMBER | MODERATOR | ADMIN | PRESIDENT | GLOBAL_ADMIN |
|--------|---------|-----------|-------|-----------|--------------|
| **Access Any Organization** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Create Organizations** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Delete Any Organization** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Manage Global Settings** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **View System Analytics** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Manage User Accounts** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🛡️ API Endpoint Access Matrix

### Authentication Endpoints
| Endpoint | Method | MEMBER | MODERATOR | ADMIN | PRESIDENT | GLOBAL_ADMIN |
|----------|--------|---------|-----------|-------|-----------|--------------|
| `/auth/login` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/auth/profile` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/auth/refresh-token` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/auth/change-password` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |

### Organization Endpoints
| Endpoint | Method | MEMBER | MODERATOR | ADMIN | PRESIDENT | GLOBAL_ADMIN |
|----------|--------|---------|-----------|-------|-----------|--------------|
| `/organizations` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/organizations/:id` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/organizations` | POST | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/organizations/:id` | PUT | ❌ | ❌ | ✅ | ✅ | ✅ |
| `/organizations/:id` | DELETE | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/organizations/:id/members` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/organizations/:id/causes` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/organizations/enroll` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |

### Cause/Content Endpoints
| Endpoint | Method | MEMBER | MODERATOR | ADMIN | PRESIDENT | GLOBAL_ADMIN |
|----------|--------|---------|-----------|-------|-----------|--------------|
| `/causes` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/causes/:id` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/causes` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/causes/:id` | PUT | 👤 | ✅ | ✅ | ✅ | ✅ |
| `/causes/:id` | DELETE | 👤 | ✅ | ✅ | ✅ | ✅ |

**Legend:**
- ✅ **Allowed** - Full access
- ❌ **Denied** - No access
- 👤 **Own Content Only** - Can only modify their own content

---

## 🔧 Role Assignment Rules

### Who Can Assign Roles

| Assigning Role | MEMBER | MODERATOR | ADMIN | PRESIDENT | GLOBAL_ADMIN |
|----------------|---------|-----------|-------|-----------|--------------|
| **MEMBER** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **MODERATOR** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **ADMIN** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **PRESIDENT** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **GLOBAL_ADMIN** | ❌ | ❌ | ❌ | ❌ | ✅ |

### Role Assignment Restrictions
1. **Cannot assign higher role than your own**
2. **PRESIDENT can only be assigned by current PRESIDENT or GLOBAL_ADMIN**
3. **GLOBAL_ADMIN can only be assigned by system administrator**
4. **Role changes require verification before taking effect**

---

## 🚫 Access Restrictions by Role

### MEMBER Restrictions
```
❌ Cannot update organization settings
❌ Cannot delete organization
❌ Cannot manage other members
❌ Cannot assign roles
❌ Cannot moderate content
❌ Cannot access admin features
```

### MODERATOR Restrictions  
```
❌ Cannot update organization settings
❌ Cannot delete organization
❌ Cannot manage member roles
❌ Cannot assign admin roles
❌ Cannot remove admins/presidents
✅ Can moderate content and discussions
```

### ADMIN Restrictions
```
❌ Cannot delete organization
❌ Cannot assign PRESIDENT role
❌ Cannot remove PRESIDENT
❌ Cannot transfer ownership
✅ Can manage members and moderators
✅ Can update organization settings
```

### PRESIDENT Restrictions
```
❌ Cannot access other organizations (unless GLOBAL_ADMIN)
❌ Cannot modify global system settings
✅ Full control over their organization
✅ Can assign any role including ADMIN
✅ Can delete organization
```

### GLOBAL_ADMIN (No Restrictions)
```
✅ Access to all organizations
✅ All actions in any organization
✅ System-wide administration
✅ Can override any restriction
```

---

## 🔍 Role Verification Examples

### Example 1: Member Trying Admin Action
```json
Request: PUT /organizations/org-123
User Role: MEMBER
Required Role: ADMIN

Result: 403 Forbidden
Message: "Access denied: Required role(s): ADMIN, PRESIDENT. User role: MEMBER"
```

### Example 2: Admin Updating Organization
```json
Request: PUT /organizations/org-123  
User Role: ADMIN
Required Role: ADMIN

Result: 200 OK
Message: "Organization updated successfully"
```

### Example 3: Non-Member Access
```json
Request: GET /organizations/org-456/members
User Organizations: ["org-123", "org-789"]
Requested Organization: org-456

Result: 403 Forbidden
Message: "Access denied: User is not a member of this organization"
```

### Example 4: Global Admin Override
```json
Request: DELETE /organizations/any-org
User Role: GLOBAL_ADMIN
Organization Member: false

Result: 200 OK
Message: "Organization deleted successfully (Global Admin override)"
```

---

## 🎯 Role-Based Feature Access

### Dashboard Features
| Feature | MEMBER | MODERATOR | ADMIN | PRESIDENT | GLOBAL_ADMIN |
|---------|---------|-----------|-------|-----------|--------------|
| **Organization Overview** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Member Directory** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Content Library** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Member Management** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Organization Settings** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Analytics Dashboard** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **System Administration** | ❌ | ❌ | ❌ | ❌ | ✅ |

### Notification Permissions
| Notification Type | MEMBER | MODERATOR | ADMIN | PRESIDENT | GLOBAL_ADMIN |
|------------------|---------|-----------|-------|-----------|--------------|
| **Announcements** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Member Alerts** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **System Notifications** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🧪 Testing Role Access

### Test Scenarios by Role

#### MEMBER Testing
```bash
# Should SUCCEED
curl -X GET /organizations/org-123/members -H "Authorization: Bearer <member_token>"
curl -X POST /organizations/enroll -H "Authorization: Bearer <member_token>"

# Should FAIL (403 Forbidden)
curl -X PUT /organizations/org-123 -H "Authorization: Bearer <member_token>"
curl -X DELETE /organizations/org-123 -H "Authorization: Bearer <member_token>"
```

#### ADMIN Testing
```bash
# Should SUCCEED
curl -X PUT /organizations/org-123 -H "Authorization: Bearer <admin_token>"
curl -X POST /members/verify -H "Authorization: Bearer <admin_token>"

# Should FAIL (403 Forbidden)
curl -X DELETE /organizations/org-123 -H "Authorization: Bearer <admin_token>"
```

#### PRESIDENT Testing
```bash
# Should SUCCEED
curl -X DELETE /organizations/org-123 -H "Authorization: Bearer <president_token>"
curl -X PUT /organizations/org-123 -H "Authorization: Bearer <president_token>"

# Should SUCCEED (All organization actions)
curl -X POST /members/assign-role -H "Authorization: Bearer <president_token>"
```

#### GLOBAL_ADMIN Testing
```bash
# Should SUCCEED (Any organization)
curl -X DELETE /organizations/any-org-id -H "Authorization: Bearer <global_admin_token>"
curl -X GET /organizations/any-org-id/members -H "Authorization: Bearer <global_admin_token>"
```

---

## 📊 Role Distribution Guidelines

### Recommended Role Distribution
```
MEMBER:      70-80% (Most users)
MODERATOR:   10-15% (Active community members)
ADMIN:       5-10%  (Trusted administrators)
PRESIDENT:   1-5%   (Organization leaders)
GLOBAL_ADMIN: <1%   (System administrators only)
```

### Role Assignment Best Practices
1. **Start with MEMBER** - All new users begin as members
2. **Promote gradually** - Earn trust before higher roles
3. **Regular review** - Audit role assignments quarterly
4. **Principle of least privilege** - Give minimum required access
5. **Document changes** - Log all role modifications

---

## 🔄 Role Transition Flows

### Member → Moderator
```
Requirements:
✅ Active participation (30+ days)
✅ Positive community engagement
✅ Admin recommendation
✅ No violations or warnings

Process:
1. Admin identifies candidate
2. Admin assigns MODERATOR role
3. User receives notification
4. Access permissions updated
```

### Moderator → Admin
```
Requirements:
✅ Successful moderation history (90+ days)
✅ Leadership qualities demonstrated
✅ President approval required
✅ Understanding of organization policies

Process:
1. President evaluates candidate
2. President assigns ADMIN role
3. User receives notification
4. Admin permissions activated
```

### Admin → President
```
Requirements:
✅ Proven administrative competence
✅ Organization leadership vision
✅ Current President approval OR election
✅ Board/member consensus (if applicable)

Process:
1. Current President designates successor
2. Transfer of PRESIDENT role
3. Previous President role adjusted
4. Full organization control transferred
```

---

## 🚨 Emergency Access Procedures

### Lost President Access
```
Scenario: Organization president account inaccessible
Solution: GLOBAL_ADMIN can assign new PRESIDENT
Process:
1. Submit admin request with verification
2. GLOBAL_ADMIN validates identity
3. Temporary PRESIDENT assigned
4. Organization access restored
```

### Compromised Admin Account
```
Scenario: Admin account suspected compromise
Solution: PRESIDENT can immediately revoke access
Process:
1. PRESIDENT removes compromised admin role
2. Account suspended pending investigation
3. All sessions invalidated
4. Security audit performed
```

---

## 📝 Quick Role Reference

### Permission Levels
```
Level 1: MEMBER - Basic access
Level 2: MODERATOR - Content management
Level 3: ADMIN - Organization management  
Level 4: PRESIDENT - Full control
Level 5: GLOBAL_ADMIN - System-wide
```

### Common Actions by Role
```
MEMBER: View, Join, Leave, Create Content
MODERATOR: + Moderate, Edit Others' Content
ADMIN: + Manage Members, Update Org Settings
PRESIDENT: + Delete Org, Assign All Roles
GLOBAL_ADMIN: + Access Any Org, System Admin
```

---

**Role Access Control Matrix | Organization Service API**  
*Last Updated: July 2025 | System Status: Production Ready ✅*
