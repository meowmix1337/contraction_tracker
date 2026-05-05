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
