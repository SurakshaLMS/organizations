# Cloud Run Deployment - Fixed Issues ✅

## Changes Made

### 1. **Port Configuration** ✅
- Added `ENV PORT=8080` in Dockerfile
- Updated `main.ts` to prioritize `process.env.PORT`
- Changed `app.listen()` to bind to `0.0.0.0` (required for Cloud Run)

### 2. **Database Connection** ✅
- Added retry logic (3 attempts) with 10-second timeout per attempt
- Added connection logging for debugging
- Prevents startup hang if database is slow

### 3. **Health Check Endpoints** ✅
- `GET /health` - Basic health check
- `GET /readiness` - Readiness probe for Cloud Run
- `GET /` - Root endpoint (existing)

## Quick Deploy

### Push changes and rebuild:

```powershell
# Commit changes
git add .
git commit -m "fix: Cloud Run deployment - port 8080, DB retry, health checks"
git push origin main

# Trigger Cloud Build (if connected to Git)
# OR manually build:
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/organizations
```

### Deploy to Cloud Run:

```powershell
gcloud run deploy organizations `
  --image gcr.io/YOUR_PROJECT_ID/organizations:latest `
  --platform managed `
  --region us-central1 `
  --port 8080 `
  --timeout 300 `
  --max-instances 10 `
  --set-env-vars "NODE_ENV=production,DATABASE_URL=YOUR_DB_URL" `
  --allow-unauthenticated
```

## Environment Variables Required

Make sure these are set in Cloud Run:

```bash
PORT=8080                    # Automatically set by Cloud Run
NODE_ENV=production
DATABASE_URL=mysql://...     # Your Google Cloud SQL connection string
```

### For Cloud SQL Connection:

If using Cloud SQL, add the connection:

```powershell
gcloud run deploy organizations `
  --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE_NAME `
  --set-env-vars "DATABASE_URL=mysql://USER:PASS@localhost/DB?socket=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"
```

## Troubleshooting

### Check logs:
```powershell
gcloud run services logs read organizations --limit 50
```

### Test health endpoint locally:
```powershell
docker run -p 8080:8080 --env-file .env organizations:latest
curl http://localhost:8080/health
```

### Common Issues:

1. **Database connection timeout**
   - ✅ Fixed: Added retry logic with timeout
   - Verify `DATABASE_URL` is correct
   - Check Cloud SQL instance is running

2. **Port not listening**
   - ✅ Fixed: Added `0.0.0.0` binding and `PORT=8080`
   - Cloud Run injects `PORT=8080` automatically

3. **Startup timeout**
   - ✅ Fixed: Added connection timeout (10s per attempt)
   - Increase Cloud Run timeout: `--timeout 300`

## Health Check Configuration (Optional)

Add to your Cloud Run service YAML:

```yaml
spec:
  template:
    spec:
      containers:
      - image: gcr.io/PROJECT_ID/organizations
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readiness
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

## What Was Fixed

| Issue | Solution |
|-------|----------|
| ❌ Container not listening on port | ✅ Added `ENV PORT=8080`, `0.0.0.0` binding |
| ❌ Database connection blocking startup | ✅ Added retry + timeout logic |
| ❌ No health check endpoint | ✅ Added `/health` and `/readiness` |
| ❌ Port priority incorrect | ✅ `process.env.PORT` now takes priority |

## Ready to Deploy! 🚀

Your app should now:
- ✅ Listen on port 8080
- ✅ Bind to 0.0.0.0 (Cloud Run compatible)
- ✅ Handle database connection issues gracefully
- ✅ Respond to health checks

Commit, push, and redeploy!
