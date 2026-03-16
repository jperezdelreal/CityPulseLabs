import type { MultiModalRoute, WalkingRoute, LatLng } from '../types/index.ts';

interface CachedRouteResult {
  routes: MultiModalRoute[];
  walkingRoute: WalkingRoute;
  timestamp: number;
}

const CACHE_TTL_MS = 30_000; // 30 seconds

function cacheKey(origin: LatLng, destination: LatLng, bikeType: string): string {
  // Round to 5 decimal places (~1m precision) to catch near-identical requests
  const oLat = origin.lat.toFixed(5);
  const oLng = origin.lng.toFixed(5);
  const dLat = destination.lat.toFixed(5);
  const dLng = destination.lng.toFixed(5);
  return `${oLat},${oLng}|${dLat},${dLng}|${bikeType}`;
}

const cache = new Map<string, CachedRouteResult>();

export function getCachedRoutes(
  origin: LatLng,
  destination: LatLng,
  bikeType: string,
): CachedRouteResult | null {
  const key = cacheKey(origin, destination, bikeType);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setCachedRoutes(
  origin: LatLng,
  destination: LatLng,
  bikeType: string,
  routes: MultiModalRoute[],
  walkingRoute: WalkingRoute,
): void {
  const key = cacheKey(origin, destination, bikeType);
  cache.set(key, { routes, walkingRoute, timestamp: Date.now() });

  // Evict old entries to prevent unbounded growth
  if (cache.size > 50) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.timestamp > CACHE_TTL_MS) cache.delete(k);
    }
  }
}
