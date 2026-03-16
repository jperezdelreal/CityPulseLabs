import { useState, useCallback, useRef, useEffect } from 'react';
import { searchAddress, DEBOUNCE_MS } from '../services/geocoding.ts';
import type { GeocodingResult } from '../services/geocoding.ts';

export interface UseGeocodeReturn {
  results: GeocodingResult[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

export function useGeocode(): UseGeocodeReturn {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setLoading(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const data = await searchAddress(query, controller.signal);
        if (!controller.signal.aborted) {
          setResults(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Error en la búsqueda');
          setResults([]);
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { results, loading, error, search, clear };
}
