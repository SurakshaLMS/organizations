-- CreateTable
CREATE TABLE `sync_log` (
    `syncId` BIGINT NOT NULL AUTO_INCREMENT,
    `tableName` VARCHAR(50) NOT NULL,
    `recordId` VARCHAR(50) NOT NULL,
    `syncType` VARCHAR(20) NOT NULL,
    `sourceData` TEXT NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `syncedBy` VARCHAR(100) NULL,

    INDEX `sync_log_tableName_idx`(`tableName`),
    INDEX `sync_log_syncedAt_idx`(`syncedAt`),
    PRIMARY KEY (`syncId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
