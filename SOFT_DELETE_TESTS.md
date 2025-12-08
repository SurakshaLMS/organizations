# 🧪 SOFT DELETE TEST CASES - Complete Test Suite

**Date:** December 8, 2025  
**Purpose:** Verify soft delete functionality for Causes, Lectures, and Documents

---

## 📋 TEST PREREQUISITES

### Required Setup
1. ✅ Database migration applied (`isActive` columns exist)
2. ✅ Prisma Client regenerated
3. ✅ Application running on development/staging server
4. ✅ Test user accounts with different roles:
   - PRESIDENT user (for testing allowed deletions)
   - ADMIN user (for testing allowed deletions)
   - MODERATOR user (for testing forbidden access)
   - MEMBER user (for testing forbidden access)

### Test Data Requirements
```sql
-- Create test organization
INSERT INTO organizations (organizationId, name) VALUES (999, 'Test Organization');

-- Create test cause
INSERT INTO org_causes (causeId, organizationId, title, isPublic, isActive) 
VALUES (999, 999, 'Test Cause for Deletion', true, true);

-- Create test lectures
INSERT INTO org_lectures (lectureId, causeId, title, isPublic, isActive) 
VALUES 
  (9991, 999, 'Test Lecture 1', true, true),
  (9992, 999, 'Test Lecture 2', true, true);

-- Create test documents
INSERT INTO org_documentation (documentationId, lectureId, title, isActive) 
VALUES 
  (99911, 9991, 'Test Doc 1 for Lecture 1', true),
  (99912, 9991, 'Test Doc 2 for Lecture 1', true),
  (99921, 9992, 'Test Doc 1 for Lecture 2', true);
```

---

## 🔴 CAUSE TESTS

### TEST 1.1: Soft Delete Cause (CASCADE) - PRESIDENT Role
**Purpose:** Verify cascade soft delete works correctly for PRESIDENT

**Steps:**
```bash
# 1. Get JWT token for PRESIDENT user
POST /api/v1/auth/login
Body: {"email": "president@test.com", "password": "password123"}
# Save the token from response

# 2. Verify cause exists before deletion
GET /api/v1/causes/999
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK, returns cause data

# 3. Verify lectures exist before deletion
GET /api/v1/lectures?causeId=999
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK, returns 2 lectures

# 4. Delete the cause
DELETE /api/v1/causes/999
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK
# Response should include:
# {
#   "message": "Cause and all related content soft deleted successfully",
#   "deletedCause": { "causeId": "999", ... },
#   "cascade": {
#     "lecturesAffected": 2,
#     "documentsAffected": 3
#   }
# }

# 5. Verify cause is hidden from queries
GET /api/v1/causes/999
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 404 Not Found

# 6. Verify lectures are hidden
GET /api/v1/lectures?causeId=999
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK, returns empty array []

# 7. Verify in database (direct SQL check)
SELECT causeId, isActive FROM org_causes WHERE causeId = 999;
# Expected: isActive = 0 (false)

SELECT lectureId, isActive FROM org_lectures WHERE causeId = 999;
# Expected: All isActive = 0 (false)

SELECT documentationId, isActive FROM org_documentation 
WHERE lectureId IN (9991, 9992);
# Expected: All isActive = 0 (false)
```

**✅ Success Criteria:**
- Cause returns 404 after deletion
- All 2 lectures have `isActive = false`
- All 3 documents have `isActive = false`
- Response shows correct affected counts
- Queries don't return soft-deleted records

---

### TEST 1.2: Soft Delete Cause - ADMIN Role
**Purpose:** Verify ADMIN role can also delete causes

**Steps:**
```bash
# Create new test cause
INSERT INTO org_causes (causeId, organizationId, title, isActive) 
VALUES (998, 999, 'Test Cause for ADMIN', true);

# 1. Get JWT token for ADMIN user
POST /api/v1/auth/login
Body: {"email": "admin@test.com", "password": "password123"}

# 2. Delete the cause
DELETE /api/v1/causes/998
Authorization: Bearer {ADMIN_TOKEN}
# Expected: 200 OK with cascade information
```

