import { create } from 'zustand';
import type { TimetableBatchDetail, TimetableClass, TimetableSection } from '../types/timetable';

type ImportState = {
  batchId: string | null;
  batch: TimetableBatchDetail | null;
  selectedSubjectCode: string | null;
  selectedSubjectCodes: string[];
  selectedClassCodeByCourseCode: Record<string, string>;
  search: string;
  uploadError: string | null;
  setBatch: (batch: TimetableBatchDetail | null) => void;
  setBatchId: (batchId: string | null) => void;
  setSearch: (value: string) => void;
  setSelectedSubjectCode: (value: string | null) => void;
  setSelectionSnapshot: (selections: Array<{ courseCode: string; classCode: string | null }>, activeCourseCode?: string | null) => void;
  toggleSubject: (courseCode: string) => void;
  chooseClass: (classItem: TimetableClass) => void;
  clearImport: () => void;
  setUploadError: (value: string | null) => void;
};

export const useImportStore = create<ImportState>()((set) => ({
  batchId: null,
  batch: null,
  selectedSubjectCode: null,
  selectedSubjectCodes: [],
  selectedClassCodeByCourseCode: {},
  search: '',
  uploadError: null,
  setBatch: (batch) =>
    set((state) => {
      if (!batch) {
        return { batch: null };
      }

      if (state.batchId && state.batchId !== batch.id) {
        return {
          batch,
          selectedSubjectCode: null,
          selectedSubjectCodes: [],
          selectedClassCodeByCourseCode: {},
        };
      }

      return { batch };
    }),
  setBatchId: (batchId) => set({ batchId }),
  setSearch: (value) => set({ search: value }),
  setSelectedSubjectCode: (value) => set({ selectedSubjectCode: value }),
  setSelectionSnapshot: (selections, activeCourseCode) =>
    set((state) => {
      const selectedSubjectCodes = Array.from(new Set(selections.map((selection) => selection.courseCode)));
      const selectedClassCodeByCourseCode = selections.reduce<Record<string, string>>((accumulator, selection) => {
        if (selection.classCode) {
          accumulator[selection.courseCode] = selection.classCode;
        }
        return accumulator;
      }, {});

      const nextSelectedSubjectCode =
        activeCourseCode && selectedSubjectCodes.includes(activeCourseCode)
          ? activeCourseCode
          : state.selectedSubjectCode && selectedSubjectCodes.includes(state.selectedSubjectCode)
            ? state.selectedSubjectCode
            : selectedSubjectCodes[0] ?? null;

      return {
        selectedSubjectCodes,
        selectedClassCodeByCourseCode,
        selectedSubjectCode: nextSelectedSubjectCode,
      };
    }),
  toggleSubject: (courseCode) =>
    set((state) => {
      const hasSelected = state.selectedSubjectCodes.includes(courseCode);
      const selectedSubjectCodes = hasSelected
        ? state.selectedSubjectCodes.filter((code) => code !== courseCode)
        : [...state.selectedSubjectCodes, courseCode];

      const nextSelectedClassCodeByCourseCode = { ...state.selectedClassCodeByCourseCode };
      if (hasSelected) {
        delete nextSelectedClassCodeByCourseCode[courseCode];
      }

      return {
        selectedSubjectCodes,
        selectedSubjectCode: state.selectedSubjectCode ?? courseCode,
        selectedClassCodeByCourseCode: nextSelectedClassCodeByCourseCode,
      };
    }),
  chooseClass: (classItem) =>
    set((state) => ({
      selectedClassCodeByCourseCode: {
        ...state.selectedClassCodeByCourseCode,
        [classItem.courseCode]: classItem.classCode,
      },
      selectedSubjectCodes: state.selectedSubjectCodes.includes(classItem.courseCode)
        ? state.selectedSubjectCodes
        : [...state.selectedSubjectCodes, classItem.courseCode],
      selectedSubjectCode: classItem.courseCode,
    })),
  clearImport: () =>
    set({
      batchId: null,
      batch: null,
      selectedSubjectCode: null,
      selectedSubjectCodes: [],
      selectedClassCodeByCourseCode: {},
      search: '',
      uploadError: null,
    }),
  setUploadError: (value) => set({ uploadError: value }),
}));
