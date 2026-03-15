import { Popup } from 'react-leaflet';
import type { StationData } from '../../types/index.ts';

interface StationPopupProps {
  station: StationData;
}

function formatLastReported(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return seconds + 's ago';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  return Math.floor(seconds / 3600) + 'h ago';
}

export default function StationPopup({ station }: StationPopupProps) {
  const fitCount =
    station.vehicle_types_available.find((v) => v.vehicle_type_id === 'FIT')?.count ?? 0;
  const efitCount =
    station.vehicle_types_available.find((v) => v.vehicle_type_id === 'EFIT')?.count ?? 0;
  const hasVehicleTypes = station.vehicle_types_available.length > 0;

  return (
    <Popup>
      <div className="min-w-[180px]" data-testid="station-popup">
        <h3 className="font-semibold text-sm mb-2 text-gray-900">{station.name}</h3>

        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Bikes</span>
            <span className="font-medium">
              {station.num_bikes_available}/{station.capacity} bikes
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Docks</span>
            <span className="font-medium">
              {station.num_docks_available}/{station.capacity} docks
            </span>
          </div>

          {hasVehicleTypes && (
            <div className="pt-1 border-t border-gray-200 text-gray-500">
              {fitCount > 0 && <span>{fitCount} FIT</span>}
              {fitCount > 0 && efitCount > 0 && <span>, </span>}
              {efitCount > 0 && <span>{efitCount} EFIT</span>}
            </div>
          )}

          <div className="pt-1 text-gray-400">
            Updated {formatLastReported(station.last_reported)}
          </div>
        </div>
      </div>
    </Popup>
  );
}
