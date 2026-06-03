import { useState } from 'react';
import { autoSchedule, type AutoScheduleStrategy } from '../../utils/autoSchedule';
import type { TimetableClass, TimetableSection, TimetableSubject } from '../../types/timetable';

type AutoScheduleModalProps = {
  subjects: TimetableSubject[];
  onClose: () => void;
  onApply: (result: { classes: TimetableClass[]; sections: TimetableSection[] }) => void;
};

const WEEKDAY_OPTIONS = [
  { weekday: '2', label: 'Thứ 2' },
  { weekday: '3', label: 'Thứ 3' },
  { weekday: '4', label: 'Thứ 4' },
  { weekday: '5', label: 'Thứ 5' },
  { weekday: '6', label: 'Thứ 6' },
  { weekday: '7', label: 'Thứ 7' },
];

export function AutoScheduleModal({ subjects, onClose, onApply }: AutoScheduleModalProps) {
  const [strategy, setStrategy] = useState<AutoScheduleStrategy>('NO_OVERLAP');
  const [offSessions, setOffSessions] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleSession = (key: string) => {
    setOffSessions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGenerate = () => {
    setErrorMessage(null);
    const result = autoSchedule(subjects, strategy, offSessions);
    if (!result) {
      setErrorMessage(
        strategy === 'CUSTOM_DAY_OFF'
          ? 'Không tìm thấy lịch phù hợp với các buổi nghỉ đã chọn. Vui lòng chọn ít buổi nghỉ hơn.'
          : strategy === 'NO_OVERLAP'
            ? 'Không tìm thấy lịch nào không bị trùng giờ. Vui lòng thử chiến lược khác.'
            : strategy === 'CONVENIENT_TRAVEL'
              ? 'Không tìm thấy lịch nào không bị cảnh báo di chuyển. Vui lòng thử chiến lược khác.'
              : 'Không tìm thấy lịch phù hợp. Vui lòng thử lại.',
      );
      return;
    }
    onApply(result);
  };

  return (
    <div className="tempo-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="tempo-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Xếp lịch tự động"
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: 560 }}
      >
        <div className="tempo-panel-toolbar tempo-modal-toolbar">
          <div>
            <h3>🪄 Xếp lịch tự động</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Hệ thống sẽ tìm lịch phù hợp với yêu cầu của bạn
            </p>
          </div>
          <button type="button" className="tempo-secondary-button" onClick={onClose}>
            Đóng
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <label
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, cursor: 'pointer',
              background: strategy === 'NO_OVERLAP' ? 'var(--color-background-info)' : 'transparent',
              borderColor: strategy === 'NO_OVERLAP' ? 'var(--color-accent)' : 'var(--color-border-tertiary)',
            }}
          >
            <input type="radio" name="strategy" checked={strategy === 'NO_OVERLAP'} onChange={() => { setStrategy('NO_OVERLAP'); setErrorMessage(null); }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>📅 Xếp lịch không trùng lớp học</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Đảm bảo không có cảnh báo trùng giờ giữa các lớp
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, cursor: 'pointer',
              background: strategy === 'CONVENIENT_TRAVEL' ? 'var(--color-background-info)' : 'transparent',
              borderColor: strategy === 'CONVENIENT_TRAVEL' ? 'var(--color-accent)' : 'var(--color-border-tertiary)',
            }}
          >
            <input type="radio" name="strategy" checked={strategy === 'CONVENIENT_TRAVEL'} onChange={() => { setStrategy('CONVENIENT_TRAVEL'); setErrorMessage(null); }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>🚶 Xếp lịch di chuyển thuận tiện</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Không có cảnh báo di chuyển giữa các tòa nhà
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, cursor: 'pointer',
              background: strategy === 'MOST_DAYS_OFF' ? 'var(--color-background-info)' : 'transparent',
              borderColor: strategy === 'MOST_DAYS_OFF' ? 'var(--color-accent)' : 'var(--color-border-tertiary)',
            }}
          >
            <input type="radio" name="strategy" checked={strategy === 'MOST_DAYS_OFF'} onChange={() => { setStrategy('MOST_DAYS_OFF'); setErrorMessage(null); }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>🏖️ Nghỉ nhiều buổi nhất trong tuần</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Hệ thống tối ưu sao cho lịch học dồn lại để nghỉ nhiều buổi nhất
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, cursor: 'pointer',
              background: strategy === 'CUSTOM_DAY_OFF' ? 'var(--color-background-info)' : 'transparent',
              borderColor: strategy === 'CUSTOM_DAY_OFF' ? 'var(--color-accent)' : 'var(--color-border-tertiary)',
            }}
          >
            <input type="radio" name="strategy" checked={strategy === 'CUSTOM_DAY_OFF'} onChange={() => { setStrategy('CUSTOM_DAY_OFF'); setErrorMessage(null); }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>📋 Tùy chọn buổi nghỉ</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2, marginBottom: 8 }}>
                Tick chọn các buổi muốn nghỉ, hệ thống sẽ đề xuất lịch
              </div>
              {strategy === 'CUSTOM_DAY_OFF' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 6 }}>
                  {WEEKDAY_OPTIONS.flatMap((day) => [
                    <label key={`${day.weekday}-morning`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={offSessions.has(`${day.weekday}-morning`)}
                        onChange={() => toggleSession(`${day.weekday}-morning`)}
                      />
                      Nghỉ sáng {day.label}
                    </label>,
                    <label key={`${day.weekday}-afternoon`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={offSessions.has(`${day.weekday}-afternoon`)}
                        onChange={() => toggleSession(`${day.weekday}-afternoon`)}
                      />
                      Nghỉ chiều {day.label}
                    </label>,
                  ])}
                </div>
              )}
            </div>
          </label>
        </div>

        {errorMessage && (
          <div className="tempo-error-banner" style={{ marginTop: 12 }}>
            ⚠ {errorMessage}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="tempo-secondary-button" onClick={onClose}>
            Hủy
          </button>
          <button type="button" className="tempo-primary-button" onClick={handleGenerate}>
            🪄 Tạo lịch
          </button>
        </div>
      </div>
    </div>
  );
}
