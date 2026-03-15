import type { LatLng, RouteSegment } from '../types/index.ts';
import { fetchWithRetry } from '../utils/retry.ts';

const ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions';

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

function getApiKey(): string {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ORS_API_KEY) || ''
  );
}

async function fetchRoute(
  profile: ORSProfile,
  from: LatLng,
  to: LatLng,
): Promise<RouteSegment> {
  const apiKey = getApiKey();
  // ORS expects [lng, lat] order
  const start = `${from.lng},${from.lat}`;
  const end = `${to.lng},${to.lat}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json, application/geo+json',
  };
  if (apiKey) {
    headers['Authorization'] = apiKey;
  }

  const url = `${ORS_BASE_URL}/${profile}?start=${start}&end=${end}`;
  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    throw new Error(`ORS API error: ${response.status} ${response.statusText}`);
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
): Promise<RouteSegment> {
  return fetchRoute('foot-walking', from, to);
}

/** Get a cycling route between two points */
export async function getCyclingRoute(
  from: LatLng,
  to: LatLng,
): Promise<RouteSegment> {
  return fetchRoute('cycling-regular', from, to);
}
