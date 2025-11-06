# 🔧 Cloud Run Deployment Troubleshooting Guide

## 🚨 Current Issue: Container Failed to Start

### Error Message:
```
The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout.
```

---

## ✅ Fixes Applied

### 1. **Simplified Dockerfile**
- Removed complex build verification steps
- Ensured Prisma Client is generated in both stages
- Added diagnostic entrypoint script
- Increased memory to 1Gi

### 2. **Added Diagnostic Script**
- `docker-entrypoint.sh` - Logs detailed startup information
- Helps identify exactly where the failure occurs

### 3. **Database Connection**
- PrismaService has proper timeout handling (8s per attempt, max 2 attempts)
- Won't block startup if database is unreachable
- Logs connection status clearly

---

## 📊 Debugging Steps

### Step 1: View Recent Logs
```bash
gcloud run services logs read organizations --region us-central1 --limit=100 --format=json | jq -r '.[] | .textPayload'
```

### Step 2: Check Specific Revision Logs
```bash
# Get the failing revision name from the error message
REVISION="organizations-00015-wh2"  # Replace with actual revision

gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=organizations AND resource.labels.revision_name=$REVISION" --limit=100 --format=json
```

### Step 3: Test Docker Image Locally
```powershell
# Build the image
docker build -t organizations-test:latest .

# Run with same environment as Cloud Run
docker run -p 8080:8080 `
  -e PORT=8080 `
  -e NODE_ENV=production `
  -e DATABASE_URL="mysql://root:Skaveesha1355660%40@34.29.9.105:3306/suraksha-lms-db?connection_limit=10&pool_timeout=120&connect_timeout=120&sslmode=disable" `
  -e STORAGE_PROVIDER=google `
  -e GCS_BUCKET_NAME=suraksha-lms `
  -e GCS_PROJECT_ID=earnest-radio-475808-j8 `
  -e JWT_SECRET=test-secret `
  -e OM_TOKEN=test-token `
  organizations-test:latest

# Test health endpoint
curl http://localhost:8080/organization/api/v1/health
```

### Step 4: Check Build Logs
```bash
gcloud builds list --limit=5
# Get the latest build ID
gcloud builds log <BUILD_ID>
```

---

## 🔍 Common Issues & Solutions

### Issue 1: Module Not Found
**Symptoms:** `Cannot find module` error in logs

**Solutions:**
1. Ensure `package.json` and `package-lock.json` are committed
2. Verify `npm ci` runs successfully in Dockerfile
3. Check that Prisma Client is generated: `npx prisma generate`

**Test locally:**
```bash
docker run --rm organizations-test:latest ls -la node_modules/.prisma/client/
```

### Issue 2: Database Connection Timeout
**Symptoms:** Container starts but times out connecting to database

**Solutions:**
1. **Check Cloud SQL IP whitelist:**
   - Go to Cloud SQL console
   - Add `0.0.0.0/0` to authorized networks (for testing)
   - For production: Use Cloud SQL Proxy

2. **Test database connection:**
```bash
# From Cloud Shell
mysql -h 34.29.9.105 -u root -p
# Enter password: Skaveesha1355660@
USE suraksha-lms-db;
SHOW TABLES;
```

3. **Use Cloud SQL Proxy (Recommended for Production):**
```bash
gcloud run services update organizations \
  --region us-central1 \
  --add-cloudsql-instances earnest-radio-475808-j8:us-central1:suraksha-lms-instance \
  --set-env-vars DATABASE_URL="mysql://root:Skaveesha1355660@/suraksha-lms-db?host=/cloudsql/earnest-radio-475808-j8:us-central1:suraksha-lms-instance"
```

### Issue 3: Port Configuration
**Symptoms:** Health check fails, container can't be reached

**Solutions:**
1. Verify app listens on `0.0.0.0` not `127.0.0.1`:
   ```typescript
   // In main.ts
   await app.listen(port, '0.0.0.0');  // ✅ Correct
   ```

2. Ensure PORT environment variable is read:
   ```typescript
   const port = parseInt(process.env.PORT || '8080', 10);
   ```

3. Check Dockerfile EXPOSE matches:
   ```dockerfile
   EXPOSE 8080
   ```

### Issue 4: Startup Timeout
**Symptoms:** Container starts but doesn't respond within allocated time

**Solutions:**
1. **Increase timeout:**
```bash
gcloud run services update organizations \
  --region us-central1 \
  --timeout=300  # 5 minutes
