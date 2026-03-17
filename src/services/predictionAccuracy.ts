// ---------------------------------------------------------------------------
// Prediction Accuracy Monitoring — Issue #64
// Pure functions for tracking prediction quality over time.
// ---------------------------------------------------------------------------

export interface PredictionRecord {
  stationId: string;
  timestamp: string;
  predictedBikes: number;
  actualBikes: number;
  confidenceLevel: 'high' | 'medium' | 'low' | 'none';
}

export interface AccuracyMetrics {
  mae: number;
  rmse: number;
  bias: number;
  sampleCount: number;
  withinRange: number;
  withinRangePct: number;
}

export interface StationAccuracy {
  stationId: string;
  metrics: AccuracyMetrics;
}

export interface AccuracyAlert {
  triggered: boolean;
  threshold: number;
  currentAccuracy: number;
  message: string;
}

export function calculateMAE(records: PredictionRecord[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + Math.abs(r.predictedBikes - r.actualBikes), 0);
  return sum / records.length;
}

export function calculateRMSE(records: PredictionRecord[]): number {
  if (records.length === 0) return 0;
  const sumSq = records.reduce((acc, r) => acc + (r.predictedBikes - r.actualBikes) ** 2, 0);
  return Math.sqrt(sumSq / records.length);
}

export function calculateBias(records: PredictionRecord[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + (r.predictedBikes - r.actualBikes), 0);
  return sum / records.length;
}

export function calculateAccuracyMetrics(records: PredictionRecord[]): AccuracyMetrics {
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

export function calculateAccuracyByStation(records: PredictionRecord[]): StationAccuracy[] {
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

export function calculateAccuracyByConfidence(
  records: PredictionRecord[],
  level: PredictionRecord['confidenceLevel'],
): AccuracyMetrics {
  const filtered = records.filter(r => r.confidenceLevel === level);
  return calculateAccuracyMetrics(filtered);
}

export function checkAccuracyAlert(
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
