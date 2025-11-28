# 🌍 ENVIRONMENT MANAGEMENT GUIDE

## Overview
This guide explains how to manage different environment configurations for development, staging, and production.

## 📁 Environment Files

### Available Files
- `.env` - Current/default environment (gitignored)
- `.env.development` - Development configuration
- `.env.production` - Production configuration
- `.env.example` - Template file (committed to git)

### File Priority
```
.env (if exists) → .env.{NODE_ENV} → defaults in code
```

## 🚀 Usage

### Development Mode
```bash
# Option 1: Use .env.development directly
cp .env.development .env
npm run start:dev

# Option 2: Set NODE_ENV
export NODE_ENV=development
npm run start:dev
```

### Production Mode
```bash
# Option 1: Use .env.production
cp .env.production .env
npm run start:prod

# Option 2: Set NODE_ENV
export NODE_ENV=production
npm run build
npm run start:prod
```

## 🔑 Key Differences

### Development (.env.development)
- **Security**: Relaxed (for ease of development)
- **CORS**: Allow all origins (`*`)
- **Rate Limiting**: Generous limits
- **Swagger**: Enabled at `/api-docs`
- **Logging**: Verbose (`debug` level)
- **File Limits**: Higher (50MB requests)
- **Session Cookies**: Insecure (http allowed)
- **Origin Validation**: Disabled
- **JWT Expiration**: Longer (7 days)

### Production (.env.production)
- **Security**: Maximum (locked down)
- **CORS**: Whitelist only (4 authorized domains)
- **Rate Limiting**: Strict (100 req/15min)
- **Swagger**: **DISABLED** (for security)
- **Logging**: Minimal (`warn` level)
- **File Limits**: Strict (10MB requests)
- **Session Cookies**: Secure (https only)
- **Origin Validation**: **ENABLED** (blocks Postman/cURL)
- **JWT Expiration**: Shorter (2 hours)

## 🔒 Security Checklist

### Before Production Deployment

#### 1. Change All Secrets
```bash
# Update these in .env.production:
JWT_SECRET=CHANGE-THIS-TO-STRONG-SECRET-Min32Chars
JWT_REFRESH_SECRET=CHANGE-THIS-REFRESH-SECRET-Min32Chars
OM_TOKEN=CHANGE-THIS-OM-TOKEN-Min32Chars
BCRYPT_PEPPER=CHANGE-THIS-PEPPER-Min32Chars
PASSWORD_ENCRYPTION_KEY=CHANGE-THIS-ENCRYPTION-KEY-32Chars
CSRF_SECRET=CHANGE-THIS-CSRF-SECRET-Min32Chars
SESSION_SECRET=CHANGE-THIS-SESSION-SECRET-Min32Chars
```

#### 2. Verify Security Settings
```bash
# These MUST be set in production:
NODE_ENV=production
ALLOWED_ORIGINS=https://lms.suraksha.lk,https://org.suraksha.lk,https://transport.suraksha.lk,https://admin.suraksha.lk
ENABLE_SWAGGER=false
HTTPS_ENABLED=true
SESSION_COOKIE_SECURE=true
LOG_LEVEL=warn
```

#### 3. Database Configuration
```bash
# Use SSL for production database
DATABASE_URL="mysql://user:pass@host:3306/db?sslmode=require&connection_limit=50"
```

## 📊 Configuration Comparison

| Setting | Development | Production |
|---------|-------------|------------|
| PORT | 8080 | 8080 |
| NODE_ENV | development | production |
| CORS | All origins | Whitelist only |
| Swagger | ✅ Enabled | ❌ Disabled |
| Rate Limit | 1000/min | 100/15min |
| Log Level | debug | warn |
| Max File Size | 50MB | 10MB |
| JWT Expiry | 7 days | 2 hours |
| Password Min Length | 6 chars | 12 chars |
| Origin Validation | ❌ Disabled | ✅ Enabled |
| HTTPS Enforcement | ❌ No | ✅ Yes |

## 🌐 CORS Configuration

### Development
```env
CORS_ORIGIN=*
ALLOWED_ORIGINS=
```
**Result**: All origins allowed (Postman works)

### Production
```env
CORS_ORIGIN=https://lms.suraksha.lk,https://org.suraksha.lk,https://transport.suraksha.lk,https://admin.suraksha.lk
ALLOWED_ORIGINS=https://lms.suraksha.lk,https://org.suraksha.lk,https://transport.suraksha.lk,https://admin.suraksha.lk
```
**Result**: Only whitelisted domains (Postman blocked)

## 📦 Storage Configuration

### Google Cloud Storage (Current)
```env
STORAGE_PROVIDER=google
GCS_PROJECT_ID=earnest-radio-475808-j8
GCS_BUCKET_NAME=suraksha-lms
GCS_PRIVATE_KEY_ID=...
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GCS_CLIENT_EMAIL=...
GCS_BASE_URL=https://storage.googleapis.com/suraksha-lms
```

### AWS S3 (Migration Support)
```env
STORAGE_PROVIDER=aws
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=suraksha-lms-prod
AWS_S3_BASE_URL=https://suraksha-lms-prod.s3.ap-south-1.amazonaws.com
```

