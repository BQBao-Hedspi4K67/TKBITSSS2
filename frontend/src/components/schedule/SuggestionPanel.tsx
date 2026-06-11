import { useMemo } from 'react';
import { getCourseTheme, parseSectionTimeRange } from '../../utils/timetable';
import { autoSchedule, type AutoScheduleStrategy, type AutoScheduleResult } from '../../utils/autoSchedule';
import type { TimetableClass, TimetableSection, TimetableSubject } from '../../types/timetable';

type SuggestionPanelProps = {
  subjects: TimetableSubject[];
  onApply: (result: AutoScheduleResult) => void;
};

type SuggestionItem = {
  strategy: AutoScheduleStrategy;
  label: string;
  tags: string[];
  result: AutoScheduleResult;
};

const SESSION_MORNING = 6 * 60 + 45;
const SESSION_EVENING = 17 * 60 + 30;

const STRATEGIES: Array<{ strategy: AutoScheduleStrategy; label: string; tags: string[] }> = [
  { strategy: 'MOST_DAYS_OFF', label: 'Nghỉ nhiều buổi nhất', tags: ['Nghỉ nhiều', 'Tối ưu'] },
  { strategy: 'CONVENIENT_TRAVEL', label: 'Di chuyển thuận tiện', tags: ['Ít di chuyển', 'Cùng tòa'] },
  { strategy: 'MORNING_ONLY', label: 'Chỉ học sáng', tags: ['Học sáng', '7h-12h'] },
  { strategy: 'AFTERNOON_ONLY', label: 'Chỉ học chiều', tags: ['Học chiều', '13h-17h'] },
  { strategy: 'OFF_MONDAY', label: 'Nghỉ thứ 2', tags: ['Nghỉ T2'] },
  { strategy: 'OFF_TUESDAY', label: 'Nghỉ thứ 3', tags: ['Nghỉ T3'] },
  { strategy: 'OFF_WEDNESDAY', label: 'Nghỉ thứ 4', tags: ['Nghỉ T4'] },
  { strategy: 'OFF_THURSDAY', label: 'Nghỉ thứ 5', tags: ['Nghỉ T5'] },
  { strategy: 'OFF_FRIDAY', label: 'Nghỉ thứ 6', tags: ['Nghỉ T6'] },
  { strategy: 'OFF_SATURDAY', label: 'Nghỉ thứ 7', tags: ['Nghỉ T7'] },
];

function computeScore(sections: TimetableSection[]): number {
  if (sections.length === 0) return 0;
  let score = 100;

  // Deduct for conflicts
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
      // Time overlap
      if (aStart < bEnd && bStart < aEnd) {
        score -= 40;
      }
      // Location gap
      const gap = Math.min(Math.abs(bStart - aEnd), Math.abs(aStart - bEnd));
      if (gap > 0 && gap < 15) {
        score -= 15;
      }
    }
  }

  // Penalty for spread-out schedule (each extra day with class)
  const days = new Set(sections.map((s) => s.weekday)).size;
  if (days >= 5) score -= 10;
  else if (days >= 4) score -= 5;

  // Penalty for mixed morning/afternoon
  const hasMorning = sections.some((s) => {
    const start = parseTimeToMinutes(s.startTime ?? '');
    return start !== null && start < 12 * 60;
  });
  const hasAfternoon = sections.some((s) => {
    const start = parseTimeToMinutes(s.startTime ?? '');
    return start !== null && start >= 12 * 60;
  });
  if (hasMorning && hasAfternoon) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

