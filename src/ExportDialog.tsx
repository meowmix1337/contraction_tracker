import { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import type { Track } from './types';
import type { ExportFormat } from './export';

interface Props {
  open: boolean;
  onClose: () => void;
  tracks: Track[];
  onExport: (selectedTrackIds: string[], format: ExportFormat) => void;
}

export function ExportDialog({ open, onClose, tracks, onExport }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(tracks.map(t => t.id)));
  const [format, setFormat] = useState<ExportFormat>('csv');
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

  function toggleTrack(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExport() {
    if (selected.size === 0) return;
    onExport([...selected], format);
    onClose();
  }

  const canExport = selected.size > 0;

  return (
    <dialog ref={dialogRef} className="confirm-dialog export-dialog" onCancel={onClose}>
      <div className="export-dialog-content">
        <div className="export-dialog-header">
          <Download size={18} />
          <h2>Export data</h2>
        </div>

        <div className="export-section">
          <p className="export-section-label">Tracks</p>
          <div className="export-track-list">
            {tracks.map(track => (
              <label key={track.id} className="export-option">
                <input
                  type="checkbox"
                  className="export-checkbox"
                  checked={selected.has(track.id)}
                  onChange={() => toggleTrack(track.id)}
                />
                <span className="export-option-name">{track.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="export-section">
          <p className="export-section-label">Format</p>
          <div className="export-format-list">
            <label className={`export-format-card ${format === 'csv' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="export-format"
                value="csv"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
                className="export-radio"
              />
              <span className="export-format-name">CSV</span>
              <span className="export-format-desc">Excel, Google Sheets</span>
            </label>
            <label className={`export-format-card ${format === 'json' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="export-format"
                value="json"
                checked={format === 'json'}
                onChange={() => setFormat('json')}
                className="export-radio"
              />
              <span className="export-format-name">JSON</span>
              <span className="export-format-desc">Full backup</span>
            </label>
          </div>
        </div>

        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-confirm-export"
            onClick={handleExport}
            disabled={!canExport}
          >
            Download
          </button>
        </div>
      </div>
    </dialog>
  );
}
