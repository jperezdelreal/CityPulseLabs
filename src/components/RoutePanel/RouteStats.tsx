import type { MultiModalRoute } from '../../types/index.ts';
import { getRouteStats, formatDistance } from '../../services/routeStats.ts';

interface RouteStatsProps {
  route: MultiModalRoute;
}

export default function RouteStats({ route }: RouteStatsProps) {
  const stats = getRouteStats(route);

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
      <span title="Distancia caminando">🚶 {formatDistance(stats.walkDistance)}</span>
      <span title="Distancia en bici">🚲 {formatDistance(stats.bikeDistance)}</span>
      <span title="Calorías quemadas">🔥 {stats.calories} kcal</span>
      <span title="CO₂ ahorrado">🌱 {stats.co2Saved} kg CO₂</span>
    </div>
  );
}
