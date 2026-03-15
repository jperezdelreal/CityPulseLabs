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
      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
        isSelected
          ? 'border-secondary-500 bg-secondary-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Ruta {index + 1}</span>
          {confidence && <ConfidenceBadge confidence={confidence} />}
        </div>
        <span className="text-lg font-bold text-gray-900">{formatDuration(route.total_time_seconds)}</span>
      </div>

      <div className="flex gap-3 text-xs text-gray-600 mb-2">
        <span>{formatDuration(route.walk_time_seconds)} ({formatDistance(route.walk_distance_meters)})</span>
        <span>{formatDuration(route.bike_time_seconds)} ({formatDistance(route.bike_distance_meters)})</span>
      </div>

      <div className="text-xs text-gray-500">
        <div>Recoger: {route.pickup_station.name}</div>
        <div>Dejar: {route.dropoff_station.name}</div>
      </div>

      {bikeLabel && speedFactor < 1 && (
        <div className="mt-1 text-xs font-medium text-secondary-700 bg-secondary-50 px-2 py-0.5 rounded inline-block">
          {bikeLabel}
        </div>
      )}

      <RouteStats route={route} />

      {timeSaved !== null && (
        <div className={`mt-2 text-xs font-medium px-2 py-1 rounded ${
          timeSaved > 0
            ? 'bg-primary-50 text-primary-700'
            : 'bg-amber-100 text-amber-700'
        }`}>
          {timeSaved > 0
            ? `Bici: ${bikeMinutes} min | Andando: ${walkMinutes} min | Ahorras ${timeSaved} min`
            : `Andando es mas rapido (${walkMinutes} min vs ${bikeMinutes} min en bici)`}
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
      <h2 className="text-lg font-semibold">Rutas</h2>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          Calculando rutas...
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {!loading && !error && routesWithConfidence.length === 0 && (
        <p className="text-sm text-gray-500">
          Haz clic en el mapa para seleccionar origen y destino.
        </p>
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
        <div className="text-xs text-gray-500 border-t pt-2 mt-2">
          Ruta directa andando: {formatDuration(walkingRoute.total_time_seconds)} ({formatDistance(walkingRoute.total_distance_meters)})
        </div>
      )}
    </div>
  );
}