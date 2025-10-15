# 🚀 Quick Start: Cloud Storage

## Current Setup: LOCAL STORAGE ✅

Your application is configured to use **local file storage** for development.

### ✅ What's Already Set Up

1. **Environment Variable**
   ```env
   STORAGE_PROVIDER=local
   LOCAL_STORAGE_PATH=./uploads
   LOCAL_STORAGE_BASE_URL=http://localhost:3001/uploads
   ```

2. **Uploads Directory**
   - Created at: `./uploads`
   - Ignored in git: ✅
   - Ready to use: ✅

3. **Service Integration**
   - `CloudStorageService` is active
   - Organization controller updated
   - Module configured

---

## 🎯 How to Use

### Upload Example

```bash
# Upload organization image
curl -X POST http://localhost:3001/organizations \
  -F "image=@logo.png" \
  -F "name=My Organization"
```

**Result:**
- File saved to: `./uploads/organization-images/org-123-xyz.png`
- Database stores: `organization-images/org-123-xyz.png`
- Public URL: `http://localhost:3001/uploads/organization-images/org-123-xyz.png`

---

## 🔄 Switch to Cloud Storage

### Option 1: Google Cloud Storage

```bash
# 1. Edit .env
STORAGE_PROVIDER=google

# 2. Restart server
npm run start:dev
```

### Option 2: AWS S3

```bash
# 1. Install AWS SDK
npm install aws-sdk

# 2. Edit .env
STORAGE_PROVIDER=aws

# 3. Restart server
npm run start:dev
```

---

## 📊 Provider Comparison

| Feature | Local | Google Cloud | AWS S3 |
|---------|-------|--------------|--------|
| **Setup Time** | ✅ Instant | ⚡ 5 min | ⚡ 5 min |
| **Cost** | ✅ Free | 💰 ~$0.02/GB | 💰 ~$0.023/GB |
| **Speed** | ⚡ Fastest | 🌐 Fast | 🌐 Fast |
| **Reliability** | ⚠️ Local | ✅ 99.95% | ✅ 99.99% |
| **CDN** | ❌ No | ✅ Yes | ✅ Yes |
| **Production** | ❌ No | ✅ Yes | ✅ Yes |

---

## 🔍 Verify Configuration

```bash
# Start server and check logs
npm run start:dev

# Look for:
🌐 Initialized local storage with base URL: http://localhost:3001/uploads
✅ Local storage initialized - Path: ./uploads
```

---

## 📁 File Organization

```
uploads/
├── organization-images/    # Organization logos
├── profile-images/         # User avatars
├── institute-images/       # Institute logos
├── cause-images/           # Cause images
└── .gitkeep               # Keep folder in git
```

---

## 🆘 Need Help?

**See detailed docs:** `CLOUD_STORAGE_CONFIG.md`

**Common Issues:**

1. **Files not uploading?**
   - Check `uploads/` directory exists
   - Verify `STORAGE_PROVIDER=local` in `.env`

2. **Want to use cloud storage?**
   - Change `STORAGE_PROVIDER` to `google` or `aws`
   - Restart server

3. **Need to switch providers?**
   - Just change one environment variable!
   - No database migration needed

---

**You're all set!** 🎉

Upload files and they'll be stored in `./uploads` directory.
