import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';

export type UserSelectionSnapshot = {
  courseCode: string;
  classCode: string | null;
};

export async function getCurrentTimetable() {
  const batch = await prisma.importBatch.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      sections: true,
    },
  });

  return batch ?? null;
}

export async function getUserSelections(userId: string) {
  // prisma.userSelection may be undefined if Prisma schema migrations
  // have not been applied yet. Handle gracefully so the API doesn't crash
  // in development environments and returns an empty selection set.
  // When migrations are applied, this will return real data.
  // runtime check below: use `any` to avoid compile errors when Prisma client
  // hasn't been generated with the `userSelection` model yet.
  const p: any = prisma;
  if (!p.userSelection) {
    console.warn('userSelection model is not available on Prisma client; returning empty selections. Run `prisma migrate` to add the model.');
    return { selections: [] };
  }

  const selections = await p.userSelection.findMany({
    where: { userId },
    orderBy: [{ courseCode: 'asc' }],
  });

  return {
    selections: selections.map((selection: any) => ({
      courseCode: selection.courseCode,
      classCode: selection.classCode,
    })),
  };
}

export async function replaceUserSelections(userId: string, selections: UserSelectionSnapshot[]) {
  const currentBatch = await getCurrentTimetable();
  if (!currentBatch) {
    throw new HttpError(404, 'Chua co TKB hien tai', { code: 'CURRENT_TIMETABLE_NOT_FOUND' });
  }

  const validCourseCodes = new Set(currentBatch.sections.map((section) => section.courseCode));
  const normalizedSelections = selections.reduce<UserSelectionSnapshot[]>((accumulator, selection) => {
    if (!validCourseCodes.has(selection.courseCode)) {
      return accumulator;
    }

    const existingIndex = accumulator.findIndex((item) => item.courseCode === selection.courseCode);
    const normalizedItem = {
      courseCode: selection.courseCode,
      classCode: selection.classCode?.trim() || null,
    };

    if (existingIndex >= 0) {
      accumulator[existingIndex] = normalizedItem;
      return accumulator;
    }

    accumulator.push(normalizedItem);
    return accumulator;
  }, []);

  await prisma.$transaction(async (tx) => {
    // If the Prisma client doesn't expose userSelection (migrations not run),
    // don't attempt to write — return an error that migrations are required.
    const t: any = tx;
    if (!t.userSelection) {
      throw new HttpError(501, 'User selections storage not available. Run Prisma migrations to enable this feature.', { code: 'USER_SELECTIONS_NOT_AVAILABLE' });
    }

    await t.userSelection.deleteMany({
      where: { userId },
    });

    if (normalizedSelections.length > 0) {
      await t.userSelection.createMany({
        data: normalizedSelections.map((selection) => ({
          userId,
          courseCode: selection.courseCode,
          classCode: selection.classCode,
        })),
      });
    }
  });

  return {
    selections: normalizedSelections,
  };
}
