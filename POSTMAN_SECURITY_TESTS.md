# POSTMAN SECURITY TEST COLLECTION
## Organization Management System - Comprehensive Security Testing

**Purpose:** Test all security protections implemented in the system  
**Environment:** Development/Staging (DO NOT run against production without approval)

---

## 🔐 AUTHENTICATION TESTS

### Test 1: Rate Limiting on Login
**Test:** Brute force protection

```bash
# Test Case: Try 6 login attempts in quick succession
POST {{base_url}}/auth/login
Content-Type: application/json

# Attempt 1-5: Should succeed or return 401
{
  "email": "test@example.com",
  "password": "wrongpassword"
}

# Attempt 6: Should return 429 Too Many Requests
Expected Response:
{
  "statusCode": 429,
  "message": "Too many login attempts - Please try again later",
  "error": "Too Many Requests"
}
```

**Validation:**
- ✅ First 5 attempts return 401 (Unauthorized) or 200 (if correct password)
- ✅ 6th attempt returns 429 (Too Many Requests)
- ✅ Must wait 15 minutes before trying again

---

## 🛡️ XSS PROTECTION TESTS

### Test 2: Script Tag XSS
**Test:** Basic script injection

```bash
POST {{base_url}}/organizations
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "<script>alert('XSS')</script>",
  "description": "Normal description"
}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "XSS attack pattern detected"
}
```

**Validation:**
- ✅ Request blocked with 400 Bad Request
- ✅ Error message indicates XSS detection
- ✅ Data NOT saved to database

### Test 3: Event Handler XSS
**Test:** onclick, onerror event handlers

```bash
POST {{base_url}}/lectures
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "<img src=x onerror=alert('XSS')>",
  "description": "Test lecture"
}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "XSS attack pattern detected"
}
```

### Test 4: JavaScript Protocol XSS
**Test:** javascript: protocol injection

```bash
POST {{base_url}}/causes
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Normal Title",
  "imageUrl": "javascript:alert('XSS')"
}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "XSS attack pattern detected"
}
```

### Test 5: Data URI XSS
**Test:** data:text/html injection

```bash
GET {{base_url}}/lectures?search=data:text/html,<script>alert('XSS')</script>
Authorization: Bearer {{token}}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "XSS attack pattern detected"
}
```

### Test 6: HTML Entity XSS
**Test:** Encoded XSS attempts

```bash
POST {{base_url}}/organizations
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "&#60;script&#62;alert('XSS')&#60;/script&#62;",
  "description": "Test"
}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "XSS attack pattern detected"
}
```

### Test 7: SVG XSS
**Test:** SVG onload injection

```bash
POST {{base_url}}/lectures
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "<svg onload=alert('XSS')>",
  "description": "Test"
}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "XSS attack pattern detected"
}
```

---

## 💉 SQL INJECTION TESTS

### Test 8: UNION SELECT Injection
**Test:** UNION-based SQL injection

```bash
GET {{base_url}}/lectures?causeId=1' UNION SELECT * FROM users--
Authorization: Bearer {{token}}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "SQL injection pattern detected"
}
```

### Test 9: OR 1=1 Injection
**Test:** Boolean-based SQL injection

```bash
GET {{base_url}}/organizations?search=' OR '1'='1
Authorization: Bearer {{token}}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "SQL injection pattern detected"
}
```

### Test 10: Comment-based Injection
**Test:** SQL comment injection

```bash
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "admin'--",
  "password": "anything"
}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "SQL injection pattern detected"
}
```

### Test 11: DELETE Injection
**Test:** Destructive SQL injection

```bash
GET {{base_url}}/lectures?title='; DELETE FROM lectures; --
Authorization: Bearer {{token}}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "SQL injection pattern detected"
}
```

---

## 📂 PATH TRAVERSAL TESTS

### Test 12: Directory Traversal
**Test:** ../ path traversal

```bash
GET {{base_url}}/lectures/../../etc/passwd
Authorization: Bearer {{token}}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "Path traversal attack detected"
}
```

### Test 13: Windows Path Traversal
**Test:** ..\ Windows-style traversal

```bash
GET {{base_url}}/organizations?file=..\\..\\windows\\system32\\config\\sam
Authorization: Bearer {{token}}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "Path traversal attack detected"
}
```

### Test 14: URL Encoded Traversal
**Test:** URL encoded ../ attempts

```bash
GET {{base_url}}/lectures?path=%2e%2e%2f%2e%2e%2fetc%2fpasswd
Authorization: Bearer {{token}}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid input detected",
  "error": "Path traversal attack detected"
}
```

---

## 📊 BULK REQUEST ABUSE TESTS

### Test 15: Excessive Limit Parameter
**Test:** limit=999999 abuse

```bash
GET {{base_url}}/lectures?limit=999999
Authorization: Bearer {{token}}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid query parameters - values exceed maximum allowed limits",
  "error": "Bad Request"
}
```

