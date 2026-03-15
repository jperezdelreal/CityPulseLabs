import { useState, useEffect } from 'react';
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
  const [routes, setRoutes] = useState<MultiModalRoute[]>([]);
  const [walkingRoute, setWalkingRoute] = useState<WalkingRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!origin || !destination) {
      setRoutes([]);
      setWalkingRoute(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchRoutes() {
      try {
        const [multiModal, walking] = await Promise.all([
          calculateMultiModalRoutes(origin!, destination!, stations, bikeType),
          calculateWalkingOnly(origin!, destination!),
        ]);

        if (!cancelled) {
          setRoutes(multiModal);
          setWalkingRoute(walking);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to calculate routes');
          setLoading(false);
        }
      }
    }

    fetchRoutes();

    return () => {
      cancelled = true;
    };
  }, [origin, destination, stations, bikeType]);

  return { routes, walkingRoute, loading, error };
}