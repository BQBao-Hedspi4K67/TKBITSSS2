export type TimetableSection = {
  id: string;
  batchId: string;
  semester: string | null;
  school: string | null;
  classCode: string;
  classCodeAlt: string | null;
  courseCode: string;
  courseName: string;
  courseNameEn: string | null;
  creditWeight: number;
  note: string | null;
  sessionNo: string | null;
  weekday: string;
  timeLabel: string | null;
  startTime: string | null;
  endTime: string | null;
  startPeriod: number | null;
  endPeriod: number | null;
  weekRange: string | null;
  room: string;
  teacherName: string | null;
  enrollmentCount: number;
  maxSeats: number;
  status: string;
  classType: string;
  openingBatch: string;
  rawRow: Record<string, unknown>;
  conflictScore: number;
  createdAt: string;
  updatedAt: string;
};

export type TimetableClass = {
  classCode: string;
  classCodeAlt: string | null;
  courseCode: string;
  courseName: string;
  courseNameEn: string | null;
  creditWeight: number;
  note: string | null;
  classType: string;
  openingBatch: string;
  sectionCount: number;
  sections: TimetableSection[];
};

export type TimetableSubject = {
  courseCode: string;
  courseName: string;
  courseNameEn: string | null;
  creditWeight: number;
  classCount: number;
  classes: TimetableClass[];
};

export type TimetableBatch = {
  id: string;
  fileName: string;
  sheetName: string;
  rowCount: number;
  subjectCount: number;
  status: string;
};

export type TimetableBatchDetail = TimetableBatch & {
  sections: TimetableSection[];
};

export type TimetableImportResponse = {
  batch: TimetableBatch;
  subjects: TimetableSubject[];
  warnings: string[];
};

export type TimetableBatchResponse = {
  batch: TimetableBatchDetail;
};

export type TimetableCurrentResponse = {
  batch: TimetableBatchDetail | null;
};

export type UserSelection = {
  courseCode: string;
  classCode: string | null;
};

export type UserSelectionsResponse = {
  selections: UserSelection[];
};

export type SaveUserSelectionsPayload = {
  selections: UserSelection[];
};

export type ConflictPreview = {
  type: 'TIME_OVERLAP' | 'LOCATION_GAP' | 'CAPACITY_LIMIT' | 'CUSTOM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  metadata: Record<string, unknown>;
};