**Validation:**
- ✅ Request blocked immediately
- ✅ Database query NOT executed
- ✅ Max limit enforced (100)

### Test 16: Excessive Page Parameter
**Test:** page=999999 abuse

```bash
GET {{base_url}}/organizations?page=999999
Authorization: Bearer {{token}}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid query parameters - values exceed maximum allowed limits",
  "error": "Bad Request"
}
```

### Test 17: Excessive Offset Parameter
**Test:** offset=999999 abuse

```bash
GET {{base_url}}/lectures?offset=999999
Authorization: Bearer {{token}}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid query parameters - values exceed maximum allowed limits",
  "error": "Bad Request"
}
```

### Test 18: Combined Bulk Abuse
**Test:** Multiple excessive parameters

```bash
GET {{base_url}}/lectures?limit=999999&page=999999&offset=999999
Authorization: Bearer {{token}}

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid query parameters - values exceed maximum allowed limits",
  "error": "Bad Request"
}
```

---

## 🌐 CORS PROTECTION TESTS

### Test 19: Unauthorized Origin (Production Only)
**Test:** Request from non-whitelisted origin

```bash
OPTIONS {{base_url}}/organizations
Origin: https://evil-site.com

Expected Response (Production):
{
  "statusCode": 403,
  "message": "Origin not allowed",
  "error": "Forbidden"
}

Expected Response (Development):
200 OK with CORS headers
```

### Test 20: Valid Origin (Production)
**Test:** Request from whitelisted origin

```bash
OPTIONS {{base_url}}/organizations
Origin: https://yourdomain.com

Expected Response:
200 OK
Headers:
  Access-Control-Allow-Origin: https://yourdomain.com
  Access-Control-Allow-Credentials: true
  Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
```

### Test 21: Credentials Without Origin
**Test:** Credentials flag without origin

```bash
GET {{base_url}}/organizations
Authorization: Bearer {{token}}
(No Origin header)

Expected Response:
200 OK (Development)
403 Forbidden (Production without ALLOWED_ORIGINS)
```

---

## 🔒 AUTHENTICATION BYPASS TESTS

### Test 22: No Token Access
**Test:** Access protected endpoint without token

```bash
GET {{base_url}}/lectures
(No Authorization header)

Expected Response:
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "No auth token"
}
```

### Test 23: Invalid Token
**Test:** Malformed JWT token

```bash
GET {{base_url}}/lectures
Authorization: Bearer invalid.token.here

Expected Response:
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid token"
}
```

### Test 24: Expired Token
**Test:** Expired JWT token

```bash
GET {{base_url}}/lectures
Authorization: Bearer {{expired_token}}

Expected Response:
{
  "statusCode": 401,
  "message": "Token expired",
  "error": "Unauthorized"
}
```

### Test 25: Modified Token Payload
**Test:** Token tampering

```bash
GET {{base_url}}/lectures
Authorization: Bearer {{token_with_modified_payload}}

Expected Response:
{
  "statusCode": 401,
  "message": "Invalid signature",
  "error": "Unauthorized"
}
```

---

## 📤 FILE UPLOAD TESTS

### Test 26: Oversized File Upload
**Test:** File exceeds size limit

```bash
POST {{base_url}}/lectures/1/with-files
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

# Upload file > 10MB
Expected Response:
{
  "statusCode": 413,
  "message": "Payload too large",
  "error": "Request Entity Too Large"
}
```

### Test 27: Invalid MIME Type
**Test:** Dangerous file type upload

```bash
POST {{base_url}}/lectures/1/with-files
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

# Upload file with .exe extension
Expected Response:
{
  "statusCode": 400,
  "message": "Invalid file type",
  "error": "Bad Request"
}
```

### Test 28: PHP Web Shell Upload
**Test:** Web shell disguised as image

```bash
POST {{base_url}}/lectures/1/with-files
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

# File: shell.php.jpg
Content: <?php system($_GET['cmd']); ?>

Expected Response:
{
  "statusCode": 400,
  "message": "Invalid file content",
  "error": "Bad Request"
}
```

---

## 🚫 RATE LIMITING TESTS

### Test 29: Global Rate Limit
**Test:** Exceed 100 requests per minute

```bash
# Send 101 requests rapidly
for i in {1..101}; do
  curl {{base_url}}/health
done

Expected Response (Request 101):
{
  "statusCode": 429,
  "message": "Too many requests from this IP",
  "error": "Too Many Requests"
}
```

### Test 30: Endpoint-Specific Rate Limit
**Test:** Rapid-fire requests to same endpoint

```bash
# Send 200 requests to /lectures in 1 minute
Expected Response (After exceeding limit):
{
  "statusCode": 429,
  "error": "Too Many Requests"
}
```

---

## 🔐 CSRF PROTECTION TESTS (Future Implementation)

### Test 31: Missing CSRF Token
**Test:** State-changing operation without CSRF token

