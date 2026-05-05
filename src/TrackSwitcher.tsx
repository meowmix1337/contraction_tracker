import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Pencil, Trash2, Plus } from 'lucide-react';
import type { Track } from './types';

interface Props {
  tracks: Track[];
  activeTrackId: string;
  tracking: boolean;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, label: string) => void;
  onDeleteRequest: (track: Track) => void;
}

export function TrackSwitcher({ tracks, activeTrackId, tracking, onSwitch, onCreate, onRename, onDeleteRequest }: Props) {
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

  function handleToggle() {
    if (tracking) return;
    setOpen(o => !o);
    setEditingId(null);
  }

  function handleSwitch(id: string) {
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
        className={`track-switcher-btn ${tracking ? 'track-switcher-btn--locked' : ''}`}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={tracking ? 'Stop the current contraction to switch tracks' : undefined}
      >
        <span className="track-switcher-label">{activeTrack.label}</span>
        {tracking
          ? <span className="track-switcher-lock">●</span>
          : <ChevronDown size={14} className={`track-chevron ${open ? 'open' : ''}`} />
        }
      </button>

      {open && (
        <div className="track-dropdown" role="listbox">
          {tracks.map(track => (
            <div
              key={track.id}
              className={`track-item ${track.id === activeTrackId ? 'active' : ''}`}
              role="option"
              aria-selected={track.id === activeTrackId}
              onClick={() => editingId !== track.id && handleSwitch(track.id)}
            >
              <span className="track-item-check">
                {track.id === activeTrackId && <Check size={12} />}
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
