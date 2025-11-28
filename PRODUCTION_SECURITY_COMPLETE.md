# 🔒 Production Security Configuration - Complete Guide

## Overview

This backend is now configured with **MAXIMUM SECURITY** for production deployment. All unauthorized access is blocked, including Postman, cURL, Thunder Client, Insomnia, and direct API calls.

---

## 🛡️ Security Features Implemented

### 1. **Strict CORS Policy**
- ✅ Only whitelisted origins allowed
- ✅ Requests from non-whitelisted domains receive **403 Forbidden**
- ✅ No origin header = **403 Forbidden** (blocks API tools)
- ✅ Invalid origin = **403 Forbidden**

### 2. **Origin Validation Guard**
- ✅ Global guard applied to ALL routes
- ✅ Validates `Origin` header on every request
- ✅ Detects and blocks API testing tools by User-Agent
- ✅ Blocks requests without origin/referer headers

### 3. **User-Agent Detection**
Automatically blocks these tools:
- Postman
- Insomnia
- Thunder Client
- HTTPie
- cURL
- wget
- python-requests
- axios (standalone)
- got (standalone)
- node-fetch (standalone)

### 4. **JWT Authentication**
- ✅ Required on all protected routes
- ✅ Token validation with expiration checks
- ✅ Role-based access control (RBAC)
- ✅ Organization-level permissions

### 5. **Security Headers**
Production mode adds:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 6. **Rate Limiting**
- Login attempts: 5 per 15 minutes
- API calls: 100 per minute
- File uploads: Size limits enforced

---

## 📋 Configuration

### Environment Variables (.env.production)

```env
# Application Mode
NODE_ENV=production
PORT=8080

# 🔒 CRITICAL: Allowed Origins (Whitelist)
ALLOWED_ORIGINS=https://lms.suraksha.lk,https://org.suraksha.lk,https://transport.suraksha.lk,https://admin.suraksha.lk

# CORS Configuration
CORS_ORIGINS=https://lms.suraksha.lk,https://org.suraksha.lk,https://transport.suraksha.lk,https://admin.suraksha.lk
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400

# Enable origin validation logging (optional)
LOG_ORIGIN_CHECKS=false
```

### Whitelisted Domains

Current allowed origins:
1. `https://lms.suraksha.lk` - Main LMS application
2. `https://org.suraksha.lk` - Organization management
3. `https://transport.suraksha.lk` - Transport module
4. `https://admin.suraksha.lk` - Admin panel

**To add a new domain:**
1. Update `ALLOWED_ORIGINS` in `.env.production`
2. Add comma-separated: `ALLOWED_ORIGINS=https://domain1.com,https://domain2.com`
3. Restart the application

---

## 🚫 What Gets Blocked

### 1. **API Testing Tools**
```bash
# Postman
curl http://localhost:8080/organization/api/v1/auth/login
# Response: 403 Forbidden - API testing tools are not allowed

# cURL
curl -X POST http://localhost:8080/organization/api/v1/auth/login
# Response: 403 Forbidden - Missing origin header

# Thunder Client (VS Code)
# Response: 403 Forbidden - API testing tools are not allowed
```

### 2. **Direct Browser Access**
```
http://localhost:8080/organization/api/v1/users
Response: 403 Forbidden - Missing origin header
```

### 3. **Unauthorized Domains**
```javascript
// Request from https://malicious-site.com
fetch('https://api.suraksha.lk/organization/api/v1/users', {
  headers: { 'Authorization': 'Bearer token' }
})
// Response: 403 Forbidden - Origin not authorized
```

### 4. **Missing Authentication**
```javascript
// Request without JWT token
fetch('https://api.suraksha.lk/organization/api/v1/users')
// Response: 401 Unauthorized - Authentication required
```

---

## ✅ What Gets Allowed

### 1. **Whitelisted Frontend Applications**
```javascript
// Request from https://lms.suraksha.lk
fetch('https://api.suraksha.lk/organization/api/v1/users', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer valid_jwt_token',
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})
// Response: 200 OK with data
```

