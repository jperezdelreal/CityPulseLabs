import { useState, useEffect, useMemo, useRef } from 'react';
import type { LatLng, MultiModalRoute, WalkingRoute } from '../types/index.ts';
import type { StationData } from '../types/gbfs.ts';
import type { BikeType } from '../services/bikeTypeFilter.ts';
import { calculateMultiModalRoutes, calculateWalkingOnly } from '../services/routeEngine.ts';
import { getCachedRoutes, setCachedRoutes } from '../utils/routeCache.ts';

interface UseRoutesResult {
  routes: MultiModalRoute[];
  walkingRoute: WalkingRoute | null;
  loading: boolean;
  error: string | null;
}

export function useRoutes(
  origin: LatLng | null,
  destination: LatLng | null,
  stations: StationData[],
  bikeType: BikeType = 'any',
): UseRoutesResult {
  const [result, setResult] = useState<{
    routes: MultiModalRoute[];
    walkingRoute: WalkingRoute | null;
    loading: boolean;
    error: string | null;
  }>({ routes: [], walkingRoute: null, loading: false, error: null });

  const hasEndpoints = origin !== null && destination !== null;
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!origin || !destination) return;

    // Abort any in-flight request from a previous render
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Check cache first
    const cached = getCachedRoutes(origin, destination, bikeType);
    if (cached) {
      setResult({
        routes: cached.routes,
        walkingRoute: cached.walkingRoute,
        loading: false,
        error: null,
      });
      return;
    }

    setResult((prev) => ({ ...prev, loading: true, error: null }));

    async function fetchRoutes() {
      try {
        const [multiModal, walking] = await Promise.all([
          calculateMultiModalRoutes(origin!, destination!, stations, bikeType, controller.signal),
          calculateWalkingOnly(origin!, destination!, controller.signal),
        ]);

        if (!controller.signal.aborted) {
          setCachedRoutes(origin!, destination!, bikeType, multiModal, walking);
          setResult({ routes: multiModal, walkingRoute: walking, loading: false, error: null });
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setResult((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to calculate routes',
          loading: false,
        }));
      }
    }

    fetchRoutes();

    return () => {
      controller.abort();
    };
  }, [origin, destination, stations, bikeType]);

  return useMemo(() => {
    if (!hasEndpoints) {
      return { routes: [], walkingRoute: null, loading: false, error: null };
    }
    return result;
  }, [hasEndpoints, result]);
}
