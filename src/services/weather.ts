import { fetchWithRetry } from '../utils/retry.ts';

export interface WeatherData {
  precipitationProbability: number;
  minutesUntilRain: number | null;
}

const WEATHER_API_URL = '/api/weather';
export const RAIN_THRESHOLD = 60;
const FORECAST_SLOT_MINUTES = 15;

/**
 * Fetch precipitation probability for A Coruña from the weather API proxy.
 * Returns the max probability in the next ~30 min window and estimated
 * minutes until rain exceeds the threshold.
 * Uses shorter timeout for non-critical weather data — graceful degradation on failure.
 */
export async function fetchWeather(): Promise<WeatherData> {
  const res = await fetchWithRetry(WEATHER_API_URL, undefined, {
    timeoutMs: 6_000,
    maxRetries: 1,
  });
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status}`);
  }

  const json = await res.json();
  const probabilities: number[] = json.precipitation_probability ?? [];

  if (probabilities.length === 0) {
    return { precipitationProbability: 0, minutesUntilRain: null };
  }

  const maxProbability = Math.max(...probabilities);

  // Each slot is 15 minutes; find the first slot above threshold
  let minutesUntilRain: number | null = null;
  for (let i = 0; i < probabilities.length; i++) {
    if (probabilities[i] >= RAIN_THRESHOLD) {
      minutesUntilRain = i * FORECAST_SLOT_MINUTES;
      break;
    }
  }

  return { precipitationProbability: maxProbability, minutesUntilRain };
}
