# Example: Organization Service URL Transformation

## 📝 Example Implementation

This is an example showing how to add URL transformation to the Organization Service.

### **1. Add Import at Top of File**

Add this to the imports section of `src/organization/organization.service.ts`:

```typescript
import {
  transformOrganizationUrls,
  transformUrlsInArray
} from '../common/utils/url-transformer.util';
```

### **2. Update formatOrganizationResponse Method**

**Location**: Line ~195

**BEFORE:**
```typescript
private formatOrganizationResponse(organization: any) {
  return {
    id: organization.organizationId.toString(),
    name: organization.name,
    type: organization.type,
    isPublic: organization.isPublic,
    needEnrollmentVerification: organization.needEnrollmentVerification,
    enabledEnrollments: organization.enabledEnrollments,
    imageUrl: organization.imageUrl,  // ❌ Relative path from DB
    instituteId: organization.instituteId ? organization.instituteId.toString() : null
  };
}
```

**AFTER:**
```typescript
private formatOrganizationResponse(organization: any) {
  // Transform URLs from relative to full
  const transformed = transformOrganizationUrls(organization);
  
  return {
    id: organization.organizationId.toString(),
    name: organization.name,
    type: organization.type,
    isPublic: organization.isPublic,
    needEnrollmentVerification: organization.needEnrollmentVerification,
    enabledEnrollments: organization.enabledEnrollments,
    imageUrl: transformed?.imageUrl,  // ✅ Full URL
    instituteId: organization.instituteId ? organization.instituteId.toString() : null
  };
}
```

### **3. Update getOrganizations Method**

**Location**: Line ~300

**BEFORE:**
```typescript
async getOrganizations(userId?: string, paginationDto?: PaginationDto, user?: any) {
  // ... query logic ...
  
  const organizations = await this.prisma.organization.findMany({
    where,
    select: {
      organizationId: true,
      name: true,
      type: true,
      isPublic: true,
      imageUrl: true,  // ❌ Returns relative path
      instituteId: true,
    },
    skip,
    take: limit,
  });

  return createPaginatedResponse(
    organizations.map(org => ({
      id: org.organizationId.toString(),
      name: org.name,
      type: org.type,
      isPublic: org.isPublic,
      imageUrl: org.imageUrl,  // ❌ Relative path
      instituteId: org.instituteId ? org.instituteId.toString() : null,
    })),
    page,
    limit,
    totalCount
  );
}
```

**AFTER:**
```typescript
async getOrganizations(userId?: string, paginationDto?: PaginationDto, user?: any) {
  // ... query logic ...
  
  const organizations = await this.prisma.organization.findMany({
    where,
    select: {
      organizationId: true,
      name: true,
      type: true,
      isPublic: true,
      imageUrl: true,
      instituteId: true,
    },
    skip,
    take: limit,
  });

  // Transform URLs in array ✅
  const transformedOrgs = transformUrlsInArray(organizations, ['imageUrl']);

  return createPaginatedResponse(
    transformedOrgs.map(org => ({
      id: org.organizationId.toString(),
      name: org.name,
      type: org.type,
      isPublic: org.isPublic,
      imageUrl: org.imageUrl,  // ✅ Full URL now
      instituteId: org.instituteId ? org.instituteId.toString() : null,
    })),
    page,
    limit,
    totalCount
  );
}
```

---

## 🎯 Apply Same Pattern to Other Methods

### **Methods to Update in organization.service.ts:**

1. **getOrganizationsByType** (Line ~376)
2. **getPublicOrganizations** (Line ~484)
3. **getUserOrganizations** (Line ~523)
4. **updateOrganization** (Line ~602)
5. **getOrganizationDetails** (Line ~873)
6. **getInstitute** (Line ~1241)
7. **getInstituteById** (Line ~1326)

### **Pattern:**

```typescript
// Before returning
const result = await this.prisma.organization.findUnique({...});

// Add this line
return transformOrganizationUrls(result);

// OR for arrays
const results = await this.prisma.organization.findMany({...});
return transformUrlsInArray(results, ['imageUrl']);
```

---

## ✅ Verification

After implementing, test with:

```bash
# Check database (should be relative)
mysql -u root -p -h 34.29.9.105 laas
SELECT organizationId, imageUrl FROM org_organizations LIMIT 1;
# Expected: /organizations/org-123.jpg

# Check API (should be full URL)
curl http://localhost:3001/organization/api/v1/organizations
# Expected: { "imageUrl": "https://storage.googleapis.com/suraksha-lms/organizations/org-123.jpg" }
```

---

## 📊 Summary

✅ **Created**: URL transformation utilities  
✅ **Added**: GCS_BASE_URL environment variable  
⏳ **TODO**: Update services to use transformers  

**Estimated time**: 15-30 minutes to update all services  
**Impact**: All file URLs will automatically transform to full URLs in API responses
