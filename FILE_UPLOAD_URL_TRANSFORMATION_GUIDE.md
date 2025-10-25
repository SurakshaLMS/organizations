# File Upload & URL Transformation Implementation Guide

## ✅ Configuration Complete

### **Environment Variable Added**
```env
GCS_BASE_URL=https://storage.googleapis.com/suraksha-lms
```

This single variable is used by all URL transformation utilities to convert relative paths to full URLs.

---

## 🎯 How It Works

### **Two-Stage URL Pattern**

1. **Database Storage** (Prisma models store relative paths):
   ```typescript
   // Stored in database
   imageUrl: "/profile-images/user-123.jpg"
   ```

2. **API Response** (Services return full URLs):
   ```typescript
   // Returned to frontend
   imageUrl: "https://storage.googleapis.com/suraksha-lms/profile-images/user-123.jpg"
   ```

---

## 📦 Utilities Created

### **1. URL Transformer Utility** (`src/common/utils/url-transformer.util.ts`)

Provides functions to transform URLs in your service layer:

```typescript
import {
  transformOrganizationUrls,
  transformCauseUrls,
  transformLectureUrls,
  transformUserUrls,
  transformInstituteUrls,
  transformDocumentationUrls,
  transformLectureWithDocsUrls,
  transformCauseWithLecturesUrls
} from '../common/utils/url-transformer.util';
```

### **2. Automatic Middleware** (`src/common/middleware/url-transform.middleware.ts`)

