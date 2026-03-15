import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { StationData, LatLng, MultiModalRoute } from '../../types/index.ts';
import StationMarkers from './StationMarkers.tsx';
import LiveIndicator from './LiveIndicator.tsx';
import LocationPicker from './LocationPicker.tsx';
import RouteDisplay from './RouteDisplay.tsx';

const A_CORUNA_CENTER = { lat: 43.3623, lng: -8.4115 };
const DEFAULT_ZOOM = 14;

interface MapViewProps {
  stations: StationData[];
  selectedStationId?: string | null;
  onStationSelect?: (station: StationData) => void;
  lastUpdated: Date | null;
  origin: LatLng | null;
  destination: LatLng | null;
  selectedRoute: MultiModalRoute | null;
  onSetOrigin: (point: LatLng) => void;
  onSetDestination: (point: LatLng) => void;
  onClearRoute: () => void;
}

export default function MapView({
  stations,
  selectedStationId,
  onStationSelect,
  lastUpdated,
  origin,
  destination,
  selectedRoute,
  onSetOrigin,
  onSetDestination,
  onClearRoute,
}: MapViewProps) {
  return (
    <div className="relative h-full w-full">
      <LiveIndicator lastUpdated={lastUpdated} />
      <MapContainer
        center={A_CORUNA_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="h-full w-full"
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <StationMarkers
          stations={stations}
          selectedStationId={selectedStationId}
          onStationSelect={onStationSelect}
        />
        <LocationPicker
          origin={origin}
          destination={destination}
          onSetOrigin={onSetOrigin}
          onSetDestination={onSetDestination}
          onClear={onClearRoute}
        />
        <RouteDisplay route={selectedRoute} />
      </MapContainer>
    </div>
  );
}
