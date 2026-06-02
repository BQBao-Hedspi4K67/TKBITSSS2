import type { TimetableClass, TimetableSubject } from '../../types/timetable';
import { formatOccupancy, formatTimeRange, isClassFull } from '../../utils/timetable';

type ClassListPanelProps = {
  subject: TimetableSubject | null;
  selectedClassCode?: string;
  onChooseClass: (classItem: TimetableClass) => void;
};

export function ClassListPanel({ subject, selectedClassCode, onChooseClass }: ClassListPanelProps) {
  if (!subject) {
    return (
      <div className="tempo-class-panel tempo-empty-state">
        Chọn một môn để xem danh sách lớp tương ứng.
      </div>
    );
  }

  return (
    <div className="tempo-class-panel">
      <div className="tempo-panel-toolbar">
        <div>
          <h3>{subject.courseCode}</h3>
          <p>{subject.courseName}</p>
        </div>
        <div className="tempo-panel-summary">{subject.classCount} lớp</div>
      </div>

      <div className="tempo-class-grid">
        {subject.classes.map((classItem) => {
          const firstMeeting = classItem.sections[0] ?? null;
          const disabled = firstMeeting ? isClassFull(firstMeeting) : false;
          const isSelected = classItem.classCode === selectedClassCode;
          return (
            <button
              key={classItem.classCode}
              type="button"
              className={isSelected ? 'tempo-class-card is-selected' : 'tempo-class-card'}
              disabled={disabled}
              onClick={() => onChooseClass(classItem)}
            >
              <div className="tempo-class-card-header">
                <strong>{classItem.classCode}</strong>
                <span>{classItem.sections.length} buổi</span>
              </div>
              <div className="tempo-class-time">
                {classItem.sections.map((meeting) => formatTimeRange(meeting)).join(' · ')}
              </div>
              <div className="tempo-class-room">
                {classItem.sections.map((meeting) => `${meeting.weekday} ${meeting.room}`).join(' · ')}
              </div>
              <div className="tempo-class-occupancy">Sỉ số: {classItem.sections.map((meeting) => formatOccupancy(meeting)).join(' · ')}</div>
              <span className={disabled ? 'tempo-badge is-danger' : 'tempo-badge is-success'}>
                {disabled ? 'Lớp đầy' : 'Còn chỗ'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
