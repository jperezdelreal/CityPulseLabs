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
    ? 'Haz clic en el mapa para marcar el origen'
    : !destination
      ? 'Haz clic en el mapa para marcar el destino'
      : null;

  return (
    <>
      <MapClickHandler origin={origin} onSetOrigin={onSetOrigin} onSetDestination={onSetDestination} />

      {instructionText && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-lg shadow-md text-sm font-medium">
          {instructionText}
        </div>
      )}

      {(origin || destination) && (
        <div className="absolute top-2 right-2 z-[1000]">
          <button
            onClick={onClear}
            className="bg-white px-3 py-1.5 rounded-lg shadow-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Borrar ruta
          </button>
        </div>
      )}

      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
          <Popup>Origen</Popup>
        </Marker>
      )}

      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Popup>Destino</Popup>
        </Marker>
      )}
    </>
  );
}