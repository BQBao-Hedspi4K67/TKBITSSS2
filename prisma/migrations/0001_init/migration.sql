-- CreateTable
CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `fullName` VARCHAR(191) NOT NULL,
  `studentCode` VARCHAR(191) NULL,
  `role` ENUM('STUDENT') NOT NULL DEFAULT 'STUDENT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  UNIQUE KEY `User_studentCode_key` (`studentCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportBatch` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `sheetName` VARCHAR(191) NULL,
  `rowCount` INTEGER NOT NULL,
  `subjectCount` INTEGER NOT NULL,
  `status` ENUM('VALIDATED', 'STORED', 'FAILED') NOT NULL DEFAULT 'VALIDATED',
  `originalHeaders` JSON NOT NULL,
  `normalizedHeaders` JSON NOT NULL,
  `warnings` JSON NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ImportBatch_userId_createdAt_idx` (`userId`, `createdAt`),
  CONSTRAINT `ImportBatch_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportedSection` (
  `id` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `semester` VARCHAR(191) NULL,
  `school` VARCHAR(191) NULL,
  `classCode` VARCHAR(191) NOT NULL,
  `classCodeAlt` VARCHAR(191) NULL,
  `courseCode` VARCHAR(191) NOT NULL,
  `courseName` VARCHAR(191) NOT NULL,
  `courseNameEn` VARCHAR(191) NULL,
  `creditWeight` INTEGER NOT NULL DEFAULT 0,
  `note` VARCHAR(191) NULL,
  `sessionNo` VARCHAR(191) NULL,
  `weekday` VARCHAR(191) NOT NULL,
  `timeLabel` VARCHAR(191) NULL,
  `startTime` VARCHAR(191) NULL,
  `endTime` VARCHAR(191) NULL,
  `startPeriod` INTEGER NULL,
  `endPeriod` INTEGER NULL,
  `weekRange` VARCHAR(191) NULL,
  `room` VARCHAR(191) NOT NULL,
  `teacherName` VARCHAR(191) NULL,
  `enrollmentCount` INTEGER NOT NULL,
  `maxSeats` INTEGER NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  `classType` VARCHAR(191) NOT NULL,
  `openingBatch` VARCHAR(191) NOT NULL,
  `rawRow` JSON NOT NULL,
  `conflictScore` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ImportedSection_batchId_courseCode_idx` (`batchId`, `courseCode`),
  KEY `ImportedSection_courseCode_classCode_idx` (`courseCode`, `classCode`),
  CONSTRAINT `ImportedSection_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ImportBatch` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Schedule` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `sourceBatchId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `semester` VARCHAR(191) NULL,
  `academicYear` VARCHAR(191) NULL,
  `description` VARCHAR(191) NULL,
  `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `conflictSummary` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Schedule_userId_createdAt_idx` (`userId`, `createdAt`),
  KEY `Schedule_sourceBatchId_idx` (`sourceBatchId`),
  CONSTRAINT `Schedule_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Schedule_sourceBatchId_fkey` FOREIGN KEY (`sourceBatchId`) REFERENCES `ImportBatch` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduleItem` (
  `id` VARCHAR(191) NOT NULL,
  `scheduleId` VARCHAR(191) NOT NULL,
  `importedSectionId` VARCHAR(191) NULL,
  `courseCode` VARCHAR(191) NOT NULL,
  `courseName` VARCHAR(191) NOT NULL,
  `classCode` VARCHAR(191) NOT NULL,
  `weekday` VARCHAR(191) NOT NULL,
  `startTime` VARCHAR(191) NOT NULL,
  `endTime` VARCHAR(191) NOT NULL,
  `room` VARCHAR(191) NOT NULL,
  `building` VARCHAR(191) NULL,
  `color` VARCHAR(191) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ScheduleItem_scheduleId_weekday_idx` (`scheduleId`, `weekday`),
  KEY `ScheduleItem_importedSectionId_idx` (`importedSectionId`),
  CONSTRAINT `ScheduleItem_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `Schedule` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ScheduleItem_importedSectionId_fkey` FOREIGN KEY (`importedSectionId`) REFERENCES `ImportedSection` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduleConflict` (
  `id` VARCHAR(191) NOT NULL,
  `scheduleId` VARCHAR(191) NOT NULL,
  `type` ENUM('TIME_OVERLAP', 'LOCATION_GAP', 'CAPACITY_LIMIT', 'CUSTOM') NOT NULL,
  `severity` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
  `message` VARCHAR(191) NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ScheduleConflict_scheduleId_type_idx` (`scheduleId`, `type`),
  CONSTRAINT `ScheduleConflict_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `Schedule` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduleShare` (
  `id` VARCHAR(191) NOT NULL,
  `scheduleId` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `permission` ENUM('VIEW', 'COMMENT') NOT NULL DEFAULT 'VIEW',
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ScheduleShare_slug_key` (`slug`),
  KEY `ScheduleShare_scheduleId_createdAt_idx` (`scheduleId`, `createdAt`),
  CONSTRAINT `ScheduleShare_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `Schedule` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
