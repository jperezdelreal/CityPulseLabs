import type { MultiModalRoute, WalkingRoute, StationData } from '../../types/index.ts';
import RouteStats from './RouteStats.tsx';
import ConfidenceBadge from '../shared/ConfidenceBadge.tsx';
import {
  calculateDropoffConfidence,
  calculatePredictiveConfidence,
  routeConfidence,
} from '../../services/confidenceScore.ts';
import type { PredictiveConfidenceScore, StationPrediction } from '../../services/confidenceScore.ts';
import type { BikeType } from '../../services/bikeTypeFilter.ts';
import { BIKE_TYPE_SPEED_FACTOR, getBikeTypeLabel } from '../../services/routeEngine.ts';
import { formatDuration, formatDistance } from '../../services/routeStats.ts';


interface RoutePanelProps {
  routes: MultiModalRoute[];
  walkingRoute: WalkingRoute | null;
  stations: StationData[];
  loading: boolean;
  error: string | null;
  selectedIndex: number;
  onSelectRoute: (index: number) => void;
  predictions?: Map<string, StationPrediction>;
  bikeType?: BikeType;
}

function RouteCard({
  route,
  walkingRoute,
  confidence,
  index,
  isSelected,
  onSelect,
  bikeType,
}: {
  route: MultiModalRoute;
  walkingRoute: WalkingRoute | null;
  confidence: PredictiveConfidenceScore | null;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  bikeType?: BikeType;
}) {
  const bikeMinutes = Math.round(route.total_time_seconds / 60);
  const walkMinutes = walkingRoute ? Math.round(walkingRoute.total_time_seconds / 60) : null;
  const timeSaved = walkMinutes ? walkMinutes - bikeMinutes : null;
  const speedFactor = bikeType ? BIKE_TYPE_SPEED_FACTOR[bikeType] ?? 1 : 1;
  const bikeLabel = bikeType ? getBikeTypeLabel(bikeType) : null;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all min-h-[44px] ${
        isSelected
          ? 'border-primary-500 bg-primary-50/50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm active:bg-gray-50'
      }`}
    >
      {/* Top row: route label + total time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isSelected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
          }`}>
            Ruta {index + 1}
          </span>
          {confidence && <ConfidenceBadge confidence={confidence} />}
        </div>
        <span className="text-xl font-bold text-gray-900">{formatDuration(route.total_time_seconds)}</span>
      </div>

      {/* Segment breakdown with visual indicators */}
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <span>🚶 {formatDuration(route.walk_time_seconds)}</span>
          <span className="text-gray-400">({formatDistance(route.walk_distance_meters)})</span>
        </div>
        <span className="text-gray-300">→</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>🚲 {formatDuration(route.bike_time_seconds)}</span>
          <span className="text-gray-400">({formatDistance(route.bike_distance_meters)})</span>
        </div>
      </div>

      {/* Station names */}
      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-4 text-center shrink-0">🟢</span>
          <span className="truncate">Recoger: <strong className="text-gray-700">{route.pickup_station.name}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 text-center shrink-0">🔴</span>
          <span className="truncate">Dejar: <strong className="text-gray-700">{route.dropoff_station.name}</strong></span>
        </div>
      </div>

      {bikeLabel && speedFactor < 1 && (
        <div className="mt-2 text-xs font-medium text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
          {bikeLabel}
        </div>
      )}

      <RouteStats route={route} />

      {timeSaved !== null && (
        <div className={`mt-2.5 text-xs font-medium px-3 py-1.5 rounded-lg ${
          timeSaved > 0
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {timeSaved > 0
            ? `⏱ Bici: ${bikeMinutes} min · Andando: ${walkMinutes} min · Ahorras ${timeSaved} min`
            : `🚶 Andando es más rápido (${walkMinutes} min vs ${bikeMinutes} min en bici)`}
        </div>
      )}
    </button>
  );
}

function getRouteConfidence(
  route: MultiModalRoute,
  stations: StationData[],
  predictions?: Map<string, StationPrediction>,
): PredictiveConfidenceScore | null {
  const pickup = stations.find((s) => s.station_id === route.pickup_station.station_id);
  const dropoff = stations.find((s) => s.station_id === route.dropoff_station.station_id);
  if (!pickup || !dropoff) return null;
  const walkToPickupMin = route.walk_to_pickup.duration_seconds / 60;
  const bikeToDropoffMin = route.bike_segment.duration_seconds / 60;

  const prediction = predictions?.get(pickup.station_id);
  const pickupConf = calculatePredictiveConfidence(pickup, walkToPickupMin, prediction);
  const dropoffConf = calculateDropoffConfidence(dropoff, bikeToDropoffMin);
  const combined = routeConfidence(pickupConf, dropoffConf);

  return {
    ...combined,
    predictedLevel: pickupConf.predictedLevel,
    predictedReason: pickupConf.predictedReason,
  };
}

const LEVEL_PRIORITY: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function RoutePanel({
  routes,
  walkingRoute,
  stations,
  loading,
  error,
  selectedIndex,
  onSelectRoute,
  predictions,
  bikeType,
}: RoutePanelProps) {
  const routesWithConfidence = routes.map((route) => ({
    route,
    confidence: getRouteConfidence(route, stations, predictions),
  }));

  routesWithConfidence.sort((a, b) => {
    const aPri = a.confidence ? LEVEL_PRIORITY[a.confidence.level] ?? 2 : 2;
    const bPri = b.confidence ? LEVEL_PRIORITY[b.confidence.level] ?? 2 : 2;
    if (aPri !== bPri) return aPri - bPri;
    return a.route.total_time_seconds - b.route.total_time_seconds;
  });

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
        <span aria-hidden="true">🗺️</span>
        Rutas disponibles
      </h2>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="animate-spin h-6 w-6 border-3 border-primary-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500">Calculando las mejores rutas...</p>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
          <p className="font-medium mb-1">⚠️ Error al calcular rutas</p>
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {!loading && !error && routesWithConfidence.length === 0 && (
        <div className="text-center py-6 space-y-2">
          <div className="text-3xl" aria-hidden="true">📍</div>
          <p className="text-sm font-medium text-gray-700">
            Selecciona origen y destino
          </p>
          <p className="text-xs text-gray-500">
            Toca el mapa o usa el buscador para elegir tu ruta
          </p>
        </div>
      )}

      {routesWithConfidence.map(({ route, confidence }, i) => (
        <RouteCard
          key={`${route.pickup_station.station_id}-${route.dropoff_station.station_id}`}
          route={route}
          walkingRoute={walkingRoute}
          confidence={confidence}
          index={i}
          isSelected={i === selectedIndex}
          onSelect={() => onSelectRoute(i)}
          bikeType={bikeType}
        />
      ))}

      {walkingRoute && !loading && (
        <div className="text-xs text-gray-500 border-t border-gray-100 pt-3 mt-3 flex items-center gap-2">
          <span>🚶</span>
          <span>Ruta directa andando: <strong>{formatDuration(walkingRoute.total_time_seconds)}</strong> ({formatDistance(walkingRoute.total_distance_meters)})</span>
        </div>
      )}
    </div>
  );
}