import { CircleMarker, Circle } from 'react-leaflet';
import type { LatLng } from '../../types/index.ts';

interface UserLocationMarkerProps {
  position: LatLng;
  accuracy: number | null;
}

export default function UserLocationMarker({ position, accuracy }: UserLocationMarkerProps) {
  return (
    <>
      {/* Accuracy circle */}
      {accuracy && accuracy > 0 && (
        <Circle
          center={[position.lat, position.lng]}
          radius={accuracy}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.08,
            weight: 1,
            opacity: 0.3,
          }}
        />
      )}

      {/* Outer pulse ring */}
      <CircleMarker
        center={[position.lat, position.lng]}
        radius={14}
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 0,
          className: 'animate-ping',
        }}
      />

      {/* Blue dot */}
      <CircleMarker
        center={[position.lat, position.lng]}
        radius={7}
        pathOptions={{
          color: '#ffffff',
          fillColor: '#3b82f6',
          fillOpacity: 1,
          weight: 3,
        }}
      />
    </>
  );
}
