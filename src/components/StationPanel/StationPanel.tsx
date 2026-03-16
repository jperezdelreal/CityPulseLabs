import type { StationData } from '../../types/index.ts';
import type { BikeType } from '../../services/bikeTypeFilter.ts';
import { getAvailabilityLevel } from '../../utils/stationColors.ts';
import { colors } from '../../styles/tokens.ts';
import { getVehicleTypeIcon } from '../../utils/vehicleTypes.ts';

interface StationPanelProps {
  station: StationData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onClose?: () => void;
  preferredBikeType?: BikeType;
}

const levelLabels: Record<string, { text: string; icon: string }> = {
  good: { text: 'Buena disponibilidad', icon: '🟢' },
  limited: { text: 'Disponibilidad limitada', icon: '🟡' },
  empty: { text: 'Pocas o ninguna bici', icon: '🔴' },
  offline: { text: 'Estación fuera de servicio', icon: '⚫' },
};

function formatLastUpdated(date: Date | null): string {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `hace ${seconds}s`;
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  return `hace ${Math.floor(seconds / 3600)}h`;
}

export default function StationPanel({
  station,
  loading,
  error,
  lastUpdated,
  onClose,
  preferredBikeType = 'any',
}: StationPanelProps) {
  if (error) {
    return (
      <div className="p-4" data-testid="station-panel-error">
        <div className="alert alert-error rounded-xl">
          <p className="font-medium">⚠️ Error al cargar estaciones</p>
          <p className="text-sm mt-1">Comprueba tu conexión e inténtalo de nuevo.</p>
          <p className="text-xs mt-1 text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4" data-testid="station-panel-loading">
        <div className="space-y-3 animate-pulse">
          <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
          <div className="h-4 bg-gray-200 rounded-lg w-1/2" />
          <div className="h-4 bg-gray-200 rounded-lg w-full" />
          <div className="h-4 bg-gray-200 rounded-lg w-2/3" />
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="p-4 text-center py-8" data-testid="station-panel-empty">
        <div className="text-3xl mb-2" aria-hidden="true">🚏</div>
        <p className="text-sm font-medium text-gray-700">Selecciona una estación</p>
        <p className="text-xs text-gray-500 mt-1">Toca un punto en el mapa para ver su información</p>
      </div>
    );
  }

  const level = getAvailabilityLevel(station);
  const statusColor = colors.availability[level];
  const levelInfo = levelLabels[level];
  const hasVehicleTypes = station.vehicle_types_available.length > 0;
  const bikePercent = Math.round((station.num_bikes_available / Math.max(station.capacity, 1)) * 100);

  return (
    <div data-testid="station-panel">
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900 truncate">{station.name}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-sm">{levelInfo.icon}</span>
            <span className="text-xs font-medium text-gray-600">{levelInfo.text}</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -mt-1 shrink-0"
            aria-label="Cerrar panel"
          >
            <span className="text-xl">×</span>
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Bikes & Docks — large, clear numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{station.num_bikes_available}</div>
            <div className="text-xs text-gray-500 mt-0.5">🚲 Bicis disponibles</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{station.num_docks_available}</div>
            <div className="text-xs text-gray-500 mt-0.5">🅿️ Anclajes libres</div>
          </div>
        </div>

        {/* Availability bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Ocupación</span>
            <span>{bikePercent}% · {station.num_bikes_available}/{station.capacity}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${bikePercent}%`,
                backgroundColor: statusColor,
              }}
            />
          </div>
        </div>

        {/* Vehicle types */}
        {hasVehicleTypes && (
          <div className="grid grid-cols-3 gap-2" data-testid="vehicle-type-breakdown">
            {station.vehicle_types_available.map((vt) => {
              const isPreferred =
                preferredBikeType !== 'any' && vt.vehicle_type_id === preferredBikeType;
              const icon = getVehicleTypeIcon(vt.vehicle_type_id);
              return (
                <div
                  key={vt.vehicle_type_id}
                  className={`flex flex-col items-center rounded-xl p-2.5 transition-all ${
                    isPreferred
                      ? 'bg-primary-50 ring-2 ring-primary-500 shadow-sm'
                      : 'bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className={`text-lg font-bold ${isPreferred ? 'text-primary-700' : 'text-gray-800'}`}>
                    {vt.count}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">{vt.vehicle_type_id}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-gray-400 pt-2 border-t border-gray-100 flex items-center justify-between">
          <span>Capacidad: {station.capacity}</span>
          <span>Actualizado {formatLastUpdated(lastUpdated)}</span>
        </div>
      </div>
    </div>
  );
}
