import { useState, useEffect, useMemo } from 'react';
import type { LatLng, MultiModalRoute, WalkingRoute } from '../types/index.ts';
import type { StationData } from '../types/gbfs.ts';
import type { BikeType } from '../services/bikeTypeFilter.ts';
import { calculateMultiModalRoutes, calculateWalkingOnly } from '../services/routeEngine.ts';

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

  useEffect(() => {
    if (!origin || !destination) return;

    let cancelled = false;
    setResult((prev) => ({ ...prev, loading: true, error: null }));

    async function fetchRoutes() {
      try {
        const [multiModal, walking] = await Promise.all([
          calculateMultiModalRoutes(origin!, destination!, stations, bikeType),
          calculateWalkingOnly(origin!, destination!),
        ]);

        if (!cancelled) {
          setResult({ routes: multiModal, walkingRoute: walking, loading: false, error: null });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setResult((prev) => ({
            ...prev,
            error: err instanceof Error ? err.message : 'Failed to calculate routes',
            loading: false,
          }));
        }
      }
    }

    fetchRoutes();

    return () => {
      cancelled = true;
    };
  }, [origin, destination, stations, bikeType]);

  return useMemo(() => {
    if (!hasEndpoints) {
      return { routes: [], walkingRoute: null, loading: false, error: null };
    }
    return result;
  }, [hasEndpoints, result]);
}