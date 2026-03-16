import { useEffect, useMemo } from 'react';
import { Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MultiModalRoute, LatLng } from '../../types/index.ts';

interface RouteDisplayProps {
  routes: MultiModalRoute[];
  selectedIndex: number;
  onSelectRoute: (index: number) => void;
  origin: LatLng | null;
  destination: LatLng | null;
  hoveredIndex?: number | null;
}

/** Auto-zooms map to fit all routes + origin/destination */
function MapAutoZoom({
  routes,
  origin,
  destination,
}: {
  routes: MultiModalRoute[];
  origin: LatLng | null;
  destination: LatLng | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routes.length === 0) return;

    const allPoints: [number, number][] = [];

    if (origin) allPoints.push([origin.lat, origin.lng]);
    if (destination) allPoints.push([destination.lat, destination.lng]);

    for (const route of routes) {
      allPoints.push(...route.walk_to_pickup.geometry);
      allPoints.push(...route.bike_segment.geometry);
      allPoints.push(...route.walk_to_destination.geometry);
    }

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [routes, origin, destination, map]);

  return null;
}

/** A single route's polylines (alternative: gray, selected: colored) */
function RoutePolylines({
  route,
  isSelected,
  isHovered,
  index,
  onSelect,
}: {
  route: MultiModalRoute;
  isSelected: boolean;
  isHovered: boolean;
  index: number;
  onSelect: (index: number) => void;
}) {
  const highlighted = isSelected || isHovered;

  const walkColor = highlighted ? '#0066CC' : '#9CA3AF';
  const bikeColor = highlighted ? '#0D9A5E' : '#9CA3AF';
  const walkWeight = highlighted ? 4 : 3;
  const bikeWeight = highlighted ? 5 : 3;
  const opacity = isSelected ? 0.9 : isHovered ? 0.7 : 0.4;

  const eventHandlers = useMemo(
    () => ({ click: () => onSelect(index) }),
    [index, onSelect],
  );

  return (
    <>
      <Polyline
        positions={route.walk_to_pickup.geometry}
        pathOptions={{ color: walkColor, weight: walkWeight, dashArray: '8 6', opacity }}
        eventHandlers={eventHandlers}
      />
      <Polyline
        positions={route.bike_segment.geometry}
        pathOptions={{ color: bikeColor, weight: bikeWeight, opacity }}
        eventHandlers={eventHandlers}
      />
      <Polyline
        positions={route.walk_to_destination.geometry}
        pathOptions={{ color: walkColor, weight: walkWeight, dashArray: '8 6', opacity }}
        eventHandlers={eventHandlers}
      />
    </>
  );
}

export default function RouteDisplay({
  routes,
  selectedIndex,
  onSelectRoute,
  origin,
  destination,
  hoveredIndex = null,
}: RouteDisplayProps) {
  if (routes.length === 0) return null;

  const selectedRoute = routes[selectedIndex] ?? null;

  return (
    <>
      <MapAutoZoom routes={routes} origin={origin} destination={destination} />

      {/* Alternative routes first (rendered below selected) */}
      {routes.map((route, i) =>
        i !== selectedIndex ? (
          <RoutePolylines
            key={`alt-${route.pickup_station.station_id}-${route.dropoff_station.station_id}`}
            route={route}
            isSelected={false}
            isHovered={hoveredIndex === i}
            index={i}
            onSelect={onSelectRoute}
          />
        ) : null,
      )}

      {/* Selected route on top */}
      {selectedRoute && (
        <RoutePolylines
          key={`sel-${selectedRoute.pickup_station.station_id}-${selectedRoute.dropoff_station.station_id}`}
          route={selectedRoute}
          isSelected={true}
          isHovered={false}
          index={selectedIndex}
          onSelect={onSelectRoute}
        />
      )}

      {/* Station markers for selected route */}
      {selectedRoute && (
        <>
          <CircleMarker
            center={[selectedRoute.pickup_station.lat, selectedRoute.pickup_station.lon]}
            radius={9}
            pathOptions={{ color: '#0D9A5E', fillColor: '#22C55E', fillOpacity: 0.9, weight: 2 }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              {selectedRoute.pickup_station.name}
            </Tooltip>
          </CircleMarker>
          <CircleMarker
            center={[selectedRoute.dropoff_station.lat, selectedRoute.dropoff_station.lon]}
            radius={9}
            pathOptions={{ color: '#FFFFFF', fillColor: '#EF4444', fillOpacity: 0.95, weight: 3 }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              {selectedRoute.dropoff_station.name}
            </Tooltip>
          </CircleMarker>
        </>
      )}
    </>
  );
}