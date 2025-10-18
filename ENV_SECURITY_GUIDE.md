# ENVIRONMENT VARIABLES - SECURITY QUICK REFERENCE
## What Each Security Variable Does

---

## 🔐 **XSS & INJECTION PROTECTION**

### `XSS_PROTECTION=true`
**What it does:** Enables XSS attack detection middleware  
**When enabled:** Blocks 22 types of XSS patterns including:
- `<script>` tags
- Event handlers (`onclick`, `onerror`)
- `javascript:` protocol
- SVG attacks
- HTML entities

**Test:**
```bash
curl -X POST http://localhost:3001/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"<script>alert(1)</script>"}'
# Result: 400 Bad Request - "XSS attack pattern detected"
```

### `ENABLE_CSRF=false`
**What it does:** CSRF token validation (currently disabled)  
**Future:** Will require CSRF tokens for state-changing operations

---

## 🚫 **BULK ABUSE PROTECTION**

### `MAX_PAGINATION_LIMIT=100`
**What it does:** Maximum items per page  
**Blocks:** `?limit=999999` attacks  
**Enforced in:** `pagination.dto.ts`

**Test:**
```bash
curl "http://localhost:3001/lectures?limit=999999"
# Result: 400 - "values exceed maximum allowed limits"
# Actual limit: 100 items
```

### `MAX_PAGE_NUMBER=1000`
**What it does:** Maximum page number allowed  
**Blocks:** `?page=999999` attacks

### `MAX_SEARCH_LENGTH=200`
**What it does:** Maximum search string length  
**Blocks:** 10,000+ character XSS payloads in search

### `MAX_OFFSET=100000`
**What it does:** Maximum offset value  
**Blocks:** `?offset=999999` attacks

---

## ⏱️ **RATE LIMITING (Brute Force Protection)**

### `THROTTLE_LIMIT_LOGIN=5`
**What it does:** Max login attempts before blocking  
**Time window:** 15 minutes (`THROTTLE_TTL_LOGIN=900000`)

**Test:**
```bash
# Try logging in 6 times with wrong password
for i in {1..6}; do
  curl -X POST http://localhost:3001/auth/login \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Attempt 6: 429 Too Many Requests
```

### `THROTTLE_LIMIT_DEFAULT=100`
**What it does:** Max requests per minute (global)  
**Time window:** 1 minute (`THROTTLE_TTL_DEFAULT=60000`)

### `RATE_LIMIT_MAX_REQUESTS=100`
**What it does:** Legacy rate limit (still active)  
**Time window:** 15 minutes

---

## 🌐 **CORS PROTECTION**

### `ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com`
**What it does:** Whitelist of allowed origins (production only)  
**Development:** `CORS_ORIGIN="*"` allows all origins  
**Production:** ONLY whitelisted origins allowed

**How it works:**
```bash
# Development - All origins allowed
curl -H "Origin: http://anything.com" http://localhost:3001/api
→ Access-Control-Allow-Origin: http://anything.com ✅

# Production - Only whitelisted origins
curl -H "Origin: https://evil-site.com" https://api.yourdomain.com
→ 403 Forbidden ❌

curl -H "Origin: https://yourdomain.com" https://api.yourdomain.com
→ Access-Control-Allow-Origin: https://yourdomain.com ✅
```

**CRITICAL:** Set this in production!
```bash
# .env (Production)
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

---

## 🔒 **MITM PROTECTION (HTTPS)**

### `HTTPS_ENABLED=true`
**What it does:** Enables HTTPS server  
**Requires:** SSL certificate and private key

### `FORCE_HTTPS=true`
**What it does:** Redirects all HTTP to HTTPS

### `SSL_CERT_PATH=/path/to/cert.pem`
**What it does:** Path to SSL certificate

### `SSL_KEY_PATH=/path/to/key.pem`
**What it does:** Path to SSL private key

### `HSTS_MAX_AGE=31536000`
**What it does:** Strict-Transport-Security header (1 year)  
**Effect:** Browser only uses HTTPS for this domain

**Headers Added (Production):**
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 📏 **REQUEST SIZE LIMITS (DoS Protection)**

### `REQUEST_SIZE_LIMIT=10mb`
**What it does:** Maximum request body size  
**Blocks:** Large payload DoS attacks

### `MAX_FILE_SIZE=10485760`
**What it does:** Maximum file upload size (10MB)  
**Blocks:** Oversized file uploads

### `MAX_FILES_PER_REQUEST=10`
**What it does:** Maximum files per upload request  
**Blocks:** Bulk file upload DoS

---

## 📝 **LOGGING**

### `LOG_LEVEL=debug` (Development)
**What it does:** Detailed logging including debug messages

### `LOG_LEVEL=warn` (Production)
**What it does:** Only warnings and errors logged  
**Security:** Reduces sensitive data in logs

### `LOG_TO_FILE=true`
**What it does:** Saves logs to files

### `LOG_MAX_FILES=14`
**What it does:** Log rotation (keeps 14 days)

---

## 🔑 **SECRETS (MUST CHANGE IN PRODUCTION!)**

### `JWT_SECRET="CHANGE-ME"`
**What it does:** Signs JWT access tokens  
**CRITICAL:** Use 64+ character random string  
**Generate:**
```bash
# Linux/Mac
openssl rand -base64 64

# Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### `JWT_REFRESH_SECRET="CHANGE-ME"`
**What it does:** Signs JWT refresh tokens  
**CRITICAL:** Must be DIFFERENT from JWT_SECRET

### `BCRYPT_PEPPER="CHANGE-ME"`
**What it does:** Additional password hashing secret

### `PASSWORD_ENCRYPTION_KEY="CHANGE-ME"`
**What it does:** Encrypts stored passwords

### `CSRF_SECRET="CHANGE-ME"`
**What it does:** CSRF token generation (future use)

### `SESSION_SECRET="CHANGE-ME"`
**What it does:** Session cookie signing

---

## 📊 **SWAGGER (API Documentation)**

### `SWAGGER_ENABLED=true` (Development)
**What it does:** Enables API documentation at `/api-docs`

### `SWAGGER_ENABLED=false` (Production)
**What it does:** DISABLES API documentation  
**Security:** Prevents API surface exposure

---

## 🎯 **QUICK SETUP GUIDE**

### Development Setup:
```bash
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run start:dev
```

### Production Setup:
```bash
cp .env.example .env
# Edit .env and change:

# 1. Set environment
NODE_ENV=production

# 2. Change ALL secrets (CRITICAL!)
JWT_SECRET="[64-char-random-string]"
JWT_REFRESH_SECRET="[different-64-char-random-string]"
BCRYPT_PEPPER="[64-char-random-string]"
PASSWORD_ENCRYPTION_KEY="[64-char-random-string]"
CSRF_SECRET="[64-char-random-string]"
SESSION_SECRET="[64-char-random-string]"

# 3. Configure CORS (CRITICAL!)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# 4. Enable HTTPS (CRITICAL!)
HTTPS_ENABLED=true
FORCE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/certs/your-cert.pem
SSL_KEY_PATH=/etc/ssl/private/your-key.pem

# 5. Disable Swagger (CRITICAL!)
SWAGGER_ENABLED=false

# 6. Set production logging
LOG_LEVEL=warn

# 7. Secure cookies
SESSION_COOKIE_SECURE=true

# 8. Configure production database
DB_HOST=your-production-db.com
DB_PASSWORD=strong-password

# 9. Configure production storage
STORAGE_PROVIDER=gcs
GCS_BUCKET_NAME=your-production-bucket

npm run build
npm run start:prod
```

---

## ✅ **VERIFICATION CHECKLIST**

After setting environment variables, verify:

### Development:
- [ ] Application starts without errors
- [ ] Can login with test credentials
- [ ] XSS protection blocks `<script>` tags
- [ ] Bulk abuse blocks `?limit=999999`
- [ ] Rate limiting triggers after 5 login attempts
- [ ] All endpoints require authentication (except `/auth/login`)

### Production:
- [ ] All secrets changed from defaults
- [ ] HTTPS enabled and working
- [ ] HTTP redirects to HTTPS
- [ ] CORS only allows whitelisted origins
- [ ] Unauthorized origins get 403
- [ ] Swagger is disabled
- [ ] HSTS header present
- [ ] Security headers present
- [ ] Logs don't contain sensitive data
- [ ] Rate limiting working
- [ ] XSS protection working
- [ ] SQL injection protection working
- [ ] Bulk abuse protection working

---

## 🚨 **SECURITY ALERTS**

### If you see these, take action immediately:

**Multiple XSS attempts:**
```bash
grep "XSS attack pattern detected" logs/*.log
# If > 10 per hour: Investigate source IP
```

**Multiple SQL injection attempts:**
```bash
grep "SQL injection pattern detected" logs/*.log
# If > 10 per hour: Block source IP at firewall
```

**Bulk abuse attempts:**
```bash
grep "Bulk abuse attempt blocked" logs/*.log
# If > 50 per hour: Implement IP-based blocking
```

**CORS violations (Production):**
```bash
grep "CORS.*blocked" logs/*.log
# If > 100 per hour: Check if legitimate origin missing from whitelist
```

**Rate limit blocks:**
```bash
grep "Too many requests" logs/*.log
# If from single IP: Potential DoS attack
```

---

## 📞 **SUPPORT**

**Configuration Issues:**
- Check `.env.example` for correct format
- Verify all required variables are set
- Check for typos in variable names
- Ensure values don't have trailing spaces

**Security Issues:**
- Review `SECURITY_PROTECTIONS_COMPLETE.md`
- Run Postman security tests
- Check `SECURITY_THREATS.md` for threat analysis
- Run `npm audit` for dependency vulnerabilities

---

**Last Updated:** January 2026  
**Next Review:** February 2026

