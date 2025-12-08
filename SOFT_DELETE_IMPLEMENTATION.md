# 🗑️ SOFT DELETE IMPLEMENTATION - Complete Guide

**Date:** December 8, 2025  
**Status:** ✅ IMPLEMENTED

---

## 📋 OVERVIEW

Implemented comprehensive soft delete functionality for Causes, Lectures, and Documents with automatic cascade behavior.

### Key Features
- ✅ Soft delete (sets `isActive = false` instead of removing records)
- ✅ Cascade delete (cause → lectures → documents)
- ✅ Role-based access control (PRESIDENT and ADMIN only)
- ✅ Transaction support for data consistency
- ✅ Automatic filtering of deleted records in queries

---

## 🗄️ DATABASE SCHEMA CHANGES

### Migration Required

Run the migration SQL file to add `isActive` fields:

```bash
# Apply migration
npx prisma db push

# Or run the SQL migration manually
mysql -u your_user -p your_database < prisma/migrations/add_soft_delete_fields.sql
```

### Schema Updates

#### Causes Table (`org_causes`)
```prisma
model Cause {
  // ... existing fields
  isActive  Boolean  @default(true)  // NEW FIELD
  
  @@index([isActive])  // NEW INDEX
}
```

#### Lectures Table (`org_lectures`)
```prisma
model Lecture {
  // ... existing fields
  isActive  Boolean  @default(true)  // NEW FIELD
  
  @@index([isActive])  // NEW INDEX
}
```

#### Documentation Table (`org_documentation`)
```prisma
model Documentation {
  // ... existing fields
  isActive  Boolean  @default(true)  // NEW FIELD
  
  @@index([isActive])  // NEW INDEX
}
```

---

## 🔐 ACCESS CONTROL

### Who Can Delete?

| Entity | Allowed Roles | Endpoint |
|--------|--------------|----------|
| **Cause** | PRESIDENT, ADMIN | `DELETE /causes/:id` |
| **Lecture** | PRESIDENT, ADMIN | `DELETE /lectures/:id` |
| **Document** | PRESIDENT, ADMIN | `DELETE /lectures/documents/:documentId` |

### Permission Checks

All delete operations verify:
1. ✅ User is authenticated (JWT token required)
2. ✅ User belongs to the organization
3. ✅ User has PRESIDENT or ADMIN role
4. ✅ User is verified in the organization

**Note:** MODERATOR role can NO LONGER delete content (security enhancement)

---

## 🔄 CASCADE BEHAVIOR

### Cause Deletion
When a cause is soft deleted:
```
Cause (isActive = false)
├── All Lectures under this cause → isActive = false
└── All Documents under those lectures → isActive = false
```

**Example Response:**
```json
{
  "message": "Cause and all related content soft deleted successfully",
  "deletedCause": {
    "causeId": "123",
    "title": "Environmental Conservation",
    "deletedAt": "2025-12-08T10:30:00.000Z"
  },
  "cascade": {
    "lecturesAffected": 15,
    "documentsAffected": 48
  }
}
```

### Lecture Deletion
When a lecture is soft deleted:
```
Lecture (isActive = false)
└── All Documents under this lecture → isActive = false
```

**Example Response:**
```json
{
  "message": "Lecture and all related documents soft deleted successfully",
  "deletedLecture": {
    "lectureId": "456",
    "title": "Introduction to Biology",
    "deletedAt": "2025-12-08T10:35:00.000Z"
  },
  "cascade": {
    "documentsAffected": 3
  }
}
```

### Document Deletion
When a document is soft deleted:
```
Document (isActive = false)
```

**Example Response:**
```json
{
  "message": "Document \"Lecture Notes.pdf\" soft deleted successfully"
}
```

---

## 📡 API ENDPOINTS

### 1. Delete Cause (Soft Delete)

**Endpoint:** `DELETE /organization/api/v1/causes/:id`

**Authorization:** Organization PRESIDENT or ADMIN

