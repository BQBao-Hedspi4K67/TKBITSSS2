import { ImportedSection, ImportStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';
import { parseTimetableWorkbook, type TimetableRow } from '../utils/excel';

export type ImportTimetableResult = {
  batch: {
    id: string;
    fileName: string;
    sheetName: string;
    rowCount: number;
    subjectCount: number;
    status: ImportStatus;
  };
  subjects: Array<{
    courseCode: string;
    courseName: string;
    courseNameEn: string | null;
    creditWeight: number;
    sectionCount: number;
    sections: ImportedSection[];
  }>;
  warnings: string[];
};

function groupSections(rows: TimetableRow[]) {
  const subjects = new Map<string, {
    courseCode: string;
    courseName: string;
    courseNameEn: string | null;
    creditWeight: number;
    sections: TimetableRow[];
  }>();

  for (const row of rows) {
    const current = subjects.get(row.courseCode) ?? {
      courseCode: row.courseCode,
      courseName: row.courseName,
      courseNameEn: row.courseNameEn,
      creditWeight: row.creditWeight,
      sections: [],
    };

    current.sections.push(row);
    if (!current.courseNameEn && row.courseNameEn) {
      current.courseNameEn = row.courseNameEn;
    }

    if (!current.creditWeight && row.creditWeight) {
      current.creditWeight = row.creditWeight;
    }

    subjects.set(row.courseCode, current);
  }

  return Array.from(subjects.values());
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

export async function importTimetableFile(file: Express.Multer.File, userId?: string): Promise<ImportTimetableResult> {
  if (!file) {
    throw new HttpError(400, 'File upload khong duoc trong', { code: 'FILE_REQUIRED' });
  }

  if (!userId) {
    throw new HttpError(401, 'Ban can dang nhap de upload TKB', { code: 'UNAUTHORIZED' });
  }

  const parsed = parseTimetableWorkbook(file.buffer, file.originalname);
  const grouped = groupSections(parsed.rows);

  const result = await prisma.$transaction(async (tx) => {
    await tx.importBatch.deleteMany({
      where: { userId },
    });

    const batch = await tx.importBatch.create({
      data: {
        userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sheetName: parsed.sheetName,
        rowCount: parsed.rows.length,
        subjectCount: grouped.length,
        status: ImportStatus.VALIDATED,
        originalHeaders: parsed.originalHeaders,
        normalizedHeaders: parsed.normalizedHeaders,
        warnings: parsed.warnings,
        metadata: {
          sourceFile: file.originalname,
          sourceSize: file.size,
        },
      },
    });

    const sectionData = parsed.rows.map((row) => ({
      batchId: batch.id,
      semester: row.semester,
      school: row.school,
      classCode: row.classCode,
      classCodeAlt: row.classCodeAlt,
      courseCode: row.courseCode,
      courseName: row.courseName,
      courseNameEn: row.courseNameEn,
      creditWeight: row.creditWeight,
      note: row.note,
      sessionNo: row.sessionNo,
      weekday: row.weekday,
      timeLabel: row.timeLabel,
      startTime: row.startTime,
      endTime: row.endTime,
      startPeriod: row.startPeriod,
      endPeriod: row.endPeriod,
      weekRange: row.weekRange,
      room: row.room,
      teacherName: row.teacherName,
      enrollmentCount: row.enrollmentCount,
      maxSeats: row.maxSeats,
      status: row.status,
      classType: row.classType,
      openingBatch: row.openingBatch,
      rawRow: row.rawRow as Prisma.InputJsonValue,
    }));

    let insertedCount = 0;
    for (const chunk of chunkArray(sectionData, 500)) {
      const response = await tx.importedSection.createMany({
        data: chunk,
      });
      insertedCount += response.count;
    }

    // Fetch sections once inside the transaction to avoid an extra round-trip
    const savedSections = await tx.importedSection.findMany({
      where: { batchId: batch.id },
      orderBy: [{ courseCode: 'asc' }, { classCode: 'asc' }],
    });

    return {
      batch,
      sections: savedSections,
    };
  }, {
    maxWait: 5_000,
    timeout: 30_000,
  });

  // Build subject->sections map efficiently (O(n) instead of O(n*m))
  const sectionsByCourse = new Map<string, ImportedSection[]>();
  for (const section of result.sections) {
    const list = sectionsByCourse.get(section.courseCode);
    if (list) {
      list.push(section);
    } else {
      sectionsByCourse.set(section.courseCode, [section]);
    }
  }

  return {
    batch: {
      id: result.batch.id,
      fileName: result.batch.fileName,
      sheetName: result.batch.sheetName ?? parsed.sheetName,
      rowCount: result.batch.rowCount,
      subjectCount: result.batch.subjectCount,
      status: result.batch.status,
    },
    subjects: grouped.map((subject) => ({
      courseCode: subject.courseCode,
      courseName: subject.courseName,
      courseNameEn: subject.courseNameEn,
      creditWeight: subject.creditWeight,
      sectionCount: subject.sections.length,
      sections: sectionsByCourse.get(subject.courseCode) ?? [],
    })),
    warnings: parsed.warnings,
  };
}

export async function getImportBatch(batchId: string, userId: string) {
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, userId },
    include: {
      sections: true,
    },
  });

  if (!batch) {
    throw new HttpError(404, 'Khong tim thay import batch', { code: 'IMPORT_BATCH_NOT_FOUND' });
  }

  return batch;
}
