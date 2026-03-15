import type { MultiModalRoute } from '../../types/index.ts';
import { getRouteStats, formatDistance } from '../../services/routeStats.ts';

interface RouteStatsProps {
  route: MultiModalRoute;
}

export default function RouteStats({ route }: RouteStatsProps) {
  const stats = getRouteStats(route);

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
      <span>🚶 {formatDistance(stats.walkDistance)}</span>
      <span>🚲 {formatDistance(stats.bikeDistance)}</span>
      <span>🔥 {stats.calories} kcal</span>
      <span>🌱 {stats.co2Saved} kg CO₂</span>
    </div>
  );
}
