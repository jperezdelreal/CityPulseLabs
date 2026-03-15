import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

const GBFS_DISCOVERY_URL =
  'https://acoruna.publicbikesystem.net/customer/gbfs/v2/gbfs.json';
const LANGUAGE = 'en';
const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  data: string;
  timestamp: number;
}

let cache: CacheEntry | null = null;

interface GBFSFeed {
  name: string;
  url: string;
}

interface DiscoveryResponse {
  data: Record<string, { feeds: GBFSFeed[] }>;
}

async function discoverUrls(): Promise<{ infoUrl: string; statusUrl: string }> {
  const res = await fetch(GBFS_DISCOVERY_URL);
  if (!res.ok) throw new Error(`Discovery failed: ${res.status}`);
  const json: DiscoveryResponse = await res.json();

  const feeds =
    json.data[LANGUAGE]?.feeds ?? json.data[Object.keys(json.data)[0]!]?.feeds;
  if (!feeds) throw new Error('No feeds in discovery');

  const infoUrl = feeds.find((f) => f.name === 'station_information')?.url;
  const statusUrl = feeds.find((f) => f.name === 'station_status')?.url;
  if (!infoUrl || !statusUrl) throw new Error('Missing feed URLs');
  return { infoUrl, statusUrl };
}

interface StationInfo {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  address?: string;
  [key: string]: unknown;
}

interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_docks_available: number;
  is_renting: boolean;
  is_returning: boolean;
  last_reported: number;
  vehicle_types_available?: { vehicle_type_id: string; count: number }[];
  [key: string]: unknown;
}

interface GBFSPayload<T> {
  data: { stations: T[] };
}

function mergeAndFilter(info: StationInfo[], status: StationStatus[]) {
  const statusMap = new Map(status.map((s) => [s.station_id, s]));
  return info
    .filter((i) => {
      const s = statusMap.get(i.station_id);
      return s && s.is_renting && s.is_returning;
    })
    .map((i) => {
      const s = statusMap.get(i.station_id)!;
      return {
        ...i,
        num_bikes_available: s.num_bikes_available,
        num_bikes_disabled: (s as Record<string, unknown>).num_bikes_disabled ?? 0,
        num_docks_available: s.num_docks_available,
        num_docks_disabled: (s as Record<string, unknown>).num_docks_disabled ?? 0,
        is_renting: s.is_renting,
        is_returning: s.is_returning,
        is_installed: (s as Record<string, unknown>).is_installed ?? true,
        last_reported: s.last_reported,
        vehicle_types_available: s.vehicle_types_available ?? [],
      };
    });
}

async function stationsHandler(
  _req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  // Return cached data if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`,
      },
      body: cache.data,
    };
  }

  try {
    const { infoUrl, statusUrl } = await discoverUrls();
    const [infoRes, statusRes] = await Promise.all([
      fetch(infoUrl),
      fetch(statusUrl),
    ]);

    if (!infoRes.ok || !statusRes.ok) {
      throw new Error(
        `GBFS fetch failed: info=${infoRes.status} status=${statusRes.status}`,
      );
    }

    const infoJson: GBFSPayload<StationInfo> = await infoRes.json();
    const statusJson: GBFSPayload<StationStatus> = await statusRes.json();

    const stations = mergeAndFilter(
      infoJson.data.stations,
      statusJson.data.stations,
    );

    const body = JSON.stringify({ stations, last_updated: Date.now() });
    cache = { data: body, timestamp: Date.now() };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`,
      },
      body,
    };
  } catch (err) {
    context.log('GBFS fetch error:', err);

    // Serve stale cache with warning if available
    if (cache) {
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'STALE',
          'X-Warning': 'GBFS upstream unavailable, serving cached data',
          'Cache-Control': 'no-cache',
        },
        body: cache.data,
      };
    }

    return {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to fetch station data from GBFS',
        message: err instanceof Error ? err.message : String(err),
      }),
    };
  }
}

app.http('stations', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'stations',
  handler: stationsHandler,
});
