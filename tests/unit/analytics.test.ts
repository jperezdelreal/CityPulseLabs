import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Contract types — Issue #62: Analytics Dashboard — Station Usage Patterns
// These define the API that the implementation MUST satisfy.
// Real implementation: src/services/analytics.ts
// ---------------------------------------------------------------------------

interface StationSnapshot {
  stationId: string;
  timestamp: string;
  hour: number;
  dayOfWeek: number;
  bikesAvailable: number;
  docksAvailable: number;
  capacity: number;
}

interface HourlyAggregate {
  stationId: string;
  hour: number;
  dayOfWeek: number;
  avgBikes: number;
  avgDocks: number;
  sampleCount: number;
}

interface StationDemand {
  stationId: string;
  avgUtilization: number;  // 0-1 scale (bikes used / capacity)
  totalSamples: number;
  peakHour: number;
  peakDayOfWeek: number;
}

interface PeakHourResult {
  hour: number;
  avgActivity: number;
  label: string;  // e.g., "8:00 AM" or "17:00"
}

// ---------------------------------------------------------------------------
// Reference implementations — pure functions defining expected behavior.
// Trinity replaces these with real imports from src/services/analytics.ts
// ---------------------------------------------------------------------------

function aggregateByHourAndDay(snapshots: StationSnapshot[]): HourlyAggregate[] {
  const key = (s: StationSnapshot) => `${s.stationId}:${s.hour}:${s.dayOfWeek}`;
  const groups = new Map<string, StationSnapshot[]>();

  for (const s of snapshots) {
    const k = key(s);
    const existing = groups.get(k) ?? [];
    existing.push(s);
    groups.set(k, existing);
  }

  return Array.from(groups.entries()).map(([k, snaps]) => {
    const [stationId, hourStr, dowStr] = k.split(':');
    const avgBikes = snaps.reduce((sum, s) => sum + s.bikesAvailable, 0) / snaps.length;
    const avgDocks = snaps.reduce((sum, s) => sum + s.docksAvailable, 0) / snaps.length;
    return {
      stationId,
      hour: parseInt(hourStr),
      dayOfWeek: parseInt(dowStr),
      avgBikes: Math.round(avgBikes * 100) / 100,
      avgDocks: Math.round(avgDocks * 100) / 100,
      sampleCount: snaps.length,
    };
  });
}

function calculateStationDemand(snapshots: StationSnapshot[]): StationDemand[] {
  const grouped = new Map<string, StationSnapshot[]>();
  for (const s of snapshots) {
    const existing = grouped.get(s.stationId) ?? [];
    existing.push(s);
    grouped.set(s.stationId, existing);
  }

  return Array.from(grouped.entries()).map(([stationId, snaps]) => {
    const avgUtilization = snaps.reduce((sum, s) => {
      return sum + (s.capacity > 0 ? (s.capacity - s.bikesAvailable) / s.capacity : 0);
    }, 0) / snaps.length;

    // Find peak: hour with lowest avg bikes (highest demand)
    const byHour = new Map<number, number[]>();
    for (const s of snaps) {
      const existing = byHour.get(s.hour) ?? [];
      existing.push(s.bikesAvailable);
      byHour.set(s.hour, existing);
    }

    let peakHour = 0;
    let lowestAvg = Infinity;
    for (const [hour, values] of byHour) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        peakHour = hour;
      }
    }

    // Find peak day
    const byDay = new Map<number, number[]>();
    for (const s of snaps) {
      const existing = byDay.get(s.dayOfWeek) ?? [];
      existing.push(s.bikesAvailable);
      byDay.set(s.dayOfWeek, existing);
    }

    let peakDayOfWeek = 0;
    let lowestDayAvg = Infinity;
    for (const [dow, values] of byDay) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg < lowestDayAvg) {
        lowestDayAvg = avg;
        peakDayOfWeek = dow;
      }
    }

    return {
      stationId,
      avgUtilization: Math.round(avgUtilization * 1000) / 1000,
      totalSamples: snaps.length,
      peakHour,
      peakDayOfWeek,
    };
  });
}

