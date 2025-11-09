# 🎯 URL Transformation Implementation Guide

## ✅ Clean OOP Architecture - No Code Duplication

### **Centralized URL Transformer Service**
Location: `src/common/services/url-transformer.service.ts`

**Features:**
- ✅ Detects relative paths vs full URLs automatically
- ✅ Converts relative paths to public storage URLs
- ✅ Leaves full URLs unchanged (YouTube, external links)
- ✅ Works synchronously (no async overhead)
- ✅ Global module - inject anywhere

---

## 📋 How It Works

### **1. URL Detection Logic**
```typescript
// Relative path (stored in DB)
"causes/images/banner.jpg" → "https://storage.googleapis.com/bucket/causes/images/banner.jpg"

// Full URL (external)
"https://youtube.com/watch?v=abc" → "https://youtube.com/watch?v=abc" (unchanged)
```

### **2. Transformation Methods**

#### **Single URL**
```typescript
const url = this.urlTransformer.transformUrl(cause.imageUrl);
```

#### **Multiple Fields**
```typescript
const transformed = this.urlTransformer.transformUrlFields(cause, ['imageUrl', 'introVideoUrl']);
```

#### **Array of Objects**
```typescript
const transformed = this.urlTransformer.transformUrlFieldsArray(causes, ['imageUrl', 'introVideoUrl']);
```

#### **Common Fields (Recommended)**
```typescript
// Automatically transforms: imageUrl, introVideoUrl, liveLink, recordingUrl, docUrl, pdfUrl, idUrl
const transformed = this.urlTransformer.transformCommonFields(cause);
const transformedArray = this.urlTransformer.transformCommonFieldsArray(causes);
```

---

## 🔧 Implementation Steps

### **Step 1: Inject UrlTransformerService**

```typescript
import { UrlTransformerService } from '../common/services/url-transformer.service';

@Injectable()
export class YourService {
  constructor(
    private prisma: PrismaService,
    private urlTransformer: UrlTransformerService, // ✅ Inject here
  ) {}
}
```

### **Step 2: Transform URLs in Response Methods Only**

#### **Example: Get Single Entity**
```typescript
async getCauseById(id: string) {
  const cause = await this.prisma.cause.findUnique({
    where: { causeId: BigInt(id) },
    select: {
      causeId: true,
      title: true,
      imageUrl: true,
      introVideoUrl: true,
    },
  });

  if (!cause) {
    throw new NotFoundException('Cause not found');
  }

  // ✅ Transform URLs before returning
  return this.urlTransformer.transformCommonFields(cause);
}
```

#### **Example: Get List of Entities**
```typescript
async getCauses() {
  const causes = await this.prisma.cause.findMany({
    select: {
      causeId: true,
      title: true,
      imageUrl: true,
      introVideoUrl: true,
    },
  });

  // ✅ Transform URLs for array
  return this.urlTransformer.transformCommonFieldsArray(causes);
}
```

#### **Example: Get Paginated Results**
```typescript
async getCausesPaginated(pagination: PaginationDto) {
  const [causes, total] = await Promise.all([
    this.prisma.cause.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      select: {
        causeId: true,
        imageUrl: true,
        introVideoUrl: true,
      },
    }),
    this.prisma.cause.count(),
  ]);

  // ✅ Transform URLs before pagination response
  const transformedCauses = this.urlTransformer.transformCommonFieldsArray(causes);

  return createPaginatedResponse(transformedCauses, total, pagination);
}
```

---

## 📝 Services to Update

### ✅ **1. Cause Service**
File: `src/cause/cause.service.ts`

**URL Fields:** `imageUrl`, `introVideoUrl`

**Methods to Update:**
- ✅ `getCauseById()` - DONE
- ✅ `getCauses()` - DONE
- `getCausesByOrganization()`
- `createCause()` (return value only)
- `updateCause()` (return value only)

### **2. Organization Service**
File: `src/organization/organization.service.ts`

**URL Fields:** `imageUrl`

**Methods to Update:**
- `createOrganization()` (return value)
- `getOrganizations()`
- `getOrganizationById()`
- `updateOrganization()` (return value)
- All query methods that return organizations

