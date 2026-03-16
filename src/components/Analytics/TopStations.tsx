import type { StationDemand } from '../../types/analytics.ts';

interface TopStationsProps {
  stations: StationDemand[];
  limit?: number;
}

export default function TopStations({ stations, limit = 10 }: TopStationsProps) {
  const top = stations.slice(0, limit);
  const maxTrips = Math.max(...top.map((s) => s.totalTrips), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">🏆 Estaciones más usadas</h3>
      <div className="space-y-2.5">
        {top.map((station, i) => {
          const pct = (station.totalTrips / maxTrips) * 100;
          return (
            <div key={station.station_id} className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400 w-5 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-xs font-medium text-gray-700 truncate">{station.name}</span>
                  <span className="text-xs text-gray-500 ml-2 shrink-0">{station.avgDailyTrips}/día</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
