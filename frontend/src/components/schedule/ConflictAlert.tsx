import type { ConflictPreview } from '../../types/timetable';
import type { TimetableClass } from '../../types/timetable';

type ConflictAlertProps = {
  conflict: ConflictPreview;
  onAutoResolve: () => void;
  onManualResolve: () => void;
  autoResolveLoading?: boolean;
};

export function ConflictAlert({
  conflict,
  onAutoResolve,
  onManualResolve,
  autoResolveLoading = false,
}: ConflictAlertProps) {
  if (conflict.type !== 'TIME_OVERLAP') {
    return null;
  }

  return (
    <div style={{
      padding: '12px 14px',
      marginBottom: 12,
      borderRadius: 8,
      background: 'var(--color-background-warning)',
      border: '1px solid var(--color-border-warning)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      justifyContent: 'space-between',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
          ⚠️ {conflict.message}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
        <button
          type="button"
          className="tempo-primary-button"
          onClick={onAutoResolve}
          disabled={autoResolveLoading}
          style={{ fontSize: 12, padding: '6px 12px' }}
        >
          {autoResolveLoading ? 'Đang xử lý...' : 'Tự động xử lý'}
        </button>
        <button
          type="button"
          className="tempo-secondary-button"
          onClick={onManualResolve}
          style={{ fontSize: 12, padding: '6px 12px' }}
        >
          Xử lý trực tiếp
        </button>
      </div>
    </div>
  );
}
