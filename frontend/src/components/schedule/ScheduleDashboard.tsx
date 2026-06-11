import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ConflictPreview } from '../../types/timetable';
import { detectLocalConflicts, getCourseTheme, parseSectionTimeRange } from '../../utils/timetable';
import type { TimetableClass, TimetableSection, TimetableSubject } from '../../types/timetable';
import { ConflictPanel } from './ConflictPanel';
import { isClassFull } from '../../utils/timetable';
import { SuggestionPanel } from './SuggestionPanel';
import { ConflictAlert } from './ConflictAlert';
import type { AutoScheduleResult } from '../../utils/autoSchedule';
import { autoResolveConflict } from '../../utils/autoSchedule';

type ScheduleDashboardProps = {
  sections: TimetableSection[];
  subject: TimetableSubject | null;
  selectedClassCode?: string;
  onChooseClass: (classItem: TimetableClass) => void;
  showHeader?: boolean;
  toolbarActions?: ReactNode;
  subjects?: TimetableSubject[];
  onApplySuggestion?: (result: AutoScheduleResult) => void;
  allSubjects?: TimetableSubject[];
};

type CalendarRange = {
  startMinutes: number;
  endMinutes: number;
  label: string;
};

type CalendarEventItem = {
  id: string;
  kind: 'selected' | 'preview';
  section: TimetableSection;
  classItem: TimetableClass;
  range: CalendarRange;
  theme: ReturnType<typeof getCourseTheme>;
  top: number;
  height: number;
  isDisabled?: boolean;
};

type LayoutEventItem = CalendarEventItem & {
  columnIndex: number;
  columnCount: number;
};

function layoutOverlapColumns(events: CalendarEventItem[]) {
  const sortedEvents = [...events].sort((left, right) => {
    if (left.range.startMinutes !== right.range.startMinutes) {
      return left.range.startMinutes - right.range.startMinutes;
    }

    if (left.range.endMinutes !== right.range.endMinutes) {
      return left.range.endMinutes - right.range.endMinutes;
    }

    if (left.kind !== right.kind) {
      return left.kind === 'selected' ? -1 : 1;
    }

    return left.id.localeCompare(right.id);
  });

  const clusters: CalendarEventItem[][] = [];
  let currentCluster: CalendarEventItem[] = [];
  let currentClusterEnd = -1;

  sortedEvents.forEach((event) => {
    if (!currentCluster.length || event.range.startMinutes < currentClusterEnd) {
      currentCluster.push(event);
      currentClusterEnd = Math.max(currentClusterEnd, event.range.endMinutes);
      return;
    }

    clusters.push(currentCluster);
    currentCluster = [event];
    currentClusterEnd = event.range.endMinutes;
  });

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  return clusters.flatMap((cluster) => {
    const columnEndTimes: number[] = [];
    const laidOutEvents: Array<{ event: CalendarEventItem; columnIndex: number }> = [];

    cluster.forEach((event) => {
      let columnIndex = columnEndTimes.findIndex((endTime) => endTime <= event.range.startMinutes);

      if (columnIndex < 0) {
        columnIndex = columnEndTimes.length;
        columnEndTimes.push(event.range.endMinutes);
      } else {
        columnEndTimes[columnIndex] = event.range.endMinutes;
      }

      laidOutEvents.push({ event, columnIndex });
    });

    const columnCount = Math.max(1, columnEndTimes.length);

    return laidOutEvents.map(({ event, columnIndex }) => ({
      ...event,
      columnIndex,
      columnCount,
    } satisfies LayoutEventItem));
  });
}

