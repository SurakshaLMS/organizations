# Environment Configuration Guide

## Overview
This project uses environment-specific configuration files to manage different deployment environments.

## Environment Files

### `.env.development`
- **Purpose:** Local development
- **Security:** Relaxed (allows all CORS origins, verbose logging)
- **File Sizes:** More permissive limits
- **Storage:** Can use local storage or cloud
- **Usage:** Copy to `.env` for local development

### `.env.production`
- **Purpose:** Production deployment  
- **Security:** Strict (whitelist CORS, origin validation, minimal logging)
- **File Sizes:** Strict limits
- **Storage:** Cloud storage only (GCS or S3)
- **Usage:** Use directly in production or integrate with Secret Manager

## Quick Start

### Development Setup
```bash
# Copy development environment
cp .env.development .env

# Edit as needed
nano .env

# Start development server
npm run start:dev
```

### Production Deployment
```bash
# Option 1: Use .env.production directly
cp .env.production .env
# Edit with production values
nano .env

# Option 2: Use Google Secret Manager (Recommended)
# Upload secrets to Secret Manager
# Configure Cloud Run to use secrets

# Build and deploy
npm run build
npm run start:prod
```

## Storage Provider Configuration

### Google Cloud Storage (GCS)
**Best for:** Google Cloud Run, App Engine, GKE

```env
STORAGE_PROVIDER=google
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-bucket-name
GCS_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Setup:**
1. Create GCS bucket: `gsutil mb gs://your-bucket-name`
2. Create service account with Storage Admin role
3. Generate and download JSON key
4. Extract credentials to environment variables

### AWS S3
**Best for:** AWS ECS, EKS, Lambda

```env
STORAGE_PROVIDER=aws
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

**Setup:**
1. Create S3 bucket: `aws s3 mb s3://your-bucket-name`
2. Create IAM user with S3 full access
3. Generate access keys
4. Configure environment variables

### Local Storage
**Best for:** Development only (not recommended for production)

```env
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
LOCAL_STORAGE_BASE_URL=http://localhost:8080/uploads
```

## Migration Between Providers

### GCS to S3 Migration
```bash
# Set both providers
STORAGE_PROVIDER=aws
# Keep GCS credentials for reading old files

# Use migration utility (coming soon)
npm run migrate:gcs-to-s3
```

### S3 to GCS Migration
```bash
# Set both providers  
STORAGE_PROVIDER=google
# Keep AWS credentials for reading old files

# Use migration utility
npm run migrate:s3-to-gcs
```

## Security Best Practices

### Development
- ✅ Use `.env.development` with test credentials
- ✅ Enable verbose logging for debugging
- ✅ Allow all CORS origins for ease of testing
- ❌ Never commit `.env` files to git

### Production
- ✅ Use Google Secret Manager or AWS Secrets Manager
- ✅ Whitelist CORS origins explicitly
- ✅ Enable origin validation guard
- ✅ Use strict file size limits
- ✅ Enable HTTPS only
- ✅ Rotate secrets regularly
- ❌ Never expose `.env.production` publicly

## Environment Variable Priority

1. **System environment variables** (highest priority)
2. **`.env` file** (local overrides)
3. **`.env.development` or `.env.production`** (defaults)
4. **Code defaults** (fallback values)

## Testing Environment Configs

### Test Development Config
```bash
NODE_ENV=development npm run start:dev
```

### Test Production Config Locally
```bash
# Use production config but with local database
NODE_ENV=production npm run start:prod
```

### Verify Configuration
```bash
# Check loaded configuration
curl http://localhost:8080/organization/api/v1/health
```

## Common Issues

### Issue: "Storage initialization failed"
**Cause:** Missing or invalid storage credentials  
**Solution:** Verify all required env vars for your provider

### Issue: "Origin not allowed" in production
**Cause:** Frontend domain not in ALLOWED_ORIGINS  
**Solution:** Add domain to ALLOWED_ORIGINS whitelist

### Issue: File uploads fail with 403
**Cause:** Invalid storage credentials or permissions  
**Solution:** Verify service account/IAM user has write permissions

## Environment Checklist

### Before Deploying to Development
- [ ] Copy `.env.development` to `.env`
- [ ] Update database credentials
- [ ] Configure storage provider
- [ ] Test file uploads
- [ ] Verify API endpoints work

### Before Deploying to Production  
- [ ] Use `.env.production` or Secret Manager
- [ ] Update all secrets (JWT, database, storage)
- [ ] Configure ALLOWED_ORIGINS whitelist
- [ ] Enable HTTPS
- [ ] Test from production frontend domains
- [ ] Verify Postman/cURL requests are blocked
- [ ] Monitor logs for security warnings
- [ ] Set up backup and disaster recovery

## Support

For issues or questions:
- Check logs: `npm run logs`
- Review documentation: `PRODUCTION_SECURITY.md`
- Contact DevOps team

---

Last Updated: November 28, 2025
