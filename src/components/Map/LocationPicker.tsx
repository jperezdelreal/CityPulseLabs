import { useMapEvents, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { LatLng } from '../../types/index.ts';

interface LocationPickerProps {
  origin: LatLng | null;
  destination: LatLng | null;
  onSetOrigin: (point: LatLng) => void;
  onSetDestination: (point: LatLng) => void;
  onClear: () => void;
}

const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickHandler({
  origin,
  onSetOrigin,
  onSetDestination,
}: Pick<LocationPickerProps, 'origin' | 'onSetOrigin' | 'onSetDestination'>) {
  useMapEvents({
    click(e) {
      const point: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (!origin) {
        onSetOrigin(point);
      } else {
        onSetDestination(point);
      }
    },
  });
  return null;
}

export default function LocationPicker({
  origin,
  destination,
  onSetOrigin,
  onSetDestination,
  onClear,
}: LocationPickerProps) {
  const instructionText = !origin
    ? '📍 Toca el mapa para elegir tu origen'
    : !destination
      ? '🏁 Toca de nuevo para elegir el destino'
      : null;

  return (
    <>
      <MapClickHandler origin={origin} onSetOrigin={onSetOrigin} onSetDestination={onSetDestination} />

      {instructionText && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
          <div className="bg-gray-900/80 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium whitespace-nowrap">
            {instructionText}
          </div>
        </div>
      )}

      {(origin || destination) && (
        <div className="absolute top-3 right-3 z-[1000]">
          <button
            onClick={onClear}
            className="bg-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-red-600 hover:bg-red-50 hover:shadow-xl active:bg-red-100 active:scale-95 transition-all min-h-[44px] flex items-center gap-1.5"
          >
            <span aria-hidden="true">✕</span>
            Borrar ruta
          </button>
        </div>
      )}

      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
          <Popup>
            <span className="font-medium">📍 Origen</span>
          </Popup>
        </Marker>
      )}

      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Popup>
            <span className="font-medium">🏁 Destino</span>
          </Popup>
        </Marker>
      )}
    </>
  );
}