```

2. **Optimize startup:**
   - Remove unnecessary database queries during initialization
   - Lazy-load heavy modules
   - Use `--min-instances=1` to keep a warm instance

3. **Check what's blocking:**
   - Review `onModuleInit` hooks
   - Check synchronous operations in constructors
   - Profile with `NODE_OPTIONS=--prof`

### Issue 5: Memory Issues
**Symptoms:** Container OOM (Out of Memory) killed

**Solutions:**
```bash
gcloud run services update organizations \
  --region us-central1 \
  --memory=2Gi  # Increase from 1Gi
```

### Issue 6: Environment Variables Missing
**Symptoms:** App crashes with config errors

**Solutions:**
1. **List current env vars:**
```bash
gcloud run services describe organizations --region us-central1 --format=json | jq '.spec.template.spec.containers[0].env'
```

2. **Set missing variables:**
```bash
gcloud run services update organizations \
  --region us-central1 \
  --set-env-vars KEY=VALUE
```

3. **Use Secret Manager (Recommended):**
```bash
# Create secret
echo -n "your-secret-value" | gcloud secrets create my-secret --data-file=-

# Mount in Cloud Run
gcloud run services update organizations \
  --region us-central1 \
  --update-secrets DATABASE_URL=database-url:latest
```

---

## 🎯 Quick Fix Checklist

- [ ] **Docker Desktop is running** (for local testing)
- [ ] **PORT=8080** in .env and Cloud Run env vars
- [ ] **App listens on 0.0.0.0:8080**
- [ ] **Prisma Client generated** in Dockerfile
- [ ] **Database accessible** from Cloud Run IP
- [ ] **All env vars set** in Cloud Run
- [ ] **Memory sufficient** (min 1Gi for NestJS)
- [ ] **Timeout adequate** (300s recommended)
- [ ] **Health endpoint** returns 200 OK
- [ ] **No blocking code** in onModuleInit

---

## 🚀 Recommended Deployment Command

```bash
gcloud run deploy organizations \
  --image gcr.io/earnest-radio-475808-j8/organizations-service:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 300 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --concurrency 80 \
  --set-env-vars NODE_ENV=production,PORT=8080,STORAGE_PROVIDER=google \
  --set-env-vars GCS_BUCKET_NAME=suraksha-lms,GCS_PROJECT_ID=earnest-radio-475808-j8 \
  --set-env-vars DATABASE_URL="mysql://root:Skaveesha1355660%40@34.29.9.105:3306/suraksha-lms-db?connection_limit=10&pool_timeout=120&connect_timeout=120" \
  --set-env-vars JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024 \
  --set-env-vars OM_TOKEN=v9Jz3Xq7Lk2p8Yt5Wm1r4Bv6Qe9Tn0HsXc3Zg7Ua5Md2Rf8KjLq6Np1YwVb4Ez7C \
  --execution-environment gen2
```

---

## 📞 Next Steps

1. **Check logs** using commands above to see exact error
2. **Test locally** with Docker to reproduce issue
3. **Verify database** connectivity from Cloud Run
4. **Increase resources** if needed (memory/timeout)
5. **Use diagnostic script** output to identify failure point

## 📝 Log Analysis Commands

```bash
# Real-time logs
gcloud run services logs tail organizations --region us-central1

# Filter for errors
gcloud run services logs read organizations --region us-central1 --limit=100 | grep -i error

# Filter for database connection
gcloud run services logs read organizations --region us-central1 --limit=100 | grep -i database

# Filter for startup issues
gcloud run services logs read organizations --region us-central1 --limit=100 | grep -i "starting\|listen\|port"
```

---

**Need More Help?**
- Review logs at: https://console.cloud.google.com/run/detail/us-central1/organizations/logs
- Cloud Run Troubleshooting: https://cloud.google.com/run/docs/troubleshooting
