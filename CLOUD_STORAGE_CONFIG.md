# 🌐 Cloud Storage Configuration Guide

## 📋 Overview

This project supports **3 storage providers** for file uploads:
- **Local File System** (Development)
- **Google Cloud Storage** (Production - GCS)
- **AWS S3** (Production - AWS)

Switch between providers by changing the `STORAGE_PROVIDER` environment variable.

---

## 🚀 Quick Start

### Current Configuration: **LOCAL STORAGE** (Active)

```env
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
LOCAL_STORAGE_BASE_URL=http://localhost:3001/uploads
```

**✅ Active Provider:** Files are stored in `./uploads` directory  
**🔗 URLs:** `http://localhost:3001/uploads/organization-images/file.jpg`

---

## 🔧 Provider Configuration

### 1️⃣ **Local Storage** (Development)

**Best for:** Local development and testing

```env
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
LOCAL_STORAGE_BASE_URL=http://localhost:3001/uploads
```

**Setup:**
1. Create `uploads` directory (already created)
2. Add `uploads/` to `.gitignore`
3. No additional dependencies needed

**Pros:**
- ✅ No cloud credentials needed
- ✅ Fast uploads
- ✅ Easy debugging
- ✅ No cost

**Cons:**
- ❌ Not suitable for production
- ❌ Files lost on server restart (if using containers)
- ❌ No CDN support

---

### 2️⃣ **Google Cloud Storage** (Production)

**Best for:** Production deployments with Google Cloud

```env
STORAGE_PROVIDER=google  # or 'gcs'

# Google Cloud Storage Credentials
GCS_PROJECT_ID=sacred-alloy-468619-s5
GCS_BUCKET_NAME=laas-file-storage
GCS_PRIVATE_KEY_ID=5dbc6adf2a2c241fdbbcc74941642952883080c1
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GCS_CLIENT_EMAIL=cloudestoage@sacred-alloy-468619-s5.iam.gserviceaccount.com
GCS_CLIENT_ID=105093119287617070968
```

**Setup:**
1. Change `STORAGE_PROVIDER=google`
2. Ensure GCS credentials are configured
3. Restart application

**Pros:**
- ✅ Scalable and reliable
- ✅ Global CDN
- ✅ Pay-per-use pricing
- ✅ Already configured

**Cons:**
- ❌ Requires cloud account
- ❌ Network latency

---

### 3️⃣ **AWS S3** (Production)

**Best for:** Production deployments with AWS

```env
STORAGE_PROVIDER=aws  # or 's3'

# AWS S3 Credentials
AWS_S3_BUCKET=your-s3-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
```

**Setup:**
1. Install AWS SDK: `npm install aws-sdk`
2. Change `STORAGE_PROVIDER=aws`
3. Configure your AWS credentials in `.env`
4. Restart application

**Pros:**
- ✅ Industry standard
- ✅ Global infrastructure
- ✅ Advanced features
- ✅ Already configured

**Cons:**
- ❌ Requires cloud account
- ❌ Additional npm dependency

---

## 🔄 Switching Providers

### From Local → Google Cloud Storage

1. Update `.env`:
   ```env
   STORAGE_PROVIDER=google
   ```

2. Restart application:
   ```bash
   npm run start:dev
   ```

3. Verify in logs:
   ```
   🌐 Initialized google storage with base URL: https://storage.googleapis.com/laas-file-storage
   ✅ Google Cloud Storage initialized - Bucket: laas-file-storage
   ```

### From Local → AWS S3

1. Install AWS SDK:
   ```bash
   npm install aws-sdk
   ```

2. Update `.env`:
   ```env
   STORAGE_PROVIDER=aws
   ```

3. Restart application

4. Verify in logs:
   ```
   🌐 Initialized aws storage with base URL: https://mysurakshabucket.s3.us-east-1.amazonaws.com
   ✅ AWS S3 initialized - Bucket: mysurakshabucket
   ```

---

## 📁 File Structure

### Database Storage (All Providers)

Files are stored in the database as **relative paths**:

```typescript
// Example: Organization image
imageUrl: "organization-images/org-123-xyz.png"
```

### Full URL Generation

The service automatically generates full URLs based on the active provider:

```typescript
// Local
"http://localhost:3001/uploads/organization-images/org-123-xyz.png"

// Google Cloud
"https://storage.googleapis.com/your-bucket/organization-images/org-123-xyz.png"

// AWS S3
"https://your-bucket.s3.us-east-1.amazonaws.com/organization-images/org-123-xyz.png"
```

---

## 🛠️ Troubleshooting

### Local Storage Not Working

**Error:** `ENOENT: no such file or directory`

**Solution:**
```bash
# Create uploads directory
mkdir uploads

# Check permissions (Linux/Mac)
chmod 755 uploads
```

### Google Cloud Storage Errors

**Error:** `Google Cloud Storage credentials not configured`

**Solution:**
1. Verify all GCS_* environment variables are set
2. Check private key format (must include `\n` for line breaks)
3. Ensure bucket exists and is accessible

### AWS S3 Errors

**Error:** `AWS SDK not installed`

**Solution:**
```bash
npm install aws-sdk
```

**Error:** `AWS S3 not initialized`

**Solution:**
1. Verify AWS credentials are correct
2. Check bucket name and region
3. Ensure IAM permissions allow uploads

---

## 📊 Upload Folders

Organization images are stored in these folders:

| Folder | Purpose | Example |
|--------|---------|---------|
| `organization-images/` | Organization logos | `organization-images/org-1.png` |
| `profile-images/` | User profile pictures | `profile-images/user-123.jpg` |
| `institute-images/` | Institute logos | `institute-images/inst-1.png` |
| `cause-images/` | Cause images | `cause-images/cause-456.jpg` |

---

## 🔐 Security Notes

### Local Storage
- Files in `./uploads` are accessible if web server serves static files
- Configure proper access controls in production

### Cloud Storage (GCS/S3)
- All uploaded files are set to **PUBLIC** by default
- Anyone with the URL can access files
- Use signed URLs for private files (feature available)

---

## 📈 Migration Strategy

### Development → Production

1. **Develop Locally:**
   ```env
   STORAGE_PROVIDER=local
   ```

2. **Test on Staging (GCS):**
   ```env
   STORAGE_PROVIDER=google
   ```

3. **Deploy to Production (GCS/AWS):**
   ```env
   STORAGE_PROVIDER=google  # or aws
   ```

### No Database Migration Needed!

The system uses **relative paths** in the database, so you can switch providers without data migration.

---

## 🎯 Best Practices

### 1. Development
```env
STORAGE_PROVIDER=local
```
Fast, free, no setup required

### 2. Staging
```env
STORAGE_PROVIDER=google
```
Test with actual cloud storage

### 3. Production
```env
STORAGE_PROVIDER=google  # or aws
```
Reliable, scalable, with CDN

---

## 📞 Support

For issues or questions:
1. Check logs for provider initialization
2. Verify environment variables
3. Test with local storage first
4. Check cloud provider console for errors

---

**Last Updated:** October 16, 2025  
**Current Configuration:** LOCAL STORAGE (Development Mode)
