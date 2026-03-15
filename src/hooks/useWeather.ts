import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWeather, type WeatherData } from '../services/weather.ts';

const POLL_INTERVAL_MS = 600_000; // 10 minutes

interface UseWeatherResult {
  precipitationProbability: number;
  minutesUntilRain: number | null;
  loading: boolean;
}

export function useWeather(): UseWeatherResult {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const weather = await fetchWeather();
      setData(weather);
    } catch {
      // Graceful degradation: no banner shown on error
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  return {
    precipitationProbability: data?.precipitationProbability ?? 0,
    minutesUntilRain: data?.minutesUntilRain ?? null,
    loading,
  };
}
