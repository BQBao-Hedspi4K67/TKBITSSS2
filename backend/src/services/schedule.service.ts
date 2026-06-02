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
          message: `${left.courseCode} va ${right.courseCode} trùng giờ vào ngày thứ ${left.weekday}`,
          metadata: {
            weekday: left.weekday,
            left,
            right,
          },
        });
        continue;
      }

      const gapMinutes = Math.min(Math.abs(rightStart - leftEnd), Math.abs(leftStart - rightEnd));
      const differentRoom = left.room !== right.room;
      if (differentRoom && gapMinutes > 0 && gapMinutes < 10) {
        conflicts.push({
          type: ConflictType.LOCATION_GAP,
          severity: ConflictSeverity.MEDIUM,
          message: `${left.courseCode} va ${right.courseCode} cảnh báo di chuyển gấp vào ngày ${left.weekday}`,
          metadata: {
            weekday: left.weekday,
            gapMinutes,
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
    throw new HttpError(404, 'Khong tim thay du lieu de kiem tra xung dot', { code: 'SCHEDULE_ITEMS_NOT_FOUND' });
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
  const sourceItems = await prisma.importedSection.findMany({
    where: {
      id: { in: input.sectionIds },
      batch: { userId },
    },
  });

  if (sourceItems.length !== input.sectionIds.length) {
    throw new HttpError(400, 'Mot hoac nhieu lop khong ton tai hoac khong thuoc ve ban', { code: 'INVALID_SCHEDULE_ITEMS' });
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
    throw new HttpError(404, 'Khong tim thay lich hoc', { code: 'SCHEDULE_NOT_FOUND' });
  }

  const sourceItems = await prisma.importedSection.findMany({
    where: {
      id: { in: input.sectionIds },
      batch: { userId },
    },
  });

  if (sourceItems.length !== input.sectionIds.length) {
    throw new HttpError(400, 'Mot hoac nhieu lop khong ton tai hoac khong thuoc ve ban', { code: 'INVALID_SCHEDULE_ITEMS' });
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
    throw new HttpError(404, 'Khong tim thay lich hoc', { code: 'SCHEDULE_NOT_FOUND' });
  }

  await prisma.schedule.delete({
    where: { id: scheduleId },
  });

  return { success: true };
}

export async function createShare(userId: string, scheduleId: string, permission: SharePermission = SharePermission.VIEW) {
  const schedule = await prisma.schedule.findFirst({ where: { id: scheduleId, userId } });
  if (!schedule) {
    throw new HttpError(404, 'Khong tim thay lich hoc', { code: 'SCHEDULE_NOT_FOUND' });
  }

  const slug = `share-${scheduleId}-${Date.now().toString(36)}`;
  return prisma.scheduleShare.create({
    data: {
      scheduleId,
      slug,
      permission,
    },
  });
}
