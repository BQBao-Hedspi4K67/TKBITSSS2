import type { ConflictPreview } from '../../types/timetable';

type ConflictPanelProps = {
  conflicts: ConflictPreview[];
};

export function ConflictPanel({ conflicts }: ConflictPanelProps) {
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
          {conflicts.map((conflict, index) => (
            <div key={`${conflict.type}-${index}`} className={`tempo-conflict-card severity-${conflict.severity.toLowerCase()}`}>
              <div className="tempo-conflict-title">{conflict.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
