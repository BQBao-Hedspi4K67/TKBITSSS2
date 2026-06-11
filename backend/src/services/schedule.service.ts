import { ConflictSeverity, ConflictType, Prisma, ScheduleStatus, SharePermission } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';
import { parseTimePart, timeToMinutes } from '../utils/normalize';

type ScheduleItemInput = {
  courseCode: string;
  courseName: string;
  classCode: string;
  weekday: string;
  startTime: string;
  endTime: string;
  room: string;
  building?: string | null;
  color?: string | null;
};

function extractBuilding(room: string): string {
  // Extract building from room name, e.g. "D9-503" → "D9", "B201" → "B", "A105" → "A"
  const match = room.match(/^([A-Za-z]+\d*)/);
  return match ? match[1] : room;
}

function generateShareSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomPart = Array.from({ length: 8 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  return `tkb-${randomPart}`;
}

export function detectTimeConflicts(items: ScheduleItemInput[]) {
  const conflicts: Array<{
    type: ConflictType;
    severity: ConflictSeverity;
    message: string;
    metadata: Record<string, unknown>;
  }> = [];

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      const left = items[leftIndex];
      const right = items[rightIndex];
      if (left.weekday !== right.weekday) {
        continue;
      }

      const leftStart = timeToMinutes(parseTimePart(left.startTime) ?? left.startTime);
      const leftEnd = timeToMinutes(parseTimePart(left.endTime) ?? left.endTime);
      const rightStart = timeToMinutes(parseTimePart(right.startTime) ?? right.startTime);
      const rightEnd = timeToMinutes(parseTimePart(right.endTime) ?? right.endTime);

      if (leftStart === null || leftEnd === null || rightStart === null || rightEnd === null) {
        continue;
      }

      const overlaps = leftStart < rightEnd && rightStart < leftEnd;
      if (overlaps) {
        conflicts.push({
          type: ConflictType.TIME_OVERLAP,
          severity: ConflictSeverity.HIGH,
          message: `${left.courseCode} và ${right.courseCode} trùng giờ vào ngày thứ ${left.weekday}`,
          metadata: {
            weekday: left.weekday,
            left,
            right,
          },
        });
        continue;
      }


      const gapMinutes = Math.min(Math.abs(rightStart - leftEnd), Math.abs(leftStart - rightEnd));
      const leftBuilding = extractBuilding(left.room);
      const rightBuilding = extractBuilding(right.room);
      const differentBuilding = leftBuilding !== rightBuilding;
      if (differentBuilding && gapMinutes > 0 && gapMinutes < 15) {
        conflicts.push({
          type: ConflictType.LOCATION_GAP,
          severity: ConflictSeverity.MEDIUM,
          message: `${left.courseCode} và ${right.courseCode} cảnh báo di chuyển gấp (cách ${gapMinutes} phút, ${leftBuilding}→${rightBuilding}) vào ngày ${left.weekday}`,
          metadata: {
            weekday: left.weekday,
            gapMinutes,
            leftBuilding,
            rightBuilding,
            left,
            right,
          },
        });
      }
    }
  }

  return conflicts;
}

export async function previewConflicts(userId: string, sectionIds: string[]) {
  const items = await prisma.importedSection.findMany({
    where: {
      id: { in: sectionIds },
      batch: { userId },
    },
  });

  if (!items.length) {
    throw new HttpError(404, 'Không tìm thấy dữ liệu để kiểm tra xung đột', { code: 'SCHEDULE_ITEMS_NOT_FOUND' });
  }

  return detectTimeConflicts(
    items.map((item) => ({
      courseCode: item.courseCode,
      courseName: item.courseName,
      classCode: item.classCode,
      weekday: item.weekday,
      startTime: item.startTime ?? '',
      endTime: item.endTime ?? '',
      room: item.room,
      building: undefined,
      color: undefined,
    })),
  );
}

