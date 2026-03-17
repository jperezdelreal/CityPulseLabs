// ---------------------------------------------------------------------------
// Analytics — Issue #62: Station Usage Patterns
// Pure aggregation functions for analyzing station snapshot data.
// ---------------------------------------------------------------------------

export interface StationSnapshot {
  stationId: string;
  timestamp: string;
  hour: number;
  dayOfWeek: number;
  bikesAvailable: number;
  docksAvailable: number;
  capacity: number;
}

export interface HourlyAggregate {
  stationId: string;
  hour: number;
  dayOfWeek: number;
  avgBikes: number;
  avgDocks: number;
  sampleCount: number;
}

export interface StationDemand {
  stationId: string;
  avgUtilization: number;
  totalSamples: number;
  peakHour: number;
  peakDayOfWeek: number;
}

export interface PeakHourResult {
  hour: number;
  avgActivity: number;
  label: string;
}

export function aggregateByHourAndDay(snapshots: StationSnapshot[]): HourlyAggregate[] {
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

export function calculateStationDemand(snapshots: StationSnapshot[]): StationDemand[] {
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

    // Peak hour: hour with lowest avg bikes (highest demand)
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

    // Peak day
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

export function getTopStationsByDemand(demands: StationDemand[], n: number = 3): StationDemand[] {
  return [...demands]
    .sort((a, b) => b.avgUtilization - a.avgUtilization)
    .slice(0, n);
}

export function getLowUtilizationStations(demands: StationDemand[], n: number = 3): StationDemand[] {
  return [...demands]
    .sort((a, b) => a.avgUtilization - b.avgUtilization)
    .slice(0, n);
}

export function identifyPeakHours(snapshots: StationSnapshot[], topN: number = 3): PeakHourResult[] {
  const byHour = new Map<number, number[]>();
  for (const s of snapshots) {
    const existing = byHour.get(s.hour) ?? [];
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

export function compareWeekdayVsWeekend(
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
