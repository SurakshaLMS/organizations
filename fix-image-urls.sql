-- ====================================================================
-- FIX IMAGE URLs - Update old S3 URLs to use custom domain
-- ====================================================================

-- Check current URLs in causes table
SELECT 
    'Causes - Current URLs' as 'Check',
    id,
    title,
    imageUrl,
    introVideoUrl
FROM org_causes
WHERE imageUrl IS NOT NULL 
   OR introVideoUrl IS NOT NULL
LIMIT 10;

-- Check current URLs in organizations table
SELECT 
    'Organizations - Current URLs' as 'Check',
    id,
    name,
    imageUrl
FROM org_organizations
WHERE imageUrl IS NOT NULL
LIMIT 10;

-- Check current URLs in lectures table
SELECT 
    'Lectures - Current URLs' as 'Check',
    id,
    title,
    coverUrl,
    liveLink,
    recordingUrl
FROM org_lectures
WHERE coverUrl IS NOT NULL
   OR liveLink IS NOT NULL
   OR recordingUrl IS NOT NULL
LIMIT 10;

-- Check current URLs in documentation table
SELECT 
    'Documentation - Current URLs' as 'Check',
    id,
    docUrl
FROM org_documentation
WHERE docUrl IS NOT NULL
LIMIT 10;

-- ====================================================================
-- UPDATE QUERIES (Run only after reviewing above results)
-- ====================================================================

-- Update old AWS S3 URLs to use custom domain in causes
-- UPDATE org_causes 
-- SET imageUrl = REPLACE(imageUrl, 
--     'https://suraksha-lms-main-bucket.s3.us-east-1.amazonaws.com', 
--     'https://storage.suraksha.lk')
-- WHERE imageUrl LIKE '%suraksha-lms-main-bucket.s3.%';

-- UPDATE org_causes 
-- SET introVideoUrl = REPLACE(introVideoUrl, 
--     'https://suraksha-lms-main-bucket.s3.us-east-1.amazonaws.com', 
--     'https://storage.suraksha.lk')
-- WHERE introVideoUrl LIKE '%suraksha-lms-main-bucket.s3.%';

-- Update old AWS S3 URLs in organizations
-- UPDATE org_organizations 
-- SET imageUrl = REPLACE(imageUrl, 
--     'https://suraksha-lms-main-bucket.s3.us-east-1.amazonaws.com', 
--     'https://storage.suraksha.lk')
-- WHERE imageUrl LIKE '%suraksha-lms-main-bucket.s3.%';

-- Update old AWS S3 URLs in lectures
-- UPDATE org_lectures 
-- SET coverUrl = REPLACE(coverUrl, 
--     'https://suraksha-lms-main-bucket.s3.us-east-1.amazonaws.com', 
--     'https://storage.suraksha.lk')
-- WHERE coverUrl LIKE '%suraksha-lms-main-bucket.s3.%';

-- UPDATE org_lectures 
-- SET recordingUrl = REPLACE(recordingUrl, 
--     'https://suraksha-lms-main-bucket.s3.us-east-1.amazonaws.com', 
--     'https://storage.suraksha.lk')
-- WHERE recordingUrl LIKE '%suraksha-lms-main-bucket.s3.%';

-- Update old AWS S3 URLs in documentation
-- UPDATE org_documentation 
-- SET docUrl = REPLACE(docUrl, 
--     'https://suraksha-lms-main-bucket.s3.us-east-1.amazonaws.com', 
--     'https://storage.suraksha.lk')
-- WHERE docUrl LIKE '%suraksha-lms-main-bucket.s3.%';
