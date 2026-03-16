interface WelcomeCTAProps {
  stationCount: number;
}

export default function WelcomeCTA({ stationCount }: WelcomeCTAProps) {
  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[999] w-[calc(100%-2rem)] max-w-sm"
      data-testid="welcome-cta"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl px-5 py-4 text-center border border-gray-100">
        <div className="text-3xl mb-2" aria-hidden="true">👆</div>
        <p className="text-sm font-semibold text-gray-800 mb-1">
          Toca dos puntos en el mapa o usa el buscador para planificar tu ruta
        </p>
        <p className="text-xs text-gray-500">
          🚲 {stationCount} estaciones disponibles ahora
        </p>
        <div className="flex items-center justify-center gap-3 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Disponible
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
            Limitada
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
            Vacía
          </span>
        </div>
      </div>
    </div>
  );
}
