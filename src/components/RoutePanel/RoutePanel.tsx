import { useState, useRef, useEffect, useCallback } from 'react';
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
  onHoverRoute?: (index: number | null) => void;
  predictions?: Map<string, StationPrediction>;
  bikeType?: BikeType;
  stationCount?: number;
}

/** Compact route card for mobile swipeable view */
function MobileRouteCard({
  route,
  walkingRoute,
  confidence,
  index,
  isSelected,
  bikeType,
}: {
  route: MultiModalRoute;
  walkingRoute: WalkingRoute | null;
  confidence: PredictiveConfidenceScore | null;
  index: number;
  isSelected: boolean;
  bikeType?: BikeType;
}) {
  const bikeMinutes = Math.round(route.total_time_seconds / 60);
  const walkMinutes = walkingRoute ? Math.round(walkingRoute.total_time_seconds / 60) : null;
  const timeSaved = walkMinutes ? walkMinutes - bikeMinutes : null;
  const speedFactor = bikeType ? BIKE_TYPE_SPEED_FACTOR[bikeType] ?? 1 : 1;
  const bikeLabel = bikeType ? getBikeTypeLabel(bikeType) : null;

  return (
    <div
      className={`route-swipe-card flex-shrink-0 w-[85vw] max-w-[320px] snap-center ${
        isSelected ? 'ring-2 ring-primary-500 shadow-lg' : 'shadow-md'
      }`}
    >
      {/* Header: Route number + time */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isSelected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
          }`}>
            Ruta {index + 1}
          </span>
          {confidence && <ConfidenceBadge confidence={confidence} />}
        </div>
        <span className="text-2xl font-extrabold text-gray-900">{formatDuration(route.total_time_seconds)}</span>
      </div>

      {/* Segment breakdown */}
      <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          🚶 {formatDuration(route.walk_time_seconds)}
        </span>
        <span className="text-gray-300">+</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          🚲 {formatDuration(route.bike_time_seconds)}
        </span>
      </div>

      {/* Stations */}
      <div className="text-xs text-gray-500 space-y-0.5 mb-2">
        <div className="truncate">🟢 <strong className="text-gray-700">{route.pickup_station.name}</strong></div>
        <div className="truncate">🔴 <strong className="text-gray-700">{route.dropoff_station.name}</strong></div>
      </div>

      {bikeLabel && speedFactor < 1 && (
        <div className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded inline-flex items-center gap-1 mb-1">
          {bikeLabel}
        </div>
      )}

      {timeSaved !== null && timeSaved > 0 && (
        <div className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
          ⏱ Ahorras {timeSaved} min vs caminar
        </div>
      )}
    </div>
  );
}

/** Full route card for desktop sidebar */
function DesktopRouteCard({
  route,
  walkingRoute,
  confidence,
  index,
  isSelected,
  onSelect,
  onHover,
  bikeType,
}: {
  route: MultiModalRoute;
  walkingRoute: WalkingRoute | null;
  confidence: PredictiveConfidenceScore | null;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
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
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
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

/** Step-by-step route directions */
function RouteSteps({ route, walkingRoute }: { route: MultiModalRoute; walkingRoute: WalkingRoute | null }) {
  const bikeMinutes = Math.round(route.total_time_seconds / 60);
  const walkMinutes = walkingRoute ? Math.round(walkingRoute.total_time_seconds / 60) : null;
  const timeSaved = walkMinutes ? walkMinutes - bikeMinutes : null;

  return (
    <div className="route-steps mt-3 space-y-0">
      <div className="route-step">
        <div className="route-step-icon bg-blue-100 text-blue-700">🚶</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">
            Camina {formatDistance(route.walk_to_pickup.distance_meters)} hasta estación {route.pickup_station.name}
          </p>
          <p className="text-xs text-gray-500">{formatDuration(route.walk_to_pickup.duration_seconds)}</p>
        </div>
      </div>
      <div className="route-step-connector" />
      <div className="route-step">
        <div className="route-step-icon bg-emerald-100 text-emerald-700">🚲</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">
            Pedalea {formatDistance(route.bike_segment.distance_meters)}
          </p>
          <p className="text-xs text-gray-500">{formatDuration(route.bike_segment.duration_seconds)}</p>
        </div>
      </div>
      <div className="route-step-connector" />
      <div className="route-step">
        <div className="route-step-icon bg-blue-100 text-blue-700">🚶</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">
            Camina {formatDistance(route.walk_to_destination.distance_meters)} hasta destino
          </p>
          <p className="text-xs text-gray-500">{formatDuration(route.walk_to_destination.duration_seconds)}</p>
        </div>
      </div>
      {timeSaved !== null && timeSaved > 0 && (
        <div className="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg text-center">
          🎉 Ahorras {timeSaved} min vs caminar ({walkMinutes} min andando)
        </div>
      )}
    </div>
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
  onHoverRoute,
  predictions,
  bikeType,
  stationCount = 0,
}: RoutePanelProps) {
  const [expandedDetails, setExpandedDetails] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Scroll snap: detect which card is centered and select it (mobile)
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>('.route-swipe-card');
    const containerCenter = el.scrollLeft + el.clientWidth / 2;
    let closestIdx = 0;
    let closestDist = Infinity;
    cards.forEach((card, i) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(containerCenter - cardCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });
    if (closestIdx !== selectedIndex) {
      onSelectRoute(closestIdx);
    }
  }, [selectedIndex, onSelectRoute]);

  // Scroll to selected card when selectedIndex changes (e.g., from map click)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>('.route-swipe-card');
    const target = cards[selectedIndex];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedIndex]);

  const selectedRoute = routesWithConfidence[selectedIndex]?.route ?? null;

  return (
    <div className="route-panel-container">
      {/* Header */}
      <div className="px-4 pt-3 pb-1">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span aria-hidden="true">🗺️</span>
          Rutas disponibles
          {routesWithConfidence.length > 0 && (
            <span className="text-xs font-normal text-gray-500">({routesWithConfidence.length})</span>
          )}
        </h2>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-6 text-center px-4">
          <div className="animate-spin h-6 w-6 border-3 border-primary-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500">Calculando las mejores rutas...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 mx-4">
          <p className="font-medium mb-1">⚠️ Error al calcular rutas</p>
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && routesWithConfidence.length === 0 && (
        <div className="text-center py-6 space-y-2 px-4">
          <div className="text-3xl" aria-hidden="true">📍</div>
          <p className="text-sm font-medium text-gray-700">
            Toca dos puntos en el mapa o usa el buscador para planificar tu ruta
          </p>
          {stationCount > 0 && (
            <p className="text-xs text-gray-500">
              🚲 {stationCount} estaciones disponibles ahora
            </p>
          )}
        </div>
      )}

      {/* === MOBILE: Swipeable horizontal cards === */}
      {routesWithConfidence.length > 0 && (
        <div className="lg:hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="route-swipe-container flex gap-3 overflow-x-auto px-4 pb-3 snap-x snap-mandatory scroll-smooth"
          >
            {routesWithConfidence.map(({ route, confidence }, i) => (
              <MobileRouteCard
                key={`${route.pickup_station.station_id}-${route.dropoff_station.station_id}`}
                route={route}
                walkingRoute={walkingRoute}
                confidence={confidence}
                index={i}
                isSelected={i === selectedIndex}
                bikeType={bikeType}
              />
            ))}
          </div>

          {/* Dot indicators */}
          {routesWithConfidence.length > 1 && (
            <div className="flex justify-center gap-1.5 pb-2">
              {routesWithConfidence.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onSelectRoute(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === selectedIndex ? 'bg-primary-500 w-4' : 'bg-gray-300'
                  }`}
                  aria-label={`Ruta ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Step-by-step for selected route (mobile) */}
          {selectedRoute && (
            <div className="px-4 pb-3">
              <button
                onClick={() => setExpandedDetails(!expandedDetails)}
                className="w-full text-xs text-primary-600 font-medium py-2 flex items-center justify-center gap-1"
              >
                {expandedDetails ? '▲ Ocultar detalle' : '▼ Ver paso a paso'}
              </button>
              {expandedDetails && (
                <>
                  <RouteSteps route={selectedRoute} walkingRoute={walkingRoute} />
                  <RouteStats route={selectedRoute} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* === DESKTOP: Vertical card list === */}
      {routesWithConfidence.length > 0 && (
        <div className="hidden lg:block p-4 space-y-3">
          {routesWithConfidence.map(({ route, confidence }, i) => (
            <DesktopRouteCard
              key={`${route.pickup_station.station_id}-${route.dropoff_station.station_id}`}
              route={route}
              walkingRoute={walkingRoute}
              confidence={confidence}
              index={i}
              isSelected={i === selectedIndex}
              onSelect={() => onSelectRoute(i)}
              onHover={(hovering) => onHoverRoute?.(hovering ? i : null)}
              bikeType={bikeType}
            />
          ))}

          {/* Step-by-step for selected route (desktop) */}
          {selectedRoute && (
            <div className="border-t border-gray-100 pt-3 mt-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                📋 Paso a paso
              </h3>
              <RouteSteps route={selectedRoute} walkingRoute={walkingRoute} />
            </div>
          )}
        </div>
      )}

      {/* Walking comparison footer */}
      {walkingRoute && !loading && (
        <div className="text-xs text-gray-500 border-t border-gray-100 px-4 py-3 flex items-center gap-2">
          <span>🚶</span>
          <span>Ruta directa andando: <strong>{formatDuration(walkingRoute.total_time_seconds)}</strong> ({formatDistance(walkingRoute.total_distance_meters)})</span>
        </div>
      )}
    </div>
  );
}