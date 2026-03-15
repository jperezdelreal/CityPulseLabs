import type { StationData } from '../../types/index.ts';
import { getAvailabilityLevel } from '../../utils/stationColors.ts';
import { colors } from '../../styles/tokens.ts';

interface StationPanelProps {
  station: StationData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onClose?: () => void;
}

const levelLabels: Record<string, string> = {
  good: 'Good availability',
  limited: 'Limited availability',
  empty: 'Few or no bikes',
  offline: 'Station offline',
};

function formatLastUpdated(date: Date | null): string {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function StationPanel({
  station,
  loading,
  error,
  lastUpdated,
  onClose,
}: StationPanelProps) {
  if (error) {
    return (
      <div className="panel p-4" data-testid="station-panel-error">
        <div className="alert alert-error">
          <p className="font-medium">Failed to load stations</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="panel p-4" data-testid="station-panel-loading">
        <div className="space-y-3">
          <div className="skeleton-text w-3/4 h-5" />
          <div className="skeleton-text w-1/2 h-4" />
          <div className="skeleton-text w-full h-4" />
          <div className="skeleton-text w-2/3 h-4" />
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="panel p-4 text-center" data-testid="station-panel-empty">
        <p className="text-gray-500 text-sm">Click a station marker to see details</p>
      </div>
    );
  }

  const level = getAvailabilityLevel(station);
  const statusColor = colors.availability[level];
  const fitCount =
    station.vehicle_types_available.find((v) => v.vehicle_type_id === 'FIT')?.count ?? 0;
  const efitCount =
    station.vehicle_types_available.find((v) => v.vehicle_type_id === 'EFIT')?.count ?? 0;
  const hasVehicleTypes = station.vehicle_types_available.length > 0;

  return (
    <div className="panel" data-testid="station-panel">
      <div className="panel-header flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 truncate">{station.name}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close panel"
          >
            ×
          </button>
        )}
      </div>

      <div className="panel-body space-y-3">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-sm font-medium text-gray-700">{levelLabels[level]}</span>
        </div>

        {/* Bikes & Docks */}
        <div className="station-card-stat">
          <span className="station-card-stat-label">Bikes available</span>
          <span className="station-card-stat-value">
            {station.num_bikes_available}/{station.capacity}
          </span>
        </div>

        <div className="station-card-stat">
          <span className="station-card-stat-label">Docks available</span>
          <span className="station-card-stat-value">
            {station.num_docks_available}/{station.capacity}
          </span>
        </div>

        {/* Availability bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${(station.num_bikes_available / Math.max(station.capacity, 1)) * 100}%`,
              backgroundColor: statusColor,
            }}
          />
        </div>

        {/* Vehicle types */}
        {hasVehicleTypes && (
          <div className="text-xs text-gray-500">
            {fitCount > 0 && <span>{fitCount} FIT</span>}
            {fitCount > 0 && efitCount > 0 && <span> · </span>}
            {efitCount > 0 && <span>{efitCount} EFIT</span>}
          </div>
        )}

        {/* Capacity */}
        <div className="station-card-stat">
          <span className="station-card-stat-label">Total capacity</span>
          <span className="station-card-stat-value">{station.capacity}</span>
        </div>
      </div>

      <div className="panel-footer text-xs text-gray-400">
        Last updated: {formatLastUpdated(lastUpdated)}
      </div>
    </div>
  );
}
