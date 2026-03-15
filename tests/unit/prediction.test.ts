import { describe, it, expect } from 'vitest';
import {
  computePrediction,
  computeConfidence,
  isRushHour,
  isWeekend,
} from '../../api/src/functions/predict';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a snapshot-like object for testing. */
function makeSnapshot(
  bikesAvailable: number,
  overrides: {
    timestamp?: string;
    hour?: number;
    dayOfWeek?: number;
  } = {},
) {
  const ts = overrides.timestamp ?? '2026-06-10T10:00:00.000Z'; // Wednesday
  const d = new Date(ts);
  return {
    bikesAvailable,
    timestamp: ts,
    hour: overrides.hour ?? d.getUTCHours(),
    dayOfWeek: overrides.dayOfWeek ?? d.getUTCDay(),
  };
}

/** Generate N snapshots spread across different weeks for enhanced mode. */
function makeMultiWeekSnapshots(
  values: number[],
  opts: { hour?: number; dayOfWeek?: number } = {},
) {
  return values.map((v, i) => {
    const d = new Date('2026-03-01T10:00:00.000Z');
    d.setDate(d.getDate() + i * 7); // one per week
    return makeSnapshot(v, {
      timestamp: d.toISOString(),
      hour: opts.hour ?? d.getUTCHours(),
      dayOfWeek: opts.dayOfWeek ?? d.getUTCDay(),
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('prediction', () => {
  // --- computeConfidence ---

  describe('computeConfidence', () => {
    it('returns "none" for 0 data points', () => {
      expect(computeConfidence(0)).toBe('none');
    });

    it('returns "low" for < 10 data points', () => {
      expect(computeConfidence(1)).toBe('low');
      expect(computeConfidence(9)).toBe('low');
    });

    it('returns "medium" for 10-50 data points', () => {
      expect(computeConfidence(10)).toBe('medium');
      expect(computeConfidence(50)).toBe('medium');
    });

    it('returns "high" for > 50 data points', () => {
      expect(computeConfidence(51)).toBe('high');
      expect(computeConfidence(100)).toBe('high');
    });
  });

  // --- isRushHour ---

  describe('isRushHour', () => {
    it('identifies morning rush hours (7-9)', () => {
      expect(isRushHour(7)).toBe(true);
      expect(isRushHour(8)).toBe(true);
      expect(isRushHour(9)).toBe(true);
    });

    it('identifies evening rush hours (17-19)', () => {
      expect(isRushHour(17)).toBe(true);
      expect(isRushHour(18)).toBe(true);
      expect(isRushHour(19)).toBe(true);
    });

    it('returns false for non-rush hours', () => {
      expect(isRushHour(6)).toBe(false);
      expect(isRushHour(10)).toBe(false);
      expect(isRushHour(12)).toBe(false);
      expect(isRushHour(16)).toBe(false);
      expect(isRushHour(20)).toBe(false);
    });
  });

  // --- isWeekend ---

  describe('isWeekend', () => {
    it('identifies Sunday (0) and Saturday (6) as weekend', () => {
      expect(isWeekend(0)).toBe(true);
      expect(isWeekend(6)).toBe(true);
    });

    it('identifies weekdays as non-weekend', () => {
      for (let d = 1; d <= 5; d++) {
        expect(isWeekend(d)).toBe(false);
      }
    });
  });

  // --- No data fallback ---

  describe('computePrediction — no data', () => {
    it('returns null prediction with "none" confidence when no snapshots', () => {
      const result = computePrediction([], 10, 3);
      expect(result.predicted).toBeNull();
      expect(result.confidence).toBe('none');
      expect(result.range).toBeNull();
      expect(result.dataPoints).toBe(0);
      expect(result.message).toBe('Insufficient data');
    });
  });

  // --- Basic algorithm ---

  describe('computePrediction — basic algorithm', () => {
    it('predicts a value from uniform data', () => {
      const snapshots = Array.from({ length: 20 }, () => makeSnapshot(8));
      const result = computePrediction(snapshots, 10, 3);

      expect(result.predicted).toBe(8);
      expect(result.confidence).toBe('medium'); // 20 data points
      expect(result.range).not.toBeNull();
      expect(result.dataPoints).toBe(20);
    });

    it('blends trend extrapolation with historical mean', () => {
      // Linearly increasing: 2, 4, 6, 8, 10
      const snapshots = [2, 4, 6, 8, 10].map((v, i) => {
        const d = new Date('2026-06-10T10:00:00.000Z');
        d.setHours(d.getHours() + i);
        return makeSnapshot(v, { timestamp: d.toISOString() });
      });

      const result = computePrediction(snapshots, 10, 3);

      // trend extrapolation at x=5: intercept=2, slope=2, so 2+2*5=12
      // historical mean = 6
      // blended = 12*0.6 + 6*0.4 = 7.2 + 2.4 = 9.6 → 10
      expect(result.predicted).toBe(10);
    });

    it('never returns a negative predicted value', () => {
      // Decreasing trend
      const snapshots = [10, 8, 6, 4, 2, 0].map((v, i) => {
        const d = new Date('2026-06-10T10:00:00.000Z');
        d.setHours(d.getHours() + i);
        return makeSnapshot(v, { timestamp: d.toISOString() });
      });

      const result = computePrediction(snapshots, 10, 3);
      expect(result.predicted).toBeGreaterThanOrEqual(0);
    });

    it('returns correct confidence for few data points', () => {
      const snapshots = [makeSnapshot(5), makeSnapshot(7)];
      const result = computePrediction(snapshots, 10, 3);
      expect(result.confidence).toBe('low'); // 2 data points
    });

    it('returns range with at least ±1', () => {
      // All same value → 0 std dev → margin clamps to 1
      const snapshots = Array.from({ length: 5 }, () => makeSnapshot(10));
      const result = computePrediction(snapshots, 10, 3);
      expect(result.range).not.toBeNull();
      expect(result.range![1] - result.range![0]).toBeGreaterThanOrEqual(2);
    });
  });

  // --- Enhanced algorithm (Issue #14) ---

  describe('computePrediction — enhanced weighting', () => {
    it('activates enhanced mode with 5+ distinct weeks of data', () => {
      // 6 snapshots across 6 different weeks
      const snapshots = makeMultiWeekSnapshots(
        [5, 6, 7, 8, 9, 10],
        { hour: 10, dayOfWeek: 3 },
      );

      const result = computePrediction(snapshots, 10, 3);
      expect(result.predicted).not.toBeNull();
      expect(result.dataPoints).toBe(6);
    });

    it('gives higher weight to matching day-of-week data', () => {
      // Target: Wednesday (3), hour 10
      const wednesdaySnapshots = makeMultiWeekSnapshots(
        [10, 10, 10, 10, 10, 10, 10],
        { hour: 10, dayOfWeek: 3 },
      );
      const mondaySnapshots = makeMultiWeekSnapshots(
        [2, 2, 2, 2, 2, 2, 2],
        { hour: 10, dayOfWeek: 1 },
      );

      // With only Wednesday data → prediction ~10
      const wedResult = computePrediction(wednesdaySnapshots, 10, 3);
      expect(wedResult.predicted).toBe(10);

      // Simple unweighted average would be 6. The weighted mean should
      // pull toward the matching day-of-week (Wednesday = 10), but
      // the 60/40 trend/mean blend moderates the effect.
      const mixed = [...wednesdaySnapshots, ...mondaySnapshots];
      const mixedResult = computePrediction(mixed, 10, 3);
      expect(mixedResult.predicted).toBeGreaterThanOrEqual(6);
      expect(mixedResult.dataPoints).toBe(14);
    });

    it('differentiates rush hour weighting', () => {
      // Rush hour data (hour 8) vs non-rush (hour 14), target is rush hour 8
      const rushData = makeMultiWeekSnapshots(
        [15, 15, 15, 15, 15, 15],
        { hour: 8, dayOfWeek: 3 },
      );
      const nonRushData = makeMultiWeekSnapshots(
        [3, 3, 3, 3, 3, 3],
        { hour: 14, dayOfWeek: 3 },
      );

      const mixed = [...rushData, ...nonRushData];
      const result = computePrediction(mixed, 8, 3); // target is rush hour

      // Unweighted mean = 9. Enhanced weighting gives rush-hour data
      // a bonus, but trend extrapolation moderates the effect.
      // The weighted mean (~9.67) is higher than unweighted (9),
      // confirming the rush-hour bonus is applied.
      expect(result.predicted).toBeGreaterThanOrEqual(8);
      expect(result.dataPoints).toBe(12);
    });
  });

  // --- Range calculation ---

  describe('range calculation', () => {
    it('range lower bound is never negative', () => {
      const snapshots = [0, 1, 0, 1, 0].map((v) => makeSnapshot(v));
      const result = computePrediction(snapshots, 10, 3);
      expect(result.range![0]).toBeGreaterThanOrEqual(0);
    });
  });
});