function getTopStationsByDemand(demands: StationDemand[], n: number = 3): StationDemand[] {
  return [...demands]
    .sort((a, b) => b.avgUtilization - a.avgUtilization)
    .slice(0, n);
}

function getLowUtilizationStations(demands: StationDemand[], n: number = 3): StationDemand[] {
  return [...demands]
    .sort((a, b) => a.avgUtilization - b.avgUtilization)
    .slice(0, n);
}

function identifyPeakHours(snapshots: StationSnapshot[], topN: number = 3): PeakHourResult[] {
  const byHour = new Map<number, number[]>();
  for (const s of snapshots) {
    const existing = byHour.get(s.hour) ?? [];
    // Activity = docks used (bikes taken out)
    existing.push(s.capacity > 0 ? (s.capacity - s.bikesAvailable) / s.capacity : 0);
    byHour.set(s.hour, existing);
  }

  const hourlyActivity: PeakHourResult[] = Array.from(byHour.entries()).map(
    ([hour, values]) => ({
      hour,
      avgActivity: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000,
      label: `${hour.toString().padStart(2, '0')}:00`,
    }),
  );

  return hourlyActivity.sort((a, b) => b.avgActivity - a.avgActivity).slice(0, topN);
}

function compareWeekdayVsWeekend(
  snapshots: StationSnapshot[],
): { weekday: number; weekend: number; ratio: number } {
  const weekday = snapshots.filter(s => s.dayOfWeek >= 1 && s.dayOfWeek <= 5);
  const weekend = snapshots.filter(s => s.dayOfWeek === 0 || s.dayOfWeek === 6);

  const weekdayUtil = weekday.length > 0
    ? weekday.reduce((sum, s) => sum + (s.capacity > 0 ? (s.capacity - s.bikesAvailable) / s.capacity : 0), 0) / weekday.length
    : 0;
  const weekendUtil = weekend.length > 0
    ? weekend.reduce((sum, s) => sum + (s.capacity > 0 ? (s.capacity - s.bikesAvailable) / s.capacity : 0), 0) / weekend.length
    : 0;

  return {
    weekday: Math.round(weekdayUtil * 1000) / 1000,
    weekend: Math.round(weekendUtil * 1000) / 1000,
    ratio: weekendUtil > 0 ? Math.round((weekdayUtil / weekendUtil) * 100) / 100 : 0,
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
    dayOfWeek: 3, // Wednesday
    bikesAvailable: 10,
    docksAvailable: 10,
    capacity: 20,
    ...overrides,
  };
}

