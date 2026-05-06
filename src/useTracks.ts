import { useState, useEffect, useCallback } from 'react';
import type { Contraction, Track } from './types';

const STORAGE_KEY = 'contraction_tracker_v2';
const LEGACY_KEY = 'contraction_tracker_data';

interface AppState {
  tracks: Track[];
  activeTrackId: string;
  contractions: Record<string, Contraction[]>;
}

function createTrackEntry(n: number): Track {
  return { id: crypto.randomUUID(), label: `Track ${n}` };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // Migrate from v1 single-track storage
    const legacy = localStorage.getItem(LEGACY_KEY);
    const legacyContractions: Contraction[] = legacy ? JSON.parse(legacy) : [];
    const defaultTrack = createTrackEntry(1);
    return {
      tracks: [defaultTrack],
      activeTrackId: defaultTrack.id,
      contractions: { [defaultTrack.id]: legacyContractions },
    };
  } catch {
    const defaultTrack = createTrackEntry(1);
    return {
      tracks: [defaultTrack],
      activeTrackId: defaultTrack.id,
      contractions: { [defaultTrack.id]: [] },
    };
  }
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function recomputeIntervals(contractions: Contraction[]): Contraction[] {
  return contractions.map((c, i) => {
    const prevCompleted = contractions.slice(i + 1).find(p => p.endTime !== null);
    const interval = prevCompleted
      ? Math.floor((c.startTime - prevCompleted.endTime!) / 1000)
      : null;
    return { ...c, interval };
  });
}

export function useTracks() {
  const [state, setState] = useState<AppState>(loadState);
  const [tracking, setTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!tracking) return;
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [tracking]);

  const contractions: Contraction[] = state.contractions[state.activeTrackId] ?? [];
  const activeTrack = state.tracks.find(t => t.id === state.activeTrackId) ?? state.tracks[0];

  // ── Contraction operations ──────────────────────────────────────────────

  const startContraction = useCallback(() => {
    setElapsed(0);
    setTracking(true);
    const newContraction: Contraction = {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      endTime: null,
      duration: null,
      interval: null,
      painLevel: null,
    };
    setState(prev => {
      const current = prev.contractions[prev.activeTrackId] ?? [];
      const last = current.find(c => c.endTime !== null);
      const interval = last ? Math.floor((newContraction.startTime - last.endTime!) / 1000) : null;
      return {
        ...prev,
        contractions: {
          ...prev.contractions,
          [prev.activeTrackId]: [{ ...newContraction, interval }, ...current],
        },
      };
    });
  }, []);

  const stopContraction = useCallback(() => {
    setTracking(false);
    const endTime = Date.now();
    setState(prev => {
      const current = prev.contractions[prev.activeTrackId] ?? [];
      const [active, ...rest] = current;
      if (!active || active.endTime !== null) return prev;
      const duration = Math.floor((endTime - active.startTime) / 1000);
      return {
        ...prev,
        contractions: {
          ...prev.contractions,
          [prev.activeTrackId]: [{ ...active, endTime, duration }, ...rest],
        },
      };
    });
  }, []);

  const deleteContraction = useCallback((id: string) => {
    setState(prev => {
      const current = prev.contractions[prev.activeTrackId] ?? [];
      const filtered = current.filter(c => c.id !== id);
      return {
        ...prev,
        contractions: {
          ...prev.contractions,
          [prev.activeTrackId]: recomputeIntervals(filtered),
        },
      };
    });
  }, []);

  const updateDuration = useCallback((id: string, newDuration: number) => {
    setState(prev => {
      const current = prev.contractions[prev.activeTrackId] ?? [];
      const updated = current.map(c => {
        if (c.id !== id || c.endTime === null) return c;
        return { ...c, duration: newDuration, endTime: c.startTime + newDuration * 1000 };
      });
      return {
        ...prev,
        contractions: {
          ...prev.contractions,
          [prev.activeTrackId]: recomputeIntervals(updated),
        },
      };
    });
  }, []);

  const updatePainLevel = useCallback((id: string, level: number | null) => {
    setState(prev => {
      const current = prev.contractions[prev.activeTrackId] ?? [];
      return {
        ...prev,
        contractions: {
          ...prev.contractions,
          [prev.activeTrackId]: current.map(c => c.id === id ? { ...c, painLevel: level } : c),
        },
      };
    });
  }, []);

  const clearAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      contractions: { ...prev.contractions, [prev.activeTrackId]: [] },
    }));
    setTracking(false);
  }, []);

  // ── Track operations ────────────────────────────────────────────────────

  const createTrack = useCallback(() => {
    setTracking(false);
    setElapsed(0);
    setState(prev => {
      const n = prev.tracks.length + 1;
      const newTrack = createTrackEntry(n);
      return {
        tracks: [...prev.tracks, newTrack],
        activeTrackId: newTrack.id,
        contractions: { ...prev.contractions, [newTrack.id]: [] },
      };
    });
  }, []);

  const deleteTrack = useCallback((id: string) => {
    setTracking(false);
    setElapsed(0);
    setState(prev => {
      if (prev.tracks.length <= 1) return prev;
      const tracks = prev.tracks.filter(t => t.id !== id);
      const activeTrackId = prev.activeTrackId === id ? tracks[0].id : prev.activeTrackId;
      const contractions = { ...prev.contractions };
      delete contractions[id];
      return { tracks, activeTrackId, contractions };
    });
  }, []);

  const renameTrack = useCallback((id: string, label: string) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === id ? { ...t, label } : t),
    }));
  }, []);

  const switchTrack = useCallback((id: string) => {
    setTracking(false);
    setElapsed(0);
    setState(prev => ({ ...prev, activeTrackId: id }));
  }, []);

  return {
    tracks: state.tracks,
    activeTrack,
    activeTrackId: state.activeTrackId,
    allContractions: state.contractions,
    contractions,
    tracking,
    elapsed,
    startContraction,
    stopContraction,
    deleteContraction,
    updateDuration,
    updatePainLevel,
    clearAll,
    createTrack,
    deleteTrack,
    renameTrack,
    switchTrack,
  };
}
