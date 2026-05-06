import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTracks } from '../useTracks';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTracks — initial state', () => {
  it('starts with one track named "Track 1"', () => {
    const { result } = renderHook(() => useTracks());
    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks[0].label).toBe('Track 1');
  });

  it('active track matches the single track', () => {
    const { result } = renderHook(() => useTracks());
    expect(result.current.activeTrackId).toBe(result.current.tracks[0].id);
  });

  it('starts with no contractions', () => {
    const { result } = renderHook(() => useTracks());
    expect(result.current.contractions).toHaveLength(0);
    expect(result.current.tracking).toBe(false);
  });

  it('migrates legacy contraction data on first load', () => {
    const legacy = [{
      id: 'legacy-id',
      startTime: Date.now() - 60_000,
      endTime: Date.now() - 30_000,
      duration: 30,
      interval: null,
      painLevel: null,
    }];
    localStorage.setItem('contraction_tracker_data', JSON.stringify(legacy));

    const { result } = renderHook(() => useTracks());
    expect(result.current.contractions).toHaveLength(1);
    expect(result.current.contractions[0].id).toBe('legacy-id');
    expect(result.current.tracks).toHaveLength(1);
  });
});

describe('useTracks — track management', () => {
  it('createTrack adds a second track with auto label', () => {
    const { result } = renderHook(() => useTracks());

    act(() => { result.current.createTrack(); });

    expect(result.current.tracks).toHaveLength(2);
    expect(result.current.tracks[1].label).toBe('Track 2');
  });

  it('createTrack switches to the new track', () => {
    const { result } = renderHook(() => useTracks());

    act(() => { result.current.createTrack(); });

    expect(result.current.activeTrackId).toBe(result.current.tracks[1].id);
  });

  it('new track starts with empty contractions', () => {
    const { result } = renderHook(() => useTracks());

    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });
    act(() => { result.current.createTrack(); });

    expect(result.current.contractions).toHaveLength(0);
  });

  it('switchTrack changes the active track', () => {
    const { result } = renderHook(() => useTracks());

    act(() => { result.current.createTrack(); });
    const firstId = result.current.tracks[0].id;
    act(() => { result.current.switchTrack(firstId); });

    expect(result.current.activeTrackId).toBe(firstId);
  });

  it('switchTrack stops any in-progress tracking', () => {
    const { result } = renderHook(() => useTracks());

    act(() => { result.current.createTrack(); });
    const firstId = result.current.tracks[0].id;
    act(() => { result.current.switchTrack(firstId); });
    act(() => { result.current.startContraction(); });

    act(() => { result.current.switchTrack(result.current.tracks[1].id); });

    expect(result.current.tracking).toBe(false);
  });

  it('renameTrack updates the label', () => {
    const { result } = renderHook(() => useTracks());
    const id = result.current.tracks[0].id;

    act(() => { result.current.renameTrack(id, 'Labor day'); });

    expect(result.current.tracks[0].label).toBe('Labor day');
    expect(result.current.activeTrack.label).toBe('Labor day');
  });

  it('deleteTrack removes the track', () => {
    const { result } = renderHook(() => useTracks());

    act(() => { result.current.createTrack(); });
    const secondId = result.current.tracks[1].id;
    act(() => { result.current.deleteTrack(secondId); });

    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks.find(t => t.id === secondId)).toBeUndefined();
  });

  it('cannot delete the last remaining track', () => {
    const { result } = renderHook(() => useTracks());
    const onlyId = result.current.tracks[0].id;

    act(() => { result.current.deleteTrack(onlyId); });

    expect(result.current.tracks).toHaveLength(1);
  });

  it('deleting the active track switches to the first remaining track', () => {
    const { result } = renderHook(() => useTracks());

    act(() => { result.current.createTrack(); });
    const activeId = result.current.activeTrackId;
    const firstId = result.current.tracks[0].id;

    act(() => { result.current.deleteTrack(activeId); });

    expect(result.current.activeTrackId).toBe(firstId);
  });

  it('deleting a non-active track does not change the active track', () => {
    const { result } = renderHook(() => useTracks());

    act(() => { result.current.createTrack(); });
    const firstId = result.current.tracks[0].id;
    const secondId = result.current.tracks[1].id;

    // Switch back to first, then delete second
    act(() => { result.current.switchTrack(firstId); });
    act(() => { result.current.deleteTrack(secondId); });

    expect(result.current.activeTrackId).toBe(firstId);
    expect(result.current.tracks).toHaveLength(1);
  });
});

