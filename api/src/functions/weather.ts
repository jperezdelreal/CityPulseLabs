import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=43.3623&longitude=-8.4115&minutely_15=precipitation_probability&forecast_minutely_15=8';

const CACHE_TTL_MS = 600_000; // 10 minutes

interface CacheEntry {
  data: string;
  timestamp: number;
}

let cache: CacheEntry | null = null;

async function weatherHandler(
  _req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
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
    const res = await fetch(OPEN_METEO_URL);
    if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);

    const json = await res.json();
    const probabilities: number[] =
      json?.minutely_15?.precipitation_probability ?? [];
    const times: string[] = json?.minutely_15?.time ?? [];

    const body = JSON.stringify({
      precipitation_probability: probabilities,
      times,
      fetched_at: new Date().toISOString(),
    });

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
    context.log('Weather fetch error:', err);

    if (cache) {
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'STALE',
          'X-Warning': 'Open-Meteo unavailable, serving cached data',
        },
        body: cache.data,
      };
    }

    return {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to fetch weather data',
        message: err instanceof Error ? err.message : String(err),
      }),
    };
  }
}

app.http('weather', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'weather',
  handler: weatherHandler,
});
