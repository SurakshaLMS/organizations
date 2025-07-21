/*
  Warnings:

  - You are about to drop the column `activatedDate` on the `institute_users` table. All the data in the column will be lost.
  - You are about to drop the column `assignedBy` on the `institute_users` table. All the data in the column will be lost.
  - You are about to drop the column `assignedDate` on the `institute_users` table. All the data in the column will be lost.
  - You are about to drop the column `deactivatedDate` on the `institute_users` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `institute_users` table. All the data in the column will be lost.
  - You are about to drop the `user_auth` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `institute_users` DROP FOREIGN KEY `institute_users_assignedBy_fkey`;

-- DropForeignKey
ALTER TABLE `user_auth` DROP FOREIGN KEY `user_auth_userId_fkey`;

-- AlterTable
ALTER TABLE `institute_users` DROP COLUMN `activatedDate`,
    DROP COLUMN `assignedBy`,
    DROP COLUMN `assignedDate`,
    DROP COLUMN `deactivatedDate`,
    DROP COLUMN `notes`;

-- DropTable
DROP TABLE `user_auth`;
