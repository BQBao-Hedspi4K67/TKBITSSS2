import { useCallback, useEffect, useMemo } from 'react';
import { useImportStore } from '../store/importStore';
import { getCurrentTimetable, getUserSelections, saveUserSelections } from '../services/timetableService';
import { buildSubjectsFromSections } from '../utils/timetable';
import type { TimetableClass } from '../types/timetable';

function buildSnapshotFromStore() {
  const store = useImportStore.getState();

  return store.selectedSubjectCodes.map((courseCode) => ({
    courseCode,
    classCode: store.selectedClassCodeByCourseCode[courseCode] ?? null,
  }));
}

export function useTimetableImport() {
  const store = useImportStore();

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const state = useImportStore.getState();
        const currentTimetable = await getCurrentTimetable();

        if (cancelled) {
          return;
        }

        if (!currentTimetable.batch) {
          state.clearImport();
          return;
        }

        state.setBatch(currentTimetable.batch);
        state.setBatchId(currentTimetable.batch.id);

        try {
          const userSelections = await getUserSelections();
          if (cancelled) {
            return;
          }

          const validCourseCodes = new Set(currentTimetable.batch.sections.map((section) => section.courseCode));
          const validSelections = userSelections.selections.filter((selection) => validCourseCodes.has(selection.courseCode));
          state.setSelectionSnapshot(validSelections);
        } catch {
          if (!cancelled) {
            state.setSelectionSnapshot([], null);
          }
        }
      } catch {
        if (!cancelled) {
          useImportStore.getState().clearImport();
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const sections = store.batch?.sections ?? [];
  const subjects = useMemo(() => buildSubjectsFromSections(sections), [sections]);

  const selectedSubjects = useMemo(
    () => subjects.filter((subject) => store.selectedSubjectCodes.includes(subject.courseCode)),
    [subjects, store.selectedSubjectCodes],
  );

  const totalCredits = useMemo(
    () => selectedSubjects.reduce((sum, subject) => sum + (subject.creditWeight || 0), 0),
    [selectedSubjects],
  );

  const visibleSubjects = selectedSubjects;

  const suggestedSubjects = useMemo(() => {
    const search = store.search.trim().toLowerCase();

    if (!search) {
      return subjects.filter((subject) => !store.selectedSubjectCodes.includes(subject.courseCode));
    }

    return subjects.filter((subject) => {
      if (store.selectedSubjectCodes.includes(subject.courseCode)) {
        return false;
      }

      return [subject.courseCode, subject.courseName, subject.courseNameEn ?? '']
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [subjects, store.search, store.selectedSubjectCodes]);

  const selectedSubject = useMemo(
    () => visibleSubjects.find((subject) => subject.courseCode === store.selectedSubjectCode) ?? visibleSubjects[0] ?? null,
    [store.selectedSubjectCode, visibleSubjects],
  );

  const selectedClasses = useMemo(
    () => selectedSubjects.flatMap((subject) => subject.classes.filter((classItem) => store.selectedClassCodeByCourseCode[subject.courseCode] === classItem.classCode)),
    [selectedSubjects, store.selectedClassCodeByCourseCode],
  );

  const selectedSections = useMemo(
    () => selectedClasses.flatMap((classItem) => classItem.sections),
    [selectedClasses],
  );

  const syncSelections = useCallback(async (nextSelections: Array<{ courseCode: string; classCode: string | null }>, activeCourseCode?: string | null) => {
    const state = useImportStore.getState();
    const previousSelections = buildSnapshotFromStore();
    const previousActiveCourseCode = state.selectedSubjectCode;

    state.setSelectionSnapshot(nextSelections, activeCourseCode);

    try {
      const response = await saveUserSelections({ selections: nextSelections });
      useImportStore.getState().setSelectionSnapshot(response.selections, activeCourseCode);
    } catch (error) {
      useImportStore.getState().setSelectionSnapshot(previousSelections, previousActiveCourseCode);
      throw error;
    }
  }, []);

  const toggleSubject = useCallback(async (courseCode: string) => {
    const current = useImportStore.getState();
    const existing = buildSnapshotFromStore();
    const hasSelected = current.selectedSubjectCodes.includes(courseCode);
    const nextSelections = hasSelected
      ? existing.filter((selection) => selection.courseCode !== courseCode)
      : [...existing, { courseCode, classCode: current.selectedClassCodeByCourseCode[courseCode] ?? null }];

    await syncSelections(nextSelections, hasSelected ? current.selectedSubjectCode : courseCode);
  }, [syncSelections]);

  const chooseClass = useCallback(async (classItem: TimetableClass) => {
    const current = useImportStore.getState();
    const isAlreadySelected = current.selectedClassCodeByCourseCode[classItem.courseCode] === classItem.classCode;
    const nextSelections = isAlreadySelected
      ? [...buildSnapshotFromStore().filter((selection) => selection.courseCode !== classItem.courseCode), { courseCode: classItem.courseCode, classCode: null }]
      : [...buildSnapshotFromStore().filter((selection) => selection.courseCode !== classItem.courseCode), { courseCode: classItem.courseCode, classCode: classItem.classCode }];

    await syncSelections(nextSelections, classItem.courseCode);
  }, [syncSelections]);

  const chooseSubject = useCallback(async (courseCode: string) => {
    const current = useImportStore.getState();
    if (current.selectedSubjectCodes.includes(courseCode)) {
      current.setSelectedSubjectCode(courseCode);
      return;
    }

    const nextSelections = [...buildSnapshotFromStore(), { courseCode, classCode: null }];
    await syncSelections(nextSelections, courseCode);
  }, [syncSelections]);

  const clearSubject = useCallback(async (courseCode: string) => {
    const current = useImportStore.getState();
    const nextSelections = buildSnapshotFromStore().filter((selection) => selection.courseCode !== courseCode);
    await syncSelections(nextSelections, current.selectedSubjectCode === courseCode ? nextSelections[0]?.courseCode ?? null : current.selectedSubjectCode);
  }, [syncSelections]);

  return {
    ...store,
    subjects,
    sections,
    selectedSubject,
    selectedSubjects,
    selectedClasses,
    selectedSections,
    visibleSubjects,
    suggestedSubjects,
    totalCredits,
    chooseSubject,
    clearSubject,
    toggleSubject,
    chooseClass,
  };
}
