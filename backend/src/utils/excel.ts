import * as XLSX from 'xlsx';
import { HttpError } from './http-error';
import { compactSpaces, normalizeKey, parseCompactTimeRange, parseInteger, parseTimePart } from './normalize';

export type TimetableRow = {
  semester: string | null;
  school: string | null;
  programCode: string | null;
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
};

type ParsedWorkbook = {
  sheetName: string;
  originalHeaders: string[];
  normalizedHeaders: string[];
  rows: TimetableRow[];
  subjectCount: number;
  warnings: string[];
};

const REQUIRED_COLUMNS = [
  { key: 'classCode', label: 'Mã_lớp' },
  { key: 'courseCode', label: 'Mã_HP' },
  { key: 'courseName', label: 'Tên_HP' },
  { key: 'weekday', label: 'Thứ' },
  { key: 'timeLabel', label: 'Thời_gian' },
  { key: 'startPeriod', label: 'BĐ' },
  { key: 'endPeriod', label: 'KT' },
  { key: 'sessionNo', label: 'Kíp' },
  { key: 'weekRange', label: 'Tuần' },
  { key: 'room', label: 'Phòng' },
  { key: 'maxSeats', label: 'SL_Max' },
  { key: 'enrollmentCount', label: 'SLĐK' },
  { key: 'status', label: 'Trạng_thái' },
  { key: 'classType', label: 'Loại_lớp' },
  { key: 'openingBatch', label: 'Đợt_mở' },
  { key: 'programCode', label: 'Mã_QL' },
];

const COLUMN_ALIASES: Record<string, string[]> = {
  semester: ['ky', 'hoc ky', 'semester'],
  school: ['truong', 'school'],
  programCode: ['ma ql', 'ma_ql', 'maql', 'program code'],
  classCode: ['ma lop', 'ma_lop', 'class code', 'class_code'],
  classCodeAlt: ['ma lop 2', 'ma_lop_', 'ma lop_', 'ma lop phu'],
  courseCode: ['ma hp', 'ma_hp', 'ma mon', 'ma_mon', 'subject code', 'course code'],
  courseName: ['ten hp', 'ten_hp', 'ten mon', 'ten_mon', 'course name'],
  courseNameEn: ['ten hp tieng anh', 'ten_hp_tieng_anh', 'course name english'],
  creditWeight: ['khoi luong', 'khoi_luong', 'tin chi', 'credit', 'credits'],
  note: ['ghi chu', 'ghi_chu', 'note'],
  sessionNo: ['buoi so', 'buoi_so', 'kip'],
  weekday: ['thu', 'day of week', 'weekday'],
  timeLabel: ['thoi gian', 'thoi_gian', 'time', 'time range'],
  startTime: ['bat dau', 'start', 'start time'],
  endTime: ['ket thuc', 'end', 'end time'],
  startPeriod: ['bd', 'bđ', 'bd tiet', 'period start'],
  endPeriod: ['kt', 'kt tiet', 'period end'],
  weekRange: ['tuan', 'weeks', 'week range'],
  room: ['phong', 'room'],
  teacherName: ['can tn', 'can_tn', 'teacher', 'instructor'],
  enrollmentCount: ['sldk', 'sl dk', 'slđk', 'so dang ky', 'registered'],
  maxSeats: ['sl max', 'sl_max', 'capacity', 'max'],
  status: ['trang thai', 'trang_thai', 'status'],
  classType: ['loai lop', 'loai_lop', 'class type'],
  openingBatch: ['dot mo', 'dot_mo', 'đợt mở', 'opening batch'],
};

function findValue(row: Record<string, unknown>, aliases: string[]) {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    const normalizedKey = normalizeKey(key);
    if (aliases.some((alias) => normalizedKey === normalizeKey(alias))) {
      return value;
    }
  }

  return undefined;
}

function isRowEmpty(row: unknown[]) {
  return row.every((value) => value === null || value === undefined || String(value).trim() === '');
}

function scoreHeaderRow(row: unknown[]) {
  const keys = row.map((value) => (value === null || value === undefined ? '' : String(value)));
  let score = 0;

  for (const column of REQUIRED_COLUMNS) {
    const aliases = COLUMN_ALIASES[column.key] ?? [column.key];
    if (keys.some((header) => aliases.some((alias) => normalizeKey(header) === normalizeKey(alias)))) {
      score += 1;
    }
  }

  return score;
}

function rowArrayToObject(headers: string[], values: unknown[]) {
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) as Record<string, unknown>;
}

function pickString(row: Record<string, unknown>, key: string, fallback: string | null = null) {
  const aliases = COLUMN_ALIASES[key] ?? [key];
  const value = findValue(row, aliases);
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return compactSpaces(String(value));
}

function parseCreditWeight(input: unknown) {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.trunc(input);
  }

  if (typeof input === 'string') {
    const match = compactSpaces(input).match(/^(\d+(?:[.,]\d+)?)/);
    if (!match) {
      return null;
    }

    const parsed = Number.parseFloat(match[1].replace(',', '.'));
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }

  return null;
}

