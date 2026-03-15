import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getContainer } from '../shared/cosmos-client.js';
import type { StationSnapshot } from './stationCollector.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PredictionConfidence = 'high' | 'medium' | 'low' | 'none';

export interface PredictionResult {
  predicted: number | null;
  confidence: PredictionConfidence;
  range: [number, number] | null;
  dataPoints: number;
  message?: string;
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/** Whether a given hour falls within morning (7-9) or evening (17-19) rush. */
export function isRushHour(hour: number): boolean {
  return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
}

/** Whether a day-of-week is a weekend (0 = Sunday, 6 = Saturday). */
export function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/** Determine confidence level from data point count. */
export function computeConfidence(dataPoints: number): PredictionConfidence {
  if (dataPoints <= 0) return 'none';
  if (dataPoints < 10) return 'low';
  if (dataPoints <= 50) return 'medium';
  return 'high';
}

/**
 * Compute the prediction from an array of historical bike-availability values.
 *
 * Algorithm:
 *   trend_extrapolation * 0.6 + historical_mean * 0.4
 *
 * Enhanced (Issue #14): when 5+ distinct weeks of data are available,
 * observations are weighted by day-of-week + hour relevance.
 */
export function computePrediction(
  snapshots: Pick<StationSnapshot, 'bikesAvailable' | 'timestamp' | 'hour' | 'dayOfWeek'>[],
  targetHour: number,
  targetDayOfWeek: number,
): PredictionResult {
  if (snapshots.length === 0) {
    return { predicted: null, confidence: 'none', range: null, dataPoints: 0, message: 'Insufficient data' };
  }

  // --- Enhanced weighting (Issue #14) ---
  const distinctWeeks = new Set(
    snapshots.map((s) => {
      const d = new Date(s.timestamp);
      const yearWeek = d.getFullYear() * 100 + Math.floor(dayOfYear(d) / 7);
      return yearWeek;
    }),
  ).size;

  const useEnhanced = distinctWeeks >= 5;
  const targetIsWeekend = isWeekend(targetDayOfWeek);
  const targetIsRush = isRushHour(targetHour);

  // Assign weights
  const weighted: { value: number; weight: number }[] = snapshots.map((s) => {
    let weight = 1;
    if (useEnhanced) {
      // Day-of-week match bonus
      if (s.dayOfWeek === targetDayOfWeek) {
        weight += 1;
      } else if (isWeekend(s.dayOfWeek) === targetIsWeekend) {
        weight += 0.5;
      }
      // Rush-hour alignment bonus
      if (isRushHour(s.hour) === targetIsRush) {
        weight += 0.5;
      }
    }
    return { value: s.bikesAvailable, weight };
  });

  // Weighted mean
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  const historicalMean = weighted.reduce((sum, w) => sum + w.value * w.weight, 0) / totalWeight;

  // Trend extrapolation: simple linear regression on chronologically sorted values
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const n = sorted.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += sorted[i].bikesAvailable;
    sumXY += i * sorted[i].bikesAvailable;
    sumX2 += i * i;
  }
  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;
  const trendExtrapolation = Math.max(0, intercept + slope * n);

  // Blend
  const predicted = Math.round(trendExtrapolation * 0.6 + historicalMean * 0.4);

  // Confidence
  const confidence = computeConfidence(snapshots.length);

  // Range (±std dev, minimum ±1)
  const meanVal = sumY / n;
  const variance = sorted.reduce((sum, s) => sum + (s.bikesAvailable - meanVal) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const margin = Math.max(1, Math.round(stdDev));
  const range: [number, number] = [Math.max(0, predicted - margin), predicted + margin];

  return { predicted, confidence, range, dataPoints: snapshots.length };
}

/** Day of year helper (1-indexed). */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

// ---------------------------------------------------------------------------
// Cosmos DB query
// ---------------------------------------------------------------------------

async function queryHistoricalSnapshots(
  stationId: string,
  targetHour: number,
  targetDayOfWeek: number,
): Promise<StationSnapshot[]> {
  const container = getContainer();

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const hourLow = (targetHour - 1 + 24) % 24;
  const hourHigh = (targetHour + 1) % 24;

  // Handle hour wrap-around (e.g. hour 0 ± 1 → 23, 0, 1)
  let hourClause: string;
  if (hourLow <= hourHigh) {
    hourClause = `c.hour >= ${hourLow} AND c.hour <= ${hourHigh}`;
  } else {
    hourClause = `(c.hour >= ${hourLow} OR c.hour <= ${hourHigh})`;
  }

  const querySpec = {
    query: `SELECT * FROM c WHERE c.stationId = @stationId AND c.timestamp >= @since AND c.dayOfWeek = @dow AND ${hourClause}`,
    parameters: [
      { name: '@stationId', value: stationId },
      { name: '@since', value: fourteenDaysAgo },
      { name: '@dow', value: targetDayOfWeek },
    ],
  };

  const { resources } = await container.items
    .query<StationSnapshot>(querySpec)
    .fetchAll();

  return resources;
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

export async function predictHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const stationParam = req.query.get('station');
  const horizonParam = req.query.get('horizon') ?? '30';

  if (!stationParam) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required query parameter: station' }),
    };
  }

  const horizonMinutes = parseInt(horizonParam, 10);
  if (isNaN(horizonMinutes) || horizonMinutes < 0) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid horizon parameter' }),
    };
  }

  try {
    const target = new Date(Date.now() + horizonMinutes * 60_000);
    const targetHour = target.getUTCHours();
    const targetDayOfWeek = target.getUTCDay();

    const snapshots = await queryHistoricalSnapshots(stationParam, targetHour, targetDayOfWeek);

    context.log(
      `Prediction for station ${stationParam}: ${snapshots.length} data points, ` +
        `horizon=${horizonMinutes}min, targetHour=${targetHour}, dow=${targetDayOfWeek}`,
    );

    const result = computePrediction(snapshots, targetHour, targetDayOfWeek);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (err) {
    context.error(`Prediction error: ${err}`);
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to compute prediction',
        message: err instanceof Error ? err.message : String(err),
      }),
    };
  }
}

// ---------------------------------------------------------------------------
// Function registration
// ---------------------------------------------------------------------------

app.http('predict', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'predict',
  handler: predictHandler,
});