function generateDayOfSnapshots(stationId: string, capacity: number): StationSnapshot[] {
  const snapshots: StationSnapshot[] = [];
  for (let hour = 0; hour < 24; hour++) {
    // Simulate rush hour pattern: fewer bikes at 8-9, 17-18
    let bikes: number;
    if (hour >= 7 && hour <= 9) bikes = 2;       // morning rush
    else if (hour >= 17 && hour <= 19) bikes = 3; // evening rush
    else if (hour >= 0 && hour <= 5) bikes = capacity; // overnight full
    else bikes = Math.round(capacity * 0.6);      // normal

    snapshots.push(makeSnapshot({
      stationId,
      hour,
      dayOfWeek: 3,
      bikesAvailable: bikes,
      docksAvailable: capacity - bikes,
      capacity,
    }));
  }
  return snapshots;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Analytics Dashboard — Issue #62', () => {

  // --- Hourly aggregation ---

  describe('aggregateByHourAndDay', () => {
    it('returns empty array for no snapshots', () => {
      expect(aggregateByHourAndDay([])).toEqual([]);
    });

    it('groups snapshots by station + hour + dayOfWeek', () => {
      const snapshots = [
        makeSnapshot({ stationId: '1', hour: 10, dayOfWeek: 3, bikesAvailable: 8 }),
        makeSnapshot({ stationId: '1', hour: 10, dayOfWeek: 3, bikesAvailable: 12 }),
        makeSnapshot({ stationId: '1', hour: 11, dayOfWeek: 3, bikesAvailable: 5 }),
      ];
      const result = aggregateByHourAndDay(snapshots);
      expect(result).toHaveLength(2); // two distinct hour groups

      const hour10 = result.find(r => r.hour === 10 && r.stationId === '1')!;
      expect(hour10.avgBikes).toBe(10); // (8+12)/2
      expect(hour10.sampleCount).toBe(2);

      const hour11 = result.find(r => r.hour === 11 && r.stationId === '1')!;
      expect(hour11.avgBikes).toBe(5);
      expect(hour11.sampleCount).toBe(1);
    });

    it('separates weekday and weekend data for same hour', () => {
      const snapshots = [
        makeSnapshot({ hour: 10, dayOfWeek: 3, bikesAvailable: 5 }),  // Wed
        makeSnapshot({ hour: 10, dayOfWeek: 6, bikesAvailable: 15 }), // Sat
      ];
      const result = aggregateByHourAndDay(snapshots);
      expect(result).toHaveLength(2);
      expect(result.find(r => r.dayOfWeek === 3)!.avgBikes).toBe(5);
      expect(result.find(r => r.dayOfWeek === 6)!.avgBikes).toBe(15);
    });

    it('separates different stations at same hour and day', () => {
      const snapshots = [
        makeSnapshot({ stationId: '1', hour: 10, dayOfWeek: 3, bikesAvailable: 5 }),
        makeSnapshot({ stationId: '2', hour: 10, dayOfWeek: 3, bikesAvailable: 15 }),
      ];
      const result = aggregateByHourAndDay(snapshots);
      expect(result).toHaveLength(2);
      expect(result.find(r => r.stationId === '1')!.avgBikes).toBe(5);
      expect(result.find(r => r.stationId === '2')!.avgBikes).toBe(15);
    });

    it('calculates both avgBikes and avgDocks', () => {
      const snapshots = [
        makeSnapshot({ bikesAvailable: 8, docksAvailable: 12 }),
        makeSnapshot({ bikesAvailable: 6, docksAvailable: 14 }),
      ];
      const result = aggregateByHourAndDay(snapshots);
      expect(result[0].avgBikes).toBe(7);
      expect(result[0].avgDocks).toBe(13);
    });

    it('covers all 24 hours when data spans full day', () => {
      const snapshots = generateDayOfSnapshots('1', 20);
      const result = aggregateByHourAndDay(snapshots);
      const hours = result.map(r => r.hour).sort((a, b) => a - b);
      expect(hours).toEqual(Array.from({ length: 24 }, (_, i) => i));
    });
  });

  // --- Station demand ---

  describe('calculateStationDemand', () => {
    it('returns empty array for no data', () => {
      expect(calculateStationDemand([])).toEqual([]);
    });

    it('calculates utilization correctly', () => {
      const snapshots = [
        makeSnapshot({ stationId: '1', bikesAvailable: 5, capacity: 20 }),  // 75% used
        makeSnapshot({ stationId: '1', bikesAvailable: 15, capacity: 20 }), // 25% used
      ];
      const result = calculateStationDemand(snapshots);
      expect(result).toHaveLength(1);
      expect(result[0].avgUtilization).toBe(0.5); // (0.75 + 0.25) / 2
    });

    it('identifies peak hour as hour with fewest bikes (highest demand)', () => {
      const snapshots = [
        makeSnapshot({ stationId: '1', hour: 8, bikesAvailable: 2, capacity: 20 }),
        makeSnapshot({ stationId: '1', hour: 10, bikesAvailable: 15, capacity: 20 }),
        makeSnapshot({ stationId: '1', hour: 14, bikesAvailable: 12, capacity: 20 }),
      ];
      const result = calculateStationDemand(snapshots);
      expect(result[0].peakHour).toBe(8);
    });

    it('handles zero-capacity stations gracefully', () => {
      const snapshots = [
        makeSnapshot({ stationId: '1', bikesAvailable: 0, capacity: 0 }),
      ];
      const result = calculateStationDemand(snapshots);
      expect(result[0].avgUtilization).toBe(0);
    });

    it('groups by station ID', () => {
      const snapshots = [
        makeSnapshot({ stationId: '1', bikesAvailable: 5, capacity: 20 }),
        makeSnapshot({ stationId: '2', bikesAvailable: 18, capacity: 20 }),
      ];
      const result = calculateStationDemand(snapshots);
      expect(result).toHaveLength(2);
    });
  });

  // --- Top/bottom stations ---

  describe('getTopStationsByDemand', () => {
    it('returns top N stations sorted by utilization descending', () => {
      const demands: StationDemand[] = [
        { stationId: 'low', avgUtilization: 0.2, totalSamples: 100, peakHour: 10, peakDayOfWeek: 3 },
        { stationId: 'high', avgUtilization: 0.9, totalSamples: 100, peakHour: 8, peakDayOfWeek: 1 },
        { stationId: 'mid', avgUtilization: 0.5, totalSamples: 100, peakHour: 17, peakDayOfWeek: 5 },
        { stationId: 'very-high', avgUtilization: 0.95, totalSamples: 100, peakHour: 8, peakDayOfWeek: 2 },
      ];
      const top3 = getTopStationsByDemand(demands, 3);
      expect(top3).toHaveLength(3);
      expect(top3[0].stationId).toBe('very-high');
      expect(top3[1].stationId).toBe('high');
      expect(top3[2].stationId).toBe('mid');
    });

    it('returns all stations when N > total', () => {
      const demands: StationDemand[] = [
        { stationId: 'a', avgUtilization: 0.5, totalSamples: 10, peakHour: 10, peakDayOfWeek: 3 },
      ];
      expect(getTopStationsByDemand(demands, 5)).toHaveLength(1);
    });

    it('defaults to 3', () => {
      const demands: StationDemand[] = Array.from({ length: 10 }, (_, i) => ({
        stationId: `s${i}`,
        avgUtilization: i * 0.1,
        totalSamples: 100,
        peakHour: 10,
        peakDayOfWeek: 3,
      }));
      expect(getTopStationsByDemand(demands)).toHaveLength(3);
    });
  });

  describe('getLowUtilizationStations', () => {
    it('returns bottom N stations sorted by utilization ascending', () => {
      const demands: StationDemand[] = [
        { stationId: 'low', avgUtilization: 0.1, totalSamples: 100, peakHour: 10, peakDayOfWeek: 3 },
        { stationId: 'high', avgUtilization: 0.9, totalSamples: 100, peakHour: 8, peakDayOfWeek: 1 },
        { stationId: 'mid', avgUtilization: 0.5, totalSamples: 100, peakHour: 17, peakDayOfWeek: 5 },
        { stationId: 'very-low', avgUtilization: 0.05, totalSamples: 100, peakHour: 14, peakDayOfWeek: 4 },
      ];
      const bottom3 = getLowUtilizationStations(demands, 3);
      expect(bottom3).toHaveLength(3);
      expect(bottom3[0].stationId).toBe('very-low');
      expect(bottom3[1].stationId).toBe('low');
      expect(bottom3[2].stationId).toBe('mid');
    });
  });

  // --- Peak hours ---

  describe('identifyPeakHours', () => {
    it('returns empty for no data', () => {
      expect(identifyPeakHours([])).toEqual([]);
    });

    it('identifies rush hours as peak activity', () => {
      const snapshots = generateDayOfSnapshots('1', 20);
      const peaks = identifyPeakHours(snapshots, 3);

      expect(peaks).toHaveLength(3);
      // Peak hours should include morning/evening rush (hours 7-9, 17-19)
      const peakHours = peaks.map(p => p.hour);
      const isRushHour = peakHours.some(h => (h >= 7 && h <= 9) || (h >= 17 && h <= 19));
      expect(isRushHour).toBe(true);
    });

    it('returns results sorted by activity descending', () => {
      const snapshots = generateDayOfSnapshots('1', 20);
      const peaks = identifyPeakHours(snapshots, 5);
      for (let i = 1; i < peaks.length; i++) {
        expect(peaks[i].avgActivity).toBeLessThanOrEqual(peaks[i - 1].avgActivity);
      }
    });

    it('includes formatted hour label', () => {
      const snapshots = [
        makeSnapshot({ hour: 8, bikesAvailable: 2, capacity: 20 }),
      ];
      const peaks = identifyPeakHours(snapshots, 1);
      expect(peaks[0].label).toBe('08:00');
    });

    it('handles single-hour data', () => {
      const snapshots = [makeSnapshot({ hour: 10, bikesAvailable: 5, capacity: 20 })];
      const peaks = identifyPeakHours(snapshots, 3);
      expect(peaks).toHaveLength(1);
      expect(peaks[0].hour).toBe(10);
    });
  });

  // --- Weekday vs weekend ---

  describe('compareWeekdayVsWeekend', () => {
    it('correctly separates weekday and weekend data', () => {
      const snapshots = [
        makeSnapshot({ dayOfWeek: 1, bikesAvailable: 5, capacity: 20 }),  // Mon - 75% util
        makeSnapshot({ dayOfWeek: 3, bikesAvailable: 5, capacity: 20 }),  // Wed - 75% util
        makeSnapshot({ dayOfWeek: 6, bikesAvailable: 15, capacity: 20 }), // Sat - 25% util
        makeSnapshot({ dayOfWeek: 0, bikesAvailable: 15, capacity: 20 }), // Sun - 25% util
      ];
      const result = compareWeekdayVsWeekend(snapshots);
      expect(result.weekday).toBe(0.75);
      expect(result.weekend).toBe(0.25);
      expect(result.ratio).toBe(3); // 0.75 / 0.25
    });

    it('handles weekday-only data', () => {
      const snapshots = [
        makeSnapshot({ dayOfWeek: 1, bikesAvailable: 10, capacity: 20 }),
        makeSnapshot({ dayOfWeek: 2, bikesAvailable: 10, capacity: 20 }),
      ];
      const result = compareWeekdayVsWeekend(snapshots);
      expect(result.weekday).toBe(0.5);
      expect(result.weekend).toBe(0);
      expect(result.ratio).toBe(0); // Can't divide by 0
    });

    it('handles weekend-only data', () => {
      const snapshots = [
        makeSnapshot({ dayOfWeek: 0, bikesAvailable: 5, capacity: 20 }),
        makeSnapshot({ dayOfWeek: 6, bikesAvailable: 5, capacity: 20 }),
      ];
      const result = compareWeekdayVsWeekend(snapshots);
      expect(result.weekday).toBe(0);
      expect(result.weekend).toBe(0.75);
    });

    it('handles empty data', () => {
      const result = compareWeekdayVsWeekend([]);
      expect(result.weekday).toBe(0);
      expect(result.weekend).toBe(0);
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('handles snapshots from multiple stations across multiple days', () => {
      const snapshots: StationSnapshot[] = [];
      for (const stationId of ['1', '2', '3']) {
        for (let dow = 0; dow < 7; dow++) {
          for (const hour of [8, 12, 17]) {
            snapshots.push(makeSnapshot({
              stationId,
              hour,
              dayOfWeek: dow,
              bikesAvailable: Math.floor(Math.random() * 20),
              capacity: 20,
            }));
          }
        }
      }
      const agg = aggregateByHourAndDay(snapshots);
      expect(agg.length).toBe(3 * 7 * 3); // 3 stations × 7 days × 3 hours

      const demands = calculateStationDemand(snapshots);
      expect(demands).toHaveLength(3);

      const peaks = identifyPeakHours(snapshots, 3);
      expect(peaks.length).toBeLessThanOrEqual(3);
    });

    it('utilization is always between 0 and 1', () => {
      const snapshots = [
        makeSnapshot({ bikesAvailable: 0, capacity: 20 }),   // 100% util
        makeSnapshot({ bikesAvailable: 20, capacity: 20 }),  // 0% util
        makeSnapshot({ bikesAvailable: 10, capacity: 20 }),  // 50% util
      ];
      const demands = calculateStationDemand(snapshots);
      for (const d of demands) {
        expect(d.avgUtilization).toBeGreaterThanOrEqual(0);
        expect(d.avgUtilization).toBeLessThanOrEqual(1);
      }
    });
  });
});
