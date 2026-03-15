import type { PredictionResult } from '../../services/prediction.ts';

interface PredictionBadgeProps {
  prediction: PredictionResult | null;
  loading: boolean;
  horizonMinutes?: number;
}

const confidenceColors: Record<string, string> = {
  high: 'text-green-700 bg-green-50',
  medium: 'text-amber-700 bg-amber-50',
  low: 'text-red-700 bg-red-50',
};

export default function PredictionBadge({
  prediction,
  loading,
  horizonMinutes = 30,
}: PredictionBadgeProps) {
  if (loading) {
    return (
      <div
        className="text-xs text-gray-400 animate-pulse"
        data-testid="prediction-loading"
      >
        Calculando predicción…
      </div>
    );
  }

  if (!prediction || prediction.predicted === null || prediction.confidence === 'none') {
    return (
      <div
        className="text-xs text-gray-400 italic"
        data-testid="prediction-unavailable"
      >
        Predicción no disponible — recopilando datos
      </div>
    );
  }

  const margin = prediction.range
    ? Math.round((prediction.range[1] - prediction.range[0]) / 2)
    : 0;

  const colorClasses = confidenceColors[prediction.confidence] ?? 'text-gray-700 bg-gray-50';

  return (
    <div
      className={`text-xs rounded px-1.5 py-0.5 ${colorClasses}`}
      data-testid="prediction-badge"
      data-confidence={prediction.confidence}
    >
      <span>
        En {horizonMinutes} min: ~{prediction.predicted} bicis
        {margin > 0 && ` (±${margin})`}
      </span>
    </div>
  );
}
