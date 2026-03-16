import { RAIN_THRESHOLD } from '../../services/weather.ts';

interface WeatherIndicatorProps {
  precipitationProbability: number;
  minutesUntilRain: number | null;
  loading: boolean;
}

export default function WeatherIndicator({
  precipitationProbability,
  minutesUntilRain,
  loading,
}: WeatherIndicatorProps) {
  if (loading) {
    return (
      <span className="text-[10px] sm:text-xs opacity-75 flex items-center gap-1">
        <span className="animate-pulse">🌤️</span> Cargando clima…
      </span>
    );
  }

  const isRainy = precipitationProbability > RAIN_THRESHOLD;

  if (isRainy) {
    const timeText =
      minutesUntilRain !== null && minutesUntilRain > 0
        ? `en ~${minutesUntilRain} min`
        : 'inminente';

    return (
      <span
        className="text-[10px] sm:text-xs font-medium bg-amber-400/20 text-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1"
        role="status"
        data-testid="weather-indicator"
      >
        ⛈️ Lluvia {timeText}
      </span>
    );
  }

  return (
    <span
      className="text-[10px] sm:text-xs opacity-75 flex items-center gap-1"
      role="status"
      data-testid="weather-indicator"
    >
      ☀️ Sin lluvia prevista
    </span>
  );
}
