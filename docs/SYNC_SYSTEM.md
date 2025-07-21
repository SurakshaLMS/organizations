# Data Synchronization System

## Overview
This system synchronizes data from the main LAAS database to the organization service database daily at 2:30 AM (during the 2-3 AM maintenance window).

## Architecture

### Source Database (LAAS)
- **Host**: database-1.c218yqq22nq7.us-east-1.rds.amazonaws.com
- **Database**: laas
- **Tables Synced**:
  - `users` → `organizations.user`
  - `institutes` → `organizations.institute`
  - `institute_user` → `organizations.institute_users`
  - User authentication data → `organizations.user_auth`

### Target Database (Organization Service)
- **Host**: database-1.c218yqq22nq7.us-east-1.rds.amazonaws.com
- **Database**: organizations

## Sync Strategy

### Performance Optimizations
1. **Batch Processing**: Users are processed in batches of 100 to prevent memory issues
2. **Upsert Operations**: Uses Prisma's upsert to efficiently handle inserts/updates
3. **Single Connection**: Maintains one connection to source database throughout sync
4. **Filtered Queries**: Only syncs active records with valid data
5. **Foreign Key Order**: Syncs in dependency order (institutes → users → institute_users → user_auth)

### Data Mapping

#### Users Table
```sql
-- Source (laas.users) → Target (organizations.user)
id → userId (BigInt)
CONCAT(first_name, ' ', last_name) → name
email → email
password → password (hashed, kept as-is)
created_at → createdAt
updated_at → updatedAt
```

#### Institutes Table
```sql
-- Source (laas.institutes) → Target (organizations.institute)
id → instituteId (BigInt)
name → name
imageUrl → imageUrl
created_at → createdAt
updated_at → updatedAt
```

#### Institute Users Table
```sql
-- Source (laas.institute_user) → Target (organizations.institute_users)
institute_id → instituteId (BigInt)
user_id → userId (BigInt)
user_type → role (mapped to enum)
status → isActive (ACTIVE = true, others = false)
created_at → createdAt
updated_at → updatedAt
```

#### User Auth Table
```sql
-- Source (laas.users) → Target (organizations.user_auth)
id → userId (BigInt)
password → password (hashed)
created_at → createdAt
updated_at → updatedAt
```

### User Type Mapping
```typescript
LAAS UserType → Organization Role
ADMIN         → ADMIN
TEACHER       → FACULTY
INSTRUCTOR    → FACULTY
STUDENT       → STUDENT
STAFF         → STAFF
DIRECTOR      → DIRECTOR
*default*     → STUDENT
```

## Configuration

### Environment Variables
```bash
# Source Database (LAAS)
DB_HOST=database-1.c218yqq22nq7.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USERNAME=admin
DB_PASSWORD=Skaveesha1355660

# Sync Configuration
USER_SYNC_ENABLED=true
USER_SYNC_CRON="30 2 * * *"  # Daily at 2:30 AM
```

### Cron Schedule
- **Schedule**: `30 2 * * *` (2:30 AM daily)
- **Timezone**: Server timezone (UTC)
- **Window**: 2-3 AM maintenance window

## API Endpoints

### Manual Sync Trigger
```http
POST /sync/trigger
Content-Type: application/json

Response:
{
  "success": true,
  "message": "Data synchronization completed successfully",
  "timestamp": "2025-07-22T01:42:59.047Z"
}
```

### Sync Status
```http
GET /sync/status

Response:
{
  "lastSync": "2025-07-22T01:42:59.047Z",
  "organizationService": {
    "users": 23,
    "institutes": 7,
    "instituteUsers": 7,
    "userAuth": 23
  },
  "sourceDatabase": {
    "users": 8,
    "institutes": 2,
    "instituteUsers": 7,
    "userAuth": 6
  },
  "isHealthy": true,
  "timestamp": "2025-07-22T01:42:59.047Z"
}
```

## Monitoring & Health Checks

