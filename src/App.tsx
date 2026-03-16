import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import MapView from './components/Map/MapView.tsx';
import UnifiedPanel from './components/UnifiedPanel/UnifiedPanel.tsx';
import MobileSearchBar from './components/SearchBar/MobileSearchBar.tsx';
import MobileRoutePanel from './components/RoutePanel/MobileRoutePanel.tsx';
import BikeTypeSelector from './components/shared/BikeTypeSelector.tsx';
import OfflineIndicator from './components/shared/OfflineIndicator.tsx';
import RainWarning from './components/shared/RainWarning.tsx';
import WeatherIndicator from './components/shared/WeatherIndicator.tsx';
import WelcomeCTA from './components/shared/WelcomeCTA.tsx';
import { useStations } from './hooks/useStations.ts';
import { useRoutes } from './hooks/useRoutes.ts';
import { useGeolocation } from './hooks/useGeolocation.ts';
import { useWeather } from './hooks/useWeather.ts';
import { useIsMobile } from './hooks/useIsMobile.ts';
import { type BikeType, filterByBikeType } from './services/bikeTypeFilter.ts';
import { findNearestStation } from './utils/nearestStation.ts';
import type { StationData, LatLng } from './types/index.ts';

function App() {
  const isMobile = useIsMobile();
  const { stations, loading, error, lastUpdated } = useStations();
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [hoveredRouteIndex, setHoveredRouteIndex] = useState<number | null>(null);
  const [bikeType, setBikeType] = useState<BikeType>('any');

  // Mobile search state
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [mobileActiveField, setMobileActiveField] = useState<'origin' | 'destination' | null>(null);
  const originSetBySearch = useRef(false);
  const destSetBySearch = useRef(false);
  const prevOriginRef = useRef<LatLng | null>(origin);
  const prevDestRef = useRef<LatLng | null>(destination);

  const geo = useGeolocation();
  const weather = useWeather();

  const nearestStation = useMemo(
    () => (geo.position ? findNearestStation(geo.position, stations) : null),
    [geo.position, stations],
  );

  const filteredStations = useMemo(
    () => filterByBikeType(stations, bikeType),
    [stations, bikeType],
  );

  const { routes, walkingRoute, loading: routeLoading, error: routeError, retry: retryRoutes } = useRoutes(origin, destination, stations, bikeType);

  const handleClearRoute = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setSelectedRouteIndex(0);
    setHoveredRouteIndex(null);
    setOriginText('');
    setDestText('');
    setMobileActiveField(null);
  }, []);

  // Detect external origin change (map click or geolocation) for mobile text sync
  useEffect(() => {
    if (originSetBySearch.current) {
      originSetBySearch.current = false;
      prevOriginRef.current = origin;
      return;
    }
    if (origin && origin !== prevOriginRef.current) {
      setOriginText('📍 Punto en el mapa');
    }
    if (!origin && prevOriginRef.current) {
      setOriginText('');
    }
    prevOriginRef.current = origin;
  }, [origin]);

  useEffect(() => {
    if (destSetBySearch.current) {
      destSetBySearch.current = false;
      prevDestRef.current = destination;
      return;
    }
    if (destination && destination !== prevDestRef.current) {
      setDestText('📍 Punto en el mapa');
    }
    if (!destination && prevDestRef.current) {
      setDestText('');
    }
    prevDestRef.current = destination;
  }, [destination]);

  useEffect(() => {
    if (geo.position && origin && geo.position.lat === origin.lat && geo.position.lng === origin.lng) {
      setOriginText('📍 Mi ubicación');
    }
  }, [geo.position, origin]);

  const handleMobileSelectOrigin = useCallback((point: LatLng, label: string) => {
    originSetBySearch.current = true;
    setOriginText(label);
    setOrigin(point);
  }, []);

  const handleMobileSelectDest = useCallback((point: LatLng, label: string) => {
    destSetBySearch.current = true;
    setDestText(label);
    setDestination(point);
  }, []);

  const hasActiveContent = !!(origin || destination);

  const mapProps = {
    stations: filteredStations,
    selectedStationId: selectedStation?.station_id,
    onStationSelect: setSelectedStation,
    lastUpdated,
    origin,
    destination,
    routes,
    selectedRouteIndex,
    onSelectRoute: setSelectedRouteIndex,
    hoveredRouteIndex,
    onSetOrigin: setOrigin,
    onSetDestination: setDestination,
    onClearRoute: handleClearRoute,
    preferredBikeType: bikeType,
    geoPosition: geo.position,
    geoAccuracy: geo.accuracy,
    geoLoading: geo.loading,
    geoError: geo.error,
    geoSupported: geo.supported,
    geoPermissionDenied: geo.permissionDenied,
    nearestStation,
    onRequestPosition: geo.requestPosition,
  };

  // ========================================
  // MOBILE — completely separate experience
  // ========================================
  if (isMobile) {
    return (
      <div className="h-screen w-screen flex flex-col relative" data-testid="mobile-app">
        <OfflineIndicator lastUpdated={lastUpdated} />
        <RainWarning
          precipitationProbability={weather.precipitationProbability}
          minutesUntilRain={weather.minutesUntilRain}
        />

        {/* Full-screen map */}
        <main className="flex-1 relative min-h-0 z-[1]">
          <MapView {...mapProps} />
        </main>

        {/* Search bar — floating at top over map */}
        <div className="absolute top-0 left-0 right-0 z-[40] pt-4 safe-area-top">
          <MobileSearchBar
            originText={originText}
            destText={destText}
            activeField={mobileActiveField}
            onOriginTextChange={setOriginText}
            onDestTextChange={setDestText}
            onSetActiveField={setMobileActiveField}
            onSelectOrigin={handleMobileSelectOrigin}
            onSelectDestination={handleMobileSelectDest}
            onClearAll={handleClearRoute}
            showClear={hasActiveContent}
          />
        </div>

        {/* Welcome CTA — between search and bottom sheet */}
        {!hasActiveContent && !loading && !routeLoading && stations.length > 0 && !mobileActiveField && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[30] w-[calc(100%-2rem)] max-w-sm">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl px-5 py-4 text-center border border-gray-100">
              <div className="text-2xl mb-1" aria-hidden="true">👆</div>
              <p className="text-sm font-semibold text-gray-800">
                Toca el mapa o busca arriba
              </p>
              <p className="text-xs text-gray-500 mt-1">
                🚲 {stations.length} estaciones disponibles
              </p>
            </div>
          </div>
        )}

        {/* Bottom sheet — route results + station info */}
        <MobileRoutePanel
          routes={routes}
          walkingRoute={walkingRoute}
          stations={stations}
          routeLoading={routeLoading}
          routeError={routeError}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={setSelectedRouteIndex}
          onRetryRoutes={retryRoutes}
          bikeType={bikeType}
          selectedStation={selectedStation}
          stationsLoading={loading}
          stationsError={error}
          lastUpdated={lastUpdated}
          onCloseStation={() => setSelectedStation(null)}
        />

        {/* BikeTypeSelector hidden on mobile — not useful on small screens */}
      </div>
    );
  }

  // ========================================
  // DESKTOP — side panel layout
  // ========================================
  return (
    <div className="h-screen w-screen flex flex-col" data-testid="desktop-app">
      <OfflineIndicator lastUpdated={lastUpdated} />
      <RainWarning
        precipitationProbability={weather.precipitationProbability}
        minutesUntilRain={weather.minutesUntilRain}
      />

      {/* Desktop header — clean, compact */}
      <header className="flex bg-white border-b border-gray-200 px-4 py-2 items-center gap-3 shrink-0 min-h-[48px]">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🚲</span>
          <span className="text-base font-bold tracking-tight text-gray-900 whitespace-nowrap">BiciCoruña</span>
        </div>
        <WeatherIndicator
          precipitationProbability={weather.precipitationProbability}
          minutesUntilRain={weather.minutesUntilRain}
          loading={weather.loading}
        />
        <div className="ml-auto shrink-0">
          <BikeTypeSelector selectedType={bikeType} onTypeChange={setBikeType} />
        </div>
      </header>

      <div className="flex-1 flex flex-row relative overflow-hidden">
        {/* Map */}
        <main className="flex-1 relative min-h-0">
          <MapView {...mapProps} />
          {!hasActiveContent && !loading && stations.length > 0 && (
            <WelcomeCTA stationCount={stations.length} />
          )}
        </main>

        {/* Desktop side panel */}
        <UnifiedPanel
          origin={origin}
          destination={destination}
          onSetOrigin={setOrigin}
          onSetDestination={setDestination}
          onClearRoute={handleClearRoute}
          routes={routes}
          walkingRoute={walkingRoute}
          stations={stations}
          routeLoading={routeLoading}
          routeError={routeError}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={setSelectedRouteIndex}
          onHoverRoute={setHoveredRouteIndex}
          onRetryRoutes={retryRoutes}
          selectedStation={selectedStation}
          stationsLoading={loading}
          stationsError={error}
          lastUpdated={lastUpdated}
          onCloseStation={() => setSelectedStation(null)}
          bikeType={bikeType}
          geoPosition={geo.position}
        />
      </div>
    </div>
  );
}

export default App;