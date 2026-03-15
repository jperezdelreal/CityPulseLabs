import { useState } from 'react';
import type { ConfidenceLevel } from '../../services/confidenceScore.ts';
import type { PredictiveConfidenceScore } from '../../services/confidenceScore.ts';

interface ConfidenceBadgeProps {
  confidence: PredictiveConfidenceScore;
  compact?: boolean;
}

const levelConfig: Record<ConfidenceLevel, { emoji: string; label: string; classes: string }> = {
  high: { emoji: '\u{1F7E2}', label: 'Alta', classes: 'bg-green-100 text-green-800' },
  medium: { emoji: '\u{1F7E1}', label: 'Media', classes: 'bg-amber-100 text-amber-800' },
  low: { emoji: '\u{1F534}', label: 'Baja', classes: 'bg-red-100 text-red-800' },
};

export default function ConfidenceBadge({ confidence, compact = false }: ConfidenceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = levelConfig[confidence.level];
  const hasPrediction = confidence.predictedLevel && confidence.predictedLevel !== confidence.level;
  const predictedConfig = hasPrediction ? levelConfig[confidence.predictedLevel!] : null;

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      data-testid="confidence-badge"
      data-level={confidence.level}
    >
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.classes}`}
      >
        <span>{config.emoji}</span>
        {!compact && <span>{config.label}</span>}
      </span>

      {hasPrediction && predictedConfig && (
        <>
          <span className="mx-0.5 text-xs text-gray-400">{'\u2192'}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${predictedConfig.classes}`}
            data-testid="confidence-badge-predicted"
          >
            <span>{predictedConfig.emoji}</span>
            {!compact && <span>{predictedConfig.label}</span>}
          </span>
        </>
      )}

      {showTooltip && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded shadow-lg whitespace-nowrap z-50"
          data-testid="confidence-tooltip"
        >
          {confidence.predictedReason ?? confidence.reason}
        </span>
      )}
    </span>
  );
}