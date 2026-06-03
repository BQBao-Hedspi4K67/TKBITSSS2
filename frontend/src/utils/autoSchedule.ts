import type { TimetableClass, TimetableSection, TimetableSubject } from '../types/timetable';

export type AutoScheduleStrategy =
  | 'NO_OVERLAP'
  | 'CONVENIENT_TRAVEL'
  | 'MOST_DAYS_OFF'
  | 'CUSTOM_DAY_OFF';

export type AutoScheduleResult = {
  classes: TimetableClass[];
  sections: TimetableSection[];
} | null;

const SESSION_MORNING_START = 6 * 60 + 45; // 06:45
const SESSION_MORNING_END = 11 * 60 + 45;  // 11:45
const SESSION_AFTERNOON_START = 12 * 60 + 30; // 12:30
const SESSION_AFTERNOON_END = 17 * 60 + 30;  // 17:30

function extractBuilding(room: string): string {
  const match = room.match(/^([A-Za-z]+\d*)/);
  return match ? match[1] : room;
}

function sessionOfTime(time: string): 'morning' | 'afternoon' | null {
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return null;
  if (minutes >= SESSION_MORNING_START && minutes <= SESSION_MORNING_END) return 'morning';
  if (minutes >= SESSION_AFTERNOON_START && minutes <= SESSION_AFTERNOON_END) return 'afternoon';
  return null;
}

function parseTimeToMinutes(time: string): number | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

function getSessionKey(weekday: string, time: string): string {
  const session = sessionOfTime(time);
  if (!session) return '';
  return `${weekday}-${session}`;
}

function hasOverlap(sections: TimetableSection[]): boolean {
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const a = sections[i];
      const b = sections[j];
      if (a.weekday !== b.weekday) continue;
      const aStart = parseTimeToMinutes(a.startTime ?? '');
      const aEnd = parseTimeToMinutes(a.endTime ?? '');
      const bStart = parseTimeToMinutes(b.startTime ?? '');
      const bEnd = parseTimeToMinutes(b.endTime ?? '');
      if (aStart === null || aEnd === null || bStart === null || bEnd === null) continue;
      if (aStart < bEnd && bStart < aEnd) return true;
    }
  }
  return false;
}

function hasLocationGap(sections: TimetableSection[]): boolean {
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const a = sections[i];
      const b = sections[j];
      if (a.weekday !== b.weekday) continue;
      const aEnd = parseTimeToMinutes(a.endTime ?? '');
      const bStart = parseTimeToMinutes(b.startTime ?? '');
      const aStart = parseTimeToMinutes(a.startTime ?? '');
      const bEnd = parseTimeToMinutes(b.endTime ?? '');
      if (aEnd === null || bStart === null || aStart === null || bEnd === null) continue;
      // Check if classes are on different buildings
      if (extractBuilding(a.room) === extractBuilding(b.room)) continue;
      // Get gap (only if they are not overlapping)
      const gap = bStart - aEnd;
      if (gap > 0 && gap < 15) return true;
      const gap2 = aStart - bEnd;
      if (gap2 > 0 && gap2 < 15) return true;
    }
  }
  return false;
}

function countDaysWithClass(sections: TimetableSection[]): Set<string> {
  return new Set(sections.map((s) => s.weekday));
}

function violatesDayOff(sections: TimetableSection[], offSessions: Set<string>): boolean {
  for (const s of sections) {
    if (!s.startTime) continue;
    const key = getSessionKey(s.weekday, s.startTime);
    if (key && offSessions.has(key)) return true;
  }
  return false;
}

function generateCombinations(classes: TimetableClass[][]): TimetableClass[][] {
  if (classes.length === 0) return [[]];
  const [first, ...rest] = classes;
  const restCombinations = generateCombinations(rest);
  const result: TimetableClass[][] = [];
  for (const cls of first) {
    for (const combo of restCombinations) {
      result.push([cls, ...combo]);
    }
  }
  return result;
}

function flattenSections(classes: TimetableClass[]): TimetableSection[] {
  const sections: TimetableSection[] = [];
  for (const cls of classes) {
    sections.push(...cls.sections);
  }
  return sections;
}

export function autoSchedule(
  selectedSubjects: TimetableSubject[],
  strategy: AutoScheduleStrategy,
  offSessions: Set<string> = new Set(),
): AutoScheduleResult {
  if (selectedSubjects.length === 0) return null;

  // For each subject, prepare list of possible classes
  const classOptions: TimetableClass[][] = selectedSubjects
    .filter((s) => s.classes.length > 0)
    .map((s) => s.classes);

  if (classOptions.length === 0) return null;

  const allCombinations = generateCombinations(classOptions);

  // Filter by strategy
  let candidates: TimetableClass[][] = [];

  if (strategy === 'CUSTOM_DAY_OFF') {
    candidates = allCombinations.filter((combo) => {
      const sections = flattenSections(combo);
      return !violatesDayOff(sections, offSessions);
    });
  } else if (strategy === 'NO_OVERLAP') {
    candidates = allCombinations.filter((combo) => {
      const sections = flattenSections(combo);
      return !hasOverlap(sections);
    });
  } else if (strategy === 'CONVENIENT_TRAVEL') {
    // No overlap AND no location gap
    candidates = allCombinations.filter((combo) => {
      const sections = flattenSections(combo);
      return !hasOverlap(sections) && !hasLocationGap(sections);
    });
  } else if (strategy === 'MOST_DAYS_OFF') {
    // No overlap, prefer the one with most days off
    const validCombos = allCombinations.filter((combo) => !hasOverlap(flattenSections(combo)));
    if (validCombos.length === 0) {
      candidates = [];
    } else {
      // Find combo with most days off (minimize number of weekdays used)
      let bestCombo: TimetableClass[] | null = null;
      let bestDays = 99;
      for (const combo of validCombos) {
        const days = countDaysWithClass(flattenSections(combo)).size;
        if (days < bestDays) {
          bestDays = days;
          bestCombo = combo;
        }
      }
      // Return first valid combo to keep the loop bounded
      candidates = bestCombo ? [bestCombo] : validCombos.slice(0, 1);
    }
  }

  if (candidates.length === 0) return null;

  // Pick the first candidate (already best)
  const chosen = candidates[0];
  return {
    classes: chosen,
    sections: flattenSections(chosen),
  };
}