### 2. **Authenticated Requests with Valid Origin**
```javascript
// Login from whitelisted domain
fetch('https://api.suraksha.lk/organization/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  }),
  credentials: 'include'
})
// Response: 200 OK with JWT token
```

---

## 🔍 Security Logs

### Production Mode Startup
```
═══════════════════════════════════════════════════════════
🔒 PRODUCTION MODE - MAXIMUM SECURITY ENABLED
═══════════════════════════════════════════════════════════
🛡️  Allowed Origins (4):
   ✅ https://lms.suraksha.lk
   ✅ https://org.suraksha.lk
   ✅ https://transport.suraksha.lk
   ✅ https://admin.suraksha.lk
───────────────────────────────────────────────────────────
🚫 BLOCKED: Postman, cURL, Thunder Client, Insomnia
🚫 BLOCKED: Direct API access without origin header
🚫 BLOCKED: Requests from non-whitelisted domains
🚫 BLOCKED: Missing or invalid authorization tokens
───────────────────────────────────────────────────────────
✅ ALLOWED: Only whitelisted frontend applications
✅ ENFORCED: JWT authentication on all protected routes
✅ ENFORCED: Origin header validation
═══════════════════════════════════════════════════════════
```

### Blocked Request Logs
```
🚫 [SECURITY] Non-browser request blocked on POST /organization/api/v1/auth/login
   IP: 192.168.1.100
   User-Agent: PostmanRuntime/7.29.0

🚫 [SECURITY] API testing tool detected and blocked
   User-Agent: curl/7.68.0
   Method: GET /organization/api/v1/users
   IP: 192.168.1.100

🚫 [SECURITY] Unauthorized origin blocked: https://unauthorized-site.com
   Method: POST /organization/api/v1/organizations
   IP: 203.0.113.50
   User-Agent: Mozilla/5.0...
```

### Allowed Request Logs (if LOG_ORIGIN_CHECKS=true)
```
✅ [SECURITY] Origin validated: https://lms.suraksha.lk
   Method: GET /organization/api/v1/users
   IP: 203.0.113.25
```

---

## 🧪 Testing Security

### Test 1: Postman (Should Fail)
```bash
# Attempt login with Postman
POST http://localhost:8080/organization/api/v1/auth/login
Body: { "email": "user@example.com", "password": "password" }

Expected: 403 Forbidden
Message: "API testing tools are not allowed. Access denied."
```

### Test 2: cURL (Should Fail)
```bash
curl -X POST http://localhost:8080/organization/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

Expected: 403 Forbidden
Message: "Missing origin header. Direct API access not allowed."
```

### Test 3: Browser Console (Should Fail)
```javascript
// Open https://google.com console and run:
fetch('http://localhost:8080/organization/api/v1/users', {
  headers: { 'Authorization': 'Bearer token' }
})

Expected: 403 Forbidden
Message: "Origin not authorized"
```

### Test 4: Authorized Frontend (Should Succeed)
```javascript
// From https://lms.suraksha.lk:
fetch('http://localhost:8080/organization/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  }),
  credentials: 'include'
})

Expected: 200 OK
Response: { "accessToken": "...", "user": {...} }
```

---

## 🚀 Deployment Checklist

### Before Production Deployment

- [ ] Set `NODE_ENV=production` in environment
- [ ] Configure `ALLOWED_ORIGINS` with production domains
- [ ] Verify JWT secrets are strong and unique
- [ ] Enable HTTPS on all domains
- [ ] Test CORS from frontend application
- [ ] Verify rate limiting is configured
- [ ] Check security headers are present
- [ ] Test blocked access (Postman, cURL)
- [ ] Test allowed access (frontend app)
- [ ] Enable logging for security events
- [ ] Set up monitoring alerts

### Production Environment Setup

1. **Set Environment Variables:**
   ```bash
   export NODE_ENV=production
   export ALLOWED_ORIGINS=https://lms.suraksha.lk,https://org.suraksha.lk
   export JWT_SECRET=your-strong-secret-here
   export AWS_ACCESS_KEY_ID=your-aws-key
   export AWS_SECRET_ACCESS_KEY=your-aws-secret
   ```

2. **Start Application:**
   ```bash
   npm run build
   npm run start:prod
   ```

