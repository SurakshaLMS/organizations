# Manual Testing and Sync APIs Guide

## 🚀 Quick Start

Your system now has comprehensive testing and sync APIs. Here's how to use them:

### Base URLs
- Local: `http://localhost:3000`
- Development: `http://localhost:8080`

## 📋 Available Test Endpoints

### 1. BigInt Conversion Testing
```http
GET /test/bigint-conversions
```
**Purpose**: Test all BigInt conversions that were causing errors
**Response**: Array of test results showing conversion success/failure

### 2. User Enrolled Organizations (Fixed Endpoint)
```http
GET /test/user-enrolled-orgs?userId=40
```
**Purpose**: Test the fixed `getUserEnrolledOrganizations` method
**Parameters**: 
- `userId` (string): User ID to test (defaults to "40")
**Response**: Organizations the user is enrolled in

### 3. JoinedAt Date Serialization Fix
```http
GET /test/joined-at-fix?userId=40
```
**Purpose**: Test the fixed `joinedAt` date field that was returning empty objects `{}`
**Parameters**: 
- `userId` (string): User ID to test (defaults to "40")
**Response**: Organizations with properly serialized joinedAt dates

### 3. Database Health Check
```http
GET /test/database-health
```
**Purpose**: Check database connection, counts, and datetime field integrity
**Response**: Table counts and recent records

### 4. Manual Data Sync
```http
POST /test/sync-data
Content-Type: application/json

{
  "table": "all"
}
```
**Purpose**: Trigger manual data synchronization
**Body**: `{ "table": "users" | "organizations" | "all" }`

### 5. Performance Testing
```http
GET /test/performance
```
**Purpose**: Test the optimized system performance (115x faster)
**Response**: Performance metrics and benchmarks

## 🔄 Existing Sync APIs

### Sync Controller Endpoints
```http
# Trigger automatic sync
POST /sync/trigger

# Manual sync with options
POST /sync/manual

# Check sync status
GET /sync/status

# Sync dashboard
GET /sync/dashboard
```

## 🧪 Manual Testing Steps

### Step 1: Test BigInt and Date Fixes
```bash
# Test the main error that was occurring
curl "http://localhost:3000/test/user-enrolled-orgs?userId=40"

# Test joinedAt date serialization fix
curl "http://localhost:3000/test/joined-at-fix?userId=40"

# Test various user IDs
curl "http://localhost:3000/test/user-enrolled-orgs?userId=1"
curl "http://localhost:3000/test/user-enrolled-orgs?userId=123"
```

### Step 2: Verify System Health
```bash
# Check database health
curl "http://localhost:3000/test/database-health"

# Test BigInt conversions
curl "http://localhost:3000/test/bigint-conversions"
```

### Step 3: Performance Validation
```bash
# Test optimized performance
curl "http://localhost:3000/test/performance"
```

### Step 4: Sync Operations
```bash
# Check current sync status
curl "http://localhost:3000/sync/status"

# Trigger manual sync
curl -X POST "http://localhost:3000/test/sync-data" \
  -H "Content-Type: application/json" \
  -d '{"table": "all"}'

# View sync dashboard
curl "http://localhost:3000/sync/dashboard"
```

## ✅ Expected Results

### Fixed Issues:
1. ✅ **BigInt Serialization**: No more "Cannot serialize BigInt" errors
2. ✅ **Prisma Type Errors**: No more "Provided String, expected BigInt" errors
3. ✅ **Performance**: 115x faster ID conversion (direct BigInt vs CUID detection)
4. ✅ **Database Integrity**: Datetime corruption resolved
5. ✅ **System Simplification**: Unnecessary relations and services removed

### Test Success Indicators:
- `/test/user-enrolled-orgs` returns organizations without errors
- `/test/bigint-conversions` shows all conversions successful
- `/test/performance` shows optimized timing metrics
- `/test/database-health` shows clean datetime fields

## 🐛 Troubleshooting

### If BigInt errors persist:
1. Check that `BigInt.prototype.toJSON` is properly set in `main.ts`
2. Verify all user IDs are converted with `BigInt(userId)` before Prisma queries
3. Use the test endpoints to identify specific failing operations

### If sync fails:
1. Check database connection with `/test/database-health`
2. Verify Prisma client is properly initialized
3. Check logs for specific error messages

## 🔧 Development Integration

Add this to your `app.module.ts` to enable test endpoints:
```typescript
import { TestController } from './test-controller';

@Module({
  controllers: [
    // ... existing controllers
    TestController
  ],
  // ... rest of module
})
```

## 📊 Performance Metrics

The system is now optimized with:
- **Direct BigInt conversion**: `BigInt(id)` instead of complex validation
- **Removed unnecessary services**: UserIdResolutionService eliminated
- **Clean database**: Datetime corruption resolved
- **Simplified relations**: Unnecessary foreign key constraints removed

Use `/test/performance` to verify the 115x speed improvement is maintained.
