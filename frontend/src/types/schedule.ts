export type ScheduleSlot = {
  id: string;
  scheduleId: string;
  importedSectionId: string | null;
  courseCode: string;
  courseName: string;
  classCode: string;
  weekday: string;
  startTime: string;
  endTime: string;
  room: string;
  building: string | null;
  color: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleConflict = {
  id: string;
  scheduleId: string;
  type: 'TIME_OVERLAP' | 'LOCATION_GAP' | 'CAPACITY_LIMIT' | 'CUSTOM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ScheduleShare = {
  id: string;
  scheduleId: string;
  slug: string;
  permission: 'VIEW' | 'COMMENT';
  expiresAt: string | null;
  createdAt: string;
};

export type SavedSchedule = {
  id: string;
  userId: string;
  sourceBatchId: string | null;
  name: string;
  semester: string | null;
  academicYear: string | null;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  conflictSummary: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  items: ScheduleSlot[];
  conflicts: ScheduleConflict[];
  shares: ScheduleShare[];
};

export type SaveSchedulePayload = {
  name: string;
  semester?: string;
  academicYear?: string;
  sourceBatchId?: string;
  sectionIds: string[];
};