**✅ Success Criteria:**
- ADMIN can successfully delete cause
- Same cascade behavior as PRESIDENT

---

### TEST 1.3: Soft Delete Cause - MODERATOR Role (FORBIDDEN)
**Purpose:** Verify MODERATOR role CANNOT delete causes

**Steps:**
```bash
# Create new test cause
INSERT INTO org_causes (causeId, organizationId, title, isActive) 
VALUES (997, 999, 'Test Cause for MODERATOR', true);

# 1. Get JWT token for MODERATOR user
POST /api/v1/auth/login
Body: {"email": "moderator@test.com", "password": "password123"}

# 2. Attempt to delete the cause
DELETE /api/v1/causes/997
Authorization: Bearer {MODERATOR_TOKEN}
# Expected: 403 Forbidden
# Response: {
#   "statusCode": 403,
#   "message": "Only organization presidents and admins can delete causes"
# }

# 3. Verify cause still exists
GET /api/v1/causes/997
Authorization: Bearer {MODERATOR_TOKEN}
# Expected: 200 OK (cause was NOT deleted)
```

**✅ Success Criteria:**
- Returns 403 Forbidden status
- Error message mentions "presidents and admins"
- Cause remains in database with `isActive = true`

---

### TEST 1.4: Query Filtering - Deleted Causes Don't Appear
**Purpose:** Verify soft-deleted causes are hidden from all queries

**Steps:**
```bash
# Setup: Create 3 causes, delete 1
INSERT INTO org_causes (causeId, organizationId, title, isActive) 
VALUES 
  (996, 999, 'Active Cause 1', true),
  (995, 999, 'Active Cause 2', true),
  (994, 999, 'Deleted Cause', false);  -- Already soft deleted

# 1. Get all causes
GET /api/v1/causes
Authorization: Bearer {USER_TOKEN}
# Expected: 200 OK, returns only 2 causes (996, 995)
# Should NOT include cause 994

# 2. Try to get deleted cause by ID
GET /api/v1/causes/994
Authorization: Bearer {USER_TOKEN}
# Expected: 404 Not Found

# 3. Get causes by organization
GET /api/v1/causes/organization/999
Authorization: Bearer {USER_TOKEN}
# Expected: 200 OK, returns only active causes
```

**✅ Success Criteria:**
- List queries don't return soft-deleted causes
- Direct ID lookup returns 404 for deleted causes
- Organization queries filter out deleted causes

---

### TEST 1.5: Double Delete Prevention
**Purpose:** Verify cannot delete already deleted cause

**Steps:**
```bash
# Setup: Cause 999 already deleted in TEST 1.1

# 1. Attempt to delete again
DELETE /api/v1/causes/999
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 404 Not Found
# Response: {
#   "statusCode": 404,
#   "message": "Cause has already been deleted"
# }
```

**✅ Success Criteria:**
- Returns 404 Not Found
- Error message indicates already deleted
- Database still shows `isActive = false` (unchanged)

---

## 🔵 LECTURE TESTS

### TEST 2.1: Soft Delete Lecture (CASCADE) - PRESIDENT Role
**Purpose:** Verify lecture soft delete cascades to documents

**Steps:**
```bash
# Setup: Create test lecture with documents
INSERT INTO org_lectures (lectureId, causeId, title, isActive) 
VALUES (8881, 999, 'Test Lecture for Delete', true);

INSERT INTO org_documentation (documentationId, lectureId, title, isActive) 
VALUES 
  (88811, 8881, 'Lecture Doc 1', true),
  (88812, 8881, 'Lecture Doc 2', true),
  (88813, 8881, 'Lecture Doc 3', true);

# 1. Get JWT token for PRESIDENT user
POST /api/v1/auth/login
Body: {"email": "president@test.com", "password": "password123"}

# 2. Verify lecture exists
GET /api/v1/lectures/8881
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK, returns lecture with 3 documents

# 3. Delete the lecture
DELETE /api/v1/lectures/8881
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK
# Response: {
#   "message": "Lecture and all related documents soft deleted successfully",
#   "deletedLecture": { "lectureId": "8881", ... },
#   "cascade": {
#     "documentsAffected": 3
#   }
# }

# 4. Verify lecture is hidden
GET /api/v1/lectures/8881
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 404 Not Found

# 5. Verify documents are hidden
GET /api/v1/lectures/8881/documents
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 404 Not Found (lecture not found)

# 6. Database verification
SELECT lectureId, isActive FROM org_lectures WHERE lectureId = 8881;
# Expected: isActive = 0 (false)

SELECT documentationId, isActive FROM org_documentation WHERE lectureId = 8881;
# Expected: All 3 documents have isActive = 0 (false)
```

