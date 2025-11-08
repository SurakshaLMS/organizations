# 📝 URL Format Guide - Database Storage

## ✅ **RECOMMENDATION: Store RELATIVE PATH Only**

### **What to Store in Database:**
```
CORRECT ✅
imageUrl: "/organization-images/org-123-abc-1731088500.jpg"
imageUrl: "/profile-images/user-456-xyz-1731088600.png"
imageUrl: "/lecture-documents/lec-789-doc-1731088700.pdf"
```

### **What NOT to Store:**
```
WRONG ❌
imageUrl: "https://storage.googleapis.com/suraksha-lms/organization-images/org-123-abc.jpg"
imageUrl: "https://storage.cloud.google.com/suraksha-lms/profile-images/user-456.png"
```

---

## 🎯 Why Relative Paths?

### **1. Flexibility** 🔄
```typescript
// Can switch storage providers without DB migration
const baseUrl = process.env.CDN_URL || 'https://storage.googleapis.com/suraksha-lms';
const fullUrl = `${baseUrl}${org.imageUrl}`;

// Today: GCS
// Tomorrow: CloudFlare CDN, AWS S3, or Azure Blob
```

### **2. Database Size** 💾
```
Relative: 50 characters
Full URL: 120+ characters

1 million records:
Relative: 50 MB
Full URL: 120 MB
Savings: 70 MB (58% smaller)
```

### **3. URL Changes** 🔧
```typescript
// Easy to change domain
OLD: storage.googleapis.com
NEW: cdn.suraksha-lms.com

// Just update env variable, no DB changes needed!
```

### **4. Multi-Environment** 🌍
```typescript
// Same DB data works across environments
DEV:  https://dev-storage.com/profile-images/user.jpg
PROD: https://cdn.suraksha.com/profile-images/user.jpg
//    Same DB value: /profile-images/user.jpg
```

---

## 📊 Verification Response Format

### From `/signed-urls/verify/:token`

```json
{
  "success": true,
  "publicUrl": "https://storage.googleapis.com/suraksha-lms/organization-images/org-123-abc.jpg",
  "relativePath": "/organization-images/org-123-abc.jpg",
  "filename": "org-123-abc.jpg",
  "message": "Upload verified successfully"
}
```

### What to Use Where:

| Field | Use For | Example |
|-------|---------|---------|
| `relativePath` | **Database storage** ✅ | `/organization-images/org-123.jpg` |
| `publicUrl` | Frontend display (temporary) | Full GCS URL |
| `filename` | File identification | `org-123-abc-1731088500.jpg` |

---

## 💻 Backend Implementation

### Creating Organization with Image

```typescript
// ❌ WRONG - Storing full URL
POST /organizations
{
  "name": "My Org",
  "imageUrl": "https://storage.googleapis.com/suraksha-lms/organization-images/org-123.jpg"
}

// ✅ CORRECT - Storing relative path
POST /organizations
{
  "name": "My Org",
  "imageUrl": "/organization-images/org-123-abc-1731088500.jpg"
}
```

### Service Layer (Already Correct)

```typescript
// src/organization/organization.service.ts
async createOrganization(dto: CreateOrganizationDto) {
  const organization = await this.prisma.organization.create({
    data: {
      name: dto.name,
      type: dto.type,
      imageUrl: dto.imageUrl, // ✅ Relative path stored
      // ... other fields
    }
  });
  
  return organization;
}
```

---

## 🎨 Frontend Implementation

### Complete Upload Flow

```typescript
// Step 1-3: Get signed URL, upload, verify
const verifyResponse = await fetch(
  `http://localhost:8080/signed-urls/verify/${uploadToken}`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }
);

const { success, relativePath, publicUrl } = await verifyResponse.json();

// Step 4: Create organization with RELATIVE path
const orgResponse = await fetch('http://localhost:8080/organizations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'My Organization',
    type: 'INSTITUTE',
    imageUrl: relativePath, // ✅ Use relativePath (NOT publicUrl)
    instituteId: '123'
  })
});
```

### Display Images (Construct Full URL)

```typescript
// React Component
function OrganizationCard({ org }) {
  const baseUrl = process.env.REACT_APP_STORAGE_URL || 
                  'https://storage.googleapis.com/suraksha-lms';
  
  const imageUrl = org.imageUrl 
    ? `${baseUrl}${org.imageUrl}` 
    : '/default-org-image.png';
  
  return (
    <div>
      <img src={imageUrl} alt={org.name} />
      <h3>{org.name}</h3>
    </div>
  );
}

