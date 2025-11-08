# CORS Configuration for Development

## ✅ Current Configuration

The application is now configured to **allow ALL origins in development mode**.

### How It Works

1. **Development Mode** (Default)
   - When `NODE_ENV` is NOT set to `production`
   - Allows requests from ANY origin (localhost, ngrok, any IP)
   - No origin whitelist required
   - CORS headers: `Access-Control-Allow-Origin: *` or the requesting origin

2. **Production Mode**
   - When `NODE_ENV=production`
   - Requires `ALLOWED_ORIGINS` environment variable
   - Only whitelisted origins are allowed
   - Example: `ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com`

## 🚀 Running in Development

Just start the application normally - CORS is already open:

```powershell
npm run start:dev
```

The server will:
- Run on port 8080
- Allow requests from ANY origin
- Log allowed origins in console: `[DEV] CORS allowed for origin: http://localhost:3000`

## 🧪 Testing from Frontend

### React/Vue/Angular (localhost:3000)
```javascript
fetch('http://localhost:8080/organization/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // For cookies/auth
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
})
```

### From Ngrok/Tunnel
```bash
# Start ngrok
ngrok http 8080

# Use the ngrok URL from your frontend
fetch('https://abc123.ngrok.io/organization/api/v1/auth/login', {
  headers: {
    'ngrok-skip-browser-warning': 'true' // Already configured!
  }
})
```

### From Any Port
Works from ANY port:
- http://localhost:3000 ✅
- http://localhost:5173 ✅
- http://localhost:8081 ✅
- http://192.168.1.100:3000 ✅
- Any external URL ✅

## 🔐 Security Notes

### Development (Current)
- ⚠️ **All origins allowed** - Do NOT use this in production
- Credentials enabled for authentication
- Detailed logging of CORS requests

### Production
- 🔒 **Origin whitelist required** via `ALLOWED_ORIGINS`
- Blocks unauthorized origins
- Enhanced security headers (HSTS, CSP, etc.)
- Logs blocked requests

## 📝 Environment Variables

### Development (No variables needed)
```env
# NODE_ENV is NOT set to "production" (or not set at all)
# CORS will automatically allow all origins
```

### Production
```env
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend.com,https://admin.your-app.com
```

## 🐛 Troubleshooting

### Still Getting CORS Errors?

1. **Check the server logs**
   - You should see: `[DEV] CORS allowed for origin: <your-origin>`
   - If you see blocked warnings, check NODE_ENV

2. **Verify NODE_ENV**
   ```powershell
   # Should be empty or NOT "production"
   echo $env:NODE_ENV
   ```

3. **Clear browser cache**
   - CORS preflight responses are cached
   - Hard refresh: Ctrl+Shift+R

4. **Check request headers**
   - Browser DevTools → Network → Request Headers
   - Should see `Origin: http://localhost:3000` (or your URL)

5. **Verify credentials**
   - If using cookies/auth, ensure `credentials: 'include'` in fetch

## 📊 Allowed Headers (Already Configured)

The following headers are already whitelisted:
- Authorization (for JWT tokens)
- Content-Type
- X-Requested-With
- ngrok-skip-browser-warning (for ngrok tunnels)
- All proxy headers (X-Forwarded-*, X-Real-IP)
- Standard headers (Accept, User-Agent, etc.)

## ✨ What Changed

**Before**: Complex middleware with potential production checks
**Now**: Simple environment-based logic:
- Development → Allow all origins automatically
- Production → Validate against whitelist

All handled in `src/main.ts` lines 56-200.

## 🎯 Quick Reference

| Environment | CORS Policy | Origins Allowed |
|------------|-------------|-----------------|
| Development | Open | ALL (*) |
| Production | Strict | Whitelist only |

**Current Mode**: Development (allows all origins) ✅
