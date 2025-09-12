# 🚨 CAUSE API VALIDATION ERROR - EXACT FIX

## The Error You're Getting:
```json
{
    "statusCode": 400,
    "message": [
        "organizationId must be a numeric string (e.g., \"1\", \"123\")",
        "organizationId should not be empty",
        "organizationId must be a string",
        "title should not be empty",
        "title must be a string"
    ],
    "error": "Bad Request",
    "timestamp": "2025-09-12T19:15:16.069Z",
    "path": "/organization/api/v1/causes"
}
```

## 🎯 ROOT CAUSE
You're either:
1. **Not sending the required fields** (`organizationId` and `title`)
2. **Sending them in wrong format** (number instead of string)
3. **Sending empty values** 
4. **Using wrong Content-Type header**

---

## ✅ EXACT WORKING REQUEST

### Method: POST
### URL: `http://localhost:3000/organization/api/v1/causes`

### Headers:
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body (JSON):
```json
{
  "organizationId": "1",
  "title": "Environmental Conservation Initiative"
}
```

---

## 🔥 COPY-PASTE SOLUTIONS

### 1. cURL Command (Replace YOUR_JWT_TOKEN):
```bash
curl -X POST http://localhost:3000/organization/api/v1/causes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"organizationId":"1","title":"Environmental Conservation Initiative"}'
```

### 2. JavaScript Fetch:
```javascript
fetch('http://localhost:3000/organization/api/v1/causes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    organizationId: "1",    // STRING not number!
    title: "Environmental Conservation Initiative"
  })
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

### 3. Postman Raw JSON Body:
```json
{
  "organizationId": "1",
  "title": "Environmental Conservation Initiative",
  "description": "A comprehensive initiative to promote environmental awareness",
  "introVideoUrl": "https://youtube.com/watch?v=example",
  "isPublic": false
}
```

---

## ❌ WHAT NOT TO DO

### Wrong Format 1 - Number instead of String:
```json
{
  "organizationId": 1,     ❌ NUMBER - CAUSES ERROR!
  "title": "Test Title"
}
```

### Wrong Format 2 - Missing Required Fields:
```json
{
  "description": "Test description"  ❌ MISSING organizationId AND title
}
```

### Wrong Format 3 - Empty Values:
```json
{
  "organizationId": "",    ❌ EMPTY STRING
  "title": ""              ❌ EMPTY STRING
}
```

### Wrong Format 4 - Missing Content-Type:
```
Headers: Authorization: Bearer token
Body: {"organizationId":"1","title":"Test"}
❌ MISSING Content-Type: application/json
```

---

## 🧪 INSTANT TEST

Copy this EXACT curl command and replace YOUR_JWT_TOKEN:

```bash
curl -X POST http://localhost:3000/organization/api/v1/causes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"organizationId":"1","title":"Test Cause Title"}'
```

**Expected Success Response:**
```json
{
  "causeId": "123",
  "organizationId": "1",
  "title": "Test Cause Title",
  "description": null,
  "introVideoUrl": null,
  "imageUrl": null,
  "isPublic": false,
  "createdAt": "2025-09-13T...",
  "updatedAt": "2025-09-13T..."
}
```

---

## 🔍 DEBUGGING CHECKLIST

If you still get errors, verify:

- [ ] **URL is correct**: `/organization/api/v1/causes` (with prefix)
- [ ] **Method is POST**
- [ ] **Content-Type**: `application/json` header included
- [ ] **Authorization**: Valid JWT token in header
- [ ] **organizationId**: String format `"1"` not number `1`
- [ ] **title**: Non-empty string provided
- [ ] **Body**: Valid JSON format
- [ ] **Server**: Running on localhost:3000

---

## 🚀 QUICK VALIDATION TEST

Run this in browser console (replace token):

```javascript
// Test the exact format
const testRequest = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    organizationId: "1",
    title: "Quick Test Cause"
  })
};

fetch('http://localhost:3000/organization/api/v1/causes', testRequest)
  .then(r => r.json())
  .then(data => {
    if (data.causeId) {
      console.log('✅ SUCCESS! Cause created:', data);
    } else {
      console.log('❌ ERROR:', data);
    }
  });
```

---

## 💡 KEY POINTS

1. **organizationId MUST be a string**: Use `"1"` not `1`
2. **title is REQUIRED**: Cannot be empty or missing
3. **Content-Type header is REQUIRED**: `application/json`
4. **JWT token is REQUIRED**: Valid Bearer token
5. **JSON format REQUIRED**: Proper JSON in request body

The error you're getting means you're missing one of these requirements. Use the exact format above and it will work!