import { useState, useCallback } from 'react';
import MapView from './components/Map/MapView.tsx';
import StationPanel from './components/StationPanel/StationPanel.tsx';
import RoutePanel from './components/RoutePanel/RoutePanel.tsx';
import { useStations } from './hooks/useStations.ts';
import { useRoutes } from './hooks/useRoutes.ts';
import type { StationData, LatLng } from './types/index.ts';

function App() {
  const { stations, loading, error, lastUpdated } = useStations();
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const { routes, walkingRoute, loading: routeLoading, error: routeError } = useRoutes(origin, destination, stations);

  const handleClearRoute = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setSelectedRouteIndex(0);
  }, []);

  const selectedRoute = routes[selectedRouteIndex] ?? null;

  return (
    <div className="h-screen w-screen flex flex-col">
      <header className="bg-blue-700 text-white px-4 py-2 flex items-center gap-2 shrink-0">
        <span className="text-xl font-bold">🚲 BiciCoruña</span>
        <span className="text-sm opacity-80">Smart bike-sharing route planner</span>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Map */}
        <main className="flex-1 relative">
          <MapView
            stations={stations}
            selectedStationId={selectedStation?.station_id}
            onStationSelect={setSelectedStation}
            lastUpdated={lastUpdated}
            origin={origin}
            destination={destination}
            selectedRoute={selectedRoute}
            onSetOrigin={setOrigin}
            onSetDestination={setDestination}
            onClearRoute={handleClearRoute}
          />
        </main>

        {/* Sidebar */}
        <aside
          className={`
            ${selectedStation || origin || destination ? 'block' : 'hidden lg:block'}
            lg:w-80 lg:border-l lg:border-gray-200 lg:relative
            ${selectedStation ? 'panel-mobile lg:panel-mobile-reset' : ''}
            bg-white overflow-y-auto
          `}
          style={selectedStation ? { zIndex: 40 } : undefined}
        >
          <RoutePanel
            routes={routes}
            walkingRoute={walkingRoute}
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
          />
        </aside>
      </div>
    </div>
  );
}

export default App;
