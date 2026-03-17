// ---------------------------------------------------------------------------
// Anomaly Detection — Issue #65: Broken Station Detection
// Pure functions for identifying station anomalies from snapshot data.
// ---------------------------------------------------------------------------

export interface StationSnapshot {
  stationId: string;
  timestamp: string;
  bikesAvailable: number;
  docksAvailable: number;
  capacity: number;
  isRenting: boolean;
  isReturning: boolean;
}

export type AnomalyType =
  | 'never_returns_bikes'
  | 'never_empty'
  | 'zero_samples'
  | 'stuck_bike';

export interface AnomalyResult {
  stationId: string;
  anomaly: AnomalyType;
  durationMinutes: number;
  lastUpdate: string;
  recommendation: string;
}

export interface AnomalyCheckConfig {
  staleThresholdMinutes: number;
  emptyThresholdMinutes: number;
  fullThresholdMinutes: number;
  offlineThresholdHours: number;
}

export const DEFAULT_CONFIG: AnomalyCheckConfig = {
  staleThresholdMinutes: 60,
  emptyThresholdMinutes: 60,
  fullThresholdMinutes: 60,
  offlineThresholdHours: 24,
};

export function detectStaleStation(
  snapshots: StationSnapshot[],
  nowMs: number,
  thresholdMinutes: number = 60,
): AnomalyResult | null {
  if (snapshots.length === 0) return null;
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const latest = sorted[0];
  const lastTs = new Date(latest.timestamp).getTime();
  const diffMinutes = (nowMs - lastTs) / 60_000;

  if (diffMinutes > thresholdMinutes) {
    const allSameBikes = sorted.every(s => s.bikesAvailable === latest.bikesAvailable);
    if (allSameBikes && sorted.length >= 2) {
      return {
        stationId: latest.stationId,
        anomaly: 'stuck_bike',
        durationMinutes: Math.round(diffMinutes),
        lastUpdate: latest.timestamp,
        recommendation: 'Station data appears frozen. Consider nearby alternatives.',
      };
    }
  }
  return null;
}

export function detectEmptyStation(
  snapshots: StationSnapshot[],
  thresholdMinutes: number = 60,
): AnomalyResult | null {
  if (snapshots.length < 2) return null;
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let runStart: string | null = null;
  let runEnd: string | null = null;

  for (const s of sorted) {
    if (s.bikesAvailable === 0) {
      if (!runStart) runStart = s.timestamp;
      runEnd = s.timestamp;
    } else {
      runStart = null;
      runEnd = null;
    }
  }

  if (runStart && runEnd) {
    const duration = (new Date(runEnd).getTime() - new Date(runStart).getTime()) / 60_000;
    if (duration >= thresholdMinutes) {
      return {
        stationId: sorted[0].stationId,
        anomaly: 'never_returns_bikes',
        durationMinutes: Math.round(duration),
        lastUpdate: runEnd,
        recommendation: 'Station has been empty. Try nearby stations.',
      };
    }
  }
  return null;
}

export function detectFullStation(
  snapshots: StationSnapshot[],
  thresholdMinutes: number = 60,
): AnomalyResult | null {
  if (snapshots.length < 2) return null;
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let runStart: string | null = null;
  let runEnd: string | null = null;

  for (const s of sorted) {
    if (s.docksAvailable === 0) {
      if (!runStart) runStart = s.timestamp;
      runEnd = s.timestamp;
    } else {
      runStart = null;
      runEnd = null;
    }
  }

  if (runStart && runEnd) {
    const duration = (new Date(runEnd).getTime() - new Date(runStart).getTime()) / 60_000;
    if (duration >= thresholdMinutes) {
      return {
        stationId: sorted[0].stationId,
        anomaly: 'never_empty',
        durationMinutes: Math.round(duration),
        lastUpdate: runEnd,
        recommendation: 'Station is full — no docks available. Try nearby stations.',
      };
    }
  }
  return null;
}

export function detectOfflineStation(
  stationId: string,
  lastSeen: string | null,
  nowMs: number,
  thresholdHours: number = 24,
): AnomalyResult | null {
  if (!lastSeen) {
    return {
      stationId,
      anomaly: 'zero_samples',
      durationMinutes: 0,
      lastUpdate: '',
      recommendation: 'No data available for this station.',
    };
  }

  const diffHours = (nowMs - new Date(lastSeen).getTime()) / 3_600_000;
  if (diffHours >= thresholdHours) {
    return {
      stationId,
      anomaly: 'zero_samples',
      durationMinutes: Math.round(diffHours * 60),
      lastUpdate: lastSeen,
      recommendation: 'Station appears offline. No data received recently.',
    };
  }
  return null;
}

export function detectAnomalies(
  stationId: string,
  snapshots: StationSnapshot[],
  nowMs: number,
  config: AnomalyCheckConfig = DEFAULT_CONFIG,
): AnomalyResult[] {
  const results: AnomalyResult[] = [];

  const lastSeen = snapshots.length > 0
    ? [...snapshots].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )[0].timestamp
    : null;

  const offline = detectOfflineStation(stationId, lastSeen, nowMs, config.offlineThresholdHours);
  if (offline) results.push(offline);

  const stale = detectStaleStation(snapshots, nowMs, config.staleThresholdMinutes);
  if (stale) results.push(stale);

  const empty = detectEmptyStation(snapshots, config.emptyThresholdMinutes);
  if (empty) results.push(empty);

  const full = detectFullStation(snapshots, config.fullThresholdMinutes);
  if (full) results.push(full);

  return results;
}