```bash
POST {{base_url}}/organizations
Authorization: Bearer {{token}}
Content-Type: application/json
(No X-CSRF-Token header)

Expected Response (Future):
{
  "statusCode": 403,
  "message": "CSRF token missing",
  "error": "Forbidden"
}
```

---

## 🛡️ MITM PROTECTION TESTS (Production Only)

### Test 32: HTTP to HTTPS Redirect
**Test:** HTTP request should redirect to HTTPS

```bash
curl -I http://yourdomain.com/api

Expected Response:
301 Moved Permanently
Location: https://yourdomain.com/api
```

### Test 33: HSTS Header Present
**Test:** Strict-Transport-Security header

```bash
curl -I https://yourdomain.com/api

Expected Headers:
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Test 34: Secure Cookie Flags
**Test:** Cookies have Secure and HttpOnly flags

```bash
POST {{base_url}}/auth/login

Expected Headers:
Set-Cookie: token=...; Secure; HttpOnly; SameSite=Strict
```

---

## 📋 TEST EXECUTION CHECKLIST

### Pre-Test Setup:
- [ ] Set up Postman environment variables
- [ ] Obtain valid JWT token
- [ ] Obtain expired JWT token (for testing)
- [ ] Configure base_url (development/staging)
- [ ] Clear rate limit counters (restart server)
- [ ] Enable security logging

### During Testing:
- [ ] Run tests in order (some have dependencies)
- [ ] Document all failures
- [ ] Check server logs for security alerts
- [ ] Monitor database for unwanted changes
- [ ] Verify no data corruption

### Post-Test Validation:
- [ ] Review security logs for all blocked attempts
- [ ] Verify no XSS payloads in database
- [ ] Verify no SQL injection succeeded
- [ ] Check rate limiting counters reset
- [ ] Verify CORS headers correct for environment
- [ ] Confirm no unauthorized data access

---

## 🚨 EXPECTED RESULTS SUMMARY

| Test Category | Expected Block Rate | Severity |
|---------------|-------------------|----------|
| XSS Protection | 100% | CRITICAL |
| SQL Injection | 100% | CRITICAL |
| Path Traversal | 100% | HIGH |
| Bulk Abuse | 100% | HIGH |
| CORS Violations | 100% (prod) | HIGH |
| Auth Bypass | 100% | CRITICAL |
| Rate Limiting | Triggered after limits | MEDIUM |
| File Upload | Based on rules | HIGH |
| CSRF | 100% (when implemented) | HIGH |
| MITM | Headers present (prod) | MEDIUM |

---

## 📊 SECURITY SCORE CALCULATION

**Passing Criteria:**
- ✅ All CRITICAL tests must pass: 100%
- ✅ All HIGH severity tests must pass: 95%+
- ✅ All MEDIUM severity tests must pass: 90%+

**Test Scoring:**
- XSS Tests (7 tests): 7 points each = 49 points
- SQL Injection (4 tests): 7 points each = 28 points
- Path Traversal (3 tests): 5 points each = 15 points
- Bulk Abuse (4 tests): 5 points each = 20 points
- CORS (3 tests): 4 points each = 12 points
- Auth (4 tests): 7 points each = 28 points
- File Upload (3 tests): 5 points each = 15 points
- Rate Limiting (2 tests): 3 points each = 6 points
- MITM (3 tests): 3 points each = 9 points

**Total Possible Score:** 182 points

**Passing Grade:** 160/182 (88%+)

---

## 🔧 POSTMAN COLLECTION SETUP

### Environment Variables:
```json
{
  "base_url": "http://localhost:3001",
  "token": "{{your_jwt_token}}",
  "expired_token": "{{expired_jwt_token}}",
  "test_email": "test@example.com",
  "test_password": "Test123!@#"
}
```

### Pre-request Script (Global):
```javascript
// Log test execution
console.log(`Running: ${pm.info.requestName}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
```

### Test Script (Global):
```javascript
// Log response
console.log(`Status: ${pm.response.code}`);
console.log(`Response: ${pm.response.text()}`);

// Store results
pm.environment.set(`${pm.info.requestName}_result`, pm.response.code);
pm.environment.set(`${pm.info.requestName}_timestamp`, new Date().toISOString());
```

---

## 📝 REPORTING

### Test Report Template:
```markdown
# Security Test Report

**Date:** {{date}}
**Environment:** {{environment}}
**Tester:** {{name}}

## Summary
- Total Tests: 34
- Passed: {{passed}}
- Failed: {{failed}}
- Score: {{score}}/182

## Failed Tests
1. Test Name: {{test_name}}
   - Expected: {{expected}}
   - Actual: {{actual}}
   - Severity: {{severity}}
   - Action Required: {{action}}

## Security Posture
- XSS Protection: {{xss_score}}%
- SQL Injection Protection: {{sql_score}}%
- Authentication: {{auth_score}}%
- CORS: {{cors_score}}%

## Recommendations
{{recommendations}}
```

---

**Last Updated:** January 2026  
**Test Version:** 1.0  
**Next Review:** February 2026

