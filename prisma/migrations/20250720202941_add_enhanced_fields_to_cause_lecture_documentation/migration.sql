-- AlterTable
ALTER TABLE `cause` ADD COLUMN `introVideoUrl` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `documentation` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `docUrl` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `lecture` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `liveLink` VARCHAR(500) NULL,
    ADD COLUMN `liveMode` VARCHAR(50) NULL,
    ADD COLUMN `mode` VARCHAR(50) NULL,
    ADD COLUMN `recordingUrl` VARCHAR(500) NULL,
    ADD COLUMN `timeEnd` DATETIME(3) NULL,
    ADD COLUMN `timeStart` DATETIME(3) NULL,
    ADD COLUMN `venue` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `lecture_timeStart_idx` ON `lecture`(`timeStart`);

-- CreateIndex
CREATE INDEX `lecture_mode_idx` ON `lecture`(`mode`);
