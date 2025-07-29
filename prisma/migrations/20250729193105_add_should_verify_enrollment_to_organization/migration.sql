-- AlterTable
ALTER TABLE `organization` ADD COLUMN `shouldVerifyEnrollment` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `organization_shouldVerifyEnrollment_idx` ON `organization`(`shouldVerifyEnrollment`);
