-- Add isActive field to Causes table
ALTER TABLE `org_causes` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true AFTER `isPublic`;
CREATE INDEX `org_causes_isActive_idx` ON `org_causes`(`isActive`);

-- Add isActive field to Lectures table  
ALTER TABLE `org_lectures` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true AFTER `isPublic`;
CREATE INDEX `org_lectures_isActive_idx` ON `org_lectures`(`isActive`);

-- Add isActive field to Documentation table
ALTER TABLE `org_documentation` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true AFTER `docUrl`;
CREATE INDEX `org_documentation_isActive_idx` ON `org_documentation`(`isActive`);
