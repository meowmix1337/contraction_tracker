import { useState, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (startTime: number, duration: number, painLevel: number | null) => void;
}

const PAIN_COLORS = ['', '#4ade80', '#a3e635', '#facc15', '#fb923c', '#f87171'];
const PAIN_LABELS = ['', '1 – Mild', '2 – Uncomfortable', '3 – Moderate', '4 – Intense', '5 – Severe'];

function tsToDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AddContractionDialog({ open, onClose, onAdd }: Props) {
  const [startValue, setStartValue] = useState(() => tsToDatetimeLocal(Date.now()));
  const [duration, setDuration] = useState(30);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [error, setError] = useState('');
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
    const handler = (e: MouseEvent) => { if (e.target === el) onClose(); };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onClose]);

  function handleAdd() {
    const ts = new Date(startValue).getTime();
    if (!startValue || isNaN(ts)) {
      setError('Please enter a valid date and time.');
      return;
    }
    const clampedDuration = Math.max(1, duration);
    onAdd(ts, clampedDuration, painLevel);
    onClose();
  }

  return (
    <dialog ref={dialogRef} className="confirm-dialog add-contraction-dialog" onCancel={onClose}>
      <div className="add-contraction-content">
        <h2>Add contraction</h2>

        <div className="add-field">
          <label className="add-field-label" htmlFor="add-start-time">Start time</label>
          <input
            id="add-start-time"
            className="add-datetime-input"
            type="datetime-local"
            value={startValue}
            onChange={e => { setStartValue(e.target.value); setError(''); }}
          />
          {error && <p className="add-field-error">{error}</p>}
        </div>

        <div className="add-field">
          <label className="add-field-label">Duration</label>
          <div className="duration-editor">
            <button className="btn-nudge" onClick={() => setDuration(d => Math.max(1, d - 5))} aria-label="Minus 5 seconds">
              <Minus size={13} />
            </button>
            <input
              className="duration-input"
              type="number"
              min={1}
              value={duration}
              onChange={e => {
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) setDuration(Math.max(1, n));
              }}
              aria-label="Duration in seconds"
            />
            <span className="duration-input-unit">s</span>
            <button className="btn-nudge" onClick={() => setDuration(d => d + 5)} aria-label="Plus 5 seconds">
              <Plus size={13} />
            </button>
          </div>
        </div>

        <div className="add-field">
          <label className="add-field-label">Pain level <span className="add-field-optional">(optional)</span></label>
          <div className="pain-rating" aria-label="Pain level">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                className={`pain-dot ${painLevel === n ? 'selected' : ''}`}
                style={{ '--dot-color': PAIN_COLORS[n] } as React.CSSProperties}
                onClick={() => setPainLevel(painLevel === n ? null : n)}
                aria-label={PAIN_LABELS[n]}
                title={PAIN_LABELS[n]}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-confirm-export" onClick={handleAdd}>Add</button>
        </div>
      </div>
    </dialog>
  );
}
