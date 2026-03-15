import { useState, useEffect } from 'react';
import type { Station } from '../types';

export function useStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch from GBFS API via Azure Function proxy
    setStations([]);
    setLoading(false);
    setError(null);
  }, []);

  return { stations, loading, error, setStations };
}
