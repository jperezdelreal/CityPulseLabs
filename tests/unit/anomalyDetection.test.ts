import { describe, it, expect } from 'vitest';
import {
  detectStaleStation,
  detectEmptyStation,
  detectFullStation,
  detectOfflineStation,
  detectAnomalies,
  DEFAULT_CONFIG,
} from '../../src/services/anomalyDetection';
import type { StationSnapshot, AnomalyType, AnomalyCheckConfig } from '../../src/services/anomalyDetection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_TS = new Date('2026-06-10T10:00:00.000Z').getTime();

function makeSnapshot(
  overrides: Partial<StationSnapshot> & { offsetMinutes?: number } = {},
): StationSnapshot {
  const { offsetMinutes = 0, ...rest } = overrides;
  const ts = new Date(BASE_TS + offsetMinutes * 60_000).toISOString();
  return {
    stationId: '1',
    timestamp: ts,
    bikesAvailable: 10,
    docksAvailable: 5,
    capacity: 15,
    isRenting: true,
    isReturning: true,
    ...rest,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Anomaly Detection — Issue #65', () => {

  // --- Stale / stuck station ---

  describe('detectStaleStation', () => {
    it('returns null when data is fresh', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0 }),
        makeSnapshot({ offsetMinutes: 10 }),
      ];
      const now = BASE_TS + 20 * 60_000; // 20 min after base
      expect(detectStaleStation(snapshots, now)).toBeNull();
    });

    it('detects station with unchanged data for >60 minutes', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 5 }),
        makeSnapshot({ offsetMinutes: 10, bikesAvailable: 5 }),
        makeSnapshot({ offsetMinutes: 20, bikesAvailable: 5 }),
      ];
      const now = BASE_TS + 90 * 60_000; // 90 min after base
      const result = detectStaleStation(snapshots, now);
      expect(result).not.toBeNull();
      expect(result!.anomaly).toBe('stuck_bike');
      expect(result!.durationMinutes).toBeGreaterThanOrEqual(60);
    });

    it('returns null when bikes change even if time gap is large', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 5 }),
        makeSnapshot({ offsetMinutes: 30, bikesAvailable: 8 }),
      ];
      const now = BASE_TS + 100 * 60_000;
      // Values changed, so even though stale, it's not "stuck"
      expect(detectStaleStation(snapshots, now)).toBeNull();
    });

    it('returns null for empty snapshot array', () => {
      expect(detectStaleStation([], BASE_TS)).toBeNull();
    });

    it('includes recommendation in result', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 3 }),
        makeSnapshot({ offsetMinutes: 10, bikesAvailable: 3 }),
      ];
      const now = BASE_TS + 120 * 60_000;
      const result = detectStaleStation(snapshots, now);
      expect(result).not.toBeNull();
      expect(result!.recommendation).toBeTruthy();
      expect(result!.recommendation.length).toBeGreaterThan(0);
    });
  });

  // --- Empty station ---

  describe('detectEmptyStation', () => {
    it('returns null when station has bikes', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 10 }),
        makeSnapshot({ offsetMinutes: 30, bikesAvailable: 8 }),
        makeSnapshot({ offsetMinutes: 60, bikesAvailable: 5 }),
      ];
      expect(detectEmptyStation(snapshots)).toBeNull();
    });

    it('detects station empty for >60 minutes', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 30, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 70, bikesAvailable: 0 }),
      ];
      const result = detectEmptyStation(snapshots);
      expect(result).not.toBeNull();
      expect(result!.anomaly).toBe('never_returns_bikes');
      expect(result!.durationMinutes).toBeGreaterThanOrEqual(60);
    });

    it('does not flag brief empty periods', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 30, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 40, bikesAvailable: 5 }), // bikes returned
      ];
      expect(detectEmptyStation(snapshots)).toBeNull();
    });

    it('resets count when bikes become available mid-sequence', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 30, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 40, bikesAvailable: 3 }),  // reset
        makeSnapshot({ offsetMinutes: 50, bikesAvailable: 0 }),  // restart
        makeSnapshot({ offsetMinutes: 80, bikesAvailable: 0 }),  // only 30 min
      ];
      expect(detectEmptyStation(snapshots)).toBeNull();
    });

    it('returns null for single snapshot', () => {
      expect(detectEmptyStation([makeSnapshot({ bikesAvailable: 0 })])).toBeNull();
    });

    it('detects empty with custom threshold', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 35, bikesAvailable: 0 }),
      ];
      expect(detectEmptyStation(snapshots, 30)).not.toBeNull();
      expect(detectEmptyStation(snapshots, 60)).toBeNull();
    });
  });

  // --- Full station ---

  describe('detectFullStation', () => {
    it('returns null when station has available docks', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, docksAvailable: 5 }),
        makeSnapshot({ offsetMinutes: 60, docksAvailable: 3 }),
      ];
      expect(detectFullStation(snapshots)).toBeNull();
    });

    it('detects station full for >60 minutes', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, docksAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 30, docksAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 70, docksAvailable: 0 }),
      ];
      const result = detectFullStation(snapshots);
      expect(result).not.toBeNull();
      expect(result!.anomaly).toBe('never_empty');
      expect(result!.durationMinutes).toBeGreaterThanOrEqual(60);
    });

    it('does not flag brief full periods', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, docksAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 20, docksAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 30, docksAvailable: 5 }),
      ];
      expect(detectFullStation(snapshots)).toBeNull();
    });

    it('returns correct station ID', () => {
      const snapshots = [
        makeSnapshot({ stationId: '42', offsetMinutes: 0, docksAvailable: 0 }),
        makeSnapshot({ stationId: '42', offsetMinutes: 70, docksAvailable: 0 }),
      ];
      const result = detectFullStation(snapshots);
      expect(result).not.toBeNull();
      expect(result!.stationId).toBe('42');
    });
  });

  // --- Offline station ---

  describe('detectOfflineStation', () => {
    it('returns null when station was seen recently', () => {
      const now = BASE_TS + 60 * 60_000; // 1 hour later
      const lastSeen = new Date(BASE_TS).toISOString();
      expect(detectOfflineStation('1', lastSeen, now)).toBeNull();
    });

    it('detects station offline for >24 hours', () => {
      const now = BASE_TS + 25 * 3_600_000; // 25 hours later
      const lastSeen = new Date(BASE_TS).toISOString();
      const result = detectOfflineStation('1', lastSeen, now);
      expect(result).not.toBeNull();
      expect(result!.anomaly).toBe('zero_samples');
      expect(result!.durationMinutes).toBeGreaterThanOrEqual(24 * 60);
    });

    it('detects station with no data at all', () => {
      const result = detectOfflineStation('1', null, BASE_TS);
      expect(result).not.toBeNull();
      expect(result!.anomaly).toBe('zero_samples');
    });

    it('uses custom threshold', () => {
      const now = BASE_TS + 2 * 3_600_000; // 2 hours later
      const lastSeen = new Date(BASE_TS).toISOString();
      // Default 24h: should not trigger
      expect(detectOfflineStation('1', lastSeen, now, 24)).toBeNull();
      // Custom 1h: should trigger
      expect(detectOfflineStation('1', lastSeen, now, 1)).not.toBeNull();
    });
  });

  // --- Combined detection ---

  describe('detectAnomalies', () => {
    it('returns empty array for healthy station', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 10, docksAvailable: 5 }),
        makeSnapshot({ offsetMinutes: 10, bikesAvailable: 8, docksAvailable: 7 }),
      ];
      const now = BASE_TS + 15 * 60_000;
      expect(detectAnomalies('1', snapshots, now)).toEqual([]);
    });

    it('can detect multiple anomalies on the same station', () => {
      // Station with 0 bikes and 0 docks for >60 min AND stale data
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 0, docksAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 10, bikesAvailable: 0, docksAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 70, bikesAvailable: 0, docksAvailable: 0 }),
      ];
      const now = BASE_TS + 200 * 60_000; // 200 min later
      const results = detectAnomalies('1', snapshots, now);
      expect(results.length).toBeGreaterThanOrEqual(1);
      const types = results.map(r => r.anomaly);
      expect(types).toContain('never_returns_bikes');
    });

    it('returns zero_samples for station with no data', () => {
      const now = BASE_TS;
      const results = detectAnomalies('ghost', [], now);
      expect(results).toHaveLength(1);
      expect(results[0].anomaly).toBe('zero_samples');
    });

    it('all results include required fields', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 70, bikesAvailable: 0 }),
      ];
      const now = BASE_TS + 200 * 60_000;
      const results = detectAnomalies('1', snapshots, now);
      for (const r of results) {
        expect(r).toHaveProperty('stationId');
        expect(r).toHaveProperty('anomaly');
        expect(r).toHaveProperty('durationMinutes');
        expect(r).toHaveProperty('lastUpdate');
        expect(r).toHaveProperty('recommendation');
        expect(typeof r.durationMinutes).toBe('number');
      }
    });

    it('respects custom config thresholds', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 40, bikesAvailable: 0 }),
      ];
      const now = BASE_TS + 50 * 60_000;

      // Default 60 min threshold: should NOT detect empty
      const defaultResults = detectAnomalies('1', snapshots, now);
      const defaultEmpty = defaultResults.filter(r => r.anomaly === 'never_returns_bikes');
      expect(defaultEmpty).toHaveLength(0);

      // Custom 30 min threshold: SHOULD detect empty
      const customConfig: AnomalyCheckConfig = {
        ...DEFAULT_CONFIG,
        emptyThresholdMinutes: 30,
      };
      const customResults = detectAnomalies('1', snapshots, now, customConfig);
      const customEmpty = customResults.filter(r => r.anomaly === 'never_returns_bikes');
      expect(customEmpty).toHaveLength(1);
    });
  });

  // --- Response format validation ---

  describe('response format', () => {
    it('anomaly type is one of the defined enum values', () => {
      const validTypes: AnomalyType[] = [
        'never_returns_bikes',
        'never_empty',
        'zero_samples',
        'stuck_bike',
      ];

      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 70, bikesAvailable: 0 }),
      ];
      const now = BASE_TS + 200 * 60_000;
      const results = detectAnomalies('1', snapshots, now);

      for (const r of results) {
        expect(validTypes).toContain(r.anomaly);
      }
    });

    it('lastUpdate is a valid ISO timestamp', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 70, bikesAvailable: 0 }),
      ];
      const now = BASE_TS + 200 * 60_000;
      const results = detectAnomalies('1', snapshots, now);

      for (const r of results) {
        if (r.lastUpdate) {
          expect(new Date(r.lastUpdate).toISOString()).toBe(r.lastUpdate);
        }
      }
    });

    it('durationMinutes is a non-negative integer', () => {
      const snapshots = [
        makeSnapshot({ offsetMinutes: 0, bikesAvailable: 0 }),
        makeSnapshot({ offsetMinutes: 70, bikesAvailable: 0 }),
      ];
      const now = BASE_TS + 200 * 60_000;
      const results = detectAnomalies('1', snapshots, now);

      for (const r of results) {
        expect(r.durationMinutes).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(r.durationMinutes)).toBe(true);
      }
    });
  });
});
