/*
  Warnings:

  - You are about to drop the `sync_log` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `institute` ADD COLUMN `lastSyncAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `institute_users` ADD COLUMN `lastSyncAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `lastSyncAt` DATETIME(3) NULL;

-- DropTable
DROP TABLE `sync_log`;