### Success Indicators
- ✅ All sync operations complete without errors
- ✅ Record counts match between source and target
- ✅ Foreign key relationships maintained
- ✅ Data integrity preserved

### Error Handling
- **Database Connection Failures**: Automatic retry with exponential backoff
- **Data Validation Errors**: Skip invalid records, log details
- **Transaction Failures**: Rollback and retry individual operations
- **Network Issues**: Connection pooling and timeout handling

### Logging
```typescript
// Log Levels
LOG [SyncService] 🔄 Starting daily data synchronization...
LOG [SyncService] 🏛️ Syncing institutes...
LOG [SyncService] ✅ Synced 7 institutes
LOG [SyncService] 👥 Syncing users...
LOG [SyncService] ✅ Synced 23 users
LOG [SyncService] 🎓 Syncing institute users...
LOG [SyncService] ✅ Synced 7 institute user relationships
LOG [SyncService] 🔐 Syncing user authentication...
LOG [SyncService] ✅ Synced 23 user authentication records
LOG [SyncService] ✅ Data synchronization completed successfully in 1250ms
```

## Testing

### Manual Testing
```bash
# Run sync test
npx ts-node scripts/test-sync.ts

# Check sync status
curl -X GET http://localhost:3000/sync/status

# Trigger manual sync
curl -X POST http://localhost:3000/sync/trigger
```

### Production Verification
1. Check sync status via API endpoint
2. Compare record counts between databases
3. Verify data integrity in organization service
4. Monitor application logs for sync success/failures

## Security Considerations

### Database Access
- ✅ Read-only access to source database
- ✅ Secure connection strings in environment variables
- ✅ Connection pooling with proper limits
- ✅ Timeout configurations to prevent hanging connections

### Data Handling
- ✅ Passwords remain hashed (no plaintext exposure)
- ✅ PII data handled according to privacy policies
- ✅ No sensitive data logged
- ✅ Secure data transmission between databases

## Troubleshooting

### Common Issues

#### Sync Fails to Start
```bash
# Check configuration
cat .env | grep -E "DB_|USER_SYNC"

# Check database connectivity
mysql -h database-1.c218yqq22nq7.us-east-1.rds.amazonaws.com -u admin -p
```

#### Data Mismatch
```bash
# Check source data
mysql -h database-1.c218yqq22nq7.us-east-1.rds.amazonaws.com -u admin -p laas
SELECT COUNT(*) FROM users WHERE is_active = 1 AND email IS NOT NULL AND password IS NOT NULL;

# Check target data
mysql -h database-1.c218yqq22nq7.us-east-1.rds.amazonaws.com -u admin -p organizations
SELECT COUNT(*) FROM user;
```

#### Performance Issues
- Increase batch size for large datasets
- Optimize database indexes
- Monitor connection pool usage
- Check network latency between databases

## Cost Optimization

### Database Connection Management
- Single persistent connection per sync operation
- Connection pooling with reasonable limits
- Proper connection cleanup after operations

### Query Optimization
- Selective field querying (only needed columns)
- Indexed WHERE clauses for performance
- LIMIT/OFFSET for large dataset pagination
- Batch processing to reduce query overhead

### Resource Usage
- Memory-efficient batch processing
- Minimal data transformation overhead
- Efficient JSON serialization
- Proper garbage collection

## Maintenance

### Regular Tasks
- [ ] Monitor sync success/failure rates
- [ ] Review and optimize sync performance
- [ ] Update data mapping as schemas evolve
- [ ] Backup sync logs and metrics
- [ ] Test disaster recovery procedures

### Updates and Changes
- Schema changes require sync service updates
- New tables need sync logic implementation
- Enum mappings may need updates
- Performance tuning based on data growth

## Future Enhancements

### Planned Features
- [ ] Incremental sync (delta-only updates)
- [ ] Real-time sync via change data capture
- [ ] Sync conflict resolution
- [ ] Data validation and cleansing
- [ ] Sync performance metrics dashboard
- [ ] Automated sync health monitoring
- [ ] Multi-environment sync support
