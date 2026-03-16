/**
 * MobileRoutePanel — Touch-first bottom sheet for route results
 *
 * A proper mobile bottom sheet that:
 * - Starts as a compact peek bar (shows route summary)
 * - Expands with swipe-up gesture to show full results
 * - Vertical list of route cards for easy comparison
 * - All touch targets ≥ 48px
 * - Overscroll containment
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { MultiModalRoute, WalkingRoute, StationData } from '../../types/index.ts';
import type { BikeType } from '../../services/bikeTypeFilter.ts';
import {
  calculateDropoffConfidence,
  calculatePredictiveConfidence,
  routeConfidence,
} from '../../services/confidenceScore.ts';
import type { PredictiveConfidenceScore } from '../../services/confidenceScore.ts';
import ConfidenceBadge from '../shared/ConfidenceBadge.tsx';
import { BIKE_TYPE_SPEED_FACTOR, getBikeTypeLabel } from '../../services/routeEngine.ts';
import { formatDuration, formatDistance } from '../../services/routeStats.ts';
import RouteStats from '../RoutePanel/RouteStats.tsx';
import StationPanel from '../StationPanel/StationPanel.tsx';

interface MobileRoutePanelProps {
  routes: MultiModalRoute[];
  walkingRoute: WalkingRoute | null;
  stations: StationData[];
  routeLoading: boolean;
  routeError: string | null;
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
  onRetryRoutes: () => void;
  bikeType: BikeType;

  selectedStation: StationData | null;
  stationsLoading: boolean;
  stationsError: string | null;
  lastUpdated: Date | null;
  onCloseStation: () => void;
}

const LEVEL_PRIORITY: Record<string, number> = { high: 0, medium: 1, low: 2 };

function getRouteConfidence(
  route: MultiModalRoute,
  stations: StationData[],
): PredictiveConfidenceScore | null {
  const pickup = stations.find((s) => s.station_id === route.pickup_station.station_id);
  const dropoff = stations.find((s) => s.station_id === route.dropoff_station.station_id);
  if (!pickup || !dropoff) return null;
  const walkToPickupMin = route.walk_to_pickup.duration_seconds / 60;
  const bikeToDropoffMin = route.bike_segment.duration_seconds / 60;
  const pickupConf = calculatePredictiveConfidence(pickup, walkToPickupMin);
  const dropoffConf = calculateDropoffConfidence(dropoff, bikeToDropoffMin);
  const combined = routeConfidence(pickupConf, dropoffConf);
  return {
    ...combined,
    predictedLevel: pickupConf.predictedLevel,
    predictedReason: pickupConf.predictedReason,
  };
}

export default function MobileRoutePanel({
  routes,
  walkingRoute,
  stations,
  routeLoading,
  routeError,
  selectedRouteIndex,
  onSelectRoute,
  onRetryRoutes,
  bikeType,
  selectedStation,
  stationsLoading,
  stationsError,
  lastUpdated,
  onCloseStation,
}: MobileRoutePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);
  const wasDragged = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const routesWithConfidence = routes.map((route) => ({
    route,
    confidence: getRouteConfidence(route, stations),
  }));

  routesWithConfidence.sort((a, b) => {
    const aPri = a.confidence ? LEVEL_PRIORITY[a.confidence.level] ?? 2 : 2;
    const bPri = b.confidence ? LEVEL_PRIORITY[b.confidence.level] ?? 2 : 2;
    if (aPri !== bPri) return aPri - bPri;
    return a.route.total_time_seconds - b.route.total_time_seconds;
  });

  const hasContent = routesWithConfidence.length > 0 || routeLoading || routeError || selectedStation;

  // Auto-expand only when user taps a station (not on routes arrival)
  useEffect(() => {
    if (selectedStation) setExpanded(true);
  }, [selectedStation]);

  const hasRoutes = routesWithConfidence.length > 0;

  // --- Smooth swipe gesture handlers ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    wasDragged.current = false;
    setIsDragging(true);
    setTranslateY(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - dragStartY.current;
    if (Math.abs(deltaY) > 5) wasDragged.current = true;
    if (expanded) {
      // Only allow downward drag when expanded
      setTranslateY(Math.max(0, deltaY));
    } else {
      // Only allow upward drag when collapsed
      setTranslateY(Math.min(0, deltaY));
    }
  }, [expanded]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - dragStartY.current;
    const elapsed = Date.now() - dragStartTime.current;
    const velocity = Math.abs(deltaY) / Math.max(elapsed, 1);

    setIsDragging(false);

    // If no real drag occurred, let click handler deal with taps
    if (!wasDragged.current) {
      setTranslateY(0);
      return;
    }

    const sheetHeight = sheetRef.current?.offsetHeight ?? window.innerHeight * 0.65;
    const threshold = sheetHeight * 0.3;

    if (expanded) {
      // Fast swipe down or dragged past 30%: collapse
      if ((velocity > 0.5 && deltaY > 0) || deltaY > threshold) {
        setExpanded(false);
        // Station-only view: dismiss station on swipe down
        if (selectedStation && !hasRoutes && !routeLoading && !routeError) {
          onCloseStation();
        }
      }
    } else {
      // Fast swipe up or dragged past 30%: expand
      if ((velocity > 0.5 && deltaY < 0) || deltaY < -threshold) {
        setExpanded(true);
      }
    }

    // Animate back to resting position
    setTranslateY(0);
  }, [expanded, selectedStation, hasRoutes, routeLoading, routeError, onCloseStation]);

  const handleDragClick = useCallback(() => {
    if (wasDragged.current) return;
    setExpanded((prev) => !prev);
  }, []);

  const handlePeekClick = useCallback(() => {
    if (wasDragged.current) return;
    setExpanded(true);
  }, []);

  if (!hasContent) return null;

  const selectedRoute = routesWithConfidence[selectedRouteIndex]?.route ?? null;

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 z-[45]"
      style={{
        maxHeight: expanded ? '65vh' : '80px',
        transform: `translateY(${translateY}px)`,
        transition: isDragging
          ? 'max-height 0.3s ease-out'
          : 'max-height 0.3s ease-out, transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
      data-testid="mobile-route-panel"
    >
      {/* Bottom sheet container */}
      <div className="bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.15)] h-full flex flex-col">
        {/* Drag header zone — entire top area is touch-draggable */}
        <div
          className="touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            onClick={handleDragClick}
            aria-hidden="true"
          >
            <div className={`w-10 h-1 rounded-full transition-all ${isDragging ? 'bg-gray-400 scale-x-110' : 'bg-gray-300'}`} />
          </div>

          {/* Collapsed peek: show summary */}
          {!expanded && routesWithConfidence.length > 0 && (
            <button
              onClick={handlePeekClick}
              className="px-4 pb-3 flex items-center justify-between w-full text-left min-h-[48px]"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🗺️</span>
                <span className="text-sm font-semibold text-gray-900">
                  {routesWithConfidence.length} ruta{routesWithConfidence.length > 1 ? 's' : ''} disponible{routesWithConfidence.length > 1 ? 's' : ''} · ~{formatDuration(routesWithConfidence[0].route.total_time_seconds)}
                </span>
              </div>
              <span className="text-xs text-gray-500">Toca para ver</span>
            </button>
          )}

          {/* Loading peek */}
          {!expanded && routeLoading && (
            <div className="px-4 pb-3 flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-500">Calculando rutas...</span>
            </div>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Loading */}
            {routeLoading && (
              <div className="px-4 py-6">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton-shimmer h-20 rounded-2xl" />
                  ))}
                </div>
              </div>
            )}

            {/* Error with retry */}
            {routeError && !routeLoading && (
              <div className="px-4 py-6 text-center">
                <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                  <div className="text-3xl mb-3">😵</div>
                  <p className="text-sm font-semibold text-red-800 mb-1">No pudimos calcular las rutas</p>
                  <p className="text-xs text-red-500 mb-4">
                    {routeError.includes('fetch')
                      ? 'Problema de conexión. Comprueba tu red.'
                      : routeError}
                  </p>
                  <button
                    onClick={onRetryRoutes}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 text-white text-sm font-medium active:bg-red-800 min-h-[48px] shadow-sm"
                  >
                    🔄 Reintentar
                  </button>
                </div>
              </div>
            )}

            {/* Route cards — horizontal swipe */}
            {routesWithConfidence.length > 0 && (
              <>
                <div className="px-4 pt-1 pb-2">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    🗺️ Rutas disponibles
                    <span className="text-xs font-normal text-gray-500">({routesWithConfidence.length})</span>
                  </h2>
                </div>

                {/* Route cards — vertical list */}
                <div className="px-4 space-y-3 pb-3">
                  {routesWithConfidence.map(({ route, confidence }, i) => {
                    const isSelected = i === selectedRouteIndex;
                    const bikeMinutes = Math.round(route.total_time_seconds / 60);
                    const walkMinutes = walkingRoute ? Math.round(walkingRoute.total_time_seconds / 60) : null;
                    const timeSaved = walkMinutes ? walkMinutes - bikeMinutes : null;
                    const speedFactor = bikeType ? BIKE_TYPE_SPEED_FACTOR[bikeType] ?? 1 : 1;
                    const bikeLabel = bikeType ? getBikeTypeLabel(bikeType) : null;

                    return (
                      <button
                        key={`${route.pickup_station.station_id}-${route.dropoff_station.station_id}`}
                        onClick={() => onSelectRoute(i)}
                        className={`w-full rounded-2xl p-4 transition-all text-left ${
                          isSelected
                            ? 'bg-primary-50/30 shadow-md border-l-[3px] border-primary-500'
                            : 'bg-white shadow-sm border-l-[3px] border-transparent hover:border-gray-300'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              Ruta {i + 1}
                            </span>
                            {confidence && <ConfidenceBadge confidence={confidence} />}
                          </div>
                          <span className="text-2xl font-extrabold text-gray-900">
                            {formatDuration(route.total_time_seconds)}
                          </span>
                        </div>

                        {/* Segments */}
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
                      </button>
                    );
                  })}
                </div>

                {/* Step-by-step expandable */}
                {selectedRoute && (
                  <div className="px-4 pb-3 border-t border-gray-100">
                    <button
                      onClick={() => setShowSteps(!showSteps)}
                      className="w-full text-sm text-primary-600 font-medium py-3 flex items-center justify-center gap-1 min-h-[48px]"
                    >
                      {showSteps ? '▲ Ocultar detalle' : '▼ Ver paso a paso'}
                    </button>
                    {showSteps && (
                      <div className="space-y-0 pb-2">
                        <StepItem
                          icon="🚶" color="blue"
                          text={`Camina ${formatDistance(selectedRoute.walk_to_pickup.distance_meters)} hasta ${selectedRoute.pickup_station.name}`}
                          time={formatDuration(selectedRoute.walk_to_pickup.duration_seconds)}
                        />
                        <div className="ml-4 w-0.5 h-3 bg-gray-200" />
                        <StepItem
                          icon="🚲" color="emerald"
                          text={`Pedalea ${formatDistance(selectedRoute.bike_segment.distance_meters)}`}
                          time={formatDuration(selectedRoute.bike_segment.duration_seconds)}
                        />
                        <div className="ml-4 w-0.5 h-3 bg-gray-200" />
                        <StepItem
                          icon="🚶" color="blue"
                          text={`Camina ${formatDistance(selectedRoute.walk_to_destination.distance_meters)} hasta destino`}
                          time={formatDuration(selectedRoute.walk_to_destination.duration_seconds)}
                        />
                        <RouteStats route={selectedRoute} />
                      </div>
                    )}
                  </div>
                )}

                {/* Walking comparison */}
                {walkingRoute && (
                  <div className="text-xs text-gray-500 border-t border-gray-100 px-4 py-3 flex items-center gap-2">
                    🚶 Andando: <strong>{formatDuration(walkingRoute.total_time_seconds)}</strong> ({formatDistance(walkingRoute.total_distance_meters)})
                  </div>
                )}
              </>
            )}

            {/* Station info — no ✕ button; swipe down to dismiss */}
            {selectedStation && (
              <div className="border-t border-gray-100">
                <StationPanel
                  station={selectedStation}
                  loading={stationsLoading}
                  error={stationsError}
                  lastUpdated={lastUpdated}
                  preferredBikeType={bikeType}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StepItem({ icon, color, text, time }: { icon: string; color: string; text: string; time: string }) {
  const bgClass = color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700';
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${bgClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{text}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
  );
}
