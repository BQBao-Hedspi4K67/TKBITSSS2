import { useMemo, useState } from 'react';

type UploadDropzoneProps = {
  onUpload: (file: File) => Promise<void>;
  loading?: boolean;
};

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

export function UploadDropzone({ onUpload, loading = false }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const acceptedHint = useMemo(() => ACCEPTED_EXTENSIONS.join(', '), []);

  return (
    <div
      className={isDragging ? 'tempo-dropzone is-dragging' : 'tempo-dropzone'}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) {
          await onUpload(file);
        }
      }}
      onClick={() => {
        const input = document.getElementById('tempo-upload-input') as HTMLInputElement | null;
        input?.click();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={async (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          const input = document.getElementById('tempo-upload-input') as HTMLInputElement | null;
          input?.click();
        }
      }}
    >
      <input
        id="tempo-upload-input"
        type="file"
        accept={acceptedHint}
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) {
            await onUpload(file);
          }
        }}
      />
      <div className="tempo-dropzone-icon">📁</div>
      <div className="tempo-dropzone-title">Kéo thả file Excel TKB vào đây</div>
      <div className="tempo-dropzone-subtitle">hoặc nhấp để chọn tệp</div>
      <div className="tempo-dropzone-hint">Hỗ trợ: {acceptedHint}</div>
      {loading ? <div className="tempo-dropzone-loading">Đang xử lý file...</div> : null}
    </div>
  );
}
