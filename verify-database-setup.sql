-- ====================================================================
-- DATABASE SETUP VERIFICATION
-- Run this to verify your database is properly configured
-- ====================================================================

-- Check MySQL SQL Mode
SELECT 
    '=== MySQL Configuration ===' as 'Check',
    @@SESSION.sql_mode as 'Session SQL Mode',
    CASE 
        WHEN @@SESSION.sql_mode LIKE '%NO_ZERO_DATE%' 
             AND @@SESSION.sql_mode LIKE '%NO_ZERO_IN_DATE%'
        THEN '✓ CONFIGURED'
        ELSE '✗ NOT CONFIGURED'
    END as 'Status';

-- Check all tables exist
SELECT 
    '=== Tables Check ===' as 'Check',
    TABLE_NAME as 'Table Name',
    TABLE_ROWS as 'Row Count',
    CREATE_TIME as 'Created At'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'org_organizations',
    'org_organization_users',
    'org_causes',
    'org_lectures',
    'org_assignments',
    'org_documentation',
    'users',
    'institutes',
    'institute_user'
  )
ORDER BY TABLE_NAME;

-- Check datetime columns configuration
SELECT 
    '=== Datetime Columns ===' as 'Check',
    TABLE_NAME as 'Table',
    COLUMN_NAME as 'Column',
    COLUMN_DEFAULT as 'Default Value',
    IS_NULLABLE as 'Nullable',
    EXTRA as 'Extra'
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND DATA_TYPE IN ('datetime', 'timestamp')
  AND TABLE_NAME IN (
    'org_organizations',
    'org_organization_users',
    'org_causes',
    'org_lectures',
    'org_assignments',
    'org_documentation',
    'users',
    'institutes',
    'institute_user'
  )
ORDER BY TABLE_NAME, COLUMN_NAME;

-- Check for any invalid datetime values
SELECT 
    '=== Invalid Dates Check ===' as 'Check',
    'org_organizations' as 'Table',
    COUNT(*) as 'Invalid Count'
FROM org_organizations 
WHERE createdAt IS NULL 
   OR createdAt = '0000-00-00 00:00:00'
   OR updatedAt IS NULL 
   OR updatedAt = '0000-00-00 00:00:00'
UNION ALL
SELECT 
    'org_organization_users',
    COUNT(*)
FROM org_organization_users 
WHERE createdAt IS NULL 
   OR createdAt = '0000-00-00 00:00:00'
   OR updatedAt IS NULL 
   OR updatedAt = '0000-00-00 00:00:00'
UNION ALL
SELECT 
    'users',
    COUNT(*)
FROM users 
WHERE created_at IS NULL 
   OR created_at = '0000-00-00 00:00:00'
   OR updated_at IS NULL 
   OR updated_at = '0000-00-00 00:00:00';

-- Summary
SELECT 
    '=== Setup Summary ===' as 'Summary',
    CASE 
        WHEN @@SESSION.sql_mode LIKE '%NO_ZERO_DATE%' THEN '✓'
        ELSE '✗'
    END as 'MySQL Config',
    (SELECT COUNT(*) FROM information_schema.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME LIKE 'org_%') as 'Org Tables',
    (SELECT COUNT(*) FROM users) as 'Total Users',
    (SELECT COUNT(*) FROM org_organizations) as 'Total Orgs',
    NOW() as 'Verified At';
