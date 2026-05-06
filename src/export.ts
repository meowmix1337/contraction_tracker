import type { Track, Contraction } from './types';

export type ExportFormat = 'csv' | 'json';

function padTwo(n: number) {
  return String(n).padStart(2, '0');
}

function formatDateParts(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  const date = `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`;
  const time = `${padTwo(d.getHours())}:${padTwo(d.getMinutes())}:${padTwo(d.getSeconds())}`;
  return { date, time };
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

export function generateCsv(
  tracks: Track[],
  allContractions: Record<string, Contraction[]>,
): string {
  const headers = ['Track', '#', 'Date', 'Start Time', 'Duration (s)', 'Interval (s)', 'Pain Level'];
  const lines: string[] = [headers.join(',')];

  for (const track of tracks) {
    const sorted = [...(allContractions[track.id] ?? [])].reverse(); // oldest first
    sorted.forEach((c, i) => {
      const { date, time } = formatDateParts(c.startTime);
      lines.push([
        escapeCsv(track.label),
        escapeCsv(i + 1),
        escapeCsv(date),
        escapeCsv(time),
        escapeCsv(c.duration),
        escapeCsv(c.interval),
        escapeCsv(c.painLevel),
      ].join(','));
    });
  }

  return lines.join('\n');
}

export function generateJson(
  tracks: Track[],
  allContractions: Record<string, Contraction[]>,
): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      tracks: tracks.map(track => ({
        id: track.id,
        label: track.label,
        contractions: [...(allContractions[track.id] ?? [])].reverse(),
      })),
    },
    null,
    2,
  );
}

export function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function runExport(
  format: ExportFormat,
  tracks: Track[],
  allContractions: Record<string, Contraction[]>,
) {
  const today = new Date();
  const date = `${today.getFullYear()}-${padTwo(today.getMonth() + 1)}-${padTwo(today.getDate())}`;
  if (format === 'csv') {
    triggerDownload(generateCsv(tracks, allContractions), `contractions-${date}.csv`, 'text/csv');
  } else {
    triggerDownload(generateJson(tracks, allContractions), `contractions-${date}.json`, 'application/json');
  }
}
