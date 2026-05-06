import { describe, it, expect } from 'vitest';
import { generateCsv, generateJson } from '../export';
import type { Track, Contraction } from '../types';

const track1: Track = { id: 'a', label: 'Track 1' };
const track2: Track = { id: 'b', label: 'My Track, Second' }; // comma in name tests CSV escaping

const c1: Contraction = {
  id: 'c1',
  startTime: new Date('2024-01-15T14:00:00').getTime(),
  endTime: new Date('2024-01-15T14:00:30').getTime(),
  duration: 30,
  interval: null,
  painLevel: 2,
};

const c2: Contraction = {
  id: 'c2',
  startTime: new Date('2024-01-15T14:06:00').getTime(),
  endTime: new Date('2024-01-15T14:06:45').getTime(),
  duration: 45,
  interval: 330,
  painLevel: null,
};

const allContractions = {
  a: [c2, c1], // newest-first (as stored)
  b: [],
};

describe('generateCsv', () => {
  it('includes a header row', () => {
    const csv = generateCsv([track1], allContractions);
    const [header] = csv.split('\n');
    expect(header).toBe('Track,#,Date,Start Time,Duration (s),Interval (s),Pain Level');
  });

  it('outputs contractions oldest-first', () => {
    const csv = generateCsv([track1], allContractions);
    const lines = csv.split('\n').slice(1);
    expect(lines[0]).toContain(',1,'); // c1 is index 1
    expect(lines[1]).toContain(',2,'); // c2 is index 2
  });

  it('includes duration and pain level', () => {
    const csv = generateCsv([track1], allContractions);
    const lines = csv.split('\n').slice(1);
    expect(lines[0]).toContain('30');
    expect(lines[0]).toContain('2'); // pain level
    expect(lines[1]).toContain('45');
  });

  it('outputs empty string for null interval on first contraction', () => {
    const csv = generateCsv([track1], allContractions);
    const firstDataRow = csv.split('\n')[1];
    // null interval → empty field between two commas
    expect(firstDataRow).toMatch(/,,[^,]/);
  });

  it('escapes commas in track labels', () => {
    const csv = generateCsv([track2], { b: [c1] });
    expect(csv).toContain('"My Track, Second"');
  });

  it('produces no data rows for an empty track', () => {
    const csv = generateCsv([track2], allContractions);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // header only
  });

  it('combines multiple tracks in order', () => {
    const csv = generateCsv([track1, track2], { ...allContractions, b: [c1] });
    const lines = csv.split('\n').slice(1);
    expect(lines).toHaveLength(3); // 2 from track1 + 1 from track2
    expect(lines[2]).toContain('My Track');
  });
});

describe('generateJson', () => {
  it('is valid JSON', () => {
    const json = generateJson([track1], allContractions);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes exportedAt timestamp', () => {
    const json = generateJson([track1], allContractions);
    const parsed = JSON.parse(json);
    expect(parsed.exportedAt).toBeDefined();
    expect(new Date(parsed.exportedAt).getFullYear()).toBeGreaterThan(2020);
  });

  it('includes track label and contractions', () => {
    const json = generateJson([track1], allContractions);
    const parsed = JSON.parse(json);
    expect(parsed.tracks).toHaveLength(1);
    expect(parsed.tracks[0].label).toBe('Track 1');
    expect(parsed.tracks[0].contractions).toHaveLength(2);
  });

  it('orders contractions oldest-first in output', () => {
    const json = generateJson([track1], allContractions);
    const parsed = JSON.parse(json);
    const [first, second] = parsed.tracks[0].contractions;
    expect(first.id).toBe('c1');
    expect(second.id).toBe('c2');
  });

  it('preserves all contraction fields', () => {
    const json = generateJson([track1], allContractions);
    const parsed = JSON.parse(json);
    const c = parsed.tracks[0].contractions[0];
    expect(c.id).toBe('c1');
    expect(c.duration).toBe(30);
    expect(c.painLevel).toBe(2);
    expect(c.interval).toBeNull();
  });

  it('handles empty track', () => {
    const json = generateJson([track2], allContractions);
    const parsed = JSON.parse(json);
    expect(parsed.tracks[0].contractions).toHaveLength(0);
  });
});
