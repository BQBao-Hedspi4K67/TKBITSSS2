import { useMemo } from 'react';
import { detectLocalConflicts, getCourseTheme, isClassFull } from '../../utils/timetable';
import type { ConflictPreview, TimetableClass, TimetableSection, TimetableSubject } from '../../types/timetable';

type ConflictFilterPanelProps = {
  selectedSections: TimetableSection[];
  subjects: TimetableSubject[];
  suggestedSubjects: TimetableSubject[];
  onChooseClass: (classItem: TimetableClass) => void;
  onSelectSubject: (code: string | null) => void;
  onAddSuggestedClass: (classItem: TimetableClass) => void;
  onGoToDashboard: () => void;
};

function isITSubject(code: string): boolean {
  const upper = code.toUpperCase();
  return ['CS', 'SE', 'IT'].some((prefix) => upper.startsWith(prefix));
}

function ConflictCard({ conflict }: { conflict: ConflictPreview }) {
  const isOverlap = conflict.type === 'TIME_OVERLAP';
  const isLocationGap = conflict.type === 'LOCATION_GAP';
  const meta = conflict.metadata as {
    left?: { id?: string; courseCode?: string; classCode?: string; weekday?: string; startTime?: string; endTime?: string; room?: string; courseName?: string };
    right?: { id?: string; courseCode?: string; classCode?: string; weekday?: string; startTime?: string; endTime?: string; room?: string; courseName?: string };
    gapMinutes?: number; leftBuilding?: string; rightBuilding?: string;
  } | null;

  return (
    <div style={{
      border: isOverlap ? '1px solid #f09595' : '1px solid #fac775',
      borderLeft: isOverlap ? '3px solid #e24b4a' : '3px solid #ba7517',
      borderRadius: 'var(--border-radius-md)',
      padding: '10px 12px',
      marginBottom: 10,
      background: isOverlap ? '#fcebeb' : '#faeeda',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          background: isOverlap ? '#e24b4a' : '#ba7517',
          color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
        }}>
          {isOverlap ? 'Trùng giờ' : `Di chuyển gấp (${meta?.gapMinutes} phút)`}
        </span>
        {meta?.left && (
          <span style={{ fontSize: 12, fontWeight: 500, color: isOverlap ? '#791f1f' : '#633806' }}>
            {meta.left.weekday ? `Thứ ${meta.left.weekday}` : ''} {meta.left.startTime}–{meta.left.endTime}
          </span>
        )}
      </div>

      {meta?.left && meta?.right ? (
        <p style={{ fontSize: 11, color: isOverlap ? '#a32d2d' : '#854f0b', marginBottom: 8 }}>
          {meta.left.courseCode} ({meta.left.courseName}) {isOverlap ? 'trùng giờ' : 'gần'} {meta.right.courseCode} ({meta.right.courseName}) vào ngày thứ {meta.left.weekday}.
          {isLocationGap && meta.leftBuilding && meta.rightBuilding && (
            <> Từ {meta.leftBuilding} → {meta.rightBuilding}.</>
          )}
        </p>
      ) : (
        <p style={{ fontSize: 11, color: '#a32d2d', marginBottom: 8 }}>{conflict.message}</p>
      )}

      {meta?.left && meta?.right ? (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.7)', border: isOverlap ? '0.5px solid #f09595' : '0.5px solid #fac775', borderRadius: 'var(--border-radius-md)', padding: '6px 8px' }}>
            <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>Lớp A</div>
            <div style={{ fontSize: 11, fontWeight: 500 }}>{meta.left.courseCode} · {meta.left.classCode}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: isOverlap ? '#a32d2d' : '#854f0b', fontWeight: 500 }}>vs</div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.7)', border: isOverlap ? '0.5px solid #f09595' : '0.5px solid #fac775', borderRadius: 'var(--border-radius-md)', padding: '6px 8px' }}>
            <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>Lớp B</div>
            <div style={{ fontSize: 11, fontWeight: 500 }}>{meta.right.courseCode} · {meta.right.classCode}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ConflictFilterPanel({ selectedSections, subjects, suggestedSubjects, onChooseClass, onAddSuggestedClass, onGoToDashboard }: ConflictFilterPanelProps) {
  const conflicts: ConflictPreview[] = useMemo(() => detectLocalConflicts(selectedSections), [selectedSections]);

  const selectedCourseCodes = useMemo(
    () => new Set(selectedSections.map((sec) => sec.courseCode)),
    [selectedSections],
  );

  // Suggested subjects: not selected, IT subjects first, limit to 6
  const suggestedSubjectsLimited = useMemo(() => {
    return suggestedSubjects
      .slice()
      .sort((a, b) => {
        const aIT = isITSubject(a.courseCode) ? 0 : 1;
        const bIT = isITSubject(b.courseCode) ? 0 : 1;
        return aIT - bIT;
      })
      .slice(0, 6);
  }, [suggestedSubjects]);

  const subjectsSelected = useMemo(
    () => subjects.filter((s) => selectedCourseCodes.has(s.courseCode)),
    [subjects, selectedCourseCodes],
  );

  return (
    <div className="tempo-surface-card">
      <div className="tempo-panel-toolbar">
        <div>
          <h3>Xung đột & Cảnh báo</h3>
        </div>
        <button type="button" className="tempo-secondary-button" onClick={onGoToDashboard}>
          Về Dashboard
        </button>
      </div>

      {/* Tổng hợp xung đột */}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
        Tổng hợp xung đột ({conflicts.length})
      </div>

      {conflicts.length === 0 ? (
        <div style={{ padding: 14, border: '1px solid var(--color-border-tertiary)', borderRadius: 12, background: '#f3faea', fontSize: 12, color: '#27500a', marginBottom: 20 }}>
          ✅ Không có xung đột. Lịch hiện tại an toàn!
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {conflicts.map((conflict, index) => (
            <ConflictCard key={`${conflict.type}-${index}`} conflict={conflict} />
          ))}
        </div>
      )}

      {/* Chọn lớp học cho từng môn — chỉ hiển thị môn đã chọn */}
      <div style={{ borderTop: '1px solid var(--color-border-tertiary)', paddingTop: 16, marginTop: 4, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Chọn lớp học cho từng môn</div>
        {subjectsSelected.length === 0 ? (
          <div style={{ padding: 12, border: '1px solid var(--color-border-tertiary)', borderRadius: 10, fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
            Bạn chưa chọn môn nào. Hãy chọn môn từ tab Upload hoặc Dashboard.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {subjectsSelected.map((subject) => {
              const selectedClass = selectedSections.find((sec) => sec.courseCode === subject.courseCode);
              const theme = getCourseTheme(subject.courseCode);
              return (
                <div key={subject.courseCode} style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: theme.accent, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{subject.courseCode} — {subject.courseName}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>{subject.creditWeight} tín</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {subject.classes.map((cls) => {
                      const firstSection = cls.sections[0];
                      if (!firstSection) return null;
                      const isSel = cls.classCode === selectedClass?.classCode;
                      const full = isClassFull(firstSection);
                      return (
                        <label
                          key={cls.classCode}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', borderRadius: 8, cursor: full ? 'not-allowed' : 'pointer',
                            background: isSel ? 'var(--color-background-info)' : 'transparent',
                            border: isSel ? '1px solid var(--color-accent)' : '1px solid var(--color-border-tertiary)',
                            opacity: full ? 0.5 : 1, fontSize: 12,
                          }}
                        >
                          <input
                            type="radio"
                            name={`class-${subject.courseCode}`}
                            checked={isSel}
                            disabled={full}
                            onChange={() => onChooseClass(cls)}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{cls.classCode}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                              {firstSection.weekday ? `Thứ ${firstSection.weekday}` : ''} · {firstSection.startTime}–{firstSection.endTime} · {firstSection.room}
                            </div>
                          </div>
                          {full ? (
                            <span style={{ fontSize: 10, color: '#a32d2d', background: '#fcebeb', padding: '1px 6px', borderRadius: 4 }}>Đầy ({firstSection.enrollmentCount}/{firstSection.maxSeats})</span>
                          ) : (
                            <span style={{ fontSize: 10, color: '#27500a', background: '#eaf3de', padding: '1px 6px', borderRadius: 4 }}>{firstSection.enrollmentCount}/{firstSection.maxSeats}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Môn học đề xuất — max 6, ưu tiên IT */}
      {suggestedSubjectsLimited.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border-tertiary)', paddingTop: 16, marginTop: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Môn học đề xuất cho học kỳ này</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {suggestedSubjectsLimited.map((subject) => {
              const firstClass = subject.classes[0];
              const firstSection = firstClass?.sections[0];
              const full = firstSection ? isClassFull(firstSection) : true;
              return (
                <div
                  key={subject.courseCode}
                  style={{
                    border: '1px solid var(--color-border-tertiary)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: 10,
                    opacity: full ? 0.55 : 1,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{subject.courseCode} · {subject.courseName}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                    {subject.creditWeight} tín
                    {full && <span style={{ marginLeft: 4, color: '#a32d2d' }}>Lớp đầy</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {!full && <span style={{ fontSize: 10, background: '#eaf3de', color: '#27500a', padding: '1px 6px', borderRadius: 8 }}>Còn chỗ</span>}
                    {full && <span style={{ fontSize: 10, background: '#fcebeb', color: '#791f1f', padding: '1px 6px', borderRadius: 8 }}>Lớp đầy</span>}
                  </div>
                  {!full && firstClass && (
                    <button
                      type="button"
                      className="tempo-primary-button"
                      style={{ width: '100%', fontSize: 11, padding: '4px 8px' }}
                      onClick={() => onAddSuggestedClass(firstClass)}
                    >
                      Thêm vào lịch
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