describe('useTracks — contraction isolation', () => {
  it('contractions on track A are not visible on track B', () => {
    const { result } = renderHook(() => useTracks());

    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    act(() => { result.current.createTrack(); });

    expect(result.current.contractions).toHaveLength(0);
  });

  it('switching back to track A restores its contractions', () => {
    const { result } = renderHook(() => useTracks());
    const trackAId = result.current.tracks[0].id;

    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    act(() => { result.current.createTrack(); });
    act(() => { result.current.switchTrack(trackAId); });

    expect(result.current.contractions).toHaveLength(1);
  });

  it('clearAll only clears the active track', () => {
    const { result } = renderHook(() => useTracks());
    const trackAId = result.current.tracks[0].id;

    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    act(() => { result.current.createTrack(); });
    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(20_000); });
    act(() => { result.current.stopContraction(); });

    // Clear Track B (currently active)
    act(() => { result.current.clearAll(); });
    expect(result.current.contractions).toHaveLength(0);

    // Track A still has its data
    act(() => { result.current.switchTrack(trackAId); });
    expect(result.current.contractions).toHaveLength(1);
  });
});

describe('useTracks — contraction operations', () => {
  it('startContraction and stopContraction work correctly', () => {
    const { result } = renderHook(() => useTracks());

    act(() => { result.current.startContraction(); });
    expect(result.current.tracking).toBe(true);
    expect(result.current.contractions[0].endTime).toBeNull();

    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    expect(result.current.tracking).toBe(false);
    expect(result.current.contractions[0].duration).toBeGreaterThanOrEqual(30);
  });

  it('addContraction inserts a completed entry with correct duration', () => {
    const { result } = renderHook(() => useTracks());
    const startTime = Date.now() - 120_000;

    act(() => { result.current.addContraction(startTime, 45, null); });

    expect(result.current.contractions).toHaveLength(1);
    const c = result.current.contractions[0];
    expect(c.startTime).toBe(startTime);
    expect(c.duration).toBe(45);
    expect(c.endTime).toBe(startTime + 45_000);
    expect(c.painLevel).toBeNull();
  });

  it('addContraction stores pain level', () => {
    const { result } = renderHook(() => useTracks());
    act(() => { result.current.addContraction(Date.now() - 60_000, 30, 3); });
    expect(result.current.contractions[0].painLevel).toBe(3);
  });

  it('addContraction inserts in chronological order (newest-first storage)', () => {
    const { result } = renderHook(() => useTracks());
    const now = Date.now();

    act(() => { result.current.addContraction(now - 60_000, 20, null); }); // older
    act(() => { result.current.addContraction(now - 10_000, 20, null); }); // newer

    expect(result.current.contractions[0].startTime).toBe(now - 10_000);
    expect(result.current.contractions[1].startTime).toBe(now - 60_000);
  });

  it('addContraction recalculates intervals for surrounding entries', () => {
    const { result } = renderHook(() => useTracks());
    const base = 1_000_000_000_000;

    // Add C1 then C3, then insert C2 between them
    act(() => { result.current.addContraction(base, 30, null); });         // C1: base → base+30s
    act(() => { result.current.addContraction(base + 200_000, 30, null); }); // C3
    act(() => { result.current.addContraction(base + 90_000, 30, null); });  // C2 inserted between

    // Newest-first: [C3, C2, C1]
    const [c3, c2, c1] = result.current.contractions;
    expect(c1.interval).toBeNull();                       // first contraction
    expect(c2.interval).toBeGreaterThan(0);               // gap from C1.endTime
    expect(c3.interval).toBeGreaterThan(0);               // gap from C2.endTime, recalculated
    expect(c3.interval).toBeLessThan(c2.interval! + 90); // C3 gap is shorter after C2 inserted
  });

  it('persists all tracks to localStorage', () => {
    const { result } = renderHook(() => useTracks());

    act(() => { result.current.createTrack(); });
    act(() => { result.current.startContraction(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { result.current.stopContraction(); });

    const stored = JSON.parse(localStorage.getItem('contraction_tracker_v2')!);
    expect(stored.tracks).toHaveLength(2);
    expect(Object.keys(stored.contractions)).toHaveLength(2);
  });
});
