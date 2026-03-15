import type { MultiModalRoute, WalkingRoute } from '../../types/index.ts';
import RouteStats from './RouteStats.tsx';

interface RoutePanelProps {
  routes: MultiModalRoute[];
  walkingRoute: WalkingRoute | null;
  loading: boolean;
  error: string | null;
  selectedIndex: number;
  onSelectRoute: (index: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  return `${mins} min`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function RouteCard({
  route,
  walkingRoute,
  index,
  isSelected,
  onSelect,
}: {
  route: MultiModalRoute;
  walkingRoute: WalkingRoute | null;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const bikeMinutes = Math.round(route.total_time_seconds / 60);
  const walkMinutes = walkingRoute ? Math.round(walkingRoute.total_time_seconds / 60) : null;
  const timeSaved = walkMinutes ? walkMinutes - bikeMinutes : null;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">Ruta {index + 1}</span>
        <span className="text-lg font-bold text-gray-900">{formatTime(route.total_time_seconds)}</span>
      </div>

      <div className="flex gap-3 text-xs text-gray-600 mb-2">
        <span>🚶 {formatTime(route.walk_time_seconds)} ({formatDistance(route.walk_distance_meters)})</span>
        <span>🚲 {formatTime(route.bike_time_seconds)} ({formatDistance(route.bike_distance_meters)})</span>
      </div>

      <div className="text-xs text-gray-500">
        <div>📍 Recoger: {route.pickup_station.name}</div>
        <div>🅿️ Dejar: {route.dropoff_station.name}</div>
      </div>

      <RouteStats route={route} />

      {timeSaved !== null && (
        <div className={`mt-2 text-xs font-medium px-2 py-1 rounded ${
          timeSaved > 0
            ? 'bg-green-100 text-green-700'
            : 'bg-amber-100 text-amber-700'
        }`}>
          {timeSaved > 0
            ? `🚲 Bici: ${bikeMinutes} min | 🚶 Andando: ${walkMinutes} min | ⚡ Ahorras ${timeSaved} min`
            : `🚶 Andando es más rápido (${walkMinutes} min vs ${bikeMinutes} min en bici)`}
        </div>
      )}
    </button>
  );
}

export default function RoutePanel({
  routes,
  walkingRoute,
  loading,
  error,
  selectedIndex,
  onSelectRoute,
}: RoutePanelProps) {
  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">🗺️ Rutas</h2>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          Calculando rutas...
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && routes.length === 0 && (
        <p className="text-sm text-gray-500">
          Haz clic en el mapa para seleccionar origen y destino.
        </p>
      )}

      {routes.map((route, i) => (
        <RouteCard
          key={`${route.pickup_station.station_id}-${route.dropoff_station.station_id}`}
          route={route}
          walkingRoute={walkingRoute}
          index={i}
          isSelected={i === selectedIndex}
          onSelect={() => onSelectRoute(i)}
        />
      ))}

      {walkingRoute && !loading && (
        <div className="text-xs text-gray-500 border-t pt-2 mt-2">
          🚶 Ruta directa andando: {formatTime(walkingRoute.total_time_seconds)} ({formatDistance(walkingRoute.total_distance_meters)})
        </div>
      )}
    </div>
  );
}