export async function saveSchedule(
  userId: string,
  input: { name: string; semester?: string; academicYear?: string; sourceBatchId?: string; sectionIds: string[] },
) {
  if (input.sourceBatchId) {
    const sourceBatch = await prisma.importBatch.findFirst({
      where: { id: input.sourceBatchId, userId },
    });

    if (!sourceBatch) {
      throw new HttpError(404, 'Không tìm thấy batch nguồn của bạn', { code: 'SOURCE_BATCH_NOT_FOUND' });
    }
  }

  const sourceItems = await prisma.importedSection.findMany({
    where: {
      id: { in: input.sectionIds },
      batch: { userId },
    },
  });

  if (sourceItems.length !== input.sectionIds.length) {
    throw new HttpError(400, 'Một hoặc nhiều lớp không tồn tại hoặc không thuộc về bạn', { code: 'INVALID_SCHEDULE_ITEMS' });
  }

  const conflicts = detectTimeConflicts(
    sourceItems.map((item) => ({
      courseCode: item.courseCode,
      courseName: item.courseName,
      classCode: item.classCode,
      weekday: item.weekday,
      startTime: item.startTime ?? '',
      endTime: item.endTime ?? '',
      room: item.room,
      building: undefined,
      color: undefined,
    })),
  );

  return prisma.$transaction(async (tx) => {
    const schedule = await tx.schedule.create({
      data: {
        userId,
        name: input.name,
        semester: input.semester,
        academicYear: input.academicYear,
        sourceBatchId: input.sourceBatchId,
        status: conflicts.length > 0 ? ScheduleStatus.DRAFT : ScheduleStatus.ACTIVE,
        conflictSummary: {
          total: conflicts.length,
        },
      },
    });

    await tx.scheduleItem.createMany({
      data: sourceItems.map((item, index) => ({
        scheduleId: schedule.id,
        importedSectionId: item.id,
        courseCode: item.courseCode,
        courseName: item.courseName,
        classCode: item.classCode,
        weekday: item.weekday,
        startTime: item.startTime ?? '',
        endTime: item.endTime ?? '',
        room: item.room,
        building: undefined,
        color: undefined,
        sortOrder: index,
      })),
    });

    await tx.scheduleConflict.createMany({
      data: conflicts.map((conflict) => ({
        scheduleId: schedule.id,
        type: conflict.type,
        severity: conflict.severity,
        message: conflict.message,
        metadata: conflict.metadata as Prisma.InputJsonValue,
      })),
    });

    return schedule;
  });
}

export async function updateSchedule(
  userId: string,
  scheduleId: string,
  input: { name: string; semester?: string; academicYear?: string; sourceBatchId?: string; sectionIds: string[] },
) {
  const existingSchedule = await prisma.schedule.findFirst({
    where: {
      id: scheduleId,
      userId,
    },
  });

  if (!existingSchedule) {
    throw new HttpError(404, 'Không tìm thấy lịch học', { code: 'SCHEDULE_NOT_FOUND' });
  }

  if (input.sourceBatchId) {
    const sourceBatch = await prisma.importBatch.findFirst({
      where: { id: input.sourceBatchId, userId },
    });

    if (!sourceBatch) {
      throw new HttpError(404, 'Không tìm thấy batch nguồn của bạn', { code: 'SOURCE_BATCH_NOT_FOUND' });
    }
  }

  const sourceItems = await prisma.importedSection.findMany({
    where: {
      id: { in: input.sectionIds },
      batch: { userId },
    },
  });

  if (sourceItems.length !== input.sectionIds.length) {
    throw new HttpError(400, 'Một hoặc nhiều lớp không tồn tại hoặc không thuộc về bạn', { code: 'INVALID_SCHEDULE_ITEMS' });
  }

  const conflicts = detectTimeConflicts(
    sourceItems.map((item) => ({
      courseCode: item.courseCode,
      courseName: item.courseName,
      classCode: item.classCode,
      weekday: item.weekday,
      startTime: item.startTime ?? '',
      endTime: item.endTime ?? '',
      room: item.room,
      building: undefined,
      color: undefined,
    })),
  );

  return prisma.$transaction(async (tx) => {
    const schedule = await tx.schedule.update({
      where: { id: existingSchedule.id },
      data: {
        name: input.name,
        semester: input.semester,
        academicYear: input.academicYear,
        sourceBatchId: input.sourceBatchId,
        status: conflicts.length > 0 ? ScheduleStatus.DRAFT : ScheduleStatus.ACTIVE,
        conflictSummary: {
          total: conflicts.length,
        },
      },
    });

    await tx.scheduleItem.deleteMany({ where: { scheduleId: schedule.id } });
    await tx.scheduleConflict.deleteMany({ where: { scheduleId: schedule.id } });

    await tx.scheduleItem.createMany({
      data: sourceItems.map((item, index) => ({
        scheduleId: schedule.id,
        importedSectionId: item.id,
        courseCode: item.courseCode,
        courseName: item.courseName,
        classCode: item.classCode,
        weekday: item.weekday,
        startTime: item.startTime ?? '',
        endTime: item.endTime ?? '',
        room: item.room,
        building: undefined,
        color: undefined,
        sortOrder: index,
      })),
    });

    await tx.scheduleConflict.createMany({
      data: conflicts.map((conflict) => ({
        scheduleId: schedule.id,
        type: conflict.type,
        severity: conflict.severity,
        message: conflict.message,
        metadata: conflict.metadata as Prisma.InputJsonValue,
      })),
    });

    return schedule;
  });
}

