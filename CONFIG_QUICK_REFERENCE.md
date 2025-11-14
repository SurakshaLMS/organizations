# 🔧 Configuration Quick Reference

## New Customizable Variables (Add to your .env)

```env
# ============================================================================
# CORS CONFIGURATION - Now fully customizable!
# ============================================================================
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400  # 24 hours in seconds

# ============================================================================
# PAGINATION LIMITS - DoS Protection (Now customizable!)
# ============================================================================
MAX_PAGINATION_LIMIT=100    # Max items per page
MAX_PAGE_NUMBER=1000        # Max page number allowed
MAX_SEARCH_LENGTH=200       # Max search query length
MAX_OFFSET=100000          # Max offset for pagination

# ============================================================================
# REQUEST LIMITS - DoS Protection (Now customizable!)
# ============================================================================
REQUEST_SIZE_LIMIT=10mb     # Max request body size
MAX_FILES_PER_REQUEST=10    # Max files per upload
```

## Common Configuration Scenarios

### Scenario 1: Production (Strict Security)
```env
NODE_ENV=production
MAX_PAGINATION_LIMIT=50
MAX_PAGE_NUMBER=500
MAX_SEARCH_LENGTH=100
REQUEST_SIZE_LIMIT=5mb
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=https://yourdomain.com
```

### Scenario 2: Development (Relaxed)
```env
NODE_ENV=development
MAX_PAGINATION_LIMIT=100
MAX_PAGE_NUMBER=1000
MAX_SEARCH_LENGTH=200
REQUEST_SIZE_LIMIT=10mb
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=  # Empty = allow all
```

### Scenario 3: Admin API (Higher Limits)
```env
MAX_PAGINATION_LIMIT=500
MAX_PAGE_NUMBER=2000
REQUEST_SIZE_LIMIT=50mb
```

### Scenario 4: Public API (Lower Limits)
```env
MAX_PAGINATION_LIMIT=20
MAX_PAGE_NUMBER=100
MAX_SEARCH_LENGTH=50
REQUEST_SIZE_LIMIT=1mb
```

## How to Apply Changes

1. **Edit `.env` file** with your desired values
2. **Restart application** (changes take effect on startup)
3. **No code changes needed!**

```powershell
# Stop current instance
# Edit .env
# Restart
npm run start:dev
```

## Validation Rules

All limits have safe defaults and validation:
- `MAX_PAGINATION_LIMIT`: 1-500 (default: 100)
- `MAX_PAGE_NUMBER`: 1-10000 (default: 1000)
- `MAX_SEARCH_LENGTH`: 1-1000 (default: 200)
- `MAX_OFFSET`: 1-1000000 (default: 100000)

## Testing Your Configuration

```bash
# Test pagination limit
curl "http://localhost:8080/api/organizations?limit=150"
# Should cap at MAX_PAGINATION_LIMIT

# Test search length
curl "http://localhost:8080/api/organizations?search=verylongsearchquery..."
# Should truncate at MAX_SEARCH_LENGTH

# Test CORS
curl -X OPTIONS http://localhost:8080/api/organizations \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST"
# Should return configured CORS headers
```

## Files Modified

- ✅ `src/config/app.config.ts` - Added 9 new config options
- ✅ `src/main.ts` - CORS now reads from config
- ✅ `src/common/dto/pagination.dto.ts` - Limits now read from env

## Backup & Rollback

```powershell
# Backup created automatically
.env.backup  # Your original configuration

# Rollback if needed
Copy-Item .env.backup .env
```

---

**Need help?** Check `HARDCODING_FIXES_COMPLETE.md` for detailed documentation.
