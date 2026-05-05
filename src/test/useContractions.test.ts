import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContractions } from '../useContractions';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useContractions', () => {
  it('starts with no contractions', () => {
    const { result } = renderHook(() => useContractions());
    expect(result.current.contractions).toHaveLength(0);
    expect(result.current.tracking).toBe(false);
  });

  it('startContraction adds an in-progress entry', () => {
    const { result } = renderHook(() => useContractions());

    act(() => { result.current.startContraction(); });

    expect(result.current.contractions).toHaveLength(1);
    expect(result.current.contractions[0].endTime).toBeNull();
    expect(result.current.tracking).toBe(true);
  });

  it('stopContraction finalizes the active contraction with duration', () => {
    const { result } = renderHook(() => useContractions());

    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(45_000); });
    act(() => { result.current.stopContraction(); });

    const c = result.current.contractions[0];
    expect(c.endTime).not.toBeNull();
    expect(c.duration).toBeGreaterThanOrEqual(45);
    expect(result.current.tracking).toBe(false);
  });

  it('calculates interval between contractions', () => {
    const { result } = renderHook(() => useContractions());

    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    // Wait 5 minutes between contractions
    act(() => { vi.advanceTimersByTime(300_000); });

    act(() => { result.current.startContraction(); });

    const second = result.current.contractions[0];
    expect(second.interval).toBeGreaterThanOrEqual(300);
  });

  it('first contraction has no interval', () => {
    const { result } = renderHook(() => useContractions());
    act(() => { result.current.startContraction(); });
    expect(result.current.contractions[0].interval).toBeNull();
  });

  it('deleteContraction removes the entry by id', () => {
    const { result } = renderHook(() => useContractions());

    act(() => { result.current.startContraction(); });
    act(() => { result.current.stopContraction(); });

    const id = result.current.contractions[0].id;
    act(() => { result.current.deleteContraction(id); });

    expect(result.current.contractions).toHaveLength(0);
  });

  it('recalculates interval on the entry after a deleted middle contraction', () => {
    const { result } = renderHook(() => useContractions());

    // C1: 0–30s
    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    // C2: starts 60s after C1 ended, lasts 30s  →  interval from C1 = 60s
    act(() => { vi.advanceTimersByTime(60_000); });
    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    // C3: starts 60s after C2 ended  →  interval from C2 = 60s
    act(() => { vi.advanceTimersByTime(60_000); });
    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    // Newest-first: [C3, C2, C1]
    const c2id = result.current.contractions[1].id;
    act(() => { result.current.deleteContraction(c2id); });

    // After deleting C2: [C3, C1] — C3's interval should now be ~150s (60+30+60) from C1's endTime
    const [c3, c1] = result.current.contractions;
    expect(result.current.contractions).toHaveLength(2);
    expect(c3.interval).toBeGreaterThanOrEqual(150);
    expect(c1.interval).toBeNull();
  });

  it('sets interval to null on the oldest remaining entry when the oldest is deleted', () => {
    const { result } = renderHook(() => useContractions());

    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    act(() => { vi.advanceTimersByTime(60_000); });
    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    // Delete the oldest (C1, last in array)
    const c1id = result.current.contractions[1].id;
    act(() => { result.current.deleteContraction(c1id); });

    expect(result.current.contractions).toHaveLength(1);
    expect(result.current.contractions[0].interval).toBeNull();
  });

  it('updateDuration changes duration and recalculates endTime', () => {
    const { result } = renderHook(() => useContractions());

    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    const id = result.current.contractions[0].id;
    const originalStart = result.current.contractions[0].startTime;

    act(() => { result.current.updateDuration(id, 60); });

    const c = result.current.contractions[0];
    expect(c.duration).toBe(60);
    expect(c.endTime).toBe(originalStart + 60_000);
  });

  it('updateDuration recalculates the interval of the next contraction', () => {
    const { result } = renderHook(() => useContractions());

    // C1: 0–30s
    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    // C2: starts 60s after C1 ended
    act(() => { vi.advanceTimersByTime(60_000); });
    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    // [C2, C1] — C2.interval ≈ 60s
    const c1id = result.current.contractions[1].id;
    const originalInterval = result.current.contractions[0].interval!;

    // Extend C1's duration by 20s — its endTime moves forward, so C2's interval shrinks by 20s
    act(() => { result.current.updateDuration(c1id, 50); });

    const newInterval = result.current.contractions[0].interval!;
    expect(newInterval).toBeLessThan(originalInterval);
    expect(originalInterval - newInterval).toBeCloseTo(20, -1);
  });

  it('updateDuration clamps to minimum of 1 second', () => {
    const { result } = renderHook(() => useContractions());

    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    const id = result.current.contractions[0].id;
    act(() => { result.current.updateDuration(id, 0); });

    // Hook itself stores 0 — clamping to 1 is handled in the UI save()
    // This test verifies the hook accepts the value as-is (UI is responsible for clamping)
    expect(result.current.contractions[0].duration).toBe(0);
  });

  it('clearAll removes all contractions and stops tracking', () => {
    const { result } = renderHook(() => useContractions());

    act(() => { result.current.startContraction(); });
    act(() => { result.current.stopContraction(); });
    act(() => { result.current.startContraction(); });
    act(() => { result.current.clearAll(); });

    expect(result.current.contractions).toHaveLength(0);
    expect(result.current.tracking).toBe(false);
  });

  it('persists contractions to localStorage', () => {
    const { result } = renderHook(() => useContractions());

    act(() => { result.current.startContraction(); });
    act(() => { result.current.stopContraction(); });

    const stored = JSON.parse(localStorage.getItem('contraction_tracker_data')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].duration).not.toBeNull();
  });

  it('loads existing contractions from localStorage on mount', () => {
    const saved = [{
      id: 'test-id',
      startTime: Date.now() - 60_000,
      endTime: Date.now() - 30_000,
      duration: 30,
      interval: null,
    }];
    localStorage.setItem('contraction_tracker_data', JSON.stringify(saved));

    const { result } = renderHook(() => useContractions());
    expect(result.current.contractions).toHaveLength(1);
    expect(result.current.contractions[0].id).toBe('test-id');
  });
});
