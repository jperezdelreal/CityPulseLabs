/**
 * UnifiedPanel — Google Maps-style unified directions panel
 *
 * Mobile: bottom sheet (collapsed → expanded) with search + routes + station info
 * Desktop: side panel with search at top, content below
 *
 * Combines the functionality of SearchBar + RoutePanel + StationPanel
 * into one cohesive experience.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useGeocode } from '../../hooks/useGeocode.ts';
import type { GeocodingResult } from '../../services/geocoding.ts';
import type { LatLng, MultiModalRoute, WalkingRoute, StationData } from '../../types/index.ts';
import type { BikeType } from '../../services/bikeTypeFilter.ts';
import RoutePanel from '../RoutePanel/RoutePanel.tsx';
import StationPanel from '../StationPanel/StationPanel.tsx';
import RouteSkeleton from './RouteSkeleton.tsx';

type ActiveField = 'origin' | 'destination' | null;

interface UnifiedPanelProps {
  origin: LatLng | null;
  destination: LatLng | null;
  onSetOrigin: (point: LatLng) => void;
  onSetDestination: (point: LatLng) => void;
  onClearRoute: () => void;

  routes: MultiModalRoute[];
  walkingRoute: WalkingRoute | null;
  stations: StationData[];
  routeLoading: boolean;
  routeError: string | null;
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
  onHoverRoute: (index: number | null) => void;
  onRetryRoutes: () => void;

  selectedStation: StationData | null;
  stationsLoading: boolean;
  stationsError: string | null;
  lastUpdated: Date | null;
  onCloseStation: () => void;
  bikeType: BikeType;

  geoPosition?: LatLng | null;
}

export default function UnifiedPanel({
  origin,
  destination,
  onSetOrigin,
  onSetDestination,
  onClearRoute,
  routes,
  walkingRoute,
  stations,
  routeLoading,
  routeError,
  selectedRouteIndex,
  onSelectRoute,
  onHoverRoute,
  onRetryRoutes,
  selectedStation,
  stationsLoading,
  stationsError,
  lastUpdated,
  onCloseStation,
  bikeType,
  geoPosition = null,
}: UnifiedPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>(null);

  const originGeocode = useGeocode();
  const destGeocode = useGeocode();

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const originSetBySearch = useRef(false);
  const destSetBySearch = useRef(false);
  const prevOriginRef = useRef<LatLng | null>(origin);
  const prevDestRef = useRef<LatLng | null>(destination);

  const hasRoutes = routes.length > 0;
  const hasContent = !!(selectedStation || origin || destination || routeLoading);

  // Detect external origin change (map click or geolocation)
  useEffect(() => {
    if (originSetBySearch.current) {
      originSetBySearch.current = false;
      prevOriginRef.current = origin;
      return;
    }
    if (origin && origin !== prevOriginRef.current) {
      setOriginText('📍 Punto en el mapa');
      setExpanded(true);
      if (!destination) {
        setActiveField(null);
      }
    }
    if (!origin && prevOriginRef.current) {
      setOriginText('');
      originGeocode.clear();
    }
    prevOriginRef.current = origin;
  }, [origin, destination, originGeocode]);

  // Detect external destination change (map click)
  useEffect(() => {
    if (destSetBySearch.current) {
      destSetBySearch.current = false;
      prevDestRef.current = destination;
      return;
    }
    if (destination && destination !== prevDestRef.current) {
      setDestText('📍 Punto en el mapa');
      setExpanded(true);
      setActiveField(null);
    }
    if (!destination && prevDestRef.current) {
      setDestText('');
      destGeocode.clear();
    }
    prevDestRef.current = destination;
  }, [destination, destGeocode]);

  // Show "Mi ubicación" when geolocation is used as origin
  useEffect(() => {
    if (geoPosition && origin && geoPosition.lat === origin.lat && geoPosition.lng === origin.lng) {
      setOriginText('📍 Mi ubicación');
    }
  }, [geoPosition, origin]);

  // Auto-expand when routes load
  useEffect(() => {
    if (hasRoutes || routeLoading) {
      setExpanded(true);
    }
  }, [hasRoutes, routeLoading]);

  // Auto-expand when station selected
  useEffect(() => {
    if (selectedStation) {
      setExpanded(true);
    }
  }, [selectedStation]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveField(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Search handlers ---
  const handleOriginChange = useCallback((value: string) => {
    setOriginText(value);
    originGeocode.search(value);
  }, [originGeocode]);

  const handleDestChange = useCallback((value: string) => {
    setDestText(value);
    destGeocode.search(value);
  }, [destGeocode]);

  const handleSelectResult = useCallback((result: GeocodingResult, field: ActiveField) => {
    const point: LatLng = { lat: result.lat, lng: result.lon };
    const shortName = result.display_name.split(',').slice(0, 2).join(',');

    if (field === 'origin') {
      originSetBySearch.current = true;
      setOriginText(shortName);
      onSetOrigin(point);
      originGeocode.clear();
      setActiveField('destination');
    } else {
      destSetBySearch.current = true;
      setDestText(shortName);
      onSetDestination(point);
      destGeocode.clear();
      setActiveField(null);
    }
  }, [onSetOrigin, onSetDestination, originGeocode, destGeocode]);

  const handleClearAll = useCallback(() => {
    setOriginText('');
    setDestText('');
    originGeocode.clear();
    destGeocode.clear();
    setActiveField(null);
    onClearRoute();
    setExpanded(false);
  }, [originGeocode, destGeocode, onClearRoute]);

  // --- Touch drag for bottom sheet ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - dragStartY.current;
    if (deltaY > 60) {
      if (!hasContent) {
        setExpanded(false);
        setActiveField(null);
      }
    } else if (deltaY < -60) {
      setExpanded(true);
    }
  }, [hasContent]);

  const handleExpandCollapsed = useCallback(() => {
    setExpanded(true);
    setActiveField('origin');
  }, []);

  const activeResults = activeField === 'origin' ? originGeocode : destGeocode;
  const isCollapsed = !expanded && !activeField;

  return (
    <>
      {/* === DESKTOP SIDE PANEL === */}
      <aside
        className={`flex flex-col w-[360px] xl:w-[400px] border-l border-gray-200 bg-white overflow-hidden transition-all ${isCollapsed ? 'max-h-[56px] md:max-h-none' : ''}`}
        data-testid="unified-panel-desktop"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Collapsed tap-to-expand handle (mobile) */}
        {isCollapsed && (
          <button
            className="md:hidden flex items-center justify-center w-full py-3 text-sm text-gray-500 bg-gray-50 border-b border-gray-100"
            onClick={handleExpandCollapsed}
            data-testid="expand-panel-button"
          >
            <span className="w-10 h-1 rounded-full bg-gray-300" />
          </button>
        )}

        {/* Search section (pinned at top) */}
        <div className="shrink-0 px-4 pt-4 pb-2 border-b border-gray-100">
          <SearchFields
            originText={originText}
            destText={destText}
            activeField={activeField}
            onOriginChange={handleOriginChange}
            onDestChange={handleDestChange}
            onSetActiveField={setActiveField}
            onClearAll={handleClearAll}
            showClear={!!(origin || destination)}
          />

          {/* Autocomplete dropdown */}
          {activeField && (activeResults.results.length > 0 || activeResults.loading) && (
            <AutocompleteDropdown
              results={activeResults.results}
              loading={activeResults.loading}
              onSelect={(result) => handleSelectResult(result, activeField)}
            />
          )}

          {/* Geocoding error */}
          {activeField && activeResults.error && (
            <div className="mt-2 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-100">
              ⚠️ {activeResults.error}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Route loading skeleton */}
          {routeLoading && <RouteSkeleton />}

          {/* Route error with retry */}
          {routeError && !routeLoading && (
            <RouteErrorState error={routeError} onRetry={onRetryRoutes} />
          )}

          {/* Route results */}
          {!routeLoading && !routeError && (
            <RoutePanel
              routes={routes}
              walkingRoute={walkingRoute}
              stations={stations}
              loading={false}
              error={null}
              selectedIndex={selectedRouteIndex}
              onSelectRoute={onSelectRoute}
              onHoverRoute={onHoverRoute}
              bikeType={bikeType}
              stationCount={stations.length}
            />
          )}

          {/* Station info */}
          {selectedStation && (
            <div className="border-t border-gray-100">
              <StationPanel
                station={selectedStation}
                loading={stationsLoading}
                error={stationsError}
                lastUpdated={lastUpdated}
                onClose={onCloseStation}
                preferredBikeType={bikeType}
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}


// --- Sub-components ---

/** Origin/destination search fields */
function SearchFields({
  originText,
  destText,
  activeField,
  onOriginChange,
  onDestChange,
  onSetActiveField,
  onClearAll,
  showClear,
}: {
  originText: string;
  destText: string;
  activeField: ActiveField;
  onOriginChange: (value: string) => void;
  onDestChange: (value: string) => void;
  onSetActiveField: (field: ActiveField) => void;
  onClearAll: () => void;
  showClear: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden" data-testid="search-bar">
      {/* Origin field */}
      <div className="relative px-3">
        <div className="flex items-center gap-2.5">
          <div className="shrink-0">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 block" />
          </div>
          <input
            type="text"
            value={originText}
            onChange={(e) => onOriginChange(e.target.value)}
            onFocus={() => onSetActiveField('origin')}
            placeholder="¿Dónde estás?"
            className={`flex-1 text-sm py-2.5 outline-none bg-transparent text-gray-900 placeholder-gray-400 min-h-[44px] ${
              activeField === 'origin' ? 'font-medium' : ''
            }`}
            aria-label="Origen"
            data-testid="origin-input"
          />
          {showClear && (
            <button
              onClick={onClearAll}
              className="text-gray-400 hover:text-gray-600 shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Borrar ruta"
              data-testid="clear-origin"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center px-3">
        <div className="w-3 flex justify-center shrink-0">
          <div className="w-0.5 h-2 bg-gray-300" />
        </div>
        <div className="flex-1 ml-2.5 border-t border-gray-200" />
      </div>

      {/* Destination field */}
      <div className="relative px-3">
        <div className="flex items-center gap-2.5">
          <div className="shrink-0">
            <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200 block" />
          </div>
          <input
            type="text"
            value={destText}
            onChange={(e) => onDestChange(e.target.value)}
            onFocus={() => onSetActiveField('destination')}
            placeholder="¿A dónde vas?"
            className={`flex-1 text-sm py-2.5 outline-none bg-transparent text-gray-900 placeholder-gray-400 min-h-[44px] ${
              activeField === 'destination' ? 'font-medium' : ''
            }`}
            aria-label="Destino"
            data-testid="dest-input"
          />
        </div>
      </div>
    </div>
  );
}


/** Autocomplete search results dropdown */
function AutocompleteDropdown({
  results,
  loading,
  onSelect,
}: {
  results: GeocodingResult[];
  loading: boolean;
  onSelect: (result: GeocodingResult) => void;
}) {
  return (
    <div
      className="mt-2 bg-white rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto border border-gray-100"
      data-testid="search-results"
    >
      {loading && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
          <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
          Buscando...
        </div>
      )}
      {results.map((result, i) => (
        <button
          key={`${result.lat}-${result.lon}-${i}`}
          onClick={() => onSelect(result)}
          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50 last:border-b-0 min-h-[48px] flex items-center"
          data-testid={`search-result-${i}`}
        >
          <span className="text-gray-400 mr-3">📍</span>
          <span className="text-gray-900 line-clamp-2">{result.display_name}</span>
        </button>
      ))}
    </div>
  );
}


/** Friendly error state with retry button */
function RouteErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="px-4 py-6 text-center" role="alert">
      <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
        <div className="text-3xl mb-3" aria-hidden="true">😵</div>
        <p className="text-sm font-semibold text-red-800 mb-1">
          No pudimos calcular las rutas
        </p>
        <p className="text-xs text-red-500 mb-4">
          {error.includes('fetch')
            ? 'Hubo un problema de conexión. Comprueba tu red e inténtalo de nuevo.'
            : error}
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:bg-red-800 transition-colors min-h-[44px] shadow-sm"
        >
          <span aria-hidden="true">🔄</span>
          Reintentar
        </button>
      </div>
    </div>
  );
}
