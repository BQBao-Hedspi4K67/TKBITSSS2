import type { TimetableClass, TimetableSection, TimetableSubject } from '../types/timetable';

export type AutoScheduleStrategy =
  | 'NO_OVERLAP'
  | 'CONVENIENT_TRAVEL'
  | 'MOST_DAYS_OFF'
  | 'CUSTOM_DAY_OFF'
  | 'MORNING_ONLY'
  | 'AFTERNOON_ONLY'
  | 'OFF_MONDAY'
  | 'OFF_TUESDAY'
  | 'OFF_WEDNESDAY'
  | 'OFF_THURSDAY'
  | 'OFF_FRIDAY'
  | 'OFF_SATURDAY';

export type AutoScheduleResult = {
  classes: TimetableClass[];
  sections: TimetableSection[];
} | null;

const SESSION_MORNING_START = 6 * 60 + 45;
const SESSION_MORNING_END = 11 * 60 + 45;
const SESSION_AFTERNOON_START = 12 * 60 + 30;
const SESSION_AFTERNOON_END = 17 * 60 + 30;

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
      if (extractBuilding(a.room) === extractBuilding(b.room)) continue;
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

  const classOptions: TimetableClass[][] = selectedSubjects
    .filter((s) => s.classes.length > 0)
    .map((s) => s.classes);

  if (classOptions.length === 0) return null;

  const allCombinations = generateCombinations(classOptions);

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
    candidates = allCombinations.filter((combo) => {
      const sections = flattenSections(combo);
      return !hasOverlap(sections) && !hasLocationGap(sections);
    });
  } else if (strategy === 'MOST_DAYS_OFF') {
    const validCombos = allCombinations.filter((combo) => !hasOverlap(flattenSections(combo)));
    if (validCombos.length === 0) {
      candidates = [];
    } else {
      let bestCombo: TimetableClass[] | null = null;
      let bestDays = 99;
      for (const combo of validCombos) {
        const days = countDaysWithClass(flattenSections(combo)).size;
        if (days < bestDays) {
          bestDays = days;
          bestCombo = combo;
        }
      }
      candidates = bestCombo ? [bestCombo] : validCombos.slice(0, 1);
    }
  } else if (strategy === 'MORNING_ONLY') {
    candidates = allCombinations.filter((combo) => {
      const sections = flattenSections(combo);
      if (hasOverlap(sections)) return false;
      return sections.every((s) => {
        const end = parseTimeToMinutes(s.endTime ?? '');
        if (end === null) return false;
        return end <= 12 * 60;
      });
    });
  } else if (strategy === 'AFTERNOON_ONLY') {
    candidates = allCombinations.filter((combo) => {
      const sections = flattenSections(combo);
      if (hasOverlap(sections)) return false;
      return sections.every((s) => {
        const start = parseTimeToMinutes(s.startTime ?? '');
        if (start === null) return false;
        return start >= 12 * 60;
      });
    });
  } else if (strategy.startsWith('OFF_')) {
    const dayOff = strategy.replace('OFF_', '');
    const dayMap: Record<string, string> = {
      'MONDAY': '2',
      'TUESDAY': '3',
      'WEDNESDAY': '4',
      'THURSDAY': '5',
      'FRIDAY': '6',
      'SATURDAY': '7',
    };
    const offDay = dayMap[dayOff];
    candidates = allCombinations.filter((combo) => {
      const sections = flattenSections(combo);
      if (hasOverlap(sections)) return false;
      return !sections.some((s) => s.weekday === offDay);
    });
  }

  if (candidates.length === 0) return null;

  const chosen = candidates[0];
  return {
    classes: chosen,
    sections: flattenSections(chosen),
  };
}

function countOverlappingPairs(sections: TimetableSection[]): number {
  let count = 0;
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
      if (aStart < bEnd && bStart < aEnd) count += 1;
    }
  }
  return count;
}

/**
 * Find best candidate combination for given subjects and a constraint function.
 * If no candidate passes the constraint, returns the combo with minimal overlaps.
 */
export function findBestCandidate(
  selectedSubjects: TimetableSubject[],
  constraintFn: (sections: TimetableSection[]) => boolean = () => true,
): AutoScheduleResult {
  if (selectedSubjects.length === 0) return null;

  const classOptions: TimetableClass[][] = selectedSubjects
    .filter((s) => s.classes.length > 0)
    .map((s) => s.classes);

  if (classOptions.length === 0) return null;

  const allCombinations = generateCombinations(classOptions);

  // First try to find any combo that satisfies the constraint.
  for (const combo of allCombinations) {
    const sections = flattenSections(combo);
    if (constraintFn(sections)) {
      return { classes: combo, sections };
    }
  }

  // No perfect match found: pick combo with minimal overlapping pairs and minimal location gaps.
  let bestCombo: TimetableClass[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const combo of allCombinations) {
    const sections = flattenSections(combo);
    const overlaps = countOverlappingPairs(sections);
    const locationPenalty = hasLocationGap(sections) ? 1 : 0;
    const score = overlaps * 100 + locationPenalty * 10;
    if (score < bestScore) {
      bestScore = score;
      bestCombo = combo;
    }
  }

  if (!bestCombo) return null;
  return { classes: bestCombo, sections: flattenSections(bestCombo) };
}

/**
 * Auto schedule with multiple strategies combined (all must pass). If none found,
 * returns best candidate (may include overlaps) using fallback.
 */
export function autoScheduleMultiStrategies(
  selectedSubjects: TimetableSubject[],
  strategies: AutoScheduleStrategy[],
  offSessions: Set<string> = new Set(),
): AutoScheduleResult {
  if (strategies.length === 0) return autoSchedule(selectedSubjects, 'NO_OVERLAP', offSessions);

  const constraintFn = (sections: TimetableSection[]) => {
    // evaluate all selected strategies; if any fails, return false
    for (const strat of strategies) {
      if (strat === 'NO_OVERLAP') {
        if (hasOverlap(sections)) return false;
      } else if (strat === 'CONVENIENT_TRAVEL') {
        if (hasOverlap(sections) || hasLocationGap(sections)) return false;
      } else if (strat === 'MOST_DAYS_OFF') {
        // prefer fewer days, allow but not enforce here
      } else if (strat === 'MORNING_ONLY') {
        if (!sections.every((s) => {
          const end = parseTimeToMinutes(s.endTime ?? '');
          return end !== null && end <= 12 * 60;
        })) return false;
      } else if (strat === 'AFTERNOON_ONLY') {
        if (!sections.every((s) => {
          const start = parseTimeToMinutes(s.startTime ?? '');
          return start !== null && start >= 12 * 60;
        })) return false;
      } else if (strat === 'CUSTOM_DAY_OFF') {
        if (offSessions.size > 0 && violatesDayOff(sections, offSessions)) return false;
      } else if (strat.startsWith('OFF_')) {
        const day = strat.replace('OFF_', '');
        const dayMap: Record<string, string> = {
          'MONDAY': '2',
          'TUESDAY': '3',
          'WEDNESDAY': '4',
          'THURSDAY': '5',
          'FRIDAY': '6',
          'SATURDAY': '7',
        };
        const offDay = dayMap[day];
        if (sections.some((s) => s.weekday === offDay)) return false;
      }
    }
    return true;
  };

  // Try to find exact match
  const exact = findBestCandidate(selectedSubjects, constraintFn);
  if (exact) return exact;

  // Fallback to best candidate even if overlapping
  return findBestCandidate(selectedSubjects, () => true);
}
