import type { Station, Route } from '../types';

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

/** Find the top N bike-sharing routes between origin and destination */
export function findRoutes(
  _origin: { lat: number; lng: number },
  _destination: { lat: number; lng: number },
  _stations: Station[],
  _topN = 3,
): Route[] {
  // TODO: Implement multi-modal routing (walk → bike → walk)
  return [];
}