Currently NOT active (Prisma v5+ doesn't support `$use` middleware).  
**You need to manually transform URLs in your services**.

---

## 🔧 How to Use in Services

### **Option 1: Transform Individual Objects**

```typescript
import { transformOrganizationUrls } from '../common/utils/url-transformer.util';

async getOrganization(id: string) {
  const org = await this.prisma.organization.findUnique({
    where: { organizationId: BigInt(id) }
  });
  
  // Transform URLs before returning
  return transformOrganizationUrls(org);
}
```

### **Option 2: Transform Arrays**

```typescript
import { transformUrlsInArray } from '../common/utils/url-transformer.util';

async getOrganizations() {
  const orgs = await this.prisma.organization.findMany();
  
  // Transform all objects in array
  return transformUrlsInArray(orgs, ['imageUrl']);
}
```

### **Option 3: Transform Nested Relations**

```typescript
import { transformLectureWithDocsUrls } from '../common/utils/url-transformer.util';

async getLectureWithDocs(id: string) {
  const lecture = await this.prisma.lecture.findUnique({
    where: { lectureId: BigInt(id) },
    include: { documentations: true }
  });
  
  // Transform lecture URLs + nested documentation URLs
  return transformLectureWithDocsUrls(lecture);
}
```

---

## 📝 URL Fields by Model

| Model | URL Fields |
|-------|------------|
| **User** | `imageUrl`, `idUrl` |
| **Institute** | `imageUrl` |
| **Organization** | `imageUrl` |
| **Cause** | `imageUrl`, `introVideoUrl` |
| **Lecture** | `recordingUrl` |
| **Documentation** | `docUrl` |

---

## ✅ Services to Update

### **1. Organization Service** (`src/organization/organization.service.ts`)

**Lines to update:**
- Line 195-209: `formatOrganizationResponse()` return statement
- Line 308-320: `getOrganizations()` response
- Line 376-415: `getOrganizationsByType()` response
- Line 484-500: `getPublicOrganizations()` response
- Line 523-540: `getUserOrganizations()` response
- Line 602-620: `updateOrganization()` response

**Example fix:**
```typescript
// BEFORE
return {
  id: organization.organizationId.toString(),
  name: organization.name,
  imageUrl: organization.imageUrl, // Relative path
};

// AFTER
import { transformOrganizationUrls } from '../common/utils/url-transformer.util';

const transformed = transformOrganizationUrls(organization);
return {
  id: organization.organizationId.toString(),
  name: organization.name,
  imageUrl: transformed?.imageUrl, // Full URL ✨
};
```

### **2. Cause Service** (`src/cause/cause.service.ts`)

**Lines to update:**
- Line 105-130: `createCause()` response
- Line 230-260: `getAllCauses()` response
- Line 253-275: `getCausesByOrganization()` response
- Line 290-310: `getPublicCauses()` response
- Line 372-390: `updateCause()` response

**Example fix:**
```typescript
import { transformCauseUrls } from '../common/utils/url-transformer.util';

const cause = await this.prisma.cause.findUnique({
  where: { causeId: BigInt(id) },
  select: {
    introVideoUrl: true,
    imageUrl: true,
  }
});

return transformCauseUrls(cause); // Auto-transforms both URLs ✨
```

### **3. Lecture Service** (`src/lecture/lecture.service.ts`)

**Lines to update:**
- Line 106-130: `createLectureWithDocumentation()` response
- Line 346-400: `getAllLectures()` response
- Line 449-515: `getLecturesByOrganization()` response
- Line 592-615: `updateLecture()` response
- Line 707-725: `addDocumentation()` response
- Line 922-940: `getDocumentation()` response

**Example fix:**
```typescript
import { transformLectureWithDocsUrls } from '../common/utils/url-transformer.util';

const lecture = await this.prisma.lecture.findUnique({
  where: { lectureId: BigInt(id) },
  include: { documentations: true }
});

return transformLectureWithDocsUrls(lecture); // Transforms lecture + docs ✨
```

---

## 🚀 Quick Implementation Steps

### **Step 1: Add imports to each service file**

```typescript
import {
  transformOrganizationUrls,   // For Organization
  transformCauseUrls,           // For Cause
  transformLectureUrls,         // For Lecture
  transformDocumentationUrls,   // For Documentation
  transformUserUrls,            // For User
  transformInstituteUrls,       // For Institute
  transformUrlsInArray,         // For arrays
  transformLectureWithDocsUrls, // For nested objects
} from '../common/utils/url-transformer.util';
```

### **Step 2: Wrap return statements**

**Before:**
```typescript
return organization;
```

**After:**
```typescript
return transformOrganizationUrls(organization);
```

### **Step 3: Test API responses**

```bash
# Database should have relative paths
SELECT imageUrl FROM org_organizations LIMIT 1;
# Result: /organizations/org-123.jpg

# API should return full URLs
curl http://localhost:3001/organization/api/v1/organizations/1
# Result: { "imageUrl": "https://storage.googleapis.com/suraksha-lms/organizations/org-123.jpg" }
```

---

## 🛠️ Testing Checklist

- [ ] Organization endpoints return full `imageUrl`
- [ ] Cause endpoints return full `imageUrl` and `introVideoUrl`
- [ ] Lecture endpoints return full `recordingUrl`
- [ ] Documentation endpoints return full `docUrl`
- [ ] Nested objects (e.g., lecture with docs) have all URLs transformed
- [ ] Array responses have all URLs transformed
- [ ] Database still stores relative paths
- [ ] Environment variable `GCS_BASE_URL` is set

---

## 📚 Files Created

1. **`src/common/utils/url-transformer.util.ts`** - Transformation functions
2. **`src/common/middleware/url-transform.middleware.ts`** - (Not used - Prisma v5+ limitation)
3. **`FILE_UPLOAD_URL_TRANSFORMATION_GUIDE.md`** - This guide

---

## 🎯 Example Service Implementation

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  transformOrganizationUrls,
  transformUrlsInArray
} from '../common/utils/url-transformer.util';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  // ✅ Single object
  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { organizationId: BigInt(id) }
    });
    return transformOrganizationUrls(org);
  }

  // ✅ Array of objects
  async getOrganizations() {
    const orgs = await this.prisma.organization.findMany();
    return transformUrlsInArray(orgs, ['imageUrl']);
  }

  // ✅ With pagination
  async getPaginatedOrganizations(page: number, limit: number) {
    const orgs = await this.prisma.organization.findMany({
      skip: (page - 1) * limit,
      take: limit
    });
    
    return {
      data: transformUrlsInArray(orgs, ['imageUrl']),
      page,
      limit,
      total: await this.prisma.organization.count()
    };
  }
}
```

---

## 🔍 Troubleshooting

### **URLs not transforming**
- ✅ Check `GCS_BASE_URL` is set in `.env`
- ✅ Restart server after adding environment variable
- ✅ Ensure URL field starts with `/` in database
- ✅ Verify transformer function is called before return

### **Full URLs being stored**
- ❌ Don't save full URLs to database
- ✅ Save upload result directly: `imageUrl: uploadResult.url`
- ✅ CloudStorageService already returns relative paths

### **Nested objects not transforming**
- ✅ Use specific transformer: `transformLectureWithDocsUrls()`
- ✅ Or manually transform nested arrays:
  ```typescript
  if (lecture.documentations) {
    lecture.documentations = lecture.documentations.map(doc =>
      transformDocumentationUrls(doc)
    );
  }
  ```

---

## 📞 Need Help?

1. Check utility functions in `src/common/utils/url-transformer.util.ts`
2. See examples in this guide
3. Verify environment variable is loaded: `console.log(process.env.GCS_BASE_URL)`

**Last Updated**: October 26, 2025  
**Status**: Ready for implementation - Manual transformation required
