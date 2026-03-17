import { useState, useEffect } from 'react';
import type { AnalyticsData } from '../../types/analytics.ts';
import { getAnalyticsProvider } from '../../services/analyticsData.ts';
import PeakHoursChart from './PeakHoursChart.tsx';
import TopStations from './TopStations.tsx';
import DayComparison from './DayComparison.tsx';
import StationHeatmap from './StationHeatmap.tsx';

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const provider = getAnalyticsProvider();
        const result = await provider.fetchAnalytics();
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch {
        // Cosmos API unavailable — fall back to mock data
        try {
          const { MockAnalyticsProvider } = await import('../../services/analyticsData.ts');
          const fallback = new MockAnalyticsProvider();
          const result = await fallback.fetchAnalytics();
          if (!cancelled) {
            setData(result);
            setLoading(false);
          }
        } catch (fallbackErr) {
          if (!cancelled) {
            setError(fallbackErr instanceof Error ? fallbackErr.message : 'Error cargando analíticas');
            setLoading(false);
          }
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="animate-pulse">Cargando analíticas…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-red-500">
        {error ?? 'No se pudieron cargar las analíticas'}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">📈 Analíticas BiciCoruña</h2>
        {data.dataSource === 'mock' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            Datos de ejemplo
          </span>
        )}
      </div>

      <PeakHoursChart data={data.hourlyUsage} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopStations stations={data.topStations} />
        <div className="space-y-4">
          <DayComparison data={data.dayTypeComparison} />
          <StationHeatmap cells={data.heatmapCells} />
        </div>
      </div>

      <div className="text-[10px] text-gray-400 text-center pt-2">
        Última actualización: {new Date(data.lastUpdated).toLocaleString('es-ES')}
      </div>
    </div>
  );
}