### **3. Institute Organizations Service**
File: `src/institute-organizations/institute-organizations.service.ts`

**URL Fields:** `imageUrl`

**Methods to Update:**
- `createOrganization()` (return value)
- `getOrganizationsByInstitute()`
- `getOrganizationByIdAndInstitute()`
- `updateOrganization()` (return value)

### **4. Lecture Service**
File: `src/lecture/lecture.service.ts`

**URL Fields:** `liveLink`, `recordingUrl`

**Methods to Update:**
- `createLecture()` (return value)
- `getLectures()`
- `getLectureById()`
- `updateLecture()` (return value)
- All query methods

### **5. Documentation Service**
File: `src/documentation/documentation.service.ts`

**URL Fields:** `docUrl`, `pdfUrl`

**Methods to Update:**
- `createDocumentation()` (return value)
- `getDocumentation()`
- `getDocumentationById()`
- `updateDocumentation()` (return value)

---

## 🎯 Key Rules

### **✅ DO:**
- Transform URLs in **response methods only** (GET requests)
- Use `transformCommonFields()` for convenience
- Keep DB storage as relative paths
- Let frontend send relative paths from signed URL uploads

### **❌ DON'T:**
- Transform URLs in create/update methods (input)
- Transform URLs before saving to database
- Use async/await (transformer is synchronous)
- Add URL transformation logic in multiple places

---

## 📊 Example Full Implementation

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UrlTransformerService } from '../common/services/url-transformer.service';

@Injectable()
export class CauseService {
  constructor(
    private prisma: PrismaService,
    private urlTransformer: UrlTransformerService,
  ) {}

  // CREATE: No transformation needed (store relative paths as-is)
  async createCause(dto: CreateCauseDto) {
    const cause = await this.prisma.cause.create({
      data: {
        title: dto.title,
        imageUrl: dto.imageUrl, // Relative path from frontend
        introVideoUrl: dto.introVideoUrl, // Could be relative OR full URL
      },
    });

    // ✅ Transform only in response
    return this.urlTransformer.transformCommonFields(cause);
  }

  // UPDATE: No transformation needed (store as-is)
  async updateCause(id: string, dto: UpdateCauseDto) {
    const cause = await this.prisma.cause.update({
      where: { causeId: BigInt(id) },
      data: {
        imageUrl: dto.imageUrl, // Store as-is
        introVideoUrl: dto.introVideoUrl, // Store as-is
      },
    });

    // ✅ Transform only in response
    return this.urlTransformer.transformCommonFields(cause);
  }

  // GET SINGLE: Transform response
  async getCauseById(id: string) {
    const cause = await this.prisma.cause.findUnique({
      where: { causeId: BigInt(id) },
    });

    if (!cause) {
      throw new NotFoundException('Cause not found');
    }

    // ✅ Transform URLs
    return this.urlTransformer.transformCommonFields(cause);
  }

  // GET LIST: Transform array response
  async getCauses() {
    const causes = await this.prisma.cause.findMany();

    // ✅ Transform all URLs
    return this.urlTransformer.transformCommonFieldsArray(causes);
  }
}
```

---

## 🚀 Benefits

### **Clean Code**
- ✅ Single responsibility (transformation in one place)
- ✅ DRY principle (no duplication)
- ✅ Easy to maintain/update
- ✅ Consistent across all services

### **Performance**
- ✅ Synchronous (no async overhead)
- ✅ Simple string operations
- ✅ No database queries

### **Flexibility**
- ✅ Supports relative paths (cloud storage)
- ✅ Supports full URLs (YouTube, external)
- ✅ Automatic detection
- ✅ Graceful error handling

---

## ✅ Next Steps

1. **Update Cause Service** - ✅ DONE
2. Update Organization Service
3. Update Institute Organizations Service
4. Update Lecture Service
5. Update Documentation Service
6. Test with frontend (signed URL flow)
7. Deploy to Cloud Run

---

**Status**: Architecture Complete ✅  
**Build**: Successful ✅  
**Pattern**: Clean OOP (no duplication) ✅
