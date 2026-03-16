/**
 * Nominatim (OpenStreetMap) geocoding service for A Coruña area.
 * Free, no API key required. Rate-limited — use with debounce.
 */

export interface GeocodingResult {
  display_name: string;
  lat: number;
  lon: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'BiciCoruna/1.0';
const A_CORUNA_VIEWBOX = '-8.5,43.3,-8.3,43.4';
const RESULT_LIMIT = 5;
const DEBOUNCE_MS = 300;

export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: String(RESULT_LIMIT),
    countrycodes: 'es',
    viewbox: A_CORUNA_VIEWBOX,
    bounded: '1',
  });

  const response = await fetch(`${NOMINATIM_BASE}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Geocoding error: ${response.status}`);
  }

  const data: NominatimResult[] = await response.json();

  return data.map((item) => ({
    display_name: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
  }));
}

export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number = DEBOUNCE_MS,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export { DEBOUNCE_MS };
