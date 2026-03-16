import type { LatLng, RouteSegment } from '../types/index.ts';
import { fetchWithRetry } from '../utils/retry.ts';

type ORSProfile = 'foot-walking' | 'cycling-regular';

/** Calculate distance between two points using Haversine formula */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch a route via our Azure Function proxy at /api/routes.
 * This avoids CORS, hides the API key server-side, and enables server-side caching.
 */
async function fetchRoute(
  profile: ORSProfile,
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal,
): Promise<RouteSegment> {
  const response = await fetchWithRetry('/api/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile,
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    }),
  }, { signal });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = (errorData as { error?: string }).error || `Route API error: ${response.status} ${response.statusText}`;
    // Propagate 429 status so callers can show quota-friendly messaging
    if (response.status === 429) {
      throw new Error('429: Servicio de rutas temporalmente no disponible. Prueba de nuevo más tarde.');
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const feature = data.features?.[0];
  if (!feature) {
    throw new Error('No route found');
  }

  const { distance, duration } = feature.properties.summary;
  // GeoJSON coordinates are [lng, lat]; convert to [lat, lng]
  const geometry: [number, number][] = feature.geometry.coordinates.map(
    (coord: number[]) => [coord[1], coord[0]] as [number, number],
  );

  return {
    geometry,
    duration_seconds: duration,
    distance_meters: distance,
  };
}

/** Get a walking route between two points */
export async function getWalkingRoute(
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal,
): Promise<RouteSegment> {
  return fetchRoute('foot-walking', from, to, signal);
}

/** Get a cycling route between two points */
export async function getCyclingRoute(
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal,
): Promise<RouteSegment> {
  return fetchRoute('cycling-regular', from, to, signal);
}
