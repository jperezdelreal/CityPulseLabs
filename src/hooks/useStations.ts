import { useState, useEffect, useRef, useCallback } from 'react';
import type { StationData } from '../types/index.ts';
import { GBFSPoller } from '../services/gbfs.ts';

const POLL_INTERVAL_MS = 30_000;

export function useStations() {
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [staleWarning, setStaleWarning] = useState(false);
  const pollerRef = useRef<GBFSPoller | null>(null);

  const handleUpdate = useCallback((data: StationData[]) => {
    setStations(data);
    setLastUpdated(new Date());
    setLoading(false);
    setError(null);
    setStaleWarning(false);
  }, []);

  const handlePollError = useCallback((_error: unknown, consecutiveFailures: number) => {
    if (consecutiveFailures >= 3) {
      setStaleWarning(true);
    }
  }, []);

  useEffect(() => {
    const poller = new GBFSPoller(POLL_INTERVAL_MS);
    pollerRef.current = poller;

    poller.start(handleUpdate, handlePollError).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to fetch stations');
      setLoading(false);
    });

    return () => {
      poller.stop();
    };
  }, [handleUpdate, handlePollError]);

  return { stations, loading, error, lastUpdated, staleWarning };
}
