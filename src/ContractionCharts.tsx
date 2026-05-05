import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { Contraction } from './types';
import { formatDuration, formatTime } from './utils';

const ACCENT = '#6c63ff';
const YELLOW = '#facc15';
const GREEN = '#4ade80';
const GRID = '#2e3350';
const TEXT = '#8b91b8';

interface ChartPoint {
  label: string;
  duration: number;
  interval: number | null;
}

function buildPoints(contractions: Contraction[]): ChartPoint[] {
  const completed = [...contractions]
    .filter(c => c.endTime !== null)
    .reverse(); // oldest first for left→right reading
  return completed.map((c, i) => ({
    label: formatTime(c.startTime),
    duration: c.duration!,
    interval: c.interval,
    index: i + 1,
  }));
}

interface TooltipEntry { name: string; value: number; color: string; }
interface TooltipPayload { active?: boolean; payload?: TooltipEntry[]; label?: string; }

function CustomTooltip({ active, payload, label }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map(entry => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatDuration(entry.value)}
        </p>
      ))}
    </div>
  );
}

function formatYAxis(seconds: number) {
  if (seconds === 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m${s > 0 ? `${s}s` : ''}` : `${s}s`;
}

interface Props {
  contractions: Contraction[];
}

export function ContractionCharts({ contractions }: Props) {
  const points = buildPoints(contractions);
  if (points.length < 3) return null;

  const hasIntervals = points.some(p => p.interval !== null);

  return (
    <div className="charts-section">
      <div className="chart-block">
        <p className="chart-title">Duration per contraction</p>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: TEXT, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={formatYAxis} tick={{ fill: TEXT, fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: GRID }} />
            <Bar dataKey="duration" name="Duration" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Line dataKey="duration" name="Trend" stroke={GREEN} strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {hasIntervals && (
        <div className="chart-block">
          <p className="chart-title">Interval between contractions</p>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: TEXT, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={formatYAxis} tick={{ fill: TEXT, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: GRID }} />
              <Bar dataKey="interval" name="Interval" fill={YELLOW} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
