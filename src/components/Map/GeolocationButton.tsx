import { useMap } from 'react-leaflet';
import type { LatLng } from '../../types/index.ts';
import type { NearestStationResult } from '../../utils/nearestStation.ts';

interface GeolocationButtonProps {
  position: LatLng | null;
  loading: boolean;
  error: string | null;
  supported: boolean;
  permissionDenied: boolean;
  nearestStation: NearestStationResult | null;
  onRequestPosition: () => void;
  onSetOrigin: (point: LatLng) => void;
}

function NearestStationInfo({
  nearest,
  onSetOrigin,
  userPosition,
}: {
  nearest: NearestStationResult;
  onSetOrigin: (point: LatLng) => void;
  userPosition: LatLng;
}) {
  const map = useMap();

  const handleGoToStation = () => {
    onSetOrigin(userPosition);
    map.flyTo([nearest.station.lat, nearest.station.lon], 16, { duration: 0.8 });
  };

  return (
    <button
      onClick={handleGoToStation}
      className="w-full text-left bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-3 py-2 rounded-lg transition-colors text-xs"
    >
      <div className="font-medium text-blue-800">
        📍 Estación más cercana
      </div>
      <div className="text-blue-700">
        {nearest.station.name} — {nearest.station.num_bikes_available} bicis
      </div>
      <div className="text-blue-600">
        {nearest.distanceMeters < 1000
          ? `${nearest.distanceMeters} m`
          : `${(nearest.distanceMeters / 1000).toFixed(1)} km`}
        {' · '}
        {nearest.walkingMinutes <= 0 ? '<1' : nearest.walkingMinutes} min caminando
      </div>
    </button>
  );
}

function GeolocationButtonInner({
  position,
  loading,
  error,
  supported,
  permissionDenied,
  nearestStation,
  onRequestPosition,
  onSetOrigin,
}: GeolocationButtonProps) {
  const map = useMap();

  if (!supported) return null;

  const handleClick = () => {
    if (position) {
      map.flyTo([position.lat, position.lng], 16, { duration: 0.8 });
      onSetOrigin(position);
    } else {
      onRequestPosition();
    }
  };

  return (
    <div className="absolute bottom-24 sm:bottom-6 left-2 z-[1000] flex flex-col gap-2 max-w-[200px]">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`
          bg-white/95 backdrop-blur-sm px-3 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-colors min-h-[44px] flex items-center gap-2
          ${loading ? 'text-gray-400 cursor-wait' : 'text-blue-600 hover:bg-blue-50 active:bg-blue-100'}
          ${permissionDenied ? 'text-gray-400' : ''}
        `}
        title={permissionDenied ? 'Permiso de ubicación denegado' : 'Usar mi ubicación como origen'}
      >
        {loading ? (
          <>
            <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            Localizando…
          </>
        ) : (
          <>📍 Mi ubicación</>
        )}
      </button>

      {error && !permissionDenied && (
        <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg shadow">
          {error}
        </div>
      )}

      {position && nearestStation && (
        <NearestStationInfo
          nearest={nearestStation}
          onSetOrigin={onSetOrigin}
          userPosition={position}
        />
      )}
    </div>
  );
}

export default function GeolocationButton(props: GeolocationButtonProps) {
  return <GeolocationButtonInner {...props} />;
}
