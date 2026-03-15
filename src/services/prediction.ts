export type PredictionConfidence = 'high' | 'medium' | 'low' | 'none';

export interface PredictionResult {
  predicted: number | null;
  confidence: PredictionConfidence;
  range: [number, number] | null;
  dataPoints: number;
  message?: string;
}

const PREDICT_API_URL = '/api/predict';

/**
 * Fetch availability prediction for a station from the prediction API.
 */
export async function fetchPrediction(
  stationId: string,
  horizonMinutes: number = 30,
): Promise<PredictionResult> {
  const url = `${PREDICT_API_URL}?station=${encodeURIComponent(stationId)}&horizon=${horizonMinutes}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Prediction API error: ${res.status}`);
  }

  return res.json();
}
