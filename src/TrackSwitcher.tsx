import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Pencil, Trash2, Plus, LayoutGrid } from 'lucide-react';
import type { Track } from './types';

interface Props {
  tracks: Track[];
  activeTrackId: string;
  isOverview: boolean;
  tracking: boolean;
  onSwitch: (id: string) => void;
  onOverviewSelect: () => void;
  onCreate: () => void;
  onRename: (id: string, label: string) => void;
  onDeleteRequest: (track: Track) => void;
}

export function TrackSwitcher({
  tracks, activeTrackId, isOverview, tracking,
  onSwitch, onOverviewSelect, onCreate, onRename, onDeleteRequest,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const activeTrack = tracks.find(t => t.id === activeTrackId) ?? tracks[0];
  const label = isOverview ? 'Overview' : activeTrack.label;

  function handleToggle() {
    setOpen(o => !o);
    setEditingId(null);
  }

  function handleOverview() {
    onOverviewSelect();
    setOpen(false);
    setEditingId(null);
  }

  function handleSwitch(id: string) {
    if (tracking) return; // block track switch while contraction in progress
    if (id !== activeTrackId) onSwitch(id);
    setOpen(false);
    setEditingId(null);
  }

  function handleCreate() {
    onCreate();
    setOpen(false);
    setEditingId(null);
  }

  function startEdit(track: Track, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(track.id);
    setEditLabel(track.label);
  }

  function commitEdit(id: string) {
    const trimmed = editLabel.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  }

  function handleDeleteClick(track: Track, e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    onDeleteRequest(track);
  }

  return (
    <div className="track-switcher" ref={containerRef}>
      <button
        className="track-switcher-btn"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="track-switcher-label">{label}</span>
        {tracking && !isOverview
          ? <span className="track-switcher-lock">●</span>
          : <ChevronDown size={14} className={`track-chevron ${open ? 'open' : ''}`} />
        }
      </button>

      {open && (
        <div className="track-dropdown" role="listbox">
          {/* Overview entry */}
          <div
            className={`track-item track-overview-item ${isOverview ? 'active' : ''}`}
            role="option"
            aria-selected={isOverview}
            onClick={handleOverview}
          >
            <span className="track-item-check">
              {isOverview && <Check size={12} />}
            </span>
            <LayoutGrid size={13} className="track-overview-icon" />
            <span className="track-item-label">Overview</span>
          </div>

          <div className="track-dropdown-divider" />

          {tracks.map(track => (
            <div
              key={track.id}
              className={`track-item ${!isOverview && track.id === activeTrackId ? 'active' : ''} ${tracking ? 'track-item--locked' : ''}`}
              role="option"
              aria-selected={!isOverview && track.id === activeTrackId}
              onClick={() => editingId !== track.id && handleSwitch(track.id)}
            >
              <span className="track-item-check">
                {!isOverview && track.id === activeTrackId && <Check size={12} />}
              </span>

              {editingId === track.id ? (
                <input
                  className="track-rename-input"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onBlur={() => commitEdit(track.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit(track.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                  aria-label="Track name"
                />
              ) : (
                <span className="track-item-label">{track.label}</span>
              )}

              <div className="track-item-actions">
                <button
                  className="btn-track-icon"
                  onClick={e => startEdit(track, e)}
                  aria-label={`Rename ${track.label}`}
                >
                  <Pencil size={11} />
                </button>
                {tracks.length > 1 && (
                  <button
                    className="btn-track-icon danger"
                    onClick={e => handleDeleteClick(track, e)}
                    aria-label={`Delete ${track.label}`}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button className="track-item track-add" onClick={handleCreate}>
            <span className="track-item-check" />
            <Plus size={12} />
            <span className="track-item-label">New track</span>
          </button>
        </div>
      )}
    </div>
  );
}
