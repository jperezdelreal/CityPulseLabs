import type { DayTypeComparison } from '../../types/analytics.ts';

interface DayComparisonProps {
  data: DayTypeComparison[];
}

export default function DayComparison({ data }: DayComparisonProps) {
  if (data.length < 2) return null;

  const weekday = data[0]!;
  const weekend = data[1]!;
  const maxTrips = Math.max(weekday.avgTrips, weekend.avgTrips);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">📅 Laborables vs Fin de semana</h3>
      <div className="grid grid-cols-2 gap-4">
        {[weekday, weekend].map((d) => {
          const pct = (d.avgTrips / maxTrips) * 100;
          const isWeekday = d === weekday;
          return (
            <div key={d.label} className="text-center">
              <div className="text-xs font-medium text-gray-600 mb-2">{d.label}</div>
              <div className="relative mx-auto w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke={isWeekday ? '#3b82f6' : '#f59e0b'}
                    strokeWidth="3"
                    strokeDasharray={`${pct} ${100 - pct}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-800">{d.avgTrips}</span>
                </div>
              </div>
              <div className="mt-2 space-y-0.5">
                <div className="text-[10px] text-gray-500">Pico: {d.peakHour}:00</div>
                <div className="text-[10px] text-gray-500">~{d.avgDuration} min/viaje</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
