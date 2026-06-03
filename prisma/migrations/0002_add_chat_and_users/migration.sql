-- Migration: Add Message table for chat between users
-- Also adds additional seed users

-- Create Message table
CREATE TABLE IF NOT EXISTS `Message` (
  `id` VARCHAR(191) NOT NULL,
  `senderId` VARCHAR(191) NOT NULL,
  `receiverId` VARCHAR(191) NOT NULL,
  `scheduleShareId` VARCHAR(191) NULL,
  `content` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Message_senderId_receiverId_idx` (`senderId`, `receiverId`),
  KEY `Message_receiverId_senderId_idx` (`receiverId`, `senderId`),
  KEY `Message_scheduleShareId_idx` (`scheduleShareId`),
  CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Message_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Message_scheduleShareId_fkey` FOREIGN KEY (`scheduleShareId`) REFERENCES `ScheduleShare` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add additional seed users (student data for chat friend search)
INSERT INTO `User` (`id`, `email`, `passwordHash`, `fullName`, `studentCode`, `role`, `createdAt`, `updatedAt`) VALUES
(
  'user_student_002',
  'nguyenvanan@tempo.local',
  '$2b$12$sQ3kryuuqh2yXLda8rG4l.0mvwThk2HqGig6leIlahEbdKMFpyT8a',
  'Nguyễn Văn An',
  '21522002',
  'STUDENT',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
),
(
  'user_student_003',
  'tranthib@tempo.local',
  '$2b$12$sQ3kryuuqh2yXLda8rG4l.0mvwThk2HqGig6leIlahEbdKMFpyT8a',
  'Trần Thị B',
  '21522003',
  'STUDENT',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
),
(
  'user_student_004',
  'leminhhuy@tempo.local',
  '$2b$12$sQ3kryuuqh2yXLda8rG4l.0mvwThk2HqGig6leIlahEbdKMFpyT8a',
  'Lê Minh Huy',
  '21522004',
  'STUDENT',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
),
(
  'user_student_005',
  'phamthanhlan@tempo.local',
  '$2b$12$sQ3kryuuqh2yXLda8rG4l.0mvwThk2HqGig6leIlahEbdKMFpyT8a',
  'Phạm Thanh Lan',
  '21522005',
  'STUDENT',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
),
(
  'user_student_006',
  'hoangminhtuan@tempo.local',
  '$2b$12$sQ3kryuuqh2yXLda8rG4l.0mvwThk2HqGig6leIlahEbdKMFpyT8a',
  'Hoàng Minh Tuấn',
  '21522006',
  'STUDENT',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
)
ON DUPLICATE KEY UPDATE
  `passwordHash` = VALUES(`passwordHash`),
  `fullName` = VALUES(`fullName`),
  `studentCode` = VALUES(`studentCode`),
  `role` = VALUES(`role`),
  `updatedAt` = CURRENT_TIMESTAMP(3);