export async function listSchedules(userId: string) {
  return prisma.schedule.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      conflicts: true,
      shares: true,
    },
  });
}

export async function deleteSchedule(userId: string, scheduleId: string) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, userId },
  });

  if (!schedule) {
    throw new HttpError(404, 'Không tìm thấy lịch học', { code: 'SCHEDULE_NOT_FOUND' });
  }

  await prisma.schedule.delete({
    where: { id: scheduleId },
  });

  return { success: true };
}

export async function getScheduleById(userId: string, scheduleId: string) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, userId },
    include: {
      items: true,
      conflicts: true,
      shares: true,
      user: {
        select: {
          id: true,
          fullName: true,
          studentCode: true,
        },
      },
    },
  });

  if (!schedule) {
    throw new HttpError(404, 'Không tìm thấy lịch học', { code: 'SCHEDULE_NOT_FOUND' });
  }

  return schedule;
}

export async function getScheduleBySlug(slug: string) {
  const share = await prisma.scheduleShare.findUnique({
    where: { slug },
    include: {
      schedule: {
        include: {
          items: true,
          user: {
            select: {
              id: true,
              fullName: true,
              studentCode: true,
            },
          },
        },
      },
    },
  });

  if (!share) {
    throw new HttpError(404, 'Không tìm thấy lịch chia sẻ', { code: 'SHARE_NOT_FOUND' });
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    throw new HttpError(410, 'Lịch chia sẻ đã hết hạn', { code: 'SHARE_EXPIRED' });
  }

  return {
    slug: share.slug,
    permission: share.permission,
    createdAt: share.createdAt,
    schedule: share.schedule,
  };
}

export async function createShare(
  userId: string,
  scheduleId: string,
  permission: SharePermission = SharePermission.VIEW,
) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, userId },
    include: { user: { select: { fullName: true, studentCode: true } } },
  });

  if (!schedule) {
    throw new HttpError(404, 'Không tìm thấy lịch học', { code: 'SCHEDULE_NOT_FOUND' });
  }

  // Check if there's already an active share for this schedule
  const existingShare = await prisma.scheduleShare.findFirst({
    where: { scheduleId },
    orderBy: { createdAt: 'desc' },
  });

  if (existingShare) {
    // Return existing share
    return existingShare;
  }

  const slug = generateShareSlug();
  return prisma.scheduleShare.create({
    data: {
      scheduleId,
      slug,
      permission,
    },
  });
}

export async function listShares(userId: string, scheduleId: string) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, userId },
  });

  if (!schedule) {
    throw new HttpError(404, 'Không tìm thấy lịch học', { code: 'SCHEDULE_NOT_FOUND' });
  }

  return prisma.scheduleShare.findMany({
    where: { scheduleId },
    orderBy: { createdAt: 'desc' },
    include: {
      schedule: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function updateShare(
  userId: string,
  shareId: string,
  data: { permission?: SharePermission; expiresAt?: string | null },
) {
  const share = await prisma.scheduleShare.findUnique({
    where: { id: shareId },
    include: { schedule: { select: { userId: true } } },
  });

  if (!share) {
    throw new HttpError(404, 'Không tìm thấy chia sẻ', { code: 'SHARE_NOT_FOUND' });
  }

  if (share.schedule.userId !== userId) {
    throw new HttpError(403, 'Không có quyền cập nhật chia sẻ này', { code: 'FORBIDDEN' });
  }

  return prisma.scheduleShare.update({
    where: { id: shareId },
    data: {
      permission: data.permission ?? undefined,
      expiresAt: data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : undefined,
    },
  });
}

export async function deleteShare(userId: string, shareId: string) {
  const share = await prisma.scheduleShare.findUnique({
    where: { id: shareId },
    include: { schedule: { select: { userId: true } } },
  });

  if (!share) {
    throw new HttpError(404, 'Không tìm thấy chia sẻ', { code: 'SHARE_NOT_FOUND' });
  }

  if (share.schedule.userId !== userId) {
    throw new HttpError(403, 'Không có quyền xóa chia sẻ này', { code: 'FORBIDDEN' });
  }

  await prisma.scheduleShare.delete({ where: { id: shareId } });

  return { success: true };
}