export function ScheduleDashboard({ sections, subject, selectedClassCode, onChooseClass, showHeader = true, toolbarActions, subjects = [], onApplySuggestion }: ScheduleDashboardProps) {
  const [detailEvent, setDetailEvent] = useState<LayoutEventItem | null>(null);
  const conflicts: ConflictPreview[] = detectLocalConflicts(sections);
  const weekdayOrder = ['2', '3', '4', '5', '6', '7'];
  const calendarStartMinutes = 6 * 60 ;
  const calendarEndMinutes = 18 * 60 ;
  const slotMinutes = 60;
  const slotHeight = 32;
  const slotCount = Math.max(1, Math.ceil((calendarEndMinutes - calendarStartMinutes) / slotMinutes));

  const scheduleBounds = useMemo(() => {
    return {
      startMinutes: calendarStartMinutes,
      endMinutes: calendarEndMinutes,
      hourCount: slotCount,
    };
  }, [calendarEndMinutes, calendarStartMinutes, slotCount]);

  const hourLabels = useMemo(() => {
    return Array.from({ length: scheduleBounds.hourCount + 1 }, (_, index) => {
      const minutes = scheduleBounds.startMinutes + index * slotMinutes;
      const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
      const mins = String(minutes % 60).padStart(2, '0');
      return `${hours}:${mins}`;
    });
  }, [scheduleBounds.hourCount, scheduleBounds.startMinutes, slotMinutes]);

  const calendarHeight = scheduleBounds.hourCount * slotHeight;

  const calendarSections = useMemo(() => {
    return sections
      .map((section) => {
        const range = parseSectionTimeRange(section);
        if (!range) {
          return null;
        }

        const theme = getCourseTheme(section.courseCode);
        const topMinutes = Math.max(0, range.startMinutes - scheduleBounds.startMinutes);
        const durationMinutes = Math.max(30, range.endMinutes - range.startMinutes);

        return {
          section,
          range,
          theme,
          top: (topMinutes / slotMinutes) * slotHeight,
          height: Math.max(36, (durationMinutes / slotMinutes) * slotHeight),
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
  }, [scheduleBounds.startMinutes, sections, slotHeight, slotMinutes]);

  const previewSections = useMemo(() => {
    if (!subject || selectedClassCode) {
      return [];
    }

    const classesToPreview = subject.classes.filter((classItem) => classItem.classCode !== selectedClassCode);
    const theme = getCourseTheme(subject.courseCode);

    return classesToPreview.flatMap((classItem) => {
      return classItem.sections
        .map((section) => {
          const range = parseSectionTimeRange(section);
          if (!range) {
            return null;
          }

          const topMinutes = Math.max(0, range.startMinutes - scheduleBounds.startMinutes);
          const durationMinutes = Math.max(30, range.endMinutes - range.startMinutes);

          return {
            classItem,
            section,
            range,
            theme,
            top: (topMinutes / slotMinutes) * slotHeight,
            height: Math.max(36, (durationMinutes / slotMinutes) * slotHeight),
          };
        })
        .filter((value): value is NonNullable<typeof value> => Boolean(value));
    });
  }, [scheduleBounds.startMinutes, selectedClassCode, slotHeight, slotMinutes, subject]);

  const selectedEventItems = useMemo<CalendarEventItem[]>(() => {
    return calendarSections.map((calendarSection) => {
      const section = calendarSection.section;
      const classItem = subject?.classes.find((candidate) => candidate.classCode === section.classCode) ?? {
        classCode: section.classCode,
        classCodeAlt: section.classCodeAlt,
        courseCode: section.courseCode,
        courseName: section.courseName,
        courseNameEn: section.courseNameEn,
        creditWeight: section.creditWeight,
        note: section.note,
        classType: section.classType,
        openingBatch: section.openingBatch,
        sectionCount: 1,
        sections: [section],
      };

      return {
        id: section.id,
        kind: 'selected',
        section,
        classItem,
        range: calendarSection.range,
        theme: calendarSection.theme,
        top: calendarSection.top,
        height: calendarSection.height,
      };
    });
  }, [calendarSections, subject]);

  const previewEventItems = useMemo<CalendarEventItem[]>(() => {
    return previewSections.map((previewItem) => ({
      id: `${previewItem.classItem.classCode}-${previewItem.section.id}`,
      kind: 'preview',
      section: previewItem.section,
      classItem: previewItem.classItem,
      range: previewItem.range,
      theme: previewItem.theme,
      top: previewItem.top,
      height: previewItem.height,
      isDisabled: isClassFull(previewItem.section),
    }));
  }, [previewSections]);

  const groupedByCourse = useMemo(() => {
    return sections.reduce<Record<string, TimetableSection[]>>((accumulator, section) => {
      const current = accumulator[section.courseCode] ?? [];
      current.push(section);
      accumulator[section.courseCode] = current;
      return accumulator;
    }, {});
  }, [sections]);

  const legendItems = useMemo(() => {
    return Object.entries(groupedByCourse)
      .map(([courseCode, courseSections]) => ({
        courseCode,
        courseName: courseSections[0]?.courseName ?? courseCode,
        theme: getCourseTheme(courseCode),
      }))
      .sort((left, right) => left.courseCode.localeCompare(right.courseCode));
  }, [groupedByCourse]);

  const { overlapSectionIds, locationGapSectionIds } = useMemo(() => {
    const overlap = new Set<string>();
    const locationGap = new Set<string>();

    conflicts.forEach((conflict) => {
      const metadata = conflict.metadata as {
        left?: { id?: string };
        right?: { id?: string };
      } | null;

      const leftId = metadata?.left?.id;
      const rightId = metadata?.right?.id;

      if (conflict.type === 'TIME_OVERLAP') {
        if (leftId) overlap.add(leftId);
        if (rightId) overlap.add(rightId);
      } else if (conflict.type === 'LOCATION_GAP') {
        if (leftId) locationGap.add(leftId);
        if (rightId) locationGap.add(rightId);
      }
    });

    return { overlapSectionIds: overlap, locationGapSectionIds: locationGap };
  }, [conflicts]);

  const activeClass = subject?.classes.find((classItem) => classItem.classCode === selectedClassCode) ?? null;
  const hasPreviewClasses = Boolean(subject && !activeClass);
  const detailRange = detailEvent ? `${detailEvent.range.label}` : '';

  const closeDetailModal = () => {
    setDetailEvent(null);
  };

  const [resolving, setResolving] = useState<string | null>(null);

  const handleAutoResolve = async (conflict: ConflictPreview) => {
    const metadata = conflict.metadata as { left?: TimetableSection; right?: TimetableSection } | null;
    if (!metadata?.left || !metadata?.right) return;

    setResolving(conflict.message);
    try {
      const alternative = autoResolveConflict(metadata.left, metadata.right, allSubjects ?? []);
      if (alternative) {
        onChooseClass(alternative);
      }
    } finally {
      setResolving(null);
    }
  };

  const handleManualResolve = (conflict: ConflictPreview) => {
    const metadata = conflict.metadata as { left?: TimetableSection; right?: TimetableSection } | null;
    if (!metadata?.left || !metadata?.right) return;

    // Propose removing the second course
    const msg = `Bạn có muốn xóa ${metadata.right.courseCode} để giải quyết xung đột không?`;
    if (confirm(msg)) {
      const courseSubject = (allSubjects ?? []).find(s => s.courseCode === metadata.right.courseCode);
      if (courseSubject) {
        // Create a dummy class with no sections to remove the course
        const dummyClass: TimetableClass = {
          ...courseSubject.classes[0],
          classCode: '',
          sections: [],
        };
        onChooseClass(dummyClass);
      }
    }
  };

  return (
    <div className="tempo-dashboard-panel">
      {showHeader ? (
        <div className="tempo-panel-toolbar">
          <div>
            <h3>Dashboard</h3>
          </div>
          <div className="tempo-panel-summary">{sections.length} lớp</div>
        </div>
      ) : null}

      <div style={{ padding: '0 12px' }}>
        {conflicts
          .filter(c => c.type === 'TIME_OVERLAP')
          .map((conflict, idx) => (
            <ConflictAlert
              key={idx}
              conflict={conflict}
              onAutoResolve={() => handleAutoResolve(conflict)}
              onManualResolve={() => handleManualResolve(conflict)}
              autoResolveLoading={resolving === conflict.message}
            />
          ))}
      </div>

      <div className="tempo-calendar-shell">
        <div className="tempo-calendar-toolbar-row">
          {toolbarActions ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>{toolbarActions}</div>
          ) : null}
          <div className="tempo-calendar-legend">
            {legendItems.length > 0 ? (
              legendItems.map((item) => (
                <div key={item.courseCode} className="tempo-calendar-legend-item">
                  <span
                    className="tempo-calendar-legend-swatch"
                    style={{ backgroundColor: item.theme.accent }}
                  />
                  <div>
                    <strong>{item.courseCode}</strong>
                    <span>{item.courseName}</span>
                  </div>
                </div>
              ))
            ) : null}
          </div>
          
        </div>

        <div className="tempo-calendar-board">
          <div className="tempo-calendar-head">
            <div className="tempo-calendar-corner" />
            <div className="tempo-calendar-head-days">
              {weekdayOrder.map((weekday) => (
                <div key={weekday} className="tempo-calendar-day-head">
                  {weekday === '2' ? 'Thứ 2' : weekday === '3' ? 'Thứ 3' : weekday === '4' ? 'Thứ 4' : weekday === '5' ? 'Thứ 5' : weekday === '6' ? 'Thứ 6' : weekday === '7' ? 'Thứ 7' : 'CN'}
                </div>
              ))}
            </div>
          </div>

          <div className="tempo-calendar-grid-wrap" style={{ ['--calendar-height' as string]: `${calendarHeight}px` }}>
            <div className="tempo-calendar-time-column">
              {hourLabels.map((label, index) => (
                <div key={label} className="tempo-calendar-time-label" style={{ top: index * slotHeight }}>
                  {label}
                </div>
              ))}
            </div>

            <div className="tempo-calendar-days-grid">
              {weekdayOrder.map((weekday) => {
                const daySelectedEvents = selectedEventItems.filter((item) => item.section.weekday === weekday);
                const dayPreviewEvents = previewEventItems.filter((item) => item.section.weekday === weekday);
                const dayEvents = layoutOverlapColumns([...daySelectedEvents, ...dayPreviewEvents]);

                return (
                  <div key={weekday} className="tempo-calendar-day-column" style={{ height: calendarHeight }}>
                    {hourLabels.slice(0, -1).map((_, index) => (
                      <div key={`${weekday}-${index}`} className="tempo-calendar-hour-line" style={{ top: index * slotHeight }} />
                    ))}

                    {dayEvents.map((event) => {
                      const width = `${100 / event.columnCount}%`;
                      const left = `calc(${(100 / event.columnCount) * event.columnIndex}% + ${event.columnIndex === 0 ? 0 : 4}px)`;
                      const adjustedWidth = `calc(${width} - ${event.columnIndex === event.columnCount - 1 ? 0 : 4}px)`;
                      const hasOverlap = overlapSectionIds.has(event.section.id);
                      const hasLocationGap = locationGapSectionIds.has(event.section.id);
                      const eventClassName = [
                        'tempo-calendar-event',
                        event.kind === 'preview' ? 'tempo-calendar-event--preview' : 'is-selected',
                        event.columnCount > 1 ? 'is-overlap' : '',
                        hasOverlap ? 'is-conflict' : '',
                        !hasOverlap && hasLocationGap ? 'is-location-gap' : '',
                        event.kind === 'preview' && event.isDisabled ? 'is-disabled' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                      if (event.kind === 'selected') {
                        return (
                          <div
                            key={event.id}
                            className="tempo-calendar-event-stack"
                            style={{
                              top: event.top,
                              height: event.height,
                              left,
                              width: adjustedWidth,
                            }}
                          >
                            <button
                              type="button"
                              className={eventClassName}
                              title="Xem chi tiết lớp"
                              style={{
                                backgroundColor: event.theme.tint,
                                borderColor: event.theme.border,
                                color: event.theme.text,
                              }}
                              onClick={() => setDetailEvent(event)}
                            >
                              <div className="tempo-calendar-event-code">{event.section.courseCode} - {event.section.classCode}</div>
                              <div className="tempo-calendar-event-meta">{event.section.courseName}</div>
                              <div className="tempo-calendar-event-meta">{event.range.label}</div>
                            </button>

                            <button
                              type="button"
                              className={event.columnCount > 1 ? 'tempo-calendar-event-remove is-overlap' : 'tempo-calendar-event-remove'}
                              title="Bỏ chọn lớp này"
                              aria-label={`Bỏ chọn ${event.section.courseCode} ${event.section.classCode}`}
                              onClick={(mouseEvent) => {
                                mouseEvent.stopPropagation();
                                onChooseClass(event.classItem);
                              }}
                            >
                              ×
                            </button>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={event.id}
                          type="button"
                          className={eventClassName}
                          style={{
                            top: event.top,
                            height: event.height,
                            left,
                            width: adjustedWidth,
                            backgroundColor: event.theme.tint,
                            borderColor: event.theme.border,
                            color: event.theme.text,
                          }}
                          disabled={event.isDisabled}
                          title="Xem chi tiết lớp"
                          onClick={() => setDetailEvent(event)}
                        >
                          <div className="tempo-calendar-event-code">{event.classItem.classCode}</div>
                          <div className="tempo-calendar-event-title">{event.section.courseName}</div>
                          <div className="tempo-calendar-event-meta">{event.range.label}</div>
                          <div className="tempo-calendar-event-meta">{event.section.room}</div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {detailEvent ? (
          <div className="tempo-modal-overlay" role="presentation" onClick={closeDetailModal}>
            <div
              className="tempo-modal-card tempo-calendar-detail-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Chi tiết lớp học"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="tempo-panel-toolbar tempo-modal-toolbar">
                <div>
                  <h3>Chi tiết lớp học</h3>
                  <p>{detailEvent.section.courseName}</p>
                </div>
                <button type="button" className="tempo-secondary-button" onClick={closeDetailModal}>
                  Đóng
                </button>
              </div>

              <div className="tempo-calendar-detail-grid">
                <div className="tempo-calendar-detail-card">
                  <span>Mã môn</span>
                  <strong>{detailEvent.section.courseCode}</strong>
                </div>
                <div className="tempo-calendar-detail-card">
                  <span>Mã lớp</span>
                  <strong>{detailEvent.section.classCode}</strong>
                </div>
                <div className="tempo-calendar-detail-card">
                  <span>Thời gian</span>
                  <strong>{detailRange}</strong>
                </div>
                <div className="tempo-calendar-detail-card">
                  <span>Phòng</span>
                  <strong>{detailEvent.section.room}</strong>
                </div>
              </div>

              <div className="tempo-calendar-detail-grid">
                <div className="tempo-calendar-detail-card">
                  <span>Giảng viên</span>
                  <strong>{detailEvent.section.teacherName ?? 'Chưa cập nhật'}</strong>
                </div>
                <div className="tempo-calendar-detail-card">
                  <span>Loại lớp</span>
                  <strong>{detailEvent.section.classType}</strong>
                </div>
                <div className="tempo-calendar-detail-card">
                  <span>Nhóm mở</span>
                  <strong>{detailEvent.section.openingBatch}</strong>
                </div>
                <div className="tempo-calendar-detail-card">
                  <span>Sĩ số</span>
                  <strong>{detailEvent.section.enrollmentCount}/{detailEvent.section.maxSeats}</strong>
                </div>
              </div>

              <div className="tempo-calendar-detail-actions">
                {detailEvent.kind === 'preview' && !detailEvent.isDisabled ? (
                  <button
                    type="button"
                    className="tempo-primary-button"
                    onClick={() => {
                      closeDetailModal();
                      void onChooseClass(detailEvent.classItem);
                    }}
                  >
                    Chọn lớp này
                  </button>
                ) : null}

                {detailEvent.kind === 'selected' ? (
                  <button
                    type="button"
                    className="tempo-secondary-button"
                    onClick={() => {
                      closeDetailModal();
                      void onChooseClass(detailEvent.classItem);
                    }}
                  >
                    Bỏ chọn lớp này
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {onApplySuggestion && subjects.length > 0 && (
        <SuggestionPanel
          subjects={subjects}
          onApply={onApplySuggestion}
        />
      )}

      <div className="tempo-dashboard-grid">
        <ConflictPanel conflicts={conflicts} />
      </div>
    </div>
  );
}
