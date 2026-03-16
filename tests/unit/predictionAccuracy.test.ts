import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Contract types — Issue #64: Prediction Accuracy Monitoring
// These define the API that the implementation MUST satisfy.
// Real implementation: src/services/predictionAccuracy.ts
// ---------------------------------------------------------------------------

interface PredictionRecord {
  stationId: string;
  timestamp: string;
  predictedBikes: number;
  actualBikes: number;
  confidenceLevel: 'high' | 'medium' | 'low' | 'none';
}

interface AccuracyMetrics {
  mae: number;            // Mean Absolute Error
  rmse: number;           // Root Mean Squared Error
  bias: number;           // Positive = overestimation, negative = underestimation
  sampleCount: number;
  withinRange: number;    // count of predictions within ±2 of actual
  withinRangePct: number; // percentage within range
}

interface StationAccuracy {
  stationId: string;
  metrics: AccuracyMetrics;
}

interface AccuracyAlert {
  triggered: boolean;
  threshold: number;
  currentAccuracy: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Reference implementations — pure functions that define expected behavior.
// Trinity replaces these with real imports from src/services/predictionAccuracy.ts
// ---------------------------------------------------------------------------

function calculateMAE(records: PredictionRecord[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + Math.abs(r.predictedBikes - r.actualBikes), 0);
  return sum / records.length;
}

function calculateRMSE(records: PredictionRecord[]): number {
  if (records.length === 0) return 0;
  const sumSq = records.reduce((acc, r) => acc + (r.predictedBikes - r.actualBikes) ** 2, 0);
  return Math.sqrt(sumSq / records.length);
}

function calculateBias(records: PredictionRecord[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + (r.predictedBikes - r.actualBikes), 0);
  return sum / records.length;
}

function calculateAccuracyMetrics(records: PredictionRecord[]): AccuracyMetrics {
  const mae = calculateMAE(records);
  const rmse = calculateRMSE(records);
  const bias = calculateBias(records);
  const withinRange = records.filter(r => Math.abs(r.predictedBikes - r.actualBikes) <= 2).length;
  return {
    mae,
    rmse,
    bias,
    sampleCount: records.length,
    withinRange,
    withinRangePct: records.length > 0 ? (withinRange / records.length) * 100 : 0,
  };
}

function calculateAccuracyByStation(records: PredictionRecord[]): StationAccuracy[] {
  const grouped = new Map<string, PredictionRecord[]>();
  for (const r of records) {
    const existing = grouped.get(r.stationId) ?? [];
    existing.push(r);
    grouped.set(r.stationId, existing);
  }
  return Array.from(grouped.entries()).map(([stationId, recs]) => ({
    stationId,
    metrics: calculateAccuracyMetrics(recs),
  }));
}

function calculateAccuracyByConfidence(
  records: PredictionRecord[],
  level: PredictionRecord['confidenceLevel'],
): AccuracyMetrics {
  const filtered = records.filter(r => r.confidenceLevel === level);
  return calculateAccuracyMetrics(filtered);
}

function checkAccuracyAlert(
  metrics: AccuracyMetrics,
  threshold: number = 80,
): AccuracyAlert {
  const triggered = metrics.withinRangePct < threshold;
  return {
    triggered,
    threshold,
    currentAccuracy: metrics.withinRangePct,
    message: triggered
      ? `Accuracy ${metrics.withinRangePct.toFixed(1)}% is below ${threshold}% threshold`
      : `Accuracy ${metrics.withinRangePct.toFixed(1)}% meets ${threshold}% threshold`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<PredictionRecord> = {}): PredictionRecord {
  return {
    stationId: '1',
    timestamp: '2026-06-10T10:00:00.000Z',
    predictedBikes: 8,
    actualBikes: 8,
    confidenceLevel: 'high',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Prediction Accuracy Monitoring — Issue #64', () => {

  // --- MAE ---

  describe('calculateMAE', () => {
    it('returns 0 for empty records', () => {
      expect(calculateMAE([])).toBe(0);
    });

    it('returns 0 when predictions are perfect', () => {
      const records = [
        makeRecord({ predictedBikes: 10, actualBikes: 10 }),
        makeRecord({ predictedBikes: 5, actualBikes: 5 }),
      ];
      expect(calculateMAE(records)).toBe(0);
    });

    it('calculates correct MAE for known errors', () => {
      const records = [
        makeRecord({ predictedBikes: 10, actualBikes: 8 }),  // error: 2
        makeRecord({ predictedBikes: 5, actualBikes: 9 }),   // error: 4
      ];
      expect(calculateMAE(records)).toBe(3); // (2 + 4) / 2
    });

    it('treats over- and under-prediction symmetrically', () => {
      const over = [makeRecord({ predictedBikes: 12, actualBikes: 10 })];  // +2
      const under = [makeRecord({ predictedBikes: 8, actualBikes: 10 })];  // -2
      expect(calculateMAE(over)).toBe(calculateMAE(under));
    });

    it('handles single record', () => {
      const records = [makeRecord({ predictedBikes: 7, actualBikes: 10 })];
      expect(calculateMAE(records)).toBe(3);
    });
  });

  // --- RMSE ---

  describe('calculateRMSE', () => {
    it('returns 0 for empty records', () => {
      expect(calculateRMSE([])).toBe(0);
    });

    it('returns 0 for perfect predictions', () => {
      const records = [
        makeRecord({ predictedBikes: 5, actualBikes: 5 }),
        makeRecord({ predictedBikes: 10, actualBikes: 10 }),
      ];
      expect(calculateRMSE(records)).toBe(0);
    });

    it('penalizes large errors more than small ones', () => {
      // Two small errors: MAE = 1, RMSE = 1
      const small = [
        makeRecord({ predictedBikes: 9, actualBikes: 10 }),
        makeRecord({ predictedBikes: 11, actualBikes: 10 }),
      ];
      // One big, one zero: MAE = 1, RMSE = √2 ≈ 1.414
      const big = [
        makeRecord({ predictedBikes: 10, actualBikes: 10 }),
        makeRecord({ predictedBikes: 12, actualBikes: 10 }),
      ];
      expect(calculateRMSE(big)).toBeGreaterThan(calculateRMSE(small));
    });

    it('calculates correct RMSE for known values', () => {
      const records = [
        makeRecord({ predictedBikes: 10, actualBikes: 8 }),  // err² = 4
        makeRecord({ predictedBikes: 5, actualBikes: 3 }),   // err² = 4
      ];
      // RMSE = sqrt((4+4)/2) = sqrt(4) = 2
      expect(calculateRMSE(records)).toBe(2);
    });

    it('RMSE >= MAE always holds', () => {
      const records = [
        makeRecord({ predictedBikes: 10, actualBikes: 5 }),
        makeRecord({ predictedBikes: 3, actualBikes: 4 }),
        makeRecord({ predictedBikes: 7, actualBikes: 9 }),
      ];
      expect(calculateRMSE(records)).toBeGreaterThanOrEqual(calculateMAE(records));
    });
  });

  // --- Bias ---

  describe('calculateBias', () => {
    it('returns 0 for empty records', () => {
      expect(calculateBias([])).toBe(0);
    });

    it('returns positive bias for overestimation', () => {
      const records = [
        makeRecord({ predictedBikes: 12, actualBikes: 10 }),
        makeRecord({ predictedBikes: 8, actualBikes: 5 }),
      ];
      expect(calculateBias(records)).toBeGreaterThan(0);
    });

    it('returns negative bias for underestimation', () => {
      const records = [
        makeRecord({ predictedBikes: 3, actualBikes: 10 }),
        makeRecord({ predictedBikes: 2, actualBikes: 5 }),
      ];
      expect(calculateBias(records)).toBeLessThan(0);
    });

    it('returns 0 bias for balanced errors', () => {
      const records = [
        makeRecord({ predictedBikes: 12, actualBikes: 10 }), // +2
        makeRecord({ predictedBikes: 8, actualBikes: 10 }),   // -2
      ];
      expect(calculateBias(records)).toBe(0);
    });

    it('calculates correct bias magnitude', () => {
      const records = [
        makeRecord({ predictedBikes: 10, actualBikes: 8 }), // +2
        makeRecord({ predictedBikes: 10, actualBikes: 6 }), // +4
      ];
      expect(calculateBias(records)).toBe(3); // (2+4)/2
    });
  });

  // --- Composite metrics ---

  describe('calculateAccuracyMetrics', () => {
    it('returns zeroed metrics for empty input', () => {
      const m = calculateAccuracyMetrics([]);
      expect(m.mae).toBe(0);
      expect(m.rmse).toBe(0);
      expect(m.bias).toBe(0);
      expect(m.sampleCount).toBe(0);
      expect(m.withinRange).toBe(0);
      expect(m.withinRangePct).toBe(0);
    });

    it('counts predictions within ±2 of actual', () => {
      const records = [
        makeRecord({ predictedBikes: 10, actualBikes: 10 }), // within
        makeRecord({ predictedBikes: 8, actualBikes: 10 }),   // within (diff = 2)
        makeRecord({ predictedBikes: 5, actualBikes: 10 }),   // outside (diff = 5)
        makeRecord({ predictedBikes: 12, actualBikes: 10 }),  // within (diff = 2)
      ];
      const m = calculateAccuracyMetrics(records);
      expect(m.withinRange).toBe(3);
      expect(m.withinRangePct).toBe(75);
      expect(m.sampleCount).toBe(4);
    });

    it('reports 100% accuracy for all-perfect predictions', () => {
      const records = Array.from({ length: 10 }, () =>
        makeRecord({ predictedBikes: 7, actualBikes: 7 }),
      );
      const m = calculateAccuracyMetrics(records);
      expect(m.withinRangePct).toBe(100);
      expect(m.mae).toBe(0);
    });
  });

  // --- Per-station accuracy ---

  describe('calculateAccuracyByStation', () => {
    it('groups records by station and calculates per-station metrics', () => {
      const records = [
        makeRecord({ stationId: '1', predictedBikes: 10, actualBikes: 10 }),
        makeRecord({ stationId: '1', predictedBikes: 8, actualBikes: 10 }),
        makeRecord({ stationId: '2', predictedBikes: 5, actualBikes: 0 }),
        makeRecord({ stationId: '2', predictedBikes: 3, actualBikes: 0 }),
      ];
      const results = calculateAccuracyByStation(records);

      expect(results).toHaveLength(2);

      const station1 = results.find(r => r.stationId === '1')!;
      expect(station1.metrics.sampleCount).toBe(2);
      expect(station1.metrics.mae).toBe(1); // (0 + 2) / 2

      const station2 = results.find(r => r.stationId === '2')!;
      expect(station2.metrics.sampleCount).toBe(2);
      expect(station2.metrics.mae).toBe(4); // (5 + 3) / 2
    });

    it('returns empty array for no records', () => {
      expect(calculateAccuracyByStation([])).toEqual([]);
    });

    it('identifies worst-performing station', () => {
      const records = [
        makeRecord({ stationId: 'good', predictedBikes: 10, actualBikes: 10 }),
        makeRecord({ stationId: 'good', predictedBikes: 9, actualBikes: 10 }),
        makeRecord({ stationId: 'bad', predictedBikes: 15, actualBikes: 3 }),
        makeRecord({ stationId: 'bad', predictedBikes: 12, actualBikes: 2 }),
      ];
      const results = calculateAccuracyByStation(records);
      const sorted = results.sort((a, b) => b.metrics.mae - a.metrics.mae);
      expect(sorted[0].stationId).toBe('bad');
    });
  });

  // --- Accuracy by confidence level ---

  describe('calculateAccuracyByConfidence', () => {
    it('filters records by confidence level', () => {
      const records = [
        makeRecord({ confidenceLevel: 'high', predictedBikes: 10, actualBikes: 10 }),
        makeRecord({ confidenceLevel: 'high', predictedBikes: 9, actualBikes: 10 }),
        makeRecord({ confidenceLevel: 'low', predictedBikes: 15, actualBikes: 3 }),
        makeRecord({ confidenceLevel: 'low', predictedBikes: 12, actualBikes: 2 }),
      ];

      const highMetrics = calculateAccuracyByConfidence(records, 'high');
      expect(highMetrics.sampleCount).toBe(2);
      expect(highMetrics.mae).toBe(0.5);

      const lowMetrics = calculateAccuracyByConfidence(records, 'low');
      expect(lowMetrics.sampleCount).toBe(2);
      expect(lowMetrics.mae).toBe(11);
    });

    it('high confidence predictions should have lower MAE than low confidence', () => {
      const records = [
        makeRecord({ confidenceLevel: 'high', predictedBikes: 10, actualBikes: 10 }),
        makeRecord({ confidenceLevel: 'high', predictedBikes: 9, actualBikes: 10 }),
        makeRecord({ confidenceLevel: 'high', predictedBikes: 11, actualBikes: 10 }),
        makeRecord({ confidenceLevel: 'low', predictedBikes: 15, actualBikes: 5 }),
        makeRecord({ confidenceLevel: 'low', predictedBikes: 2, actualBikes: 8 }),
      ];

      const highMAE = calculateAccuracyByConfidence(records, 'high').mae;
      const lowMAE = calculateAccuracyByConfidence(records, 'low').mae;
      expect(highMAE).toBeLessThan(lowMAE);
    });

    it('returns zeroed metrics when no records match the level', () => {
      const records = [makeRecord({ confidenceLevel: 'high' })];
      const m = calculateAccuracyByConfidence(records, 'none');
      expect(m.sampleCount).toBe(0);
      expect(m.mae).toBe(0);
    });
  });

  // --- Alert threshold ---

  describe('checkAccuracyAlert', () => {
    it('triggers alert when accuracy below threshold', () => {
      const metrics: AccuracyMetrics = {
        mae: 5, rmse: 6, bias: 2, sampleCount: 100,
        withinRange: 70, withinRangePct: 70,
      };
      const alert = checkAccuracyAlert(metrics, 80);
      expect(alert.triggered).toBe(true);
      expect(alert.currentAccuracy).toBe(70);
      expect(alert.message).toContain('below');
    });

    it('does not trigger when accuracy meets threshold', () => {
      const metrics: AccuracyMetrics = {
        mae: 1, rmse: 1, bias: 0, sampleCount: 100,
        withinRange: 90, withinRangePct: 90,
      };
      const alert = checkAccuracyAlert(metrics, 80);
      expect(alert.triggered).toBe(false);
      expect(alert.message).toContain('meets');
    });

    it('uses 80% as default threshold', () => {
      const metrics: AccuracyMetrics = {
        mae: 3, rmse: 4, bias: 1, sampleCount: 50,
        withinRange: 40, withinRangePct: 80,
      };
      const alert = checkAccuracyAlert(metrics);
      expect(alert.threshold).toBe(80);
      expect(alert.triggered).toBe(false);
    });

    it('triggers at exactly threshold boundary (below)', () => {
      const metrics: AccuracyMetrics = {
        mae: 2, rmse: 3, bias: 0, sampleCount: 100,
        withinRange: 79, withinRangePct: 79.9,
      };
      const alert = checkAccuracyAlert(metrics, 80);
      expect(alert.triggered).toBe(true);
    });

    it('does not trigger at exactly threshold boundary (at)', () => {
      const metrics: AccuracyMetrics = {
        mae: 1, rmse: 1, bias: 0, sampleCount: 100,
        withinRange: 80, withinRangePct: 80,
      };
      const alert = checkAccuracyAlert(metrics, 80);
      expect(alert.triggered).toBe(false);
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('handles prediction of 0 bikes correctly', () => {
      const records = [
        makeRecord({ predictedBikes: 0, actualBikes: 0 }),
        makeRecord({ predictedBikes: 0, actualBikes: 3 }),
      ];
      expect(calculateMAE(records)).toBe(1.5);
      expect(calculateBias(records)).toBe(-1.5); // underestimate
    });

    it('handles very large prediction errors', () => {
      const records = [
        makeRecord({ predictedBikes: 100, actualBikes: 0 }),
      ];
      expect(calculateMAE(records)).toBe(100);
      expect(calculateRMSE(records)).toBe(100);
    });

    it('handles single-station dataset', () => {
      const records = Array.from({ length: 50 }, (_, i) =>
        makeRecord({ stationId: 'solo', predictedBikes: 10, actualBikes: 10 + (i % 3) }),
      );
      const byStation = calculateAccuracyByStation(records);
      expect(byStation).toHaveLength(1);
      expect(byStation[0].stationId).toBe('solo');
      expect(byStation[0].metrics.sampleCount).toBe(50);
    });
  });
});
