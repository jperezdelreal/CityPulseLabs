import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

const ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions';
const CACHE_TTL_MS = 300_000; // 5 min — nearby searches hit cache instead of ORS
const MAX_CACHE_SIZE = 200;
const ORS_TIMEOUT_MS = 15_000;

interface CacheEntry {
  body: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function evictStale(): void {
  if (cache.size <= MAX_CACHE_SIZE) return;
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) cache.delete(key);
  }
}

function cacheKey(profile: string, coordinates: number[][]): string {
  // Round to 3 decimals (~110m precision) to maximize cache hits for nearby searches
  const coords = coordinates
    .map(([lng, lat]) => `${lng.toFixed(3)},${lat.toFixed(3)}`)
    .join('|');
  return `${profile}:${coords}`;
}

interface RouteRequestBody {
  profile: string;
  coordinates: number[][];
}

async function routesHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    context.error('ORS_API_KEY not configured in Azure Function app settings');
    return {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Route service not configured' }),
    };
  }

  let body: RouteRequestBody;
  try {
    body = (await req.json()) as RouteRequestBody;
  } catch {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { profile, coordinates } = body;

  if (!profile || !coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing profile or coordinates (need at least 2 [lng,lat] pairs)' }),
    };
  }

  const validProfiles = ['foot-walking', 'cycling-regular', 'cycling-electric'];
  if (!validProfiles.includes(profile)) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Invalid profile. Allowed: ${validProfiles.join(', ')}` }),
    };
  }

  // Check server-side cache
  const key = cacheKey(profile, coordinates);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`,
      },
      body: cached.body,
    };
  }

  // Forward to ORS
  const orsUrl = `${ORS_BASE_URL}/${profile}/geojson`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ORS_TIMEOUT_MS);

    const orsResponse = await fetch(orsUrl, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!orsResponse.ok) {
      const errorText = await orsResponse.text().catch(() => 'Unknown error');
      context.warn(`ORS API error: ${orsResponse.status} — ${errorText}`);

      // Serve stale cache if available
      if (cached) {
        return {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'STALE',
            'X-Warning': 'ORS upstream error, serving cached route',
          },
          body: cached.body,
        };
      }

      return {
        status: orsResponse.status === 429 ? 429 : 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: orsResponse.status === 429
            ? 'Servicio de rutas temporalmente no disponible. Prueba de nuevo más tarde.'
            : 'Route calculation failed',
          upstream_status: orsResponse.status,
        }),
      };
    }

    const responseBody = await orsResponse.text();

    // Cache the successful response
    cache.set(key, { body: responseBody, timestamp: Date.now() });
    evictStale();

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`,
      },
      body: responseBody,
    };
  } catch (err) {
    context.error('ORS proxy error:', err);

    // Serve stale cache on network failure
    if (cached) {
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'STALE',
          'X-Warning': 'ORS upstream unavailable, serving cached route',
        },
        body: cached.body,
      };
    }

    return {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to reach route service',
        message: err instanceof Error ? err.message : String(err),
      }),
    };
  }
}

app.http('routes', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'routes',
  handler: routesHandler,
});
