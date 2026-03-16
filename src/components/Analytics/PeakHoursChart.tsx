import type { HourlyUsage } from '../../types/analytics.ts';

interface PeakHoursChartProps {
  data: HourlyUsage[];
}

export default function PeakHoursChart({ data }: PeakHoursChartProps) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.pickups, d.dropoffs)), 1);
  const barWidth = 14;
  const gap = 4;
  const chartWidth = data.length * (barWidth * 2 + gap + 6);
  const chartHeight = 160;
  const padding = { top: 10, bottom: 30, left: 40, right: 10 };

  const scaleY = (v: number) =>
    chartHeight - padding.bottom - (v / maxValue) * (chartHeight - padding.top - padding.bottom);

  // Y-axis labels
  const yTicks = [0, Math.round(maxValue / 2), maxValue];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Viajes por hora</h3>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight}`}
          className="w-full min-w-[500px]"
          role="img"
          aria-label="Gráfico de barras: viajes por hora"
        >
          {/* Y-axis labels */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={scaleY(tick)}
                x2={chartWidth + padding.left}
                y2={scaleY(tick)}
                stroke="#e5e7eb"
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 6}
                y={scaleY(tick) + 4}
                textAnchor="end"
                className="text-[10px] fill-gray-400"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const x = padding.left + i * (barWidth * 2 + gap + 6);
            return (
              <g key={d.hour}>
                {/* Pickup bar */}
                <rect
                  x={x}
                  y={scaleY(d.pickups)}
                  width={barWidth}
                  height={scaleY(0) - scaleY(d.pickups)}
                  rx={2}
                  className="fill-primary-500"
                  opacity={0.85}
                >
                  <title>Recogidas {d.hour}:00 — {d.pickups}</title>
                </rect>
                {/* Dropoff bar */}
                <rect
                  x={x + barWidth + 2}
                  y={scaleY(d.dropoffs)}
                  width={barWidth}
                  height={scaleY(0) - scaleY(d.dropoffs)}
                  rx={2}
                  className="fill-emerald-400"
                  opacity={0.75}
                >
                  <title>Devoluciones {d.hour}:00 — {d.dropoffs}</title>
                </rect>
                {/* X-axis label */}
                {d.hour % 3 === 0 && (
                  <text
                    x={x + barWidth}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    className="text-[10px] fill-gray-500"
                  >
                    {d.hour}:00
                  </text>
                )}
              </g>
            );
          })}

          {/* Legend */}
          <rect x={chartWidth - 100} y={4} width={10} height={10} rx={2} className="fill-primary-500" opacity={0.85} />
          <text x={chartWidth - 86} y={13} className="text-[10px] fill-gray-600">Recogidas</text>
          <rect x={chartWidth - 100} y={18} width={10} height={10} rx={2} className="fill-emerald-400" opacity={0.75} />
          <text x={chartWidth - 86} y={27} className="text-[10px] fill-gray-600">Devoluciones</text>
        </svg>
      </div>
    </div>
  );
}
