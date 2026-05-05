import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) el.showModal();
    else el.close();
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      if (e.target === el) onCancel();
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onCancel]);

  return (
    <dialog ref={dialogRef} className="confirm-dialog" onCancel={onCancel}>
      <div className="confirm-dialog-content">
        <div className="confirm-icon">
          <AlertTriangle size={22} />
        </div>
        <h2>Clear all data?</h2>
        <p>This will permanently delete all recorded contractions from this device. This cannot be undone.</p>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-confirm-delete" onClick={onConfirm}>Clear data</button>
        </div>
      </div>
    </dialog>
  );
}