**✅ Success Criteria:**
- Lecture returns 404 after deletion
- All 3 documents have `isActive = false`
- Response shows `documentsAffected: 3`
- Queries don't return deleted lecture

---

### TEST 2.2: Soft Delete Lecture - ADMIN Role
**Purpose:** Verify ADMIN role can delete lectures

**Steps:**
```bash
# Create test lecture
INSERT INTO org_lectures (lectureId, causeId, title, isActive) 
VALUES (8882, 999, 'Test Lecture for ADMIN', true);

# 1. Get JWT token for ADMIN user
POST /api/v1/auth/login
Body: {"email": "admin@test.com", "password": "password123"}

# 2. Delete the lecture
DELETE /api/v1/lectures/8882
Authorization: Bearer {ADMIN_TOKEN}
# Expected: 200 OK
```

**✅ Success Criteria:**
- ADMIN can successfully delete lecture
- Same cascade behavior as PRESIDENT

---

### TEST 2.3: Soft Delete Lecture - MODERATOR Role (FORBIDDEN)
**Purpose:** Verify MODERATOR role CANNOT delete lectures

**Steps:**
```bash
# Create test lecture
INSERT INTO org_lectures (lectureId, causeId, title, isActive) 
VALUES (8883, 999, 'Test Lecture for MODERATOR', true);

# 1. Get JWT token for MODERATOR user
POST /api/v1/auth/login
Body: {"email": "moderator@test.com", "password": "password123"}

# 2. Attempt to delete
DELETE /api/v1/lectures/8883
Authorization: Bearer {MODERATOR_TOKEN}
# Expected: 403 Forbidden
# Response: {
#   "statusCode": 403,
#   "message": "Only organization presidents and admins can delete lectures"
# }

# 3. Verify lecture still exists
GET /api/v1/lectures/8883
Authorization: Bearer {MODERATOR_TOKEN}
# Expected: 200 OK (lecture was NOT deleted)
```

**✅ Success Criteria:**
- Returns 403 Forbidden status
- Lecture remains with `isActive = true`

---

### TEST 2.4: Query Filtering - Deleted Lectures Don't Appear
**Purpose:** Verify soft-deleted lectures are hidden

**Steps:**
```bash
# Setup: Create lectures, delete one
INSERT INTO org_lectures (lectureId, causeId, title, isActive) 
VALUES 
  (8884, 999, 'Active Lecture 1', true),
  (8885, 999, 'Active Lecture 2', true),
  (8886, 999, 'Deleted Lecture', false);  -- Soft deleted

# 1. Get all lectures for cause
GET /api/v1/lectures?causeId=999
Authorization: Bearer {USER_TOKEN}
# Expected: Returns only lectures 8884, 8885 (NOT 8886)

# 2. Try to get deleted lecture
GET /api/v1/lectures/8886
Authorization: Bearer {USER_TOKEN}
# Expected: 404 Not Found

# 3. Search lectures
GET /api/v1/lectures?search=Deleted
Authorization: Bearer {USER_TOKEN}
# Expected: Empty array (deleted lecture not returned)
```

**✅ Success Criteria:**
- List queries exclude soft-deleted lectures
- Direct access returns 404
- Search doesn't find deleted lectures

---

### TEST 2.5: Double Delete Prevention - Lecture
**Purpose:** Verify cannot delete already deleted lecture

**Steps:**
```bash
# Setup: Lecture 8881 already deleted in TEST 2.1

# 1. Attempt to delete again
DELETE /api/v1/lectures/8881
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 404 Not Found
# Response: {
#   "statusCode": 404,
#   "message": "Lecture has already been deleted"
# }
```

