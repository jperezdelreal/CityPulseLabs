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
      className="w-full text-left bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-3 py-3 rounded-xl transition-colors text-xs min-h-[44px]"
    >
      <div className="font-medium text-blue-800">
        📍 Estación más cercana
      </div>
      <div className="text-blue-700 mt-0.5">
        {nearest.station.name} — {nearest.station.num_bikes_available} bicis
      </div>
      <div className="text-blue-600 mt-0.5">
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
    <div className="absolute bottom-28 sm:bottom-6 right-3 z-[1000] flex flex-col items-end gap-2 max-w-[220px]">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`
          bg-white shadow-lg px-4 py-3 rounded-2xl text-sm font-semibold transition-all min-h-[52px] min-w-[52px] flex items-center gap-2.5
          ${loading ? 'text-gray-400 cursor-wait' : 'text-blue-600 hover:bg-blue-50 hover:shadow-xl active:bg-blue-100 active:scale-95'}
          ${permissionDenied ? 'text-gray-400 opacity-60' : ''}
        `}
        title={permissionDenied ? 'Permiso de ubicación denegado' : 'Usar mi ubicación como origen'}
      >
        {loading ? (
          <>
            <span className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full shrink-0" />
            <span>Localizando…</span>
          </>
        ) : (
          <>
            <span className="text-lg">📍</span>
            <span>Mi ubicación</span>
          </>
        )}
      </button>

      {error && !permissionDenied && (
        <div className="bg-red-50 text-red-600 text-xs px-3 py-2.5 rounded-xl shadow border border-red-100">
          ⚠️ {error}
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
