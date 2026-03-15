import { useState, useEffect } from 'react';
import type { GeofencingZonesCollection } from '../types/index.ts';
import {
  discoverGeofencingUrl,
  fetchGeofencingZones,
} from '../services/geofencing.ts';

export function useGeofencing() {
  const [zones, setZones] = useState<GeofencingZonesCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadZones() {
      try {
        const url = await discoverGeofencingUrl();
        if (!url) {
          if (!cancelled) {
            setZones(null);
            setLoading(false);
          }
          return;
        }

        const data = await fetchGeofencingZones(url);
        if (!cancelled) {
          setZones(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch geofencing zones',
          );
          setLoading(false);
        }
      }
    }

    loadZones();

    return () => {
      cancelled = true;
    };
  }, []);

  return { zones, loading, error };
}
