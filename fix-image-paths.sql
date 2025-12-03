-- ====================================================================
-- FIX IMAGE PATHS - Add folder prefix to old relative paths
-- ====================================================================
-- This fixes images that were stored without folder prefix
-- Before: "profile-xxx.jpg"
-- After: "cause-images/profile-xxx.jpg"

-- Check current paths without folder prefix
SELECT 
    'Causes - Paths without folder prefix' as 'Check',
    causeId,
    title,
    imageUrl
FROM org_causes
WHERE imageUrl IS NOT NULL 
  AND imageUrl NOT LIKE 'http%'  -- Not full URLs
  AND imageUrl NOT LIKE '%/%'    -- No folder separator
LIMIT 20;

-- FIX: Add cause-images/ prefix to paths without folder structure
UPDATE org_causes 
SET imageUrl = CONCAT('cause-images/', imageUrl)
WHERE imageUrl IS NOT NULL 
  AND imageUrl NOT LIKE 'http%'       -- Not full URLs
  AND imageUrl NOT LIKE '%/%'         -- No folder separator
  AND imageUrl != '';

-- Verify the fix
SELECT 
    'After Fix - All cause images' as 'Check',
    causeId,
    title,
    imageUrl
FROM org_causes
WHERE imageUrl IS NOT NULL
LIMIT 10;