function MiniCalendarPreview({ sections }: { sections: TimetableSection[] }) {
  const weekdayOrder = ['2', '3', '4', '5', '6', '7'];
  const slotCount = 12; // 6:45 - 17:30
  const slotHeight = 6;

  const daySlots = useMemo(() => {
    return weekdayOrder.map((weekday) => {
      const daySections = sections.filter((s) => s.weekday === weekday);
      const slots: number[] = [];
      for (const sec of daySections) {
        const range = parseSectionTimeRange(sec);
        if (!range) continue;
        const startSlot = Math.max(0, Math.floor((range.startMinutes - SESSION_MORNING) / 60));
        const endSlot = Math.min(slotCount, Math.ceil((range.endMinutes - SESSION_MORNING) / 60));
        for (let i = startSlot; i < endSlot; i++) {
          slots.push(i);
        }
      }
      return { weekday, slots };
    });
  }, [sections]);

  return (
    <div className="tempo-suggestion-mini-cal">
      {daySlots.map(({ weekday, slots }) => (
        <div key={weekday} className="tempo-suggestion-mini-day">
          <div className="tempo-suggestion-mini-label">
            {weekday === '2' ? 'T2' : weekday === '3' ? 'T3' : weekday === '4' ? 'T4' : weekday === '5' ? 'T5' : weekday === '6' ? 'T6' : 'T7'}
          </div>
          <div className="tempo-suggestion-mini-track">
            {Array.from({ length: slotCount }, (_, i) => (
              <div
                key={i}
                className={`tempo-suggestion-mini-slot ${slots.includes(i) ? 'is-filled' : ''}`}
                style={{ height: slotHeight }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SuggestionPanel({ subjects, onApply }: SuggestionPanelProps) {
  const suggestions = useMemo<SuggestionItem[]>(() => {
    const results: SuggestionItem[] = [];

    for (const { strategy, label, tags } of STRATEGIES) {
      const result = autoSchedule(subjects, strategy);
      // Only include suggestions that have no time overlap
      if (result) {
        const sections = result.sections;
        let hasOverlapLocal = false;
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
            if (aStart < bEnd && bStart < aEnd) {
              hasOverlapLocal = true;
              break;
            }
          }
          if (hasOverlapLocal) break;
        }
        if (!hasOverlapLocal) {
          results.push({ strategy, label, tags, result });
        }
      }
      if (results.length >= 3) break;
    }

    return results;
  }, [subjects]);

  if (suggestions.length === 0 || subjects.length === 0) {
    return null;
  }

  return (
    <div className="tempo-suggestion-panel-dash">
      <div className="tempo-suggestion-panel-dash-header">
        <span className="tempo-suggestion-panel-dash-title">Phương án gợi ý</span>
        <span className="tempo-suggestion-panel-dash-count">{suggestions.length} phương án</span>
      </div>

      {suggestions.map((item, index) => {
        if (!item.result) return null;
        const score = computeScore(item.result.sections);
        const scoreColor = score >= 80 ? 'var(--color-success)' : score >= 60 ? '#EF9F27' : 'var(--color-danger)';
        const scoreBg = score >= 80 ? '#EAF3DE' : score >= 60 ? '#FAEEDA' : '#FCEBEB';

        return (
          <div key={item.strategy} className="tempo-suggestion-card">
            <div className="tempo-suggestion-card-header">
              <span className="tempo-suggestion-card-name">
                {index === 0 && subjects.length >= 3 ? '⭐ ' : ''}{item.label}
              </span>
              <span className="tempo-suggestion-card-score" style={{ color: scoreColor, background: scoreBg }}>
                {score}%
              </span>
            </div>

            <div className="tempo-suggestion-card-bar">
              <div className="tempo-suggestion-card-bar-fill" style={{ width: `${score}%`, backgroundColor: scoreColor }} />
            </div>

            <div className="tempo-suggestion-card-tags">
              {item.tags.map((tag) => (
                <span key={tag} className="tempo-suggestion-tag">{tag}</span>
              ))}
              <span className="tempo-suggestion-tag tempo-suggestion-tag--info">
                {item.result.classes.length} môn
              </span>
            </div>

            <MiniCalendarPreview sections={item.result.sections} />

            <div className="tempo-suggestion-card-actions">
              <button
                type="button"
                className="tempo-secondary-button tempo-suggestion-btn"
                onClick={() => onApply(item.result)}
              >
                Áp dụng
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
