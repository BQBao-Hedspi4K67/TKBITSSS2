import { useState } from 'react';
import type { ConflictPreview } from '../../types/timetable';

type ConflictPanelProps = {
  conflicts: ConflictPreview[];
  onAutoResolve?: (conflict: ConflictPreview) => void;
  onManualResolve?: (conflict: ConflictPreview, courseCode: string) => Promise<void> | void;
  autoResolveLoading?: string | null;
};

function ManualResolveModal({ 
  conflict, 
  onResolve, 
  onCancel 
}: { 
  conflict: ConflictPreview;
  onResolve: (courseCode: string) => void;
  onCancel: () => void;
}) {
  const metadata = conflict.metadata as { left?: { courseCode?: string }; right?: { courseCode?: string } } | null;
  if (!metadata?.left?.courseCode || !metadata?.right?.courseCode) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 12,
        padding: 20,
        maxWidth: 400,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        border: '1px solid var(--color-border-secondary)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Xử lý xung đột</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          Hãy chọn 1 lớp muốn xóa để giải quyết xung đột:
        </div>
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className="tempo-secondary-button"
            onClick={() => onResolve(metadata.left!.courseCode!)}
            style={{ padding: '10px 14px', fontSize: 13, textAlign: 'left' }}
          >
            🗑 Xóa {metadata.left.courseCode}
          </button>
          <button
            type="button"
            className="tempo-secondary-button"
            onClick={() => onResolve(metadata.right!.courseCode!)}
            style={{ padding: '10px 14px', fontSize: 13, textAlign: 'left' }}
          >
            🗑 Xóa {metadata.right.courseCode}
          </button>
        </div>
        <button
          type="button"
          className="tempo-secondary-button"
          onClick={onCancel}
          style={{ width: '100%', padding: '10px 14px', fontSize: 13 }}
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

export function ConflictPanel({ conflicts, onAutoResolve, onManualResolve, autoResolveLoading }: ConflictPanelProps) {
  const [manualResolveConflict, setManualResolveConflict] = useState<ConflictPreview | null>(null);

  return (
    <div className="tempo-conflict-panel">
      <div className="tempo-panel-toolbar">
        <div>
          <h3>Xung đột & cảnh báo</h3>
        </div>
        <div className="tempo-panel-summary">{conflicts.length} items</div>
      </div>

      {conflicts.length === 0 ? (
        <div className="tempo-empty-state">Chưa phát hiện xung đột từ các lớp đã chọn.</div>
      ) : (
        <div className="tempo-conflict-list">
          {conflicts.map((conflict, index) => {
            const isTimeOverlap = conflict.type === 'TIME_OVERLAP';
            const metadata = conflict.metadata as { left?: { courseCode?: string }; right?: { courseCode?: string } } | null;
            
            return (
              <div key={`${conflict.type}-${index}`}>
                {isTimeOverlap ? (
                  <div style={{
                    padding: '12px 14px',
                    marginBottom: 8,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    justifyContent: 'space-between',
                  }}
                  className="tempo-conflict-alert-time-overlap"
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#7c2d12' }}>
                      ⚠️ {conflict.message}
                    </div>
                    <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="tempo-primary-button"
                        onClick={() => onAutoResolve?.(conflict)}
                        disabled={autoResolveLoading === conflict.message}
                        style={{ fontSize: 12, padding: '6px 12px' }}
                      >
                        {autoResolveLoading === conflict.message ? 'Đang xử lý...' : 'Tự động xử lý'}
                      </button>
                      <button
                        type="button"
                        className="tempo-secondary-button"
                        onClick={() => setManualResolveConflict(conflict)}
                        style={{ fontSize: 12, padding: '6px 12px' }}
                      >
                        Xử lý trực tiếp
                      </button>
                    </div>
                  </div>
                ) : conflict.type === 'LOCATION_GAP' ? (
                  <div style={{
                    padding: '12px 14px',
                    marginBottom: 8,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                  className="tempo-conflict-alert-location-gap"
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                      ⚡ {conflict.message}
                    </div>
                  </div>
                ) : (
                  <div className={`tempo-conflict-card severity-${conflict.severity.toLowerCase()}`} style={{ marginBottom: 8 }}>
                    <div className="tempo-conflict-title">{conflict.message}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {manualResolveConflict && (
        <ManualResolveModal
          conflict={manualResolveConflict}
          onResolve={(courseCode) => {
            onManualResolve?.(manualResolveConflict, courseCode);
            setManualResolveConflict(null);
          }}
          onCancel={() => setManualResolveConflict(null)}
        />
      )}
    </div>
  );
}