**✅ Success Criteria:**
- Returns 404 Not Found
- Error message indicates already deleted

---

## 🟢 DOCUMENT TESTS

### TEST 3.1: Soft Delete Document - PRESIDENT Role
**Purpose:** Verify document soft delete (no cascade)

**Steps:**
```bash
# Setup: Create test document
INSERT INTO org_documentation (documentationId, lectureId, title, isActive) 
VALUES (77771, 8881, 'Test Document for Delete', true);

# 1. Get JWT token for PRESIDENT user
POST /api/v1/auth/login
Body: {"email": "president@test.com", "password": "password123"}

# 2. Verify document exists
GET /api/v1/lectures/8881/documents
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK, includes document 77771

# 3. Delete the document
DELETE /api/v1/lectures/documents/77771
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK
# Response: {
#   "message": "Document \"Test Document for Delete\" soft deleted successfully"
# }

# 4. Verify document is hidden
GET /api/v1/lectures/8881/documents
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK, does NOT include document 77771

# 5. Database verification
SELECT documentationId, isActive FROM org_documentation WHERE documentationId = 77771;
# Expected: isActive = 0 (false)

# 6. Verify lecture is NOT affected
SELECT lectureId, isActive FROM org_lectures WHERE lectureId = 8881;
# Expected: isActive = 1 (true) - lecture still active
```

**✅ Success Criteria:**
- Document returns 404 or is filtered from queries
- Document has `isActive = false`
- Parent lecture remains active (`isActive = true`)
- No cascade effect (only document deleted)

---

### TEST 3.2: Soft Delete Document - ADMIN Role
**Purpose:** Verify ADMIN role can delete documents

**Steps:**
```bash
# Create test document
INSERT INTO org_documentation (documentationId, lectureId, title, isActive) 
VALUES (77772, 8881, 'Test Document for ADMIN', true);

# 1. Get JWT token for ADMIN user
POST /api/v1/auth/login
Body: {"email": "admin@test.com", "password": "password123"}

# 2. Delete the document
DELETE /api/v1/lectures/documents/77772
Authorization: Bearer {ADMIN_TOKEN}
# Expected: 200 OK
```

**✅ Success Criteria:**
- ADMIN can successfully delete document
- Same behavior as PRESIDENT

---

### TEST 3.3: Soft Delete Document - MODERATOR Role (FORBIDDEN)
**Purpose:** Verify MODERATOR role CANNOT delete documents

**Steps:**
```bash
# Create test document
INSERT INTO org_documentation (documentationId, lectureId, title, isActive) 
VALUES (77773, 8881, 'Test Document for MODERATOR', true);

# 1. Get JWT token for MODERATOR user
POST /api/v1/auth/login
Body: {"email": "moderator@test.com", "password": "password123"}

# 2. Attempt to delete
DELETE /api/v1/lectures/documents/77773
Authorization: Bearer {MODERATOR_TOKEN}
# Expected: 403 Forbidden
# Response: {
#   "statusCode": 403,
#   "message": "Only organization presidents and admins can delete documents"
# }

# 3. Verify document still exists
GET /api/v1/lectures/8881/documents
Authorization: Bearer {MODERATOR_TOKEN}
# Expected: 200 OK, includes document 77773
```

**✅ Success Criteria:**
- Returns 403 Forbidden status
- Document remains with `isActive = true`

---

### TEST 3.4: Query Filtering - Deleted Documents Don't Appear
**Purpose:** Verify soft-deleted documents are hidden

**Steps:**
```bash
# Setup: Create documents, delete one
INSERT INTO org_documentation (documentationId, lectureId, title, isActive) 
VALUES 
  (77774, 8881, 'Active Doc 1', true),
  (77775, 8881, 'Active Doc 2', true),
  (77776, 8881, 'Deleted Doc', false);  -- Soft deleted

# 1. Get all documents for lecture
GET /api/v1/lectures/8881/documents
Authorization: Bearer {USER_TOKEN}
# Expected: Returns only documents 77774, 77775 (NOT 77776)

# 2. Get lecture details (includes documents)
GET /api/v1/lectures/8881
Authorization: Bearer {USER_TOKEN}
# Expected: Response.documents array does NOT include document 77776

# 3. Try direct access (if endpoint exists)
# Expected: 404 Not Found or filtered out
```

