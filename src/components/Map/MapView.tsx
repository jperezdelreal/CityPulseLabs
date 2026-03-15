import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const A_CORUNA_CENTER = { lat: 43.3623, lng: -8.4115 };
const DEFAULT_ZOOM = 14;

export default function MapView() {
  return (
    <MapContainer
      center={A_CORUNA_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}
