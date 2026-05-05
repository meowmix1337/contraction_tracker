import { useState } from 'react';
import { Activity, Timer, Clock, Trash2, RotateCcw, Info, Pencil, Check, X, Minus, Plus } from 'lucide-react';
import { useTracks } from './useTracks';
import { formatDuration, formatTime, averageDuration, averageInterval } from './utils';
import { ConfirmDialog } from './ConfirmDialog';
import { TrackSwitcher } from './TrackSwitcher';
import { lazy, Suspense } from 'react';
const ContractionCharts = lazy(() => import('./ContractionCharts').then(m => ({ default: m.ContractionCharts })));
import type { Contraction, Track } from './types';
import './App.css';

function StatCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${className ?? ''}`}>{value}</span>
    </div>
  );
}

const PAIN_COLORS = ['', '#4ade80', '#a3e635', '#facc15', '#fb923c', '#f87171'];
const PAIN_LABELS = ['', '1 – Mild', '2 – Uncomfortable', '3 – Moderate', '4 – Intense', '5 – Severe'];

function PainRating({ value, onChange }: { value: number | null; onChange: (level: number | null) => void }) {
  return (
    <div className="pain-rating" aria-label="Pain level">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          className={`pain-dot ${value === n ? 'selected' : ''}`}
          style={{ '--dot-color': PAIN_COLORS[n] } as React.CSSProperties}
          onClick={() => onChange(value === n ? null : n)}
          aria-label={PAIN_LABELS[n]}
          title={PAIN_LABELS[n]}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ContractionCard({
  contraction,
  index,
  total,
  onDelete,
  onUpdateDuration,
  onUpdatePainLevel,
}: {
  contraction: Contraction;
  index: number;
  total: number;
  onDelete: (id: string) => void;
  onUpdateDuration: (id: string, seconds: number) => void;
  onUpdatePainLevel: (id: string, level: number | null) => void;
}) {
  const isInProgress = contraction.endTime === null;
  const isLatest = index === 0;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(0);

  function openEdit() {
    setDraft(contraction.duration!);
    setEditing(true);
  }

  function save() {
    const clamped = Math.max(1, draft);
    onUpdateDuration(contraction.id, clamped);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  function handleInput(raw: string) {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) setDraft(Math.max(1, n));
  }

  if (editing) {
    return (
      <div className="contraction-card editing">
        <div className={`contraction-index ${isLatest ? 'latest' : ''}`}>{total - index}</div>
        <div className="contraction-info">
          <span className="contraction-time">{formatTime(contraction.startTime)}</span>
          <div className="duration-editor">
            <button className="btn-nudge" onClick={() => setDraft(d => Math.max(1, d - 5))} aria-label="Minus 5 seconds">
              <Minus size={13} />
            </button>
            <input
              className="duration-input"
              type="number"
              min={1}
              value={draft}
              onChange={e => handleInput(e.target.value)}
              aria-label="Duration in seconds"
            />
            <span className="duration-input-unit">s</span>
            <button className="btn-nudge" onClick={() => setDraft(d => d + 5)} aria-label="Plus 5 seconds">
              <Plus size={13} />
            </button>
          </div>
        </div>
        <div className="edit-actions">
          <button className="btn-edit-action save" onClick={save} aria-label="Save">
            <Check size={15} />
          </button>
          <button className="btn-edit-action cancel" onClick={cancel} aria-label="Cancel">
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`contraction-card ${isInProgress ? 'in-progress' : ''}`}>
      <div className={`contraction-index ${isLatest && !isInProgress ? 'latest' : ''}`}>
        {total - index}
      </div>
      <div className="contraction-info">
        <span className="contraction-time">{formatTime(contraction.startTime)}</span>
        <div className="contraction-meta">
          {isInProgress ? (
            <span className="meta-item in-progress-label">
              <Activity size={12} />
              In progress…
            </span>
          ) : (
            <span className="meta-item duration">
              <Timer size={12} />
              {formatDuration(contraction.duration!)}
            </span>
          )}
          {contraction.interval !== null && (
            <span className="meta-item interval">
              <Clock size={12} />
              {formatDuration(contraction.interval)} apart
            </span>
          )}
        </div>
        {!isInProgress && (
          <PainRating
            value={contraction.painLevel ?? null}
            onChange={level => onUpdatePainLevel(contraction.id, level)}
          />
        )}
      </div>
      <div className="card-actions">
        {!isInProgress && (
          <button className="btn-icon" onClick={openEdit} aria-label="Edit duration">
            <Pencil size={14} />
          </button>
        )}
        <button className="btn-icon danger" onClick={() => onDelete(contraction.id)} aria-label="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const {
    tracks, activeTrack, activeTrackId,
    contractions, tracking, elapsed,
    startContraction, stopContraction,
    deleteContraction, updateDuration, updatePainLevel,
    clearAll, createTrack, deleteTrack, renameTrack, switchTrack,
  } = useTracks();

  const completed = contractions.filter(c => c.endTime !== null);
  const durations = completed.map(c => c.duration!);
  const intervals = completed.map(c => c.interval).filter((v): v is number => v !== null);

  const avgDur = averageDuration(durations);
  const avgInt = averageInterval(intervals);
  const count = contractions.length;

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  // Reset pagination when switching tracks
  function handleSwitchTrack(id: string) {
    switchTrack(id);
    setVisibleCount(5);
  }

  function handleCreateTrack() {
    createTrack();
    setVisibleCount(5);
  }

  function handleMainButton() {
    if (tracking) stopContraction();
    else startContraction();
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <div className="icon-wrap">
            <Activity size={18} />
          </div>
          <TrackSwitcher
            tracks={tracks}
            activeTrackId={activeTrackId}
            tracking={tracking}
            onSwitch={handleSwitchTrack}
            onCreate={handleCreateTrack}
            onRename={renameTrack}
            onDeleteRequest={setTrackToDelete}
          />
        </div>
        {count > 0 && (
          <button className="btn-clear" onClick={() => setShowClearConfirm(true)}>
            <RotateCcw size={13} />
            Reset
          </button>
        )}
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Count" value={count > 0 ? String(count) : '—'} />
        <StatCard
          label="Avg duration"
          value={avgDur !== null ? formatDuration(avgDur) : '—'}
          className="green"
        />
        <StatCard
          label="Avg interval"
          value={avgInt !== null ? formatDuration(avgInt) : '—'}
          className="yellow"
        />
      </div>

      {/* Main Button */}
      <div className={`btn-track-wrap ${tracking ? 'tracking' : ''}`}>
        <div className="elapsed-display">
          {tracking ? formatDuration(elapsed) : ''}
        </div>
        <button
          className={`btn-track ${tracking ? 'active' : 'idle'}`}
          onClick={handleMainButton}
        >
          {tracking ? <Activity size={32} /> : <Timer size={32} />}
          {tracking ? 'Stop' : 'Start'}
        </button>
        <span className="btn-track-hint">
          {tracking ? 'Tap when contraction ends' : 'Tap when contraction begins'}
        </span>
      </div>

      {/* Guidance */}
      {avgInt !== null && avgInt <= 300 && avgDur !== null && avgDur >= 45 && (
        <div className="guidance-card">
          <Info size={16} className="guidance-icon" />
          <p className="guidance-text">
            <strong>511 rule check:</strong> Contractions appear to be{' '}
            <strong>{formatDuration(avgInt)}</strong> apart, lasting{' '}
            <strong>{formatDuration(avgDur)}</strong>. Consider contacting your care provider.
          </p>
        </div>
      )}

      <Suspense fallback={null}>
        <ContractionCharts contractions={contractions} />
      </Suspense>

      {/* History */}
      <div className="history-section">
        <div className="history-header">
          <span className="history-title">History</span>
          {count > 0 && <span className="history-count">{count}</span>}
        </div>
        {count === 0 ? (
          <div className="history-empty">
            <Timer size={24} />
            <span>No contractions recorded yet</span>
          </div>
        ) : (
          <>
            <div className="history-list">
              {contractions.slice(0, visibleCount).map((c, i) => (
                <ContractionCard
                  key={c.id}
                  contraction={c}
                  index={i}
                  total={count}
                  onDelete={deleteContraction}
                  onUpdateDuration={updateDuration}
                  onUpdatePainLevel={updatePainLevel}
                />
              ))}
            </div>
            {visibleCount < count && (
              <button
                className="btn-show-more"
                onClick={() => setVisibleCount(v => v + 5)}
              >
                Show {Math.min(5, count - visibleCount)} more
              </button>
            )}
          </>
        )}
      </div>

      {/* Clear all contractions on active track */}
      <ConfirmDialog
        open={showClearConfirm}
        title={`Clear "${activeTrack.label}"?`}
        message="This will permanently delete all recorded contractions for this track. This cannot be undone."
        confirmLabel="Clear data"
        onConfirm={() => { clearAll(); setShowClearConfirm(false); setVisibleCount(5); }}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* Delete entire track */}
      <ConfirmDialog
        open={!!trackToDelete}
        title={`Delete "${trackToDelete?.label}"?`}
        message="This will permanently delete the track and all its contraction data. This cannot be undone."
        confirmLabel="Delete track"
        onConfirm={() => { deleteTrack(trackToDelete!.id); setTrackToDelete(null); setVisibleCount(5); }}
        onCancel={() => setTrackToDelete(null)}
      />
    </div>
  );
}
