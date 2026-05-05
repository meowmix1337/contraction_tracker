import { describe, it, expect } from 'vitest';
import { formatDuration, formatTime, averageDuration, averageInterval } from '../utils';

describe('formatDuration', () => {
  it('shows seconds only when under a minute', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(59)).toBe('59s');
  });

  it('shows minutes and zero-padded seconds at 60s+', () => {
    expect(formatDuration(60)).toBe('1m 00s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(125)).toBe('2m 05s');
    expect(formatDuration(300)).toBe('5m 00s');
  });
});

describe('formatTime', () => {
  it('returns a non-empty time string for a valid timestamp', () => {
    const result = formatTime(Date.now());
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('formats different timestamps differently', () => {
    const t1 = new Date('2024-01-01T08:00:00').getTime();
    const t2 = new Date('2024-01-01T20:30:00').getTime();
    expect(formatTime(t1)).not.toBe(formatTime(t2));
  });
});

describe('averageDuration', () => {
  it('returns null for empty array', () => {
    expect(averageDuration([])).toBeNull();
  });

  it('returns the value itself for a single entry', () => {
    expect(averageDuration([60])).toBe(60);
  });

  it('rounds to nearest integer', () => {
    expect(averageDuration([10, 11])).toBe(11); // 10.5 rounds to 11
    expect(averageDuration([30, 60, 90])).toBe(60);
  });
});

describe('averageInterval', () => {
  it('returns null for empty array', () => {
    expect(averageInterval([])).toBeNull();
  });

  it('returns the value itself for a single entry', () => {
    expect(averageInterval([300])).toBe(300);
  });

  it('calculates average correctly', () => {
    expect(averageInterval([200, 400])).toBe(300);
    expect(averageInterval([60, 120, 180])).toBe(120);
  });
});
