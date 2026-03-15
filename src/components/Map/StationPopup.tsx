import { Popup } from 'react-leaflet';
import type { StationData } from '../../types/index.ts';
import type { BikeType } from '../../services/bikeTypeFilter.ts';
import ConfidenceBadge from '../shared/ConfidenceBadge.tsx';
import {
  calculatePickupConfidence,
  calculateDropoffConfidence,
} from '../../services/confidenceScore.ts';

interface StationPopupProps {
  station: StationData;
  preferredBikeType?: BikeType;
}

function formatLastReported(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return seconds + 's ago';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  return Math.floor(seconds / 3600) + 'h ago';
}

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  FIT: { icon: '🔧', label: 'FIT' },
  EFIT: { icon: '⚡', label: 'EFIT' },
  BOOST: { icon: '🚀', label: 'BOOST' },
};

export default function StationPopup({ station, preferredBikeType = 'any' }: StationPopupProps) {
  const hasVehicleTypes = station.vehicle_types_available.length > 0;

  const pickupConf = calculatePickupConfidence(station, 0);
  const dropoffConf = calculateDropoffConfidence(station, 0);

  return (
    <Popup>
      <div className="min-w-[180px]" data-testid="station-popup">
        <h3 className="font-semibold text-sm mb-2 text-gray-900">{station.name}</h3>

        <div className="text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Bikes</span>
            <span className="flex items-center gap-1 font-medium">
              {station.num_bikes_available}/{station.capacity}
              <ConfidenceBadge confidence={pickupConf} compact />
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Docks</span>
            <span className="flex items-center gap-1 font-medium">
              {station.num_docks_available}/{station.capacity}
              <ConfidenceBadge confidence={dropoffConf} compact />
            </span>
          </div>

          {hasVehicleTypes && (
            <div className="pt-1 border-t border-gray-200 space-y-0.5">
              {station.vehicle_types_available.map((vt) => {
                const meta = TYPE_LABELS[vt.vehicle_type_id];
                if (!meta) return null;
                const isPreferred =
                  preferredBikeType !== 'any' && vt.vehicle_type_id === preferredBikeType;
                return (
                  <div
                    key={vt.vehicle_type_id}
                    className={`flex justify-between items-center ${
                      isPreferred ? 'font-semibold text-blue-700' : 'text-gray-500'
                    }`}
                  >
                    <span>
                      {meta.icon} {meta.label}
                    </span>
                    <span>{vt.count}</span>
                  </div>
                );
              })}
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