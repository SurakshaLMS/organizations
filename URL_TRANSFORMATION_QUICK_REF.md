# 🎯 Quick Reference: URL Transformation

## ✅ What's Done

1. **.env configured** - `GCS_BASE_URL=https://storage.googleapis.com/suraksha-lms`
2. **Utilities created** - `src/common/utils/url-transformer.util.ts`
3. **Documentation written** - Ready for implementation

---

## 📦 Import in Services

```typescript
import {
  transformOrganizationUrls,    // Organization { imageUrl }
  transformCauseUrls,            // Cause { imageUrl, introVideoUrl }
  transformLectureUrls,          // Lecture { recordingUrl }
  transformDocumentationUrls,    // Documentation { docUrl }
  transformUserUrls,             // User { imageUrl, idUrl }
  transformInstituteUrls,        // Institute { imageUrl }
  transformUrlsInArray,          // For arrays
  transformLectureWithDocsUrls,  // Nested: lecture + docs
  transformCauseWithLecturesUrls // Nested: cause + lectures
} from '../common/utils/url-transformer.util';
```

---

## 🔧 Usage Patterns

### **Single Object**
```typescript
const org = await this.prisma.organization.findUnique({...});
return transformOrganizationUrls(org);
```

### **Array**
```typescript
const orgs = await this.prisma.organization.findMany({...});
return transformUrlsInArray(orgs, ['imageUrl']);
```

### **Nested Objects**
```typescript
const lecture = await this.prisma.lecture.findUnique({
  include: { documentations: true }
});
return transformLectureWithDocsUrls(lecture);
```

### **Paginated Response**
```typescript
const orgs = await this.prisma.organization.findMany({...});
const transformed = transformUrlsInArray(orgs, ['imageUrl']);
return createPaginatedResponse(transformed, page, limit, total);
```

---

## 📊 URL Fields by Model

| Model | Fields |
|-------|--------|
| Organization | `imageUrl` |
| Cause | `imageUrl`, `introVideoUrl` |
| Lecture | `recordingUrl` |
| Documentation | `docUrl` |
| User | `imageUrl`, `idUrl` |
| Institute | `imageUrl` |

---

## 🎯 Files to Update

1. **organization.service.ts** - 8 methods
2. **cause.service.ts** - 5 methods
3. **lecture.service.ts** - 6 methods
4. **institute.service.ts** - 3 methods (if exists)
5. **user.service.ts** - 3 methods (if exists)

---

## ✅ Verification

```bash
# 1. Check environment variable
npm start
# Should see no errors about GCS_BASE_URL

# 2. Check database (relative paths)
SELECT imageUrl FROM org_organizations LIMIT 1;
# Expected: /organizations/org-123.jpg

# 3. Check API (full URLs)
curl http://localhost:3001/organization/api/v1/organizations/1
# Expected: "imageUrl": "https://storage.googleapis.com/suraksha-lms/..."
```

---

## 🚀 Implementation Checklist

- [ ] Add imports to service files
- [ ] Update return statements with transformers
- [ ] Restart server (`npm start`)
- [ ] Test single object endpoints
- [ ] Test array endpoints
- [ ] Test paginated endpoints
- [ ] Test nested object endpoints
- [ ] Verify database still has relative paths
- [ ] Verify API returns full URLs

---

## 💡 Pro Tips

✅ **DO:**
- Always transform before returning from service
- Use specific transformers (`transformOrganizationUrls`)
- Transform arrays with `transformUrlsInArray`
- Test both database and API

❌ **DON'T:**
- Store full URLs in database
- Transform inside Prisma queries
- Forget to transform nested objects
- Skip testing after changes

---

**📚 Full Documentation:** `FILE_UPLOAD_URL_TRANSFORMATION_GUIDE.md`  
**🔍 Example:** `EXAMPLE_IMPLEMENTATION.md`
