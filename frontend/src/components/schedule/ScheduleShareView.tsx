import { useEffect, useMemo, useState } from 'react';
import { getSharedScheduleBySlug } from '../../services/timetableService';
import { getCourseTheme } from '../../utils/timetable';

type ScheduleShareViewProps = {
  slug: string;
  scheduleName: string;
  permission: 'VIEW' | 'COMMENT';
  onClose: () => void;
  onSendComment: (comment: string) => void | Promise<void>;
};

type CalendarRange = {
  startMinutes: number;
  endMinutes: number;
  label: string;
};

const weekdayOrder = ['2', '3', '4', '5', '6', '7', 'CN'];
const weekdayLabels: Record<string, string> = {
  '2': 'Thứ 2', '3': 'Thứ 3', '4': 'Thứ 4', '5': 'Thứ 5', '6': 'Thứ 6', '7': 'Thứ 7', 'CN': 'CN',
};

function parseMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

type SharedScheduleItem = {
  id: string;
  courseCode: string;
  courseName: string;
  classCode: string;
  weekday: string;
  startTime: string;
  endTime: string;
  room: string;
  building: string | null;
};

export function ScheduleShareView({ slug, scheduleName, permission, onClose, onSendComment }: ScheduleShareViewProps) {
  const [schedule, setSchedule] = useState<{
    id: string;
    name: string;
    user: { fullName: string; studentCode: string | null };
    items: SharedScheduleItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getSharedScheduleBySlug(slug);
        if (!cancelled) setSchedule(data.schedule);
      } catch (err) {
        if (!cancelled) setError('Không thể tải lịch');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [slug]);

  const handleSendComment = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);
    try {
      await onSendComment(comment.trim());
      // Close modal and let parent handle displaying the message
      onClose();
    } finally {
      setSending(false);
    }
  };

  // Build calendar view like ScheduleDashboard
  const calendarStartMinutes = 6 * 60 + 45;
  const calendarEndMinutes = 17 * 60 + 30;
  const slotMinutes = 45;
  const slotHeight = 40;
  const slotCount = Math.max(1, Math.ceil((calendarEndMinutes - calendarStartMinutes) / slotMinutes));

  const hourLabels = useMemo(() => {
    return Array.from({ length: slotCount + 1 }, (_, index) => {
      const minutes = calendarStartMinutes + index * slotMinutes;
      const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
      const mins = String(minutes % 60).padStart(2, '0');
      return `${hours}:${mins}`;
    });
  }, [slotCount]);

  const calendarHeight = slotCount * slotHeight;

  // Convert items to calendar events
  const calendarEvents = useMemo(() => {
    if (!schedule) return [];
    return schedule.items.map((item) => {
      const start = parseMinutes(item.startTime);
      const end = parseMinutes(item.endTime);
      if (start === null || end === null) return null;
      const topMinutes = Math.max(0, start - calendarStartMinutes);
      const durationMinutes = Math.max(30, end - start);
      const theme = getCourseTheme(item.courseCode);
      const rangeLabel = `${item.startTime} - ${item.endTime}`;
      return {
        id: item.id,
        courseCode: item.courseCode,
        courseName: item.courseName,
        classCode: item.classCode,
        room: item.room,
        weekday: item.weekday,
        startTime: item.startTime,
        endTime: item.endTime,
        theme,
        top: (topMinutes / slotMinutes) * slotHeight,
        height: Math.max(36, (durationMinutes / slotMinutes) * slotHeight),
        range: { startMinutes: start, endMinutes: end, label: rangeLabel } as CalendarRange,
      };
    }).filter(Boolean) as Array<{
      id: string;
      courseCode: string;
      courseName: string;
      classCode: string;
      room: string;
      weekday: string;
      startTime: string;
      endTime: string;
      theme: ReturnType<typeof getCourseTheme>;
      top: number;
      height: number;
      range: CalendarRange;
    }>;
  }, [schedule]);

  const legendItems = useMemo(() => {
    if (!schedule) return [];
    const grouped: Record<string, { courseCode: string; courseName: string }> = {};
    schedule.items.forEach((item) => {
      if (!grouped[item.courseCode]) {
        grouped[item.courseCode] = { courseCode: item.courseCode, courseName: item.courseName };
      }
    });
    return Object.values(grouped).map((item) => ({
      ...item,
      theme: getCourseTheme(item.courseCode),
    }));
  }, [schedule]);

  if (loading) {
    return (
      <div className="tempo-modal-overlay" role="presentation" onClick={onClose}>
        <div className="tempo-modal-card tempo-calendar-detail-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="tempo-chat-share-loading">Đang tải lịch...</div>
        </div>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="tempo-modal-overlay" role="presentation" onClick={onClose}>
        <div className="tempo-modal-card tempo-calendar-detail-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="tempo-chat-share-error">{error ?? 'Không tìm thấy lịch'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="tempo-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="tempo-modal-card tempo-calendar-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={scheduleName}
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: 1060 }}
      >
        {/* Header */}
        <div className="tempo-panel-toolbar tempo-modal-toolbar">
          <div>
            <h3>{scheduleName}</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {schedule.user.fullName} · {schedule.user.studentCode ?? ''} · {schedule.items.length} lớp
            </p>
          </div>
          <button type="button" className="tempo-secondary-button" onClick={onClose}>
            Đóng
          </button>
        </div>

        {/* Legend */}
        <div className="tempo-calendar-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {legendItems.map((item) => (
            <div key={item.courseCode} className="tempo-calendar-legend-item">
              <span className="tempo-calendar-legend-swatch" style={{ backgroundColor: item.theme.accent }} />
              <div>
                <strong>{item.courseCode}</strong>
                <span>{item.courseName}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar like ScheduleDashboard */}
        <div className="tempo-calendar-board" style={{ marginTop: 12 }}>
          <div className="tempo-calendar-head">
            <div className="tempo-calendar-corner" />
            {weekdayOrder.map((weekday) => (
              <div key={weekday} className="tempo-calendar-day-head">
                {weekdayLabels[weekday]}
              </div>
            ))}
          </div>

          <div className="tempo-calendar-grid-wrap" style={{ ['--calendar-height' as string]: `${calendarHeight}px`, minWidth: 0 }}>
            <div className="tempo-calendar-time-column">
              {hourLabels.map((label, index) => (
                <div key={label} className="tempo-calendar-time-label" style={{ top: index * slotHeight }}>
                  {label}
                </div>
              ))}
            </div>

            <div className="tempo-calendar-days-grid">
              {weekdayOrder.map((weekday) => {
                const dayEvents = calendarEvents
                  .filter((ev) => ev.weekday === weekday)
                  .sort((a, b) => a.range.startMinutes - b.range.startMinutes);

                return (
                  <div key={weekday} className="tempo-calendar-day-column" style={{ height: calendarHeight }}>
                    {hourLabels.slice(0, -1).map((_, index) => (
                      <div key={`${weekday}-${index}`} className="tempo-calendar-hour-line" style={{ top: index * slotHeight }} />
                    ))}

                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="tempo-calendar-event is-selected"
                        style={{
                          top: event.top,
                          height: event.height,
                          left: 0,
                          width: '100%',
                          backgroundColor: event.theme.tint,
                          borderColor: event.theme.border,
                          color: event.theme.text,
                        }}
                        title={event.room}
                      >
                        <div className="tempo-calendar-event-code">{event.courseCode}</div>
                        <div className="tempo-calendar-event-title">{event.classCode}</div>
                        <div className="tempo-calendar-event-meta">{event.courseName}</div>
                        <div className="tempo-calendar-event-meta">{event.range.label}</div>
                        <div className="tempo-calendar-event-meta">{event.room}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Comment section - only show if permission allows */}
        {permission === 'COMMENT' && (
          <div className="tempo-chat-share-comment" style={{ marginTop: 12 }}>
            <div className="tempo-share-section-label">Nhận xét</div>
            <div className="tempo-chat-share-comment-row">
              <input
                type="text"
                className="tempo-chat-input"
                placeholder="Viết nhận xét về lịch này..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendComment();
                }}
                disabled={sending}
              />
              <button
                type="button"
                className="tempo-primary-button"
                onClick={handleSendComment}
                disabled={!comment.trim() || sending}
              >
                {sending ? 'Đang gửi...' : 'Gửi nhận xét'}
              </button>
            </div>
          </div>
        )}

        {permission === 'VIEW' && (
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 8 }}>
            Bạn có quyền xem lịch này.
          </p>
        )}
      </div>
    </div>
  );
}
