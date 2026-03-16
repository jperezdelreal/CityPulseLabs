import { useState, useCallback, useMemo } from 'react';
import MapView from './components/Map/MapView.tsx';
import StationPanel from './components/StationPanel/StationPanel.tsx';
import RoutePanel from './components/RoutePanel/RoutePanel.tsx';
import SearchBar from './components/SearchBar/SearchBar.tsx';
import BikeTypeSelector from './components/shared/BikeTypeSelector.tsx';
import OfflineIndicator from './components/shared/OfflineIndicator.tsx';
import RainWarning from './components/shared/RainWarning.tsx';
import WeatherIndicator from './components/shared/WeatherIndicator.tsx';
import WelcomeCTA from './components/shared/WelcomeCTA.tsx';
import { useStations } from './hooks/useStations.ts';
import { useRoutes } from './hooks/useRoutes.ts';
import { useGeolocation } from './hooks/useGeolocation.ts';
import { useWeather } from './hooks/useWeather.ts';
import { type BikeType, filterByBikeType } from './services/bikeTypeFilter.ts';
import { findNearestStation } from './utils/nearestStation.ts';
import type { StationData, LatLng } from './types/index.ts';

function App() {
  const { stations, loading, error, lastUpdated } = useStations();
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [hoveredRouteIndex, setHoveredRouteIndex] = useState<number | null>(null);
  const [bikeType, setBikeType] = useState<BikeType>('any');

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

  const { routes, walkingRoute, loading: routeLoading, error: routeError } = useRoutes(origin, destination, stations, bikeType);

  const handleClearRoute = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setSelectedRouteIndex(0);
    setHoveredRouteIndex(null);
  }, []);

  const hasActiveContent = !!(selectedStation || origin || destination);

  return (
    <div className="h-screen w-screen flex flex-col">
      <OfflineIndicator lastUpdated={lastUpdated} />
      <RainWarning
        precipitationProbability={weather.precipitationProbability}
        minutesUntilRain={weather.minutesUntilRain}
      />
      <header className="bg-gradient-to-r from-primary-700 to-primary-600 text-white px-3 sm:px-4 py-2.5 flex items-center gap-3 shrink-0 min-h-[52px] shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl" aria-hidden="true">🚲</span>
          <div className="flex flex-col leading-tight">
            <span className="text-base sm:text-lg font-bold tracking-tight whitespace-nowrap">BiciCoruña</span>
            <WeatherIndicator
              precipitationProbability={weather.precipitationProbability}
              minutesUntilRain={weather.minutesUntilRain}
              loading={weather.loading}
            />
          </div>
        </div>
        <div className="ml-auto shrink-0">
          <BikeTypeSelector selectedType={bikeType} onTypeChange={setBikeType} />
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Map — full-screen on mobile */}
        <main className="flex-1 relative min-h-0">
          <MapView
            stations={filteredStations}
            selectedStationId={selectedStation?.station_id}
            onStationSelect={setSelectedStation}
            lastUpdated={lastUpdated}
            origin={origin}
            destination={destination}
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRoute={setSelectedRouteIndex}
            hoveredRouteIndex={hoveredRouteIndex}
            onSetOrigin={setOrigin}
            onSetDestination={setDestination}
            onClearRoute={handleClearRoute}
            preferredBikeType={bikeType}
            geoPosition={geo.position}
            geoAccuracy={geo.accuracy}
            geoLoading={geo.loading}
            geoError={geo.error}
            geoSupported={geo.supported}
            geoPermissionDenied={geo.permissionDenied}
            nearestStation={nearestStation}
            onRequestPosition={geo.requestPosition}
          />
          <SearchBar
            origin={origin}
            destination={destination}
            onSetOrigin={setOrigin}
            onSetDestination={setDestination}
            onClearRoute={handleClearRoute}
          />
          {!hasActiveContent && !loading && stations.length > 0 && (
            <WelcomeCTA stationCount={stations.length} />
          )}
        </main>

        {/* Sidebar — bottom sheet on mobile, side panel on desktop */}
        <aside
          className={`
            ${hasActiveContent ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
            ${hasActiveContent ? 'block' : 'hidden lg:block'}
            fixed bottom-0 left-0 right-0 lg:static
            lg:w-[340px] xl:w-[380px] lg:border-l lg:border-gray-200
            panel-mobile lg:panel-mobile-reset
            bg-white overflow-y-auto
            max-h-[70vh] lg:max-h-full
            transition-all duration-300 ease-out
          `}
          style={hasActiveContent ? { zIndex: 40 } : undefined}
        >
          {/* Mobile drag handle */}
          <div className="flex justify-center pt-3 pb-2 lg:hidden" aria-hidden="true">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Clear route button — visible when route is active */}
          {(origin || destination) && (
            <div className="px-4 pb-2 lg:pt-2">
              <button
                onClick={handleClearRoute}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 text-sm font-medium transition-colors min-h-[44px]"
                data-testid="clear-route-panel"
              >
                <span aria-hidden="true">✕</span>
                Borrar ruta
              </button>
            </div>
          )}

          <RoutePanel
            routes={routes}
            walkingRoute={walkingRoute}
            stations={stations}
            loading={routeLoading}
            error={routeError}
            selectedIndex={selectedRouteIndex}
            onSelectRoute={setSelectedRouteIndex}
            onHoverRoute={setHoveredRouteIndex}
            stationCount={stations.length}
          />
          <StationPanel
            station={selectedStation}
            loading={loading}
            error={error}
            lastUpdated={lastUpdated}
            onClose={() => setSelectedStation(null)}
            preferredBikeType={bikeType}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;