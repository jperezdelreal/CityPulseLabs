/**
 * Skeleton/shimmer loading for route cards.
 * Replaces the generic spinner with a visual preview of what's loading.
 */
export default function RouteSkeleton() {
  return (
    <div className="px-4 space-y-3 pb-4" aria-label="Cargando rutas" role="status">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-100 p-4 space-y-3"
        >
          {/* Header: route label + time */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 skeleton-shimmer rounded-full" />
              <div className="h-5 w-14 skeleton-shimmer rounded-full" style={{ animationDelay: `${i * 100 + 50}ms` }} />
            </div>
            <div className="h-7 w-16 skeleton-shimmer rounded" style={{ animationDelay: `${i * 100 + 100}ms` }} />
          </div>

          {/* Segment breakdown */}
          <div className="flex items-center gap-3">
            <div className="h-3 w-20 skeleton-shimmer rounded" style={{ animationDelay: `${i * 100 + 150}ms` }} />
            <div className="h-3 w-20 skeleton-shimmer rounded" style={{ animationDelay: `${i * 100 + 200}ms` }} />
          </div>

          {/* Station names */}
          <div className="space-y-1.5">
            <div className="h-3 w-full skeleton-shimmer rounded" style={{ animationDelay: `${i * 100 + 250}ms` }} />
            <div className="h-3 w-3/4 skeleton-shimmer rounded" style={{ animationDelay: `${i * 100 + 300}ms` }} />
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-400 text-center pt-1">Calculando las mejores rutas...</p>
    </div>
  );
}
