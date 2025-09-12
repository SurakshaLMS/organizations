# 🚨 EXACT CAUSE API TEST REQUEST

## Problem
You're getting validation errors when creating a cause. Here's the EXACT request format that will work.

## ✅ WORKING REQUEST EXAMPLES

### 1. Minimal Working Request

**Method:** POST  
**URL:** `http://localhost:3000/organization/api/v1/causes`  
**Headers:**
```
Content-Type: application/json
Authorization: Bearer your-actual-jwt-token
```

**Body (JSON):**
```json
{
  "organizationId": "1",
  "title": "Environmental Conservation Initiative"
}
```

### 2. Complete Working Request

**Body (JSON):**
```json
{
  "organizationId": "1",
  "title": "Environmental Conservation Initiative",
  "description": "A comprehensive initiative to promote environmental awareness and conservation practices",
  "introVideoUrl": "https://youtube.com/watch?v=example",
  "isPublic": false
}
```

## 🔥 COPY-PASTE cURL COMMAND

Replace `YOUR_JWT_TOKEN` with your actual token:

```bash
curl -X POST http://localhost:3000/organization/api/v1/causes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "organizationId": "1",
    "title": "Test Environmental Initiative"
  }'
```

## 🔥 COPY-PASTE JavaScript Fetch

```javascript
fetch('http://localhost:3000/organization/api/v1/causes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    organizationId: "1",
    title: "Test Environmental Initiative"
  })
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

## 🔥 COPY-PASTE Postman Collection

**Method:** POST  
**URL:** `{{base_url}}/organization/api/v1/causes`  
**Headers:**
- `Content-Type`: `application/json`
- `Authorization`: `Bearer {{jwt_token}}`

**Body (raw JSON):**
```json
{
  "organizationId": "1",
  "title": "Environmental Conservation Initiative",
  "description": "A comprehensive initiative to promote environmental awareness",
  "isPublic": false
}
```

## ❌ COMMON MISTAKES TO AVOID

### 1. Wrong organizationId Type
```json
{
  "organizationId": 1,  ❌ NUMBER - WRONG!
  "title": "Test Title"
}
```

Should be:
```json
{
  "organizationId": "1",  ✅ STRING - CORRECT!
  "title": "Test Title"
}
```

### 2. Missing Required Fields
```json
{
  "description": "Test description"  ❌ MISSING organizationId AND title
}
```

Should be:
```json
{
  "organizationId": "1",  ✅ REQUIRED
  "title": "Test Title",  ✅ REQUIRED
  "description": "Test description"
}
```

### 3. Extra Fields Not Allowed
```json
{
  "organizationId": "1",
  "title": "Test Title",
  "extraField": "not allowed"  ❌ EXTRA FIELD - WRONG!
}
```

Should be:
```json
{
  "organizationId": "1",
  "title": "Test Title"  ✅ ONLY ALLOWED FIELDS
}
```

### 4. Invalid URL Format
```json
{
  "organizationId": "1",
  "title": "Test Title",
  "introVideoUrl": "not-a-url"  ❌ INVALID URL
}
```

Should be:
```json
{
  "organizationId": "1",
  "title": "Test Title",
  "introVideoUrl": "https://youtube.com/watch?v=example"  ✅ VALID URL
}
```

## 🎯 TROUBLESHOOTING CHECKLIST

- [ ] Using correct endpoint: `/organization/api/v1/causes`
- [ ] Including JWT token in Authorization header
- [ ] `organizationId` is a STRING (in quotes)
- [ ] `title` is provided and not empty
- [ ] No extra fields outside the DTO
- [ ] `introVideoUrl` is a valid URL (if provided)
- [ ] `isPublic` is a boolean (if provided)
- [ ] Content-Type is `application/json`

## 🚀 TEST YOUR REQUEST

1. Copy one of the working requests above
2. Replace `YOUR_JWT_TOKEN` with your actual token
3. Replace `organizationId` with your organization ID (as string)
4. Send the request

If you still get errors, check:
- Is your JWT token valid?
- Is the server running on localhost:3000?
- Are you including the `/organization/api/v1` prefix?

## 💡 SUCCESS RESPONSE

When it works, you'll get:
```json
{
  "causeId": "123",
  "organizationId": "1",
  "title": "Environmental Conservation Initiative",
  "description": "A comprehensive initiative...",
  "imageUrl": null,
  "isPublic": false,
  "createdAt": "2025-09-12T15:48:38.782Z",
  "updatedAt": "2025-09-12T15:48:38.782Z"
}
```