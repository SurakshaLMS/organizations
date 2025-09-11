/*
  Warnings:

  - You are about to drop the `assignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cause` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documentation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `institute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `institute_users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lecture` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization_users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `assignment` DROP FOREIGN KEY `assignment_causeId_fkey`;

-- DropForeignKey
ALTER TABLE `cause` DROP FOREIGN KEY `cause_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `documentation` DROP FOREIGN KEY `documentation_lectureId_fkey`;

-- DropForeignKey
ALTER TABLE `institute_users` DROP FOREIGN KEY `institute_users_instituteId_fkey`;

-- DropForeignKey
ALTER TABLE `institute_users` DROP FOREIGN KEY `institute_users_userId_fkey`;

-- DropForeignKey
ALTER TABLE `lecture` DROP FOREIGN KEY `lecture_causeId_fkey`;

-- DropForeignKey
ALTER TABLE `organization` DROP FOREIGN KEY `organization_instituteId_fkey`;

-- DropForeignKey
ALTER TABLE `organization_users` DROP FOREIGN KEY `organization_users_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `organization_users` DROP FOREIGN KEY `organization_users_userId_fkey`;

-- DropTable
DROP TABLE `assignment`;

-- DropTable
DROP TABLE `cause`;

-- DropTable
DROP TABLE `documentation`;

-- DropTable
DROP TABLE `institute`;

-- DropTable
DROP TABLE `institute_users`;

-- DropTable
DROP TABLE `lecture`;

-- DropTable
DROP TABLE `organization`;

-- DropTable
DROP TABLE `organization_users`;

-- DropTable
DROP TABLE `user`;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(500) NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NULL,
    `phone_number` VARCHAR(20) NULL,
    `date_of_birth` DATE NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    `nic` VARCHAR(20) NULL,
    `birth_certificate_no` VARCHAR(50) NULL,
    `address_line1` TEXT NULL,
    `address_line2` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `province` VARCHAR(100) NULL,
    `postal_code` VARCHAR(20) NULL,
    `country` VARCHAR(100) NULL,
    `subscription_plan` VARCHAR(191) NULL,
    `payment_expires_at` DATETIME(3) NULL,
    `image_url` VARCHAR(255) NULL,
    `id_url` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_nic_key`(`nic`),
    UNIQUE INDEX `users_birth_certificate_no_key`(`birth_certificate_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `institutes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL,
    `pin_code` VARCHAR(20) NULL,
    `type` ENUM('school', 'tuition_institute', 'online_academy', 'pre_school', 'other') NOT NULL DEFAULT 'school',
    `imageUrl` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `institutes_code_key`(`code`),
    UNIQUE INDEX `institutes_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `institute_user` (
    `institute_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'FORMER', 'INVITED') NOT NULL DEFAULT 'PENDING',
    `user_id_institue` VARCHAR(50) NULL,
    `verified_by` BIGINT NULL,
    `verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `institute_users_userId_fkey`(`user_id`),
    PRIMARY KEY (`institute_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `org_organizations` (
    `organizationId` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM('INSTITUTE', 'GLOBAL') NOT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `enrollmentKey` VARCHAR(255) NULL,
    `needEnrollmentVerification` BOOLEAN NOT NULL DEFAULT true,
    `enabledEnrollments` BOOLEAN NOT NULL DEFAULT true,
    `imageUrl` VARCHAR(500) NULL,
    `instituteId` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `org_organizations_type_idx`(`type`),
    INDEX `org_organizations_isPublic_idx`(`isPublic`),
    INDEX `org_organizations_instituteId_idx`(`instituteId`),
    PRIMARY KEY (`organizationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `org_organization_users` (
    `organizationId` BIGINT NOT NULL,
    `userId` BIGINT NOT NULL,
    `role` ENUM('MEMBER', 'MODERATOR', 'ADMIN', 'PRESIDENT') NOT NULL DEFAULT 'MEMBER',
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verifiedBy` BIGINT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `org_organization_users_role_idx`(`role`),
    INDEX `org_organization_users_isVerified_idx`(`isVerified`),
    INDEX `organization_users_userId_fkey`(`userId`),
    PRIMARY KEY (`organizationId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `org_causes` (
    `causeId` BIGINT NOT NULL AUTO_INCREMENT,
    `organizationId` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `introVideoUrl` VARCHAR(500) NULL,
    `imageUrl` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `org_causes_organizationId_idx`(`organizationId`),
    INDEX `org_causes_isPublic_idx`(`isPublic`),
    PRIMARY KEY (`causeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `org_lectures` (
    `lectureId` BIGINT NOT NULL AUTO_INCREMENT,
    `causeId` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NULL,
    `description` TEXT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `liveLink` VARCHAR(500) NULL,
    `liveMode` VARCHAR(50) NULL,
    `mode` VARCHAR(50) NULL,
    `recordingUrl` VARCHAR(500) NULL,
    `timeEnd` DATETIME(3) NULL,
    `timeStart` DATETIME(3) NULL,
    `venue` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `org_lectures_causeId_idx`(`causeId`),
    INDEX `org_lectures_isPublic_idx`(`isPublic`),
    INDEX `org_lectures_timeStart_idx`(`timeStart`),
    INDEX `org_lectures_mode_idx`(`mode`),
    PRIMARY KEY (`lectureId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `org_assignments` (
    `assignmentId` BIGINT NOT NULL AUTO_INCREMENT,
    `causeId` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `dueDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `org_assignments_causeId_idx`(`causeId`),
    INDEX `org_assignments_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`assignmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `org_documentation` (
    `documentationId` BIGINT NOT NULL AUTO_INCREMENT,
    `lectureId` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NULL,
    `description` TEXT NULL,
    `docUrl` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `org_documentation_lectureId_idx`(`lectureId`),
    PRIMARY KEY (`documentationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `institute_user` ADD CONSTRAINT `institute_user_institute_id_fkey` FOREIGN KEY (`institute_id`) REFERENCES `institutes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `institute_user` ADD CONSTRAINT `institute_user_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `institute_user` ADD CONSTRAINT `institute_user_verified_by_fkey` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `org_organizations` ADD CONSTRAINT `org_organizations_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `institutes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `org_organization_users` ADD CONSTRAINT `org_organization_users_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `org_organizations`(`organizationId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `org_organization_users` ADD CONSTRAINT `org_organization_users_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `org_organization_users` ADD CONSTRAINT `org_organization_users_verifiedBy_fkey` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `org_causes` ADD CONSTRAINT `org_causes_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `org_organizations`(`organizationId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `org_lectures` ADD CONSTRAINT `org_lectures_causeId_fkey` FOREIGN KEY (`causeId`) REFERENCES `org_causes`(`causeId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `org_assignments` ADD CONSTRAINT `org_assignments_causeId_fkey` FOREIGN KEY (`causeId`) REFERENCES `org_causes`(`causeId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `org_documentation` ADD CONSTRAINT `org_documentation_lectureId_fkey` FOREIGN KEY (`lectureId`) REFERENCES `org_lectures`(`lectureId`) ON DELETE CASCADE ON UPDATE CASCADE;
