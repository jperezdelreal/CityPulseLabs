import type { HeatmapCell } from '../../types/analytics.ts';

interface StationHeatmapProps {
  cells: HeatmapCell[];
}

function intensityColor(intensity: number): string {
  if (intensity > 0.8) return '#dc2626';
  if (intensity > 0.6) return '#f97316';
  if (intensity > 0.4) return '#eab308';
  if (intensity > 0.2) return '#22c55e';
  return '#94a3b8';
}

function intensityLabel(intensity: number): string {
  if (intensity > 0.8) return 'Muy alta';
  if (intensity > 0.6) return 'Alta';
  if (intensity > 0.4) return 'Media';
  if (intensity > 0.2) return 'Baja';
  return 'Muy baja';
}

export default function StationHeatmap({ cells }: StationHeatmapProps) {
  const sorted = [...cells].sort((a, b) => b.intensity - a.intensity);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">🗺️ Mapa de calor de estaciones</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sorted.map((cell) => (
          <div
            key={cell.station_id}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: intensityColor(cell.intensity) }}
              title={`Intensidad: ${Math.round(cell.intensity * 100)}%`}
            />
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-700 truncate">{cell.name}</div>
              <div className="text-[10px] text-gray-500">{intensityLabel(cell.intensity)}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-gray-100">
        {[
          { color: '#dc2626', label: 'Muy alta' },
          { color: '#f97316', label: 'Alta' },
          { color: '#eab308', label: 'Media' },
          { color: '#22c55e', label: 'Baja' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