// Vue Component
<template>
  <div>
    <img :src="getFullImageUrl(org.imageUrl)" :alt="org.name" />
    <h3>{{ org.name }}</h3>
  </div>
</template>

<script>
export default {
  methods: {
    getFullImageUrl(relativePath) {
      if (!relativePath) return '/default-org-image.png';
      const baseUrl = process.env.VUE_APP_STORAGE_URL || 
                      'https://storage.googleapis.com/suraksha-lms';
      return `${baseUrl}${relativePath}`;
    }
  }
}
</script>
```

---

## 📦 Database Schema

### Current Schema (Correct)

```prisma
model Organization {
  organizationId  BigInt   @id @default(autoincrement())
  name            String   @db.VarChar(255)
  imageUrl        String?  @db.VarChar(500)  // ✅ Stores relative path
  // ... other fields
}

model Cause {
  causeId     BigInt   @id @default(autoincrement())
  title       String   @db.VarChar(255)
  imageUrl    String?  @db.VarChar(500)  // ✅ Stores relative path
  // ... other fields
}
```

### Example Data

```sql
-- ✅ CORRECT Data
INSERT INTO Organization (name, imageUrl) VALUES 
('Tech Club', '/organization-images/org-123-abc-1731088500.jpg'),
('Science Society', '/organization-images/org-456-xyz-1731088600.png');

-- ❌ WRONG Data (too long, inflexible)
INSERT INTO Organization (name, imageUrl) VALUES 
('Tech Club', 'https://storage.googleapis.com/suraksha-lms/organization-images/org-123.jpg');
```

---

## 🔄 Migration Example (If You Have Full URLs)

### SQL Migration

```sql
-- If you accidentally stored full URLs, clean them
UPDATE Organization
SET imageUrl = REPLACE(
  imageUrl, 
  'https://storage.googleapis.com/suraksha-lms', 
  ''
)
WHERE imageUrl LIKE 'https://storage.googleapis.com/suraksha-lms%';

-- Result:
-- Before: https://storage.googleapis.com/suraksha-lms/organization-images/org-123.jpg
-- After:  /organization-images/org-123.jpg
```

---

## 📋 Quick Reference

### ✅ DO:
- Store relative paths in database: `/folder/file.jpg`
- Use `relativePath` from verify response
- Construct full URL in frontend when displaying
- Keep database records portable

### ❌ DON'T:
- Store full URLs in database: `https://...`
- Use `publicUrl` from verify response for database
- Hardcode domain in database
- Mix URL formats in same field

---

## 🎯 Summary

| Aspect | Value | Example |
|--------|-------|---------|
| **Database Storage** | Relative path | `/organization-images/org-123.jpg` |
| **Verify Response** | Use `relativePath` | From response JSON |
| **Frontend Display** | Construct full URL | `baseUrl + relativePath` |
| **Environment Variable** | Base URL | `https://storage.googleapis.com/suraksha-lms` |

---

## 💡 Complete Example

```typescript
// Backend Endpoint (Already implemented correctly)
@Post()
async create(@Body() dto: CreateOrganizationDto) {
  // dto.imageUrl should be relative path
  // Example: "/organization-images/org-123-abc.jpg"
  return this.organizationService.create(dto);
}

// Frontend Upload + Create
async function createOrgWithImage(file, orgData, token) {
  // 1. Get signed URL
  const signed = await getSignedUrl('organization', '123', '.jpg', token);
  
  // 2. Upload file
  await uploadToGCS(signed.signedUrl, file);
  
  // 3. Verify upload
  const verified = await verifyUpload(signed.uploadToken, token);
  
  // 4. Create organization with RELATIVE path
  const org = await fetch('/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...orgData,
      imageUrl: verified.relativePath // ✅ Use this, not publicUrl
    })
  });
  
  return org;
}

// Frontend Display
function DisplayOrg({ org }) {
  const fullUrl = `${process.env.STORAGE_URL}${org.imageUrl}`;
  return <img src={fullUrl} alt={org.name} />;
}
```

---

## ✅ Verification Checklist

- [ ] Store only relative paths in database (`/folder/file.jpg`)
- [ ] Use `relativePath` field from verify response
- [ ] Frontend constructs full URL for display
- [ ] Backend accepts relative paths in DTOs
- [ ] Environment variable for base storage URL
- [ ] No hardcoded domains in database

**✅ FOLLOW THIS GUIDE FOR CONSISTENT URL HANDLING ACROSS YOUR APPLICATION!**
