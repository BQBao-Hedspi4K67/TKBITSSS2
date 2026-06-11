import type { ConflictPreview, TimetableSection } from '../types/timetable';
import type { TimetableClass, TimetableSubject } from '../types/timetable';

type CourseTheme = {
  accent: string;
  tint: string;
  border: string;
  text: string;
};

const courseThemes: CourseTheme[] = [
  { accent: '#2563eb', tint: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' },
  { accent: '#0f766e', tint: '#ccfbf1', border: '#5eead4', text: '#0f766e' },
  { accent: '#7c3aed', tint: '#ede9fe', border: '#c4b5fd', text: '#6d28d9' },
  { accent: '#ea580c', tint: '#ffedd5', border: '#fdba74', text: '#c2410c' },
  { accent: '#be185d', tint: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
  { accent: '#15803d', tint: '#dcfce7', border: '#86efac', text: '#166534' },
  { accent: '#b45309', tint: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  { accent: '#0f9d58', tint: '#d1fae5', border: '#6ee7b7', text: '#047857' },
];

function hashCourseCode(courseCode: string) {
  return Array.from(courseCode).reduce((hash, character) => {
    return ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }, 0);
}

function parseClockValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, '');
  if (!normalized) {
    return null;
  }

  const colonMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    return Number.parseInt(colonMatch[1], 10) * 60 + Number.parseInt(colonMatch[2], 10);
  }

  const compactMatch = normalized.match(/^(\d{3,4})$/);
  if (compactMatch) {
    const padded = compactMatch[1].padStart(4, '0');
    return Number.parseInt(padded.slice(0, 2), 10) * 60 + Number.parseInt(padded.slice(2), 10);
  }

  return null;
}

function parseRangeLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, '');
  if (!normalized) {
    return null;
  }

  const parts = normalized.split(/[-–~→]/).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const start = parseClockValue(parts[0]);
  const end = parseClockValue(parts[1]);

  if (start === null || end === null) {
    return null;
  }

  return { start, end };
}