**Request:**
```bash
curl -X DELETE \
  https://api.yourdomain.com/organization/api/v1/causes/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200):**
```json
{
  "message": "Cause and all related content soft deleted successfully",
  "deletedCause": {
    "causeId": "123",
    "title": "Environmental Conservation",
    "deletedAt": "2025-12-08T10:30:00.000Z"
  },
  "cascade": {
    "lecturesAffected": 15,
    "documentsAffected": 48
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - User is not PRESIDENT or ADMIN
- `404 Not Found` - Cause not found or already deleted

---

### 2. Delete Lecture (Soft Delete)

**Endpoint:** `DELETE /organization/api/v1/lectures/:id`

**Authorization:** Organization PRESIDENT or ADMIN

**Request:**
```bash
curl -X DELETE \
  https://api.yourdomain.com/organization/api/v1/lectures/456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200):**
```json
{
  "message": "Lecture and all related documents soft deleted successfully",
  "deletedLecture": {
    "lectureId": "456",
    "title": "Introduction to Biology",
    "deletedAt": "2025-12-08T10:35:00.000Z"
  },
  "cascade": {
    "documentsAffected": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - User is not PRESIDENT or ADMIN
- `404 Not Found` - Lecture not found or already deleted

---

### 3. Delete Document (Soft Delete)

**Endpoint:** `DELETE /organization/api/v1/lectures/documents/:documentId`

**Authorization:** Organization PRESIDENT or ADMIN

**Request:**
```bash
curl -X DELETE \
  https://api.yourdomain.com/organization/api/v1/lectures/documents/789 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200):**
```json
{
  "message": "Document \"Lecture Notes.pdf\" soft deleted successfully"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - User is not PRESIDENT or ADMIN
- `404 Not Found` - Document not found or already deleted

---

## 🔍 QUERY FILTERING

All GET endpoints automatically filter out soft-deleted records:

### Filtered Queries

| Endpoint | Filter Applied |
|----------|----------------|
| `GET /causes` | `isActive = true` |
| `GET /causes/:id` | `isActive = true` |
| `GET /causes/organization/:organizationId` | `isActive = true` |
| `GET /lectures` | `isActive = true` |
| `GET /lectures/:id` | `isActive = true` |
| `GET /lectures/:id/documents` | `isActive = true` |

### Example: Getting Active Causes

**Before Soft Delete:**
- Cause returns all causes (including deleted)

**After Soft Delete:**
- Only returns causes where `isActive = true`
- Deleted causes are invisible to users

---

## 🛠️ IMPLEMENTATION DETAILS

### Transaction Support

All cascade delete operations use Prisma transactions for atomicity:

```typescript
await this.prisma.$transaction(async (prisma) => {
  // 1. Soft delete documents
  await prisma.documentation.updateMany({
    where: { lecture: { causeId } },
    data: { isActive: false }
  });
  
  // 2. Soft delete lectures
  await prisma.lecture.updateMany({
    where: { causeId },
    data: { isActive: false }
  });
  
  // 3. Soft delete cause
  await prisma.cause.update({
    where: { causeId },
    data: { isActive: false }
  });
});
```

### Permission Validation

```typescript
// Check user role
const userRole = await prisma.organizationUser.findUnique({
  where: {
    organizationId_userId: { organizationId, userId }
  },
  select: { role: true, isVerified: true }
});

// Verify permission
if (!userRole || !userRole.isVerified) {
  throw new ForbiddenException('You are not a member of this organization');
}

if (userRole.role !== 'PRESIDENT' && userRole.role !== 'ADMIN') {
  throw new ForbiddenException('Only presidents and admins can delete');
}
```

### Duplicate Delete Prevention

```typescript
if (!cause.isActive) {
  throw new NotFoundException('Cause has already been deleted');
}
```

---

## 🧪 TESTING

### Test Scenarios

#### 1. Test Cause Deletion (CASCADE)
```bash
# Create test data
POST /causes (Create cause) → causeId: 1
POST /lectures (Create 2 lectures under cause 1) → lectureId: 1, 2
POST /lectures/1/with-documents (Add 3 docs to lecture 1)
POST /lectures/2/with-documents (Add 2 docs to lecture 2)

# Soft delete cause
DELETE /causes/1 (as ADMIN)

# Verify cascade
GET /causes/1 → 404 Not Found
GET /lectures?causeId=1 → Empty array
GET /lectures/1/documents → 404 Not Found

# Verify database
SELECT * FROM org_causes WHERE causeId = 1 → isActive = false
SELECT * FROM org_lectures WHERE causeId = 1 → All isActive = false
SELECT * FROM org_documentation WHERE lectureId IN (1,2) → All isActive = false
```

#### 2. Test Permission Checks
```bash
# As MODERATOR (should fail)
DELETE /causes/1 → 403 Forbidden

# As ADMIN (should succeed)
DELETE /causes/1 → 200 OK

# As PRESIDENT (should succeed)
DELETE /causes/1 → 200 OK

# As non-member (should fail)
DELETE /causes/1 → 403 Forbidden
```

#### 3. Test Duplicate Delete
```bash
# First delete
DELETE /lectures/1 → 200 OK

# Second delete (same lecture)
DELETE /lectures/1 → 404 Not Found (already deleted)
```

---

## 📊 DATABASE QUERIES

### Check Soft-Deleted Records

```sql
-- Count active vs deleted causes
SELECT 
  SUM(CASE WHEN isActive = true THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN isActive = false THEN 1 ELSE 0 END) as deleted
FROM org_causes;

-- Find recently deleted causes
SELECT causeId, title, updatedAt
FROM org_causes
WHERE isActive = false
ORDER BY updatedAt DESC
LIMIT 10;

-- Count cascade deletions for a cause
SELECT 
  c.causeId,
  c.title,
  COUNT(DISTINCT l.lectureId) as deleted_lectures,
  COUNT(d.documentationId) as deleted_documents
FROM org_causes c
LEFT JOIN org_lectures l ON c.causeId = l.causeId AND l.isActive = false
LEFT JOIN org_documentation d ON l.lectureId = d.lectureId AND d.isActive = false
WHERE c.isActive = false
GROUP BY c.causeId, c.title;
```

### Restore Soft-Deleted Records (Admin Only)

```sql
-- Restore a cause (manual SQL - no API endpoint)
UPDATE org_causes SET isActive = true WHERE causeId = 123;

-- Restore cascade (lectures and documents)
UPDATE org_lectures SET isActive = true WHERE causeId = 123;
UPDATE org_documentation SET isActive = true 
WHERE lectureId IN (SELECT lectureId FROM org_lectures WHERE causeId = 123);
```

---

## ⚠️ IMPORTANT NOTES

### Breaking Changes

1. **MODERATOR Role Restriction**
   - Before: MODERATOR could delete lectures and documents
   - After: Only PRESIDENT and ADMIN can delete
   - **Impact:** Moderators will receive 403 Forbidden errors

2. **Delete Behavior Change**
   - Before: Hard delete (record removed from database)
   - After: Soft delete (record marked as inactive)
   - **Impact:** Deleted records still exist in database

3. **S3 Files NOT Deleted**
   - Soft delete does NOT remove files from S3
   - Files remain in storage but are marked inactive
   - **Future:** Implement separate cleanup job for old files

### Migration Checklist

- [ ] Run database migration (`add_soft_delete_fields.sql`)
- [ ] Update API documentation for clients
- [ ] Inform users about MODERATOR permission changes
- [ ] Test all delete endpoints with PRESIDENT/ADMIN roles
- [ ] Verify cascade behavior in staging environment
- [ ] Update frontend to handle new response format

---

## 🚀 DEPLOYMENT

### Pre-Deployment Steps

1. **Backup Database**
   ```bash
   mysqldump -u user -p database > backup_before_soft_delete.sql
   ```

2. **Apply Migration**
   ```bash
   npx prisma db push
   ```

3. **Verify Migration**
   ```sql
   DESCRIBE org_causes; -- Check for isActive column
   DESCRIBE org_lectures; -- Check for isActive column
   DESCRIBE org_documentation; -- Check for isActive column
   ```

4. **Deploy Application**
   ```bash
   npm run build
   NODE_ENV=production npm run start:prod
   ```

5. **Test in Production**
   - Test cause deletion with ADMIN account
   - Verify cascade works correctly
   - Check that deleted items don't appear in listings

---

## 📞 SUPPORT

### Common Issues

**Issue:** "Only organization presidents and admins can delete"
**Solution:** Check user role in organization. Only PRESIDENT and ADMIN roles are allowed.

**Issue:** "Cause has already been deleted"
**Solution:** The cause was previously soft deleted. Check database `isActive` field.

**Issue:** "Deleted items still appear in queries"
**Solution:** Ensure all GET queries include `isActive = true` filter.

---

## 📝 CHANGELOG

### Version 1.0.0 (December 8, 2025)

**Added:**
- ✅ Soft delete functionality for Causes, Lectures, and Documents
- ✅ Cascade soft delete (cause → lectures → documents)
- ✅ Role-based access control (PRESIDENT and ADMIN only)
- ✅ Transaction support for atomic operations
- ✅ Automatic filtering of deleted records in queries
- ✅ Database migration for `isActive` fields
- ✅ Comprehensive API documentation

**Changed:**
- ⚠️ MODERATOR role can no longer delete content
- ⚠️ Delete operations now soft delete instead of hard delete
- ⚠️ S3 files are NOT deleted (records only marked inactive)

**Security:**
- ✅ Enhanced permission checks
- ✅ Transaction-based consistency
- ✅ Duplicate delete prevention

---

**Status:** ✅ PRODUCTION READY  
**Documentation:** Complete  
**Testing:** Required before deployment