**✅ Success Criteria:**
- Document queries exclude soft-deleted documents
- Lecture detail view doesn't show deleted documents
- Document count reflects only active documents

---

### TEST 3.5: Double Delete Prevention - Document
**Purpose:** Verify cannot delete already deleted document

**Steps:**
```bash
# Setup: Document 77771 already deleted in TEST 3.1

# 1. Attempt to delete again
DELETE /api/v1/lectures/documents/77771
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 404 Not Found
# Response: {
#   "statusCode": 404,
#   "message": "Document has already been deleted"
# }
```

**✅ Success Criteria:**
- Returns 404 Not Found
- Error message indicates already deleted

---

## 🔄 CASCADE INTEGRITY TESTS

### TEST 4.1: Full Cascade - Cause → Lectures → Documents
**Purpose:** Verify complete cascade when deleting cause

**Steps:**
```bash
# Setup: Create cause with 2 lectures, each with 2 documents
INSERT INTO org_causes (causeId, organizationId, title, isActive) 
VALUES (888, 999, 'Full Cascade Test', true);

INSERT INTO org_lectures (lectureId, causeId, title, isActive) 
VALUES 
  (8881, 888, 'Lecture A', true),
  (8882, 888, 'Lecture B', true);

INSERT INTO org_documentation (documentationId, lectureId, title, isActive) 
VALUES 
  (88811, 8881, 'Doc A1', true),
  (88812, 8881, 'Doc A2', true),
  (88821, 8882, 'Doc B1', true),
  (88822, 8882, 'Doc B2', true);

# 1. Delete the cause
DELETE /api/v1/causes/888
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK
# Response cascade: { lecturesAffected: 2, documentsAffected: 4 }

# 2. Verify complete cascade in database
SELECT 'CAUSE' as type, causeId as id, isActive FROM org_causes WHERE causeId = 888
UNION ALL
SELECT 'LECTURE', lectureId, isActive FROM org_lectures WHERE causeId = 888
UNION ALL
SELECT 'DOCUMENT', documentationId, isActive FROM org_documentation 
WHERE lectureId IN (8881, 8882);
# Expected: All 7 rows (1 cause + 2 lectures + 4 docs) have isActive = 0
```

**✅ Success Criteria:**
- 1 cause marked inactive
- 2 lectures marked inactive
- 4 documents marked inactive
- Response shows correct affected counts
- All done in single transaction

---

### TEST 4.2: Partial Cascade - Lecture → Documents Only
**Purpose:** Verify lecture deletion doesn't affect cause

**Steps:**
```bash
# Setup: Use existing cause 888, create new lecture
INSERT INTO org_lectures (lectureId, causeId, title, isActive) 
VALUES (8883, 888, 'Lecture C', true);

INSERT INTO org_documentation (documentationId, lectureId, title, isActive) 
VALUES 
  (88831, 8883, 'Doc C1', true),
  (88832, 8883, 'Doc C2', true);

# 1. Delete the lecture
DELETE /api/v1/lectures/8883
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK
# Response: { documentsAffected: 2 }

# 2. Verify partial cascade
SELECT isActive FROM org_causes WHERE causeId = 888;
# Expected: isActive = 1 (true) - cause NOT affected

SELECT isActive FROM org_lectures WHERE lectureId = 8883;
# Expected: isActive = 0 (false) - lecture deleted

SELECT isActive FROM org_documentation WHERE lectureId = 8883;
# Expected: All isActive = 0 (false) - documents deleted
```

**✅ Success Criteria:**
- Cause remains active
- Lecture marked inactive
- 2 documents marked inactive

---

### TEST 4.3: No Cascade - Document Only
**Purpose:** Verify document deletion doesn't affect lecture or cause

