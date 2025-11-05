# 🌐 Google Cloud Storage - REQUIRED SETUP

## ⚠️ CRITICAL: Application Now Requires Google Cloud Storage

The application has been configured to **ONLY use Google Cloud Storage** for file uploads. Local storage has been completely disabled for security reasons.

---

## 📋 Required Environment Variables

Add these to your `.env` file:

```env
# Storage Configuration - GOOGLE CLOUD STORAGE ONLY
STORAGE_PROVIDER=google

# Google Cloud Storage Credentials
GCS_BUCKET_NAME=your-bucket-name-here
GCS_PROJECT_ID=your-gcp-project-id
GCS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GCS_PRIVATE_KEY_ID=your-private-key-id
GCS_CLIENT_ID=your-client-id

# File URL Base (for database transformations)
GCS_BASE_URL=https://storage.googleapis.com/your-bucket-name-here
```

---

## 🔧 How to Get Google Cloud Storage Credentials

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your **Project ID**

### Step 2: Enable Cloud Storage API
1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Cloud Storage"
3. Click **Enable** for "Cloud Storage API"

### Step 3: Create a Storage Bucket
1. Go to **Cloud Storage** > **Buckets**
2. Click **Create Bucket**
3. Choose a globally unique name (e.g., `suraksha-lms-uploads`)
4. Select a location (e.g., `us-central1` or your preferred region)
5. Choose **Standard** storage class
6. Set **Public access prevention**: Enforce public access prevention (RECOMMENDED)
7. Create the bucket

### Step 4: Create a Service Account
1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `storage-uploader` (or any descriptive name)
4. Description: "Service account for file uploads"
5. Click **Create and Continue**
6. Grant role: **Storage Object Admin** (or **Storage Admin** for full control)
7. Click **Done**

### Step 5: Create Service Account Key
1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Click **Create** - a JSON file will download

### Step 6: Extract Credentials from JSON File

The downloaded JSON file looks like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "storage-uploader@project.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/...",
  "universe_domain": "googleapis.com"
}
```

### Step 7: Add to .env File

```env
GCS_BUCKET_NAME=suraksha-lms-uploads
GCS_PROJECT_ID=your-project-id
GCS_CLIENT_EMAIL=storage-uploader@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
GCS_PRIVATE_KEY_ID=abc123...
GCS_CLIENT_ID=123456789...
```

**IMPORTANT**: 
- Keep the private key on ONE line in .env
- Preserve the `\n` characters (they represent newlines)
- Wrap the private key in double quotes

---

## 🔐 Bucket Permissions Setup

### Make Bucket Publicly Readable (for uploaded images)

1. Go to **Cloud Storage** > **Buckets** > Select your bucket
2. Go to **Permissions** tab
3. Click **Grant Access**
4. Add principal: `allUsers`
5. Select role: **Storage Object Viewer**
6. Click **Save**

**OR** configure via command line:
```bash
gsutil iam ch allUsers:objectViewer gs://your-bucket-name
```

---

## ✅ Verify Configuration

1. **Update .env** with all GCS credentials
2. **Restart the application**:
   ```bash
   npm run start
   ```

3. **Look for this log message**:
   ```
   [CloudStorageService] ✅ Google Cloud Storage initialized - Bucket: your-bucket-name
   ```

4. **If you see an error**:
   ```
   ❌ Google Cloud Storage initialization failed
   ```
   Check your credentials and ensure:
   - Bucket exists and is accessible
   - Service account has proper permissions
   - Private key is correctly formatted in .env

---

## 🚨 What Happens Without GCS Configuration?

If Google Cloud Storage is not properly configured, the application will **FAIL TO START** and show this error:

```
Google Cloud Storage initialization failed: Google Cloud Storage credentials not configured.
Required: GCS_BUCKET_NAME, GCS_PROJECT_ID, GCS_PRIVATE_KEY, GCS_CLIENT_EMAIL
```

This is **intentional** - we've disabled local storage fallback for security reasons.

---

## 📊 Storage Provider Comparison

| Feature | Google Cloud Storage | Local Storage |
|---------|---------------------|---------------|
| Security | ✅ Secure, isolated | ❌ Vulnerable |
| Scalability | ✅ Unlimited | ❌ Limited by disk |
| Backup | ✅ Automatic | ❌ Manual |
| CDN Support | ✅ Global edge network | ❌ None |
| Cost | ✅ Pay as you go | ❌ Server costs |
| **Status** | ✅ **ENABLED** | ❌ **DISABLED** |

---

## 🎯 Quick Setup Checklist

- [ ] Created Google Cloud Project
- [ ] Enabled Cloud Storage API
- [ ] Created Storage Bucket
- [ ] Created Service Account with Storage Object Admin role
- [ ] Downloaded JSON key file
- [ ] Added all credentials to .env:
  - [ ] GCS_BUCKET_NAME
  - [ ] GCS_PROJECT_ID
  - [ ] GCS_CLIENT_EMAIL
  - [ ] GCS_PRIVATE_KEY
  - [ ] GCS_PRIVATE_KEY_ID
  - [ ] GCS_CLIENT_ID
- [ ] Set STORAGE_PROVIDER=google
- [ ] Made bucket publicly readable (for image URLs)
- [ ] Restarted application
- [ ] Verified "Google Cloud Storage initialized" log message

---

## 💡 Pro Tips

1. **Keep credentials secure**: Never commit .env to Git
2. **Use separate buckets** for dev/staging/production
3. **Enable versioning** on bucket for backup
4. **Set lifecycle rules** to auto-delete old files
5. **Monitor usage** in Google Cloud Console
6. **Enable logging** for security audits

---

## ❓ Troubleshooting

### Error: "Google Cloud Storage not initialized"
- Check that all GCS_ environment variables are set
- Verify private key is properly formatted with `\n` newlines
- Ensure service account has Storage Object Admin role

### Error: "Bucket not found"
- Verify bucket name is correct
- Check bucket exists in Google Cloud Console
- Ensure service account has access to bucket

### Error: "Permission denied"
- Service account needs Storage Object Admin role
- Check IAM permissions in Google Cloud Console

### Files upload but return 404
- Make bucket publicly readable
- Run: `gsutil iam ch allUsers:objectViewer gs://bucket-name`

---

## 📞 Need Help?

1. Check [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
2. Review [Service Account Setup Guide](https://cloud.google.com/iam/docs/creating-managing-service-accounts)
3. Verify [Bucket Permissions](https://cloud.google.com/storage/docs/access-control/making-data-public)

---

## ✅ Summary

**BEFORE**: Application used local storage (security risk)
**NOW**: Application requires Google Cloud Storage (secure, scalable, production-ready)

**You MUST configure Google Cloud Storage credentials or the application will not start.**