function minutesToClockLabel(minutes: number) {
  const normalized = Math.max(0, Math.round(minutes));
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${remainder}`;
}

export function getCourseTheme(courseCode: string): CourseTheme {
  return courseThemes[Math.abs(hashCourseCode(courseCode)) % courseThemes.length];
}

function timeToMinutes(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

export function formatTimeRange(section: TimetableSection) {
  const label = section.timeLabel?.trim();
  if (label) {
    return label;
  }

  if (section.startTime && section.endTime) {
    return `${section.startTime} - ${section.endTime}`;
  }

  return 'Chưa có giờ học';
}

export function formatOccupancy(section: TimetableSection) {
  return `${section.enrollmentCount}/${section.maxSeats}`;
}

export function parseSectionTimeRange(section: TimetableSection) {
  const directStart = parseClockValue(section.startTime);
  const directEnd = parseClockValue(section.endTime);
  if (directStart !== null && directEnd !== null) {
    return {
      startMinutes: directStart,
      endMinutes: directEnd,
      label: `${minutesToClockLabel(directStart)} - ${minutesToClockLabel(directEnd)}`,
    };
  }

  const labelRange = parseRangeLabel(section.timeLabel);
  if (labelRange) {
    return {
      startMinutes: labelRange.start,
      endMinutes: labelRange.end,
      label: `${minutesToClockLabel(labelRange.start)} - ${minutesToClockLabel(labelRange.end)}`,
    };
  }

  if (section.startPeriod !== null && section.endPeriod !== null) {
    const startMinutes = 8 * 60 + (section.startPeriod - 1) * 60;
    const endMinutes = 8 * 60 + section.endPeriod * 60;
    return {
      startMinutes,
      endMinutes,
      label: `Tiết ${section.startPeriod}-${section.endPeriod}`,
    };
  }

  return null;
}

export function isClassFull(section: TimetableSection) {
  return section.enrollmentCount >= section.maxSeats;
}

export function groupSectionsBySubject(sections: TimetableSection[]) {
  return sections.reduce<Record<string, TimetableSection[]>>((accumulator, section) => {
    const current = accumulator[section.courseCode] ?? [];
    current.push(section);
    accumulator[section.courseCode] = current;
    return accumulator;
  }, {});
}

export function groupSectionsByClass(sections: TimetableSection[]) {
  return sections.reduce<Record<string, TimetableSection[]>>((accumulator, section) => {
    const key = `${section.courseCode}::${section.classCode}`;
    const current = accumulator[key] ?? [];
    current.push(section);
    accumulator[key] = current;
    return accumulator;
  }, {});
}

export function buildSubjectsFromSections(sections: TimetableSection[]): TimetableSubject[] {
  const classGroups = groupSectionsByClass(sections);
  const classesByCourse = Object.values(classGroups).reduce<Record<string, TimetableClass[]>>((accumulator, classSections) => {
    const first = classSections[0];
    const classModel: TimetableClass = {
      classCode: first.classCode,
      classCodeAlt: first.classCodeAlt,
      courseCode: first.courseCode,
      courseName: first.courseName,
      courseNameEn: first.courseNameEn,
      creditWeight: first.creditWeight,
      note: first.note,
      classType: first.classType,
      openingBatch: first.openingBatch,
      sectionCount: classSections.length,
      sections: classSections,
    };

    const current = accumulator[first.courseCode] ?? [];
    current.push(classModel);
    accumulator[first.courseCode] = current;
    return accumulator;
  }, {});

  return Object.values(classesByCourse)
    .map((courseClasses) => {
      const first = courseClasses[0];
      return {
        courseCode: first.courseCode,
        courseName: first.courseName,
        courseNameEn: first.courseNameEn,
        creditWeight: first.creditWeight,
        classCount: courseClasses.length,
        classes: courseClasses,
      } satisfies TimetableSubject;
    })
    .sort((left, right) => left.courseCode.localeCompare(right.courseCode));
}

function extractBuildingFromRoom(room: string): string {
  // Extract building from room name: "D9-503" → "D9", "B201" → "B", "A105" → "A"
  const match = room.match(/^([A-Za-z]+\d*)/);
  return match ? match[1] : room;
}

export function detectLocalConflicts(sections: TimetableSection[]): ConflictPreview[] {
  const conflicts: ConflictPreview[] = [];

  for (let leftIndex = 0; leftIndex < sections.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sections.length; rightIndex += 1) {
      const left = sections[leftIndex];
      const right = sections[rightIndex];
      if (left.weekday !== right.weekday) {
        continue;
      }

      const leftStart = timeToMinutes(left.startTime);
      const leftEnd = timeToMinutes(left.endTime);
      const rightStart = timeToMinutes(right.startTime);
      const rightEnd = timeToMinutes(right.endTime);

      if (leftStart === null || leftEnd === null || rightStart === null || rightEnd === null) {
        continue;
      }

      const overlaps = leftStart < rightEnd && rightStart < leftEnd;
      if (overlaps) {
        conflicts.push({
          type: 'TIME_OVERLAP',
          severity: 'HIGH',
          message: `${left.courseCode} và ${right.courseCode} trùng giờ vào ngày thứ ${left.weekday}`,
          metadata: { left, right },
        });
        continue;
      }

      const gap = Math.min(Math.abs(rightStart - leftEnd), Math.abs(leftStart - rightEnd));
      const leftBuilding = extractBuildingFromRoom(left.room);
      const rightBuilding = extractBuildingFromRoom(right.room);
      const differentBuilding = leftBuilding !== rightBuilding;
      if (differentBuilding && gap > 0 && gap < 15) {
        conflicts.push({
          type: 'LOCATION_GAP',
          severity: 'MEDIUM',
          message: `${left.courseCode} và ${right.courseCode} cảnh báo di chuyển gấp (cách ${gap} phút, ${leftBuilding}→${rightBuilding}) vào ngày ${left.weekday}`,
          metadata: { left, right, gap, leftBuilding, rightBuilding },
        });
      }
    }
  }

  return conflicts;
}