3. **Verify Security:**
   - Check startup logs for security configuration
   - Test with Postman (should be blocked)
   - Test from frontend (should work)

---

## 🔧 Troubleshooting

### Issue 1: Frontend Can't Connect
**Symptom:** Frontend gets 403 Forbidden

**Solution:**
1. Check if frontend domain is in `ALLOWED_ORIGINS`
2. Verify origin header is being sent
3. Check browser console for CORS errors
4. Ensure HTTPS is used (not HTTP)

```env
# Add frontend domain to whitelist
ALLOWED_ORIGINS=https://lms.suraksha.lk,https://your-frontend.com
```

### Issue 2: All Requests Blocked
**Symptom:** Even whitelisted domains get 403

**Solution:**
1. Check `NODE_ENV=production` is set
2. Verify `ALLOWED_ORIGINS` format (comma-separated, no spaces)
3. Check logs for specific error messages
4. Ensure frontend sends `Origin` header

```bash
# Check environment
echo $NODE_ENV
echo $ALLOWED_ORIGINS
```

### Issue 3: Need to Allow Postman for Testing
**Temporary Solution (Development Only):**
```env
# .env.development
NODE_ENV=development
ALLOWED_ORIGINS=
```

**Production Alternative:**
Use frontend application or create test scripts that include proper origin headers.

### Issue 4: CORS Preflight Fails
**Symptom:** OPTIONS requests return 403

**Solution:**
1. Check `CORS_METHODS` includes `OPTIONS`
2. Verify origin is whitelisted
3. Check browser sends origin header in preflight

```env
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
```

---

## 📊 Security Monitoring

### Key Metrics to Monitor

1. **Blocked Requests:**
   - Count of 403 responses
   - User-Agent patterns
   - IP addresses

2. **Failed Authentications:**
   - 401 responses
   - Rate limit hits
   - Invalid tokens

3. **Suspicious Activity:**
   - Multiple IPs from same user
   - Repeated blocked requests
   - Unusual access patterns

### Log Analysis

```bash
# Count blocked requests
grep "SECURITY.*blocked" logs/app.log | wc -l

# Most common blocked User-Agents
grep "User-Agent:" logs/app.log | sort | uniq -c | sort -rn

# Blocked IPs
grep "🚫.*IP:" logs/app.log | awk '{print $NF}' | sort | uniq -c
```

---

## 🔐 Additional Security Recommendations

### 1. **Network Level**
- Use WAF (Web Application Firewall)
- Enable DDoS protection
- Implement IP whitelisting at load balancer
- Use private VPC for database

### 2. **Application Level**
- Rotate JWT secrets regularly
- Implement refresh token rotation
- Add request signing for sensitive operations
- Enable audit logging

### 3. **Infrastructure Level**
- Use secrets manager (AWS Secrets Manager, etc.)
- Enable CloudWatch/monitoring
- Set up alerting for security events
- Regular security audits

### 4. **Data Protection**
- Encrypt sensitive data at rest
- Use TLS 1.3 for all connections
- Implement data retention policies
- Regular backups with encryption

---

## 📝 Summary

### Security Status: ✅ MAXIMUM SECURITY ENABLED

**Blocked:**
- ❌ Postman requests
- ❌ cURL requests
- ❌ Thunder Client requests
- ❌ Insomnia requests
- ❌ Direct browser access
- ❌ Unauthorized domains
- ❌ Missing authentication
- ❌ Missing origin headers

**Allowed:**
- ✅ Whitelisted frontend domains only
- ✅ Valid JWT tokens
- ✅ Proper origin headers
- ✅ HTTPS connections

**Protection Against:**
- 🛡️ CSRF attacks
- 🛡️ XSS attacks
- 🛡️ Clickjacking
- 🛡️ MIME sniffing
- 🛡️ Protocol downgrade
- 🛡️ Unauthorized API access
- 🛡️ Rate limit abuse

---

## 📞 Support

For security concerns or questions:
- Review security logs in production
- Check this documentation
- Contact: dev@suraksha.edu

**Remember:** Security is an ongoing process. Regularly review and update security configurations.
