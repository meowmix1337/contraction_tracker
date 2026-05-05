import { useState, useEffect, useCallback } from 'react';
import type { Contraction } from './types';

const STORAGE_KEY = 'contraction_tracker_data';

function loadFromStorage(): Contraction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(contractions: Contraction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contractions));
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

export function useContractions() {
  const [contractions, setContractions] = useState<Contraction[]>(loadFromStorage);
  const [tracking, setTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    saveToStorage(contractions);
  }, [contractions]);

  useEffect(() => {
    if (!tracking) return;
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [tracking]);

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
    setContractions(prev => {
      const last = prev.find(c => c.endTime !== null);
      const interval = last ? Math.floor((newContraction.startTime - last.endTime!) / 1000) : null;
      return [{ ...newContraction, interval }, ...prev];
    });
  }, []);

  const stopContraction = useCallback(() => {
    setTracking(false);
    const endTime = Date.now();
    setContractions(prev => {
      const [active, ...rest] = prev;
      if (!active || active.endTime !== null) return prev;
      const duration = Math.floor((endTime - active.startTime) / 1000);
      return [{ ...active, endTime, duration }, ...rest];
    });
  }, []);

  const deleteContraction = useCallback((id: string) => {
    setContractions(prev => {
      const filtered = prev.filter(c => c.id !== id);
      return recomputeIntervals(filtered);
    });
  }, []);

  const updateDuration = useCallback((id: string, newDuration: number) => {
    setContractions(prev => {
      const updated = prev.map(c => {
        if (c.id !== id || c.endTime === null) return c;
        return { ...c, duration: newDuration, endTime: c.startTime + newDuration * 1000 };
      });
      return recomputeIntervals(updated);
    });
  }, []);

  const updatePainLevel = useCallback((id: string, level: number | null) => {
    setContractions(prev => prev.map(c => c.id === id ? { ...c, painLevel: level } : c));
  }, []);

  const clearAll = useCallback(() => {
    setContractions([]);
    setTracking(false);
  }, []);

  return { contractions, tracking, elapsed, startContraction, stopContraction, deleteContraction, updateDuration, updatePainLevel, clearAll };
}