function parseRow(row: Record<string, unknown>): TimetableRow | null {
  const rawCourseCode = pickString(row, 'courseCode');
  const rawCourseName = pickString(row, 'courseName');
  const rawClassCode = pickString(row, 'classCode');

  const meaningfulValues = Object.values(row).filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
  if (meaningfulValues.length === 0) {
    return null;
  }

  const compactTime = parseCompactTimeRange(pickString(row, 'timeLabel'));
  const startTime = parseTimePart(pickString(row, 'startTime')) ?? compactTime?.start ?? null;
  const endTime = parseTimePart(pickString(row, 'endTime')) ?? compactTime?.end ?? null;

  return {
    semester: pickString(row, 'semester'),
    school: pickString(row, 'school'),
    programCode: pickString(row, 'programCode'),
    classCode: rawClassCode ?? '',
    classCodeAlt: pickString(row, 'classCodeAlt'),
    courseCode: rawCourseCode ?? '',
    courseName: rawCourseName ?? '',
    courseNameEn: pickString(row, 'courseNameEn'),
    creditWeight: parseCreditWeight(findValue(row, COLUMN_ALIASES.creditWeight)) ?? 0,
    note: pickString(row, 'note'),
    sessionNo: pickString(row, 'sessionNo'),
    weekday: pickString(row, 'weekday') ?? '',
    timeLabel: pickString(row, 'timeLabel') ?? compactTime?.raw ?? null,
    startTime,
    endTime,
    startPeriod: parseInteger(findValue(row, COLUMN_ALIASES.startPeriod)),
    endPeriod: parseInteger(findValue(row, COLUMN_ALIASES.endPeriod)),
    weekRange: pickString(row, 'weekRange'),
    room: pickString(row, 'room') ?? '',
    teacherName: pickString(row, 'teacherName'),
    enrollmentCount: parseInteger(findValue(row, COLUMN_ALIASES.enrollmentCount)) ?? 0,
    maxSeats: parseInteger(findValue(row, COLUMN_ALIASES.maxSeats)) ?? 0,
    status: pickString(row, 'status') ?? '',
    classType: pickString(row, 'classType') ?? '',
    openingBatch: pickString(row, 'openingBatch') ?? '',
    rawRow: row,
  };
}

function normalizeRowKeys(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value]));
}

export function parseTimetableWorkbook(buffer: Buffer, fileName: string): ParsedWorkbook {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new HttpError(400, 'File Excel khong co sheet nao hop le', { code: 'EMPTY_WORKBOOK' });
  }

  const sheet = workbook.Sheets[sheetName];
  const rowsAsArrays = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!rowsAsArrays.length) {
    throw new HttpError(400, 'File khong co du lieu dong nao', { code: 'EMPTY_SHEET' });
  }

  const headerRowIndex = rowsAsArrays.slice(0, 10).reduce((bestIndex, row, currentIndex) => {
    const score = scoreHeaderRow(row ?? []);
    const bestScore = scoreHeaderRow(rowsAsArrays[bestIndex] ?? []);
    return score > bestScore ? currentIndex : bestIndex;
  }, 0);

  const originalHeaders = (rowsAsArrays[headerRowIndex] ?? []).map((value) => (value === null || value === undefined ? '' : String(value))).filter(Boolean);
  const normalizedHeaders = originalHeaders.map((header) => normalizeKey(header));

  const rawRows = rowsAsArrays
    .slice(headerRowIndex + 1)
    .filter((row) => !isRowEmpty(row ?? []))
    .map((row) => rowArrayToObject(originalHeaders, row ?? []));

  const mappedRows = rawRows.map((row) => parseRow(normalizeRowKeys(row))).filter((row): row is TimetableRow => Boolean(row));

  const missingColumns = REQUIRED_COLUMNS.filter((column) => {
    const aliases = COLUMN_ALIASES[column.key] ?? [column.key];
    return !originalHeaders.some((header) => aliases.some((alias) => normalizeKey(header) === normalizeKey(alias)));
  });

  const invalidRows = mappedRows.filter((row) => {
    return !row.courseCode || !row.courseName || !row.classCode || !row.weekday || !row.room || !row.status || !row.classType || !row.openingBatch || row.enrollmentCount === null || row.maxSeats === null;
  });

  if (missingColumns.length > 0) {
    throw new HttpError(400, 'File khong dung format thoi khoa bieu', {
      code: 'MISSING_REQUIRED_COLUMNS',
      details: {
        fileName,
        missingColumns: missingColumns.map((column) => column.label),
        expectedColumns: REQUIRED_COLUMNS.map((column) => column.label),
      },
    });
  }

  if (invalidRows.length > 0) {
    throw new HttpError(400, 'Du lieu trong file co dong khong hop le', {
      code: 'INVALID_TIMETABLE_ROWS',
      details: {
        invalidRowCount: invalidRows.length,
      },
    });
  }

  const subjectCodes = new Set(mappedRows.map((row) => row.courseCode));

  return {
    sheetName,
    originalHeaders,
    normalizedHeaders,
    rows: mappedRows,
    subjectCount: subjectCodes.size,
    warnings: [],
  };
}
