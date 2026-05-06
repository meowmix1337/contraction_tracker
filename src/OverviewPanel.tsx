import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Track, Contraction } from './types';
import { formatDuration, formatTime, averageDuration, averageInterval } from './utils';

interface TrackStats {
  track: Track;
  count: number;
  avgDuration: number | null;
  avgInterval: number | null;
  lastTime: number | null;
}

function computeTrackStats(track: Track, contractions: Contraction[]): TrackStats {
  const completed = contractions.filter(c => c.endTime !== null);
  const intervals = contractions.map(c => c.interval).filter((v): v is number => v !== null);
  const startTimes = contractions.map(c => c.startTime);
  return {
    track,
    count: contractions.length,
    avgDuration: averageDuration(completed.map(c => c.duration!)),
    avgInterval: averageInterval(intervals),
    lastTime: startTimes.length > 0 ? Math.max(...startTimes) : null,
  };
}

interface Props {
  tracks: Track[];
  allContractions: Record<string, Contraction[]>;
}

export function OverviewPanel({ tracks, allContractions }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const trackStats = tracks.map(t => computeTrackStats(t, allContractions[t.id] ?? []));

  const allCompleted = Object.values(allContractions).flat().filter(c => c.endTime !== null);
  const allIntervals = Object.values(allContractions).flat()
    .map(c => c.interval).filter((v): v is number => v !== null);
  const totalCount = Object.values(allContractions).reduce((sum, cs) => sum + cs.length, 0);
  const avgDur = averageDuration(allCompleted.map(c => c.duration!));
  const avgInt = averageInterval(allIntervals);
  const lastTime = trackStats.reduce<number | null>((max, s) => {
    if (s.lastTime === null) return max;
    return max === null || s.lastTime > max ? s.lastTime : max;
  }, null);

  return (
    <div className="overview-panel">
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total</span>
          <span className="stat-value">{totalCount > 0 ? String(totalCount) : '—'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Last</span>
          <span className="stat-value">{lastTime !== null ? formatTime(lastTime) : '—'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avg duration</span>
          <span className="stat-value green">{avgDur !== null ? formatDuration(avgDur) : '—'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avg interval</span>
          <span className="stat-value yellow">{avgInt !== null ? formatDuration(avgInt) : '—'}</span>
        </div>
      </div>

      <div className="breakdown-section">
        <button className="breakdown-toggle" onClick={() => setShowBreakdown(s => !s)}>
          <span>Per-track breakdown</span>
          {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showBreakdown && (
          <div className="breakdown-list">
            {trackStats.map(s => (
              <div key={s.track.id} className="breakdown-card">
                <p className="breakdown-track-name">{s.track.label}</p>
                <div className="breakdown-stats">
                  <div className="breakdown-stat">
                    <span className="breakdown-stat-label">Count</span>
                    <span className="breakdown-stat-value">{s.count > 0 ? String(s.count) : '—'}</span>
                  </div>
                  <div className="breakdown-stat">
                    <span className="breakdown-stat-label">Avg dur.</span>
                    <span className="breakdown-stat-value green">{s.avgDuration !== null ? formatDuration(s.avgDuration) : '—'}</span>
                  </div>
                  <div className="breakdown-stat">
                    <span className="breakdown-stat-label">Avg int.</span>
                    <span className="breakdown-stat-value yellow">{s.avgInterval !== null ? formatDuration(s.avgInterval) : '—'}</span>
                  </div>
                  <div className="breakdown-stat">
                    <span className="breakdown-stat-label">Last</span>
                    <span className="breakdown-stat-value">{s.lastTime !== null ? formatTime(s.lastTime) : '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
