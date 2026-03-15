import { useState, useCallback, useMemo } from 'react';
import MapView from './components/Map/MapView.tsx';
import StationPanel from './components/StationPanel/StationPanel.tsx';
import RoutePanel from './components/RoutePanel/RoutePanel.tsx';
import BikeTypeSelector from './components/shared/BikeTypeSelector.tsx';
import OfflineIndicator from './components/shared/OfflineIndicator.tsx';
import { useStations } from './hooks/useStations.ts';
import { useRoutes } from './hooks/useRoutes.ts';
import { type BikeType, filterByBikeType } from './services/bikeTypeFilter.ts';
import type { StationData, LatLng } from './types/index.ts';

function App() {
  const { stations, loading, error, lastUpdated } = useStations();
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [bikeType, setBikeType] = useState<BikeType>('any');

  const filteredStations = useMemo(
    () => filterByBikeType(stations, bikeType),
    [stations, bikeType],
  );

  const { routes, walkingRoute, loading: routeLoading, error: routeError } = useRoutes(origin, destination, stations, bikeType);

  const handleClearRoute = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setSelectedRouteIndex(0);
  }, []);

  const selectedRoute = routes[selectedRouteIndex] ?? null;

  return (
    <div className="h-screen w-screen flex flex-col">
      <OfflineIndicator lastUpdated={lastUpdated} />
      <header className="bg-primary-700 text-white px-3 sm:px-4 py-2 flex items-center gap-2 shrink-0 min-h-[48px]">
        <span className="text-lg sm:text-xl font-bold whitespace-nowrap">🚲 BiciCoruña</span>
        <span className="text-xs sm:text-sm opacity-80 hidden sm:inline truncate">Planificador inteligente de rutas en bici</span>
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
            selectedRoute={selectedRoute}
            onSetOrigin={setOrigin}
            onSetDestination={setDestination}
            onClearRoute={handleClearRoute}
            preferredBikeType={bikeType}
            loading={loading}
            error={error}
          />
        </main>

        {/* Sidebar — bottom sheet on mobile, side panel on desktop */}
        <aside
          className={`
            ${selectedStation || origin || destination ? 'block' : 'hidden lg:block'}
            fixed bottom-0 left-0 right-0 lg:static
            lg:w-80 lg:border-l lg:border-gray-200
            panel-mobile lg:panel-mobile-reset
            bg-white overflow-y-auto
            max-h-[70vh] lg:max-h-full
            transition-transform duration-300
          `}
          style={selectedStation || origin || destination ? { zIndex: 40 } : undefined}
        >
          {/* Mobile drag handle */}
          <div className="flex justify-center py-2 lg:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <RoutePanel
            routes={routes}
            walkingRoute={walkingRoute}
            stations={stations}
            loading={routeLoading}
            error={routeError}
            selectedIndex={selectedRouteIndex}
            onSelectRoute={setSelectedRouteIndex}
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