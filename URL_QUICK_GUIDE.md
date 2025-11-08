# 🎯 QUICK ANSWER: Use RELATIVE PATH Only

## ✅ **CORRECT - Store This in Database:**

```json
{
  "name": "My Organization",
  "imageUrl": "/organization-images/org-123-abc-1731088500.jpg"
}
```

## ❌ **WRONG - Don't Store Full URL:**

```json
{
  "name": "My Organization",
  "imageUrl": "https://storage.googleapis.com/suraksha-lms/organization-images/org-123.jpg"
}
```

---

## 📝 Why Relative Path?

| Reason | Benefit |
|--------|---------|
| **Flexibility** | Can change storage provider without DB migration |
| **Size** | 50 chars vs 120+ chars (58% smaller) |
| **Portability** | Works across dev/staging/prod |
| **Updates** | Change domain in 1 place (env var), not millions of DB rows |

---

## 💻 Implementation

### From Signed URL Verification:

```javascript
// Response from POST /signed-urls/verify/:token
{
  "success": true,
  "publicUrl": "https://storage.googleapis.com/suraksha-lms/organization-images/org-123.jpg",
  "relativePath": "/organization-images/org-123-abc-1731088500.jpg",  // ✅ Use this
  "filename": "org-123-abc-1731088500.jpg"
}
```

### Frontend Code:

```typescript
// After verification
const { relativePath } = await verifyUpload(uploadToken);

// Create organization with RELATIVE path
await fetch('/organizations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Org',
    type: 'INSTITUTE',
    imageUrl: relativePath,  // ✅ "/organization-images/org-123.jpg"
    instituteId: '123'
  })
});
```

### Display Images:

```typescript
// Construct full URL in frontend
const baseUrl = 'https://storage.googleapis.com/suraksha-lms';
const fullUrl = `${baseUrl}${org.imageUrl}`;

<img src={fullUrl} alt={org.name} />
```

---

## 📊 Database Storage

```sql
-- ✅ CORRECT
imageUrl: "/organization-images/org-123.jpg"
imageUrl: "/profile-images/user-456.png"
imageUrl: "/lecture-documents/lec-789.pdf"

-- ❌ WRONG
imageUrl: "https://storage.googleapis.com/..."
```

---

## ✅ Quick Checklist

- [x] Use `relativePath` from verification response
- [x] Store ONLY relative path in database
- [x] Construct full URL in frontend for display
- [x] Never store `https://...` in database

**Use: `/folder/file.jpg` format always!**
