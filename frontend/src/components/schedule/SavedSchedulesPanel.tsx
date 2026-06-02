import { getCourseTheme } from '../../utils/timetable';
import type { SavedSchedule } from '../../types/schedule';

type SavedSchedulesPanelProps = {
  schedules: SavedSchedule[];
  onView: (scheduleId: string) => void | Promise<void>;
  onDelete: (scheduleId: string) => void | Promise<void>;
  onShare: (scheduleId: string) => void | Promise<void>;
  onSaveCurrent: () => void | Promise<void>;
};

const weekdayOrder = ['2', '3', '4', '5', '6', '7', 'CN'];
const weekdayLabels: Record<string, string> = {
  '2': 'T2',
  '3': 'T3',
  '4': 'T4',
  '5': 'T5',
  '6': 'T6',
  '7': 'T7',
  CN: 'CN',
};

function parseMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

function buildPeriodLabel(schedule: SavedSchedule) {
  const parts = [schedule.semester, schedule.academicYear].filter((value): value is string => Boolean(value && value.trim()));
  return parts.join(' · ');
}

export function SavedSchedulesPanel({ schedules, onView, onDelete, onShare, onSaveCurrent }: SavedSchedulesPanelProps) {
  return (
    <div className="tempo-dashboard-panel">
      <div className="tempo-panel-toolbar">
        <div>
          <h3>Lịch đã lưu</h3>
          
        </div>
        <button type="button" className="tempo-secondary-button" onClick={onSaveCurrent}>
          Save current schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="tempo-empty-state">Chưa có lịch nào được lưu.</div>
      ) : (
        <div className="tempo-schedule-list">
          {schedules.map((schedule) => (
            <article key={schedule.id} className="tempo-schedule-card">
              <div className="tempo-schedule-card-header">
                <div>
                  <div className="tempo-schedule-title">{schedule.name}</div>
                  <div className="tempo-schedule-meta">{schedule.status} · {schedule.items.length} lớp · {schedule.conflicts.length} xung đột</div>
                  {buildPeriodLabel(schedule) ? <div className="tempo-schedule-meta">{buildPeriodLabel(schedule)}</div> : null}
                </div>
                <span className={schedule.conflicts.length > 0 ? 'tempo-badge is-danger' : 'tempo-badge is-success'}>
                  {schedule.conflicts.length > 0 ? 'Có cảnh báo' : 'An toàn'}
                </span>
              </div>

              <div className="tempo-schedule-mini-calendar" aria-label={`Preview ${schedule.name}`}>
                {weekdayOrder.map((weekday) => {
                  const dayItems = schedule.items
                    .filter((item) => item.weekday === weekday)
                    .sort((left, right) => left.startTime.localeCompare(right.startTime));

                  return (
                    <div key={weekday} className="tempo-schedule-mini-day">
                      <div className="tempo-schedule-mini-day-label">{weekdayLabels[weekday]}</div>
                      <div className="tempo-schedule-mini-day-track">
                        {dayItems.map((item, index) => {
                          const start = parseMinutes(item.startTime);
                          const end = parseMinutes(item.endTime);
                          const top = start !== null ? Math.max(0, ((start - (6 * 60 + 45)) / (10 * 60 + 45)) * 100) : index * 14;
                          const height = start !== null && end !== null ? Math.max(14, ((end - start) / (10 * 60 + 45)) * 100) : 14;
                          const theme = getCourseTheme(item.courseCode);

                          return (
                            <div
                              key={item.id}
                              className="tempo-schedule-mini-block"
                              style={{
                                top: `${top}%`,
                                height: `${height}%`,
                                backgroundColor: item.color ?? theme.tint,
                                borderColor: item.color ?? theme.border,
                              }}
                              title={`${item.courseCode} ${item.classCode} · ${item.startTime} - ${item.endTime}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="tempo-actions-row" style={{ justifyContent: 'flex-start' }}>
                <button type="button" className="tempo-secondary-button" onClick={() => onView(schedule.id)}>
                  View
                </button>
                <button type="button" className="tempo-secondary-button" onClick={() => onShare(schedule.id)}>
                  Share
                </button>
                <button type="button" className="tempo-secondary-button" onClick={() => onDelete(schedule.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
