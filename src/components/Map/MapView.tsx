import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { StationData } from '../../types/index.ts';
import StationMarkers from './StationMarkers.tsx';
import LiveIndicator from './LiveIndicator.tsx';

const A_CORUNA_CENTER = { lat: 43.3623, lng: -8.4115 };
const DEFAULT_ZOOM = 14;

interface MapViewProps {
  stations: StationData[];
  selectedStationId?: string | null;
  onStationSelect?: (station: StationData) => void;
  lastUpdated: Date | null;
}

export default function MapView({
  stations,
  selectedStationId,
  onStationSelect,
  lastUpdated,
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
      </MapContainer>
    </div>
  );
}