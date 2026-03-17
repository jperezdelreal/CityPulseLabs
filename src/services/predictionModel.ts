// ---------------------------------------------------------------------------
// Prediction Model — Issue #63: Improved Prediction
// Pure functions for training and predicting station availability.
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

export interface HistoricalPattern {
  stationId: string;
  hour: number;
  dayOfWeek: number;
  avgBikes: number;
  stdDev: number;
  sampleCount: number;
}

export interface ModelPrediction {
  stationId: string;
  predictedBikes: number;
  confidenceScore: number;
  availabilityLevel: 'green' | 'yellow' | 'red';
  range: [number, number];
  dataPoints: number;
  timestamp: string;
}

export interface TrainingResult {
  patternsGenerated: number;
  stationsCovered: number;
  hoursCovered: number;
  oldestDataPoint: string;
  newestDataPoint: string;
}

export function trainModel(snapshots: StationSnapshot[]): {
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

export function calculateConfidenceScore(sampleCount: number, maxSamples: number = 100): number {
  return Math.min(Math.round((sampleCount / maxSamples) * 100), 100);
}

export function predictAvailability(
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
