import { Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import type { MultiModalRoute } from '../../types/index.ts';

interface RouteDisplayProps {
  route: MultiModalRoute | null;
}

export default function RouteDisplay({ route }: RouteDisplayProps) {
  if (!route) return null;

  return (
    <>
      {/* Walk to pickup - dashed blue */}
      <Polyline
        positions={route.walk_to_pickup.geometry}
        pathOptions={{ color: '#3B82F6', weight: 4, dashArray: '8 6', opacity: 0.8 }}
      />

      {/* Bike segment - solid green */}
      <Polyline
        positions={route.bike_segment.geometry}
        pathOptions={{ color: '#22C55E', weight: 5, opacity: 0.9 }}
      />

      {/* Walk to destination - dashed blue */}
      <Polyline
        positions={route.walk_to_destination.geometry}
        pathOptions={{ color: '#3B82F6', weight: 4, dashArray: '8 6', opacity: 0.8 }}
      />

      {/* Pickup station marker */}
      <CircleMarker
        center={[route.pickup_station.lat, route.pickup_station.lon]}
        radius={8}
        pathOptions={{ color: '#22C55E', fillColor: '#22C55E', fillOpacity: 0.9, weight: 2 }}
      >
        <Tooltip permanent direction="top" offset={[0, -10]}>
          {route.pickup_station.name}
        </Tooltip>
      </CircleMarker>

      {/* Dropoff station marker */}
      <CircleMarker
        center={[route.dropoff_station.lat, route.dropoff_station.lon]}
        radius={8}
        pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.9, weight: 2 }}
      >
        <Tooltip permanent direction="top" offset={[0, -10]}>
          {route.dropoff_station.name}
        </Tooltip>
      </CircleMarker>
    </>
  );
}