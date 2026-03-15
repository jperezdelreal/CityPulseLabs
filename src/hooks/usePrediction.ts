import { useState, useEffect, useCallback } from 'react';
import { fetchPrediction, type PredictionResult } from '../services/prediction.ts';

interface UsePredictionResult {
  prediction: PredictionResult | null;
  loading: boolean;
  error: string | null;
}

export function usePrediction(
  stationId: string | null,
  horizonMinutes: number = 30,
): UsePredictionResult {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!stationId) {
      setPrediction(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchPrediction(stationId, horizonMinutes);
      setPrediction(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  }, [stationId, horizonMinutes]);

  useEffect(() => {
    load();
  }, [load]);

  return { prediction, loading, error };
}
