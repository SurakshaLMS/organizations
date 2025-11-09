# Fix CORS for Lovable.app Frontend

## ❌ Current Problem

```
Access to fetch at 'https://organizations-923357517997.europe-west1.run.app/organization/api/v1/auth/login' 
from origin 'https://id-preview--ea005849-ee8b-421d-b766-ce5e23eea597.lovable.app' 
has been blocked by CORS policy
```

**Root Cause**: Your Cloud Run service is running in production mode (`NODE_ENV=production`) and the Lovable.app origin is not in the `ALLOWED_ORIGINS` whitelist.

## ✅ Solution: Update Cloud Run Environment Variables

You need to add your Lovable.app domain to the `ALLOWED_ORIGINS` environment variable in Cloud Run.

### Step 1: Update Cloud Run with Lovable.app Origin

Run this command in PowerShell:

```powershell
gcloud run services update organizations `
  --region=europe-west1 `
  --set-env-vars "ALLOWED_ORIGINS=https://id-preview--ea005849-ee8b-421d-b766-ce5e23eea597.lovable.app,http://localhost:8080" `
  --project=earnest-radio-475808-j8
```

**Note**: This adds **both** your Lovable.app domain and localhost for testing.

### Step 2: Verify the Update

```powershell
gcloud run services describe organizations `
  --region=europe-west1 `
  --project=earnest-radio-475808-j8 `
  --format="value(spec.template.spec.containers[0].env)"
```

Look for `ALLOWED_ORIGINS` in the output.

### Step 3: Test from Your Frontend

Wait 1-2 minutes for the deployment to complete, then test from your Lovable.app:

```javascript
fetch('https://organizations-923357517997.europe-west1.run.app/organization/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

## 🔄 For Multiple Lovable.app Previews

If you have multiple preview URLs or will create new ones, add them all comma-separated:

```powershell
gcloud run services update organizations `
  --region=europe-west1 `
  --set-env-vars "ALLOWED_ORIGINS=https://id-preview--ea005849-ee8b-421d-b766-ce5e23eea597.lovable.app,https://another-preview.lovable.app,http://localhost:8080" `
  --project=earnest-radio-475808-j8
```

## 🌐 For Production Domain

When you have a custom domain, add it:

```powershell
gcloud run services update organizations `
  --region=europe-west1 `
  --set-env-vars "ALLOWED_ORIGINS=https://your-production-domain.com,https://id-preview--ea005849-ee8b-421d-b766-ce5e23eea597.lovable.app,http://localhost:8080" `
  --project=earnest-radio-475808-j8
```

## 🔓 Alternative: Allow All Origins (Development Only)

**WARNING**: Only use this for development/testing, NOT production!

To temporarily allow all origins:

```powershell
# Remove or empty the ALLOWED_ORIGINS
gcloud run services update organizations `
  --region=europe-west1 `
  --remove-env-vars ALLOWED_ORIGINS `
  --project=earnest-radio-475808-j8
```

With an empty `ALLOWED_ORIGINS`, the code will default to allowing all origins in production (but this is NOT recommended for security).

## 📋 Current Configuration Understanding

Your code in `src/main.ts` works like this:

```typescript
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

app.enableCors({
  origin: isProduction && allowedOrigins.length > 0 
    ? allowedOrigins  // Production: Use whitelist
    : true,           // Development: Allow all origins
});
```

**Since Cloud Run sets `NODE_ENV=production` by default**, it's checking the `ALLOWED_ORIGINS` whitelist.

## 🎯 Quick Command Reference

| Action | Command |
|--------|---------|
| **Add Lovable origin** | `gcloud run services update organizations --region=europe-west1 --set-env-vars "ALLOWED_ORIGINS=https://id-preview--ea005849-ee8b-421d-b766-ce5e23eea597.lovable.app" --project=earnest-radio-475808-j8` |
| **View current env vars** | `gcloud run services describe organizations --region=europe-west1 --project=earnest-radio-475808-j8` |
| **Remove ALLOWED_ORIGINS** | `gcloud run services update organizations --region=europe-west1 --remove-env-vars ALLOWED_ORIGINS --project=earnest-radio-475808-j8` |

## ✅ Verification Checklist

After updating:

- [ ] Command executed successfully
- [ ] Wait 1-2 minutes for Cloud Run to redeploy
- [ ] Test login from Lovable.app frontend
- [ ] Check browser Network tab - should see 200 OK (not 403)
- [ ] Verify `Access-Control-Allow-Origin` header is present in response

## 🐛 Still Having Issues?

1. **Check Cloud Run logs**:
   ```powershell
   gcloud run services logs read organizations `
     --region=europe-west1 `
     --project=earnest-radio-475808-j8 `
     --limit=50
   ```
   Look for: `[SECURITY] CORS request blocked for origin:`

2. **Verify exact URL match**:
   - The origin must match EXACTLY (https vs http, port, subdomain)
   - Check browser DevTools → Network → Request Headers → Origin

3. **Check for typos**:
   - Ensure no extra spaces in the ALLOWED_ORIGINS value
   - Comma-separated, no quotes around individual URLs

## 📱 For Dynamic Lovable Previews

Lovable.app creates unique preview URLs. Options:

1. **Add wildcard support** (requires code change)
2. **Use pattern matching** (requires code change)
3. **Add each preview URL manually** (current solution)
4. **Use a reverse proxy** with permissive CORS in development

For now, option 3 is the quickest fix.
