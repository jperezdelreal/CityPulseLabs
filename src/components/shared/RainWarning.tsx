import { useState } from 'react';

interface RainWarningProps {
  precipitationProbability: number;
  minutesUntilRain: number | null;
}

export default function RainWarning({
  precipitationProbability,
  minutesUntilRain,
}: RainWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || precipitationProbability <= 60) return null;

  const timeText =
    minutesUntilRain !== null && minutesUntilRain > 0
      ? `~${minutesUntilRain} min`
      : 'pronto';

  return (
    <div
      role="alert"
      className="bg-amber-400 text-amber-900 px-4 py-2 flex items-center justify-between text-sm font-medium shrink-0"
    >
      <span>⛈️ Lluvia probable en {timeText} ({precipitationProbability}%)</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 text-amber-800 hover:text-amber-950 font-bold"
        aria-label="Cerrar aviso de lluvia"
      >
        ✕
      </button>
    </div>
  );
}
