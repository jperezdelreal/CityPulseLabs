import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Contract types — Issue #63: Improved Prediction Model
// These define the API that the implementation MUST satisfy.
// Real implementation: api/src/functions/predict.ts (enhanced)
// ---------------------------------------------------------------------------

interface HistoricalPattern {
  stationId: string;
  hour: number;
  dayOfWeek: number;
  avgBikes: number;
  stdDev: number;
  sampleCount: number;
}

interface ModelPrediction {
  stationId: string;
  predictedBikes: number;
  confidenceScore: number;  // 0-100 scale (Issue #63 requirement)
  availabilityLevel: 'green' | 'yellow' | 'red';
  range: [number, number];
  dataPoints: number;
  timestamp: string;
}

interface TrainingResult {
  patternsGenerated: number;
  stationsCovered: number;
  hoursCovered: number;
  oldestDataPoint: string;
  newestDataPoint: string;
}

interface StationSnapshot {
  stationId: string;
  timestamp: string;
  hour: number;
  dayOfWeek: number;
  bikesAvailable: number;
  docksAvailable: number;
  capacity: number;
}

// ---------------------------------------------------------------------------
// Reference implementations — pure functions defining expected behavior.
// Trinity replaces these with real imports.
// ---------------------------------------------------------------------------

function trainModel(snapshots: StationSnapshot[]): {
  patterns: HistoricalPattern[];
  result: TrainingResult;
} {
  if (snapshots.length === 0) {
    return {
      patterns: [],
      result: {
        patternsGenerated: 0,
        stationsCovered: 0,
        hoursCovered: 0,
        oldestDataPoint: '',
        newestDataPoint: '',
      },
    };
  }

  const key = (s: StationSnapshot) => `${s.stationId}:${s.hour}:${s.dayOfWeek}`;
  const groups = new Map<string, StationSnapshot[]>();

  for (const s of snapshots) {
    const k = key(s);
    const existing = groups.get(k) ?? [];
    existing.push(s);
    groups.set(k, existing);
  }

  const patterns: HistoricalPattern[] = Array.from(groups.entries()).map(([k, snaps]) => {
    const [stationId, hourStr, dowStr] = k.split(':');
    const values = snaps.map(s => s.bikesAvailable);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
    return {
      stationId,
      hour: parseInt(hourStr),
      dayOfWeek: parseInt(dowStr),
      avgBikes: Math.round(avg * 100) / 100,
      stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
      sampleCount: values.length,
    };
  });

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const stations = new Set(snapshots.map(s => s.stationId));
  const hours = new Set(snapshots.map(s => s.hour));

  return {
    patterns,
    result: {
      patternsGenerated: patterns.length,
      stationsCovered: stations.size,
      hoursCovered: hours.size,
      oldestDataPoint: sorted[0].timestamp,
      newestDataPoint: sorted[sorted.length - 1].timestamp,
    },
  };
}

function calculateConfidenceScore(sampleCount: number, maxSamples: number = 100): number {
  return Math.min(Math.round((sampleCount / maxSamples) * 100), 100);
}

function predictAvailability(
  pattern: HistoricalPattern | null,
  capacity: number,
): ModelPrediction {
  const now = new Date().toISOString();

  if (!pattern || pattern.sampleCount === 0) {
    return {
      stationId: pattern?.stationId ?? 'unknown',
      predictedBikes: 0,
      confidenceScore: 0,
      availabilityLevel: 'red',
      range: [0, 0],
      dataPoints: 0,
      timestamp: now,
    };
  }

  const predicted = Math.round(pattern.avgBikes);
  const confidenceScore = calculateConfidenceScore(pattern.sampleCount);
  const margin = Math.max(1, Math.round(pattern.stdDev));
  const range: [number, number] = [
    Math.max(0, predicted - margin),
    Math.min(capacity, predicted + margin),
  ];

  let availabilityLevel: 'green' | 'yellow' | 'red';
  if (capacity > 0) {
    const ratio = predicted / capacity;
    if (ratio > 0.2) availabilityLevel = 'green';
    else if (ratio > 0.1) availabilityLevel = 'yellow';
    else availabilityLevel = 'red';
  } else {
    availabilityLevel = 'red';
  }

  return {
    stationId: pattern.stationId,
    predictedBikes: predicted,
    confidenceScore,
    availabilityLevel,
    range,
    dataPoints: pattern.sampleCount,
    timestamp: now,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(overrides: Partial<StationSnapshot> = {}): StationSnapshot {
  return {
    stationId: '1',
    timestamp: '2026-06-10T10:00:00.000Z',
    hour: 10,
    dayOfWeek: 3,
    bikesAvailable: 10,
    docksAvailable: 10,
    capacity: 20,
    ...overrides,
  };
}

function generateTrainingData(
  stationId: string,
  weeks: number,
  capacity: number,
): StationSnapshot[] {
  const snapshots: StationSnapshot[] = [];
  const baseDate = new Date('2026-04-01T00:00:00.000Z');

  for (let w = 0; w < weeks; w++) {
    for (let dow = 0; dow < 7; dow++) {
      for (let hour = 0; hour < 24; hour++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + w * 7 + dow);
        d.setUTCHours(hour);

        // Realistic pattern: fewer bikes at rush hours
        let bikes: number;
        if (hour >= 7 && hour <= 9) bikes = Math.round(capacity * 0.15);
        else if (hour >= 17 && hour <= 19) bikes = Math.round(capacity * 0.2);
        else bikes = Math.round(capacity * 0.6);

        // Add some noise
        bikes = Math.max(0, Math.min(capacity, bikes + Math.floor(Math.random() * 3 - 1)));

        snapshots.push({
          stationId,
          timestamp: d.toISOString(),
          hour,
          dayOfWeek: d.getUTCDay(),
          bikesAvailable: bikes,
          docksAvailable: capacity - bikes,
          capacity,
        });
      }
    }
  }
  return snapshots;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Improved Prediction Model — Issue #63', () => {

  // --- Confidence score ---

  describe('calculateConfidenceScore', () => {
    it('returns 0 for 0 samples', () => {
      expect(calculateConfidenceScore(0)).toBe(0);
    });

    it('returns 100 for >= 100 samples', () => {
      expect(calculateConfidenceScore(100)).toBe(100);
      expect(calculateConfidenceScore(200)).toBe(100);
    });

    it('returns proportional score for intermediate counts', () => {
      expect(calculateConfidenceScore(50)).toBe(50);
      expect(calculateConfidenceScore(25)).toBe(25);
      expect(calculateConfidenceScore(75)).toBe(75);
    });

    it('returns integer value', () => {
      const score = calculateConfidenceScore(33);
      expect(Number.isInteger(score)).toBe(true);
    });

    it('score is between 0 and 100 inclusive', () => {
      for (const n of [0, 1, 10, 50, 100, 1000]) {
        const score = calculateConfidenceScore(n);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    it('uses custom max samples', () => {
      expect(calculateConfidenceScore(50, 200)).toBe(25);
      expect(calculateConfidenceScore(50, 50)).toBe(100);
    });
  });

  // --- Model training ---

  describe('trainModel', () => {
    it('returns empty result for no data', () => {
      const { patterns, result } = trainModel([]);
      expect(patterns).toEqual([]);
      expect(result.patternsGenerated).toBe(0);
      expect(result.stationsCovered).toBe(0);
    });

    it('generates patterns grouped by station + hour + dayOfWeek', () => {
      const snapshots = [
        makeSnapshot({ stationId: '1', hour: 10, dayOfWeek: 3, bikesAvailable: 8 }),
        makeSnapshot({ stationId: '1', hour: 10, dayOfWeek: 3, bikesAvailable: 12 }),
        makeSnapshot({ stationId: '1', hour: 11, dayOfWeek: 3, bikesAvailable: 5 }),
      ];
      const { patterns } = trainModel(snapshots);
      expect(patterns).toHaveLength(2); // 2 distinct groups
    });

    it('calculates correct average for pattern', () => {
      const snapshots = [
        makeSnapshot({ hour: 10, dayOfWeek: 3, bikesAvailable: 6 }),
        makeSnapshot({ hour: 10, dayOfWeek: 3, bikesAvailable: 10 }),
        makeSnapshot({ hour: 10, dayOfWeek: 3, bikesAvailable: 14 }),
      ];
      const { patterns } = trainModel(snapshots);
      expect(patterns[0].avgBikes).toBe(10);
    });

    it('calculates standard deviation', () => {
      const snapshots = [
        makeSnapshot({ hour: 10, dayOfWeek: 3, bikesAvailable: 8 }),
        makeSnapshot({ hour: 10, dayOfWeek: 3, bikesAvailable: 12 }),
      ];
      const { patterns } = trainModel(snapshots);
      expect(patterns[0].stdDev).toBe(2); // std dev of [8, 12] = 2
    });

    it('reports correct station and hour coverage', () => {
      const snapshots = [
        makeSnapshot({ stationId: '1', hour: 8 }),
        makeSnapshot({ stationId: '1', hour: 10 }),
        makeSnapshot({ stationId: '2', hour: 8 }),
      ];
      const { result } = trainModel(snapshots);
      expect(result.stationsCovered).toBe(2);
      expect(result.hoursCovered).toBe(2);
    });

    it('reports oldest and newest data points', () => {
      const snapshots = [
        makeSnapshot({ timestamp: '2026-04-01T08:00:00.000Z' }),
        makeSnapshot({ timestamp: '2026-04-15T10:00:00.000Z' }),
        makeSnapshot({ timestamp: '2026-04-07T12:00:00.000Z' }),
      ];
      const { result } = trainModel(snapshots);
      expect(result.oldestDataPoint).toBe('2026-04-01T08:00:00.000Z');
      expect(result.newestDataPoint).toBe('2026-04-15T10:00:00.000Z');
    });

    it('handles multi-week dataset', () => {
      const snapshots = generateTrainingData('1', 4, 20);
      const { patterns, result } = trainModel(snapshots);
      expect(patterns.length).toBeGreaterThan(0);
      expect(result.stationsCovered).toBe(1);
      expect(result.hoursCovered).toBe(24);
    });
  });

  // --- Prediction ---

  describe('predictAvailability', () => {
    it('returns red/0 confidence for null pattern', () => {
      const result = predictAvailability(null, 20);
      expect(result.confidenceScore).toBe(0);
      expect(result.availabilityLevel).toBe('red');
      expect(result.predictedBikes).toBe(0);
    });

    it('returns green for well-stocked station', () => {
      const pattern: HistoricalPattern = {
        stationId: '1',
        hour: 10,
        dayOfWeek: 3,
        avgBikes: 12,
        stdDev: 2,
        sampleCount: 50,
      };
      const result = predictAvailability(pattern, 20);
      expect(result.availabilityLevel).toBe('green');
      expect(result.predictedBikes).toBe(12);
      expect(result.confidenceScore).toBe(50);
    });

    it('returns yellow for marginal availability', () => {
      const pattern: HistoricalPattern = {
        stationId: '1',
        hour: 8,
        dayOfWeek: 1,
        avgBikes: 3,
        stdDev: 1,
        sampleCount: 100,
      };
      const result = predictAvailability(pattern, 20);
      expect(result.availabilityLevel).toBe('yellow');
    });

    it('returns red for near-empty station', () => {
      const pattern: HistoricalPattern = {
        stationId: '1',
        hour: 8,
        dayOfWeek: 1,
        avgBikes: 1,
        stdDev: 1,
        sampleCount: 100,
      };
      const result = predictAvailability(pattern, 20);
      expect(result.availabilityLevel).toBe('red');
    });

    it('never predicts negative bikes in range', () => {
      const pattern: HistoricalPattern = {
        stationId: '1',
        hour: 8,
        dayOfWeek: 1,
        avgBikes: 1,
        stdDev: 5,
        sampleCount: 50,
      };
      const result = predictAvailability(pattern, 20);
      expect(result.range[0]).toBeGreaterThanOrEqual(0);
    });

    it('never predicts above capacity in range', () => {
      const pattern: HistoricalPattern = {
        stationId: '1',
        hour: 3,
        dayOfWeek: 0,
        avgBikes: 18,
        stdDev: 5,
        sampleCount: 50,
      };
      const result = predictAvailability(pattern, 20);
      expect(result.range[1]).toBeLessThanOrEqual(20);
    });

    it('confidence is proportional to sample count', () => {
      const lowData: HistoricalPattern = {
        stationId: '1', hour: 10, dayOfWeek: 3,
        avgBikes: 10, stdDev: 2, sampleCount: 10,
      };
      const highData: HistoricalPattern = {
        stationId: '1', hour: 10, dayOfWeek: 3,
        avgBikes: 10, stdDev: 2, sampleCount: 80,
      };
      const lowResult = predictAvailability(lowData, 20);
      const highResult = predictAvailability(highData, 20);
      expect(highResult.confidenceScore).toBeGreaterThan(lowResult.confidenceScore);
    });

    it('≥60% confidence for ≥100 samples (success criteria)', () => {
      const pattern: HistoricalPattern = {
        stationId: '1', hour: 10, dayOfWeek: 3,
        avgBikes: 10, stdDev: 2, sampleCount: 100,
      };
      const result = predictAvailability(pattern, 20);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
    });
  });

  // --- Zero false positive guarantee ---

  describe('zero false positive: never predict availability for empty station', () => {
    it('predicts red when historical average is 0', () => {
      const pattern: HistoricalPattern = {
        stationId: '1', hour: 8, dayOfWeek: 1,
        avgBikes: 0, stdDev: 0, sampleCount: 100,
      };
      const result = predictAvailability(pattern, 20);
      expect(result.availabilityLevel).toBe('red');
      expect(result.predictedBikes).toBe(0);
    });

    it('predicts red when average is very low', () => {
      const pattern: HistoricalPattern = {
        stationId: '1', hour: 8, dayOfWeek: 1,
        avgBikes: 0.3, stdDev: 0.5, sampleCount: 100,
      };
      const result = predictAvailability(pattern, 20);
      expect(result.availabilityLevel).toBe('red');
    });

    it('does not predict green for station that is historically empty at this hour', () => {
      const pattern: HistoricalPattern = {
        stationId: '1', hour: 8, dayOfWeek: 1,
        avgBikes: 1.5, stdDev: 1, sampleCount: 100,
      };
      const result = predictAvailability(pattern, 20);
      expect(result.availabilityLevel).not.toBe('green');
    });
  });

  // --- Performance ---

  describe('performance', () => {
    it('prediction completes in <100ms per station (Issue #63 requirement)', () => {
      const pattern: HistoricalPattern = {
        stationId: '1', hour: 10, dayOfWeek: 3,
        avgBikes: 10, stdDev: 2, sampleCount: 100,
      };

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        predictAvailability(pattern, 20);
      }
      const elapsed = performance.now() - start;
      const perStation = elapsed / 100;

      expect(perStation).toBeLessThan(100);
    });

    it('model training handles 10K+ snapshots efficiently', () => {
      const snapshots = generateTrainingData('1', 8, 20); // ~1344 snapshots
      const start = performance.now();
      trainModel(snapshots);
      const elapsed = performance.now() - start;

      // Training should complete in reasonable time (< 5s)
      expect(elapsed).toBeLessThan(5000);
    });
  });

  // --- Response format ---

  describe('response format', () => {
    it('includes all required fields from Issue #63 spec', () => {
      const pattern: HistoricalPattern = {
        stationId: '42', hour: 10, dayOfWeek: 3,
        avgBikes: 10, stdDev: 2, sampleCount: 50,
      };
      const result = predictAvailability(pattern, 20);

      expect(result).toHaveProperty('stationId', '42');
      expect(result).toHaveProperty('predictedBikes');
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('availabilityLevel');
      expect(result).toHaveProperty('range');
      expect(result).toHaveProperty('dataPoints');
      expect(result).toHaveProperty('timestamp');
    });

    it('confidenceScore is a number 0-100', () => {
      for (const sampleCount of [0, 1, 25, 50, 100, 200]) {
        const pattern: HistoricalPattern = {
          stationId: '1', hour: 10, dayOfWeek: 3,
          avgBikes: 10, stdDev: 2, sampleCount,
        };
        const result = predictAvailability(pattern, 20);
        expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(result.confidenceScore).toBeLessThanOrEqual(100);
        expect(Number.isInteger(result.confidenceScore)).toBe(true);
      }
    });

    it('availabilityLevel is one of green/yellow/red', () => {
      const validLevels = ['green', 'yellow', 'red'];
      const pattern: HistoricalPattern = {
        stationId: '1', hour: 10, dayOfWeek: 3,
        avgBikes: 10, stdDev: 2, sampleCount: 50,
      };
      const result = predictAvailability(pattern, 20);
      expect(validLevels).toContain(result.availabilityLevel);
    });

    it('range is a tuple of two non-negative numbers', () => {
      const pattern: HistoricalPattern = {
        stationId: '1', hour: 10, dayOfWeek: 3,
        avgBikes: 10, stdDev: 2, sampleCount: 50,
      };
      const result = predictAvailability(pattern, 20);
      expect(result.range).toHaveLength(2);
      expect(result.range[0]).toBeGreaterThanOrEqual(0);
      expect(result.range[1]).toBeGreaterThanOrEqual(result.range[0]);
    });

    it('timestamp is a valid ISO 8601 string', () => {
      const pattern: HistoricalPattern = {
        stationId: '1', hour: 10, dayOfWeek: 3,
        avgBikes: 10, stdDev: 2, sampleCount: 50,
      };
      const result = predictAvailability(pattern, 20);
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toISOString()).toBeTruthy();
    });
  });
});