## 🔄 Storage Migration

### Prerequisites
```bash
# Install AWS SDK (if migrating to/from S3)
npm install aws-sdk
```

### GCS to S3 Migration
```typescript
// Single file
const result = await cloudStorageService.migrateFromGcsToS3(
  'user/profile/123.jpg'
);

// Batch migration
const results = await cloudStorageService.batchMigrate(
  ['user/profile/1.jpg', 'user/profile/2.jpg'],
  'gcs-to-s3',
  true // Delete source files after migration
);
```

### S3 to GCS Migration
```typescript
// Single file
const result = await cloudStorageService.migrateFromS3ToGcs(
  'user/profile/123.jpg'
);

// Batch migration
const results = await cloudStorageService.batchMigrate(
  ['user/profile/1.jpg', 'user/profile/2.jpg'],
  's3-to-gcs',
  false // Keep source files
);
```

### Verify Migration
```typescript
const comparison = await cloudStorageService.compareFiles('user/profile/123.jpg');
console.log(comparison);
// {
//   gcs: { exists: true, size: 152400, contentType: 'image/jpeg' },
//   s3: { exists: true, size: 152400, contentType: 'image/jpeg' },
//   match: true
// }
```

## 🛠️ Common Tasks

### Switch to Development
```bash
cp .env.development .env
npm run start:dev
```

### Switch to Production
```bash
cp .env.production .env
npm run build
npm run start:prod
```

### Test Production Locally
```bash
# Copy production config
cp .env.production .env

# Update for local testing
# In .env, change:
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
SESSION_COOKIE_SECURE=false
HTTPS_ENABLED=false

# Start
npm run build
npm run start:prod
```

### Create New Environment
```bash
# Example: staging
cp .env.production .env.staging

# Modify .env.staging
NODE_ENV=staging
# ... adjust other settings ...

# Use it
cp .env.staging .env
npm run start:prod
```

## 🔍 Environment Verification

### Check Current Environment
```bash
# View loaded environment
node -e "require('dotenv').config(); console.log('NODE_ENV:', process.env.NODE_ENV)"
```

### Verify Production Security
```bash
# Start server and check logs
npm run start:prod

# Should see:
# 🔒 PRODUCTION MODE ACTIVATED
# 🛡️  Allowed Origins: https://lms.suraksha.lk, ...
# 🚫 Postman/cURL requests will be BLOCKED
# 🔒 Swagger UI disabled in production mode for security
```

### Test Security
```bash
# This should FAIL in production (403 Forbidden)
curl -X GET https://api.suraksha.lk/organization/api/v1/organizations

# This should WORK (from authorized frontend)
# Open browser DevTools on https://lms.suraksha.lk
fetch('/organization/api/v1/organizations').then(res => res.json()).then(console.log)
```

## 📝 Best Practices

### 1. Never Commit Secrets
```bash
# .gitignore already includes:
.env
.env.local
.env.*.local
```

### 2. Use Environment-Specific Values
```bash
# ❌ Bad: Same database for all environments
DATABASE_URL=mysql://root:pass@prod-db:3306/prod

# ✅ Good: Different databases
# .env.development
DATABASE_URL=mysql://root:pass@localhost:3306/dev

# .env.production
DATABASE_URL=mysql://root:pass@prod-db:3306/prod
```

### 3. Document Required Variables
Keep `.env.example` updated:
```bash
# Update example file when adding new variables
cp .env .env.example
# Remove sensitive values manually
```

### 4. Validate on Startup
Application logs missing/invalid variables:
```
⚠️⚠️⚠️ CRITICAL SECURITY WARNING ⚠️⚠️⚠️
⚠️  No ALLOWED_ORIGINS configured!
⚠️  API will reject ALL requests in production!
```

## 🆘 Troubleshooting

### Issue: "Origin not allowed" in production
**Solution**: Add frontend domain to ALLOWED_ORIGINS
```env
ALLOWED_ORIGINS=https://lms.suraksha.lk,https://your-new-domain.com
```

### Issue: Postman blocked in production
**Expected behavior** - Production blocks Postman for security.
**Solution**: Use browser DevTools from authorized frontend, or switch to development mode for testing.

### Issue: Swagger not working in production
**Expected behavior** - Swagger disabled in production for security.
**Solution**: Switch to development mode or enable temporarily (NOT RECOMMENDED).

### Issue: File upload fails with "SignedUrl expired"
**Development**: TTL is 30 minutes
**Production**: TTL is 10 minutes
**Solution**: Adjust SIGNED_URL_TTL_MINUTES or ensure faster uploads.

### Issue: AWS SDK not found
```bash
# Install AWS SDK for migration features
npm install aws-sdk
```

## 📚 Related Documentation

- [PRODUCTION_SECURITY.md](./PRODUCTION_SECURITY.md) - Security configuration
- [README.md](./README.md) - General setup
- [STORAGE_QUICKSTART.md](./STORAGE_QUICKSTART.md) - Storage configuration

---

**Last Updated**: November 28, 2025
**Maintainer**: DevOps Team