**Steps:**
```bash
# Setup: Use existing structures
# 1. Delete single document
DELETE /api/v1/lectures/documents/88831
Authorization: Bearer {PRESIDENT_TOKEN}
# Expected: 200 OK

# 2. Verify no cascade
SELECT isActive FROM org_causes WHERE causeId = 888;
# Expected: isActive = 1 (true) - cause NOT affected

SELECT isActive FROM org_lectures WHERE lectureId = 8883;
# Expected: isActive = 1 (true) - lecture NOT affected

SELECT isActive FROM org_documentation WHERE documentationId = 88831;
# Expected: isActive = 0 (false) - only this document deleted

SELECT isActive FROM org_documentation WHERE documentationId = 88832;
# Expected: isActive = 1 (true) - sibling document NOT affected
```

**✅ Success Criteria:**
- Only target document marked inactive
- Lecture remains active
- Cause remains active
- Other documents in same lecture remain active

---

## 📊 TEST SUMMARY CHECKLIST

### Cause Tests (5 tests)
- [ ] TEST 1.1: Cause soft delete cascade (PRESIDENT)
- [ ] TEST 1.2: Cause soft delete (ADMIN)
- [ ] TEST 1.3: Cause delete forbidden (MODERATOR)
- [ ] TEST 1.4: Query filtering for causes
- [ ] TEST 1.5: Double delete prevention (cause)

### Lecture Tests (5 tests)
- [ ] TEST 2.1: Lecture soft delete cascade (PRESIDENT)
- [ ] TEST 2.2: Lecture soft delete (ADMIN)
- [ ] TEST 2.3: Lecture delete forbidden (MODERATOR)
- [ ] TEST 2.4: Query filtering for lectures
- [ ] TEST 2.5: Double delete prevention (lecture)

### Document Tests (5 tests)
- [ ] TEST 3.1: Document soft delete (PRESIDENT)
- [ ] TEST 3.2: Document soft delete (ADMIN)
- [ ] TEST 3.3: Document delete forbidden (MODERATOR)
- [ ] TEST 3.4: Query filtering for documents
- [ ] TEST 3.5: Double delete prevention (document)

### Cascade Integrity Tests (3 tests)
- [ ] TEST 4.1: Full cascade (cause → lectures → documents)
- [ ] TEST 4.2: Partial cascade (lecture → documents)
- [ ] TEST 4.3: No cascade (document only)

**Total: 18 Test Cases**

---

## 🎯 EXPECTED RESULTS SUMMARY

| Test Category | Expected Pass | Critical? |
|---------------|---------------|-----------|
| Cause soft delete | 5/5 | ✅ YES |
| Lecture soft delete | 5/5 | ✅ YES |
| Document soft delete | 5/5 | ✅ YES |
| Cascade integrity | 3/3 | ✅ YES |

### All Tests Must Pass Before Production Deployment!

---

## 🐛 TROUBLESHOOTING

### If Tests Fail:

**403 Forbidden (Unexpected)**
- Check user role in database
- Verify JWT token is valid
- Ensure user is verified member of organization

**404 Not Found (Before Deletion)**
- Check test data was inserted correctly
- Verify `isActive = true` before test
- Check foreign key relationships

**Cascade Not Working**
- Verify transaction is being used
- Check database indexes on foreign keys
- Review Prisma transaction logs

**Query Still Returns Deleted Items**
- Check `isActive: true` filter in all query methods
- Restart application to reload code
- Verify Prisma Client was regenerated

**TypeScript Errors**
- Restart TypeScript server in VS Code
- Run `npx prisma generate` again
- Clear VS Code cache and reload

---

## ✅ FINAL VALIDATION

After all tests pass, run this final check:

```sql
-- Count active vs deleted records
SELECT 
  'Causes' as entity,
  SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN isActive = 0 THEN 1 ELSE 0 END) as deleted
FROM org_causes
UNION ALL
SELECT 
  'Lectures',
  SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END),
  SUM(CASE WHEN isActive = 0 THEN 1 ELSE 0 END)
FROM org_lectures
UNION ALL
SELECT 
  'Documents',
  SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END),
  SUM(CASE WHEN isActive = 0 THEN 1 ELSE 0 END)
FROM org_documentation;
```

**If all counts match expected test results, soft delete is working perfectly! ✅**
