import { useState, useRef, useEffect, useCallback } from 'react';
import { useGeocode } from '../../hooks/useGeocode.ts';
import type { GeocodingResult } from '../../services/geocoding.ts';
import type { LatLng } from '../../types/index.ts';

interface SearchBarProps {
  origin: LatLng | null;
  destination: LatLng | null;
  onSetOrigin: (point: LatLng) => void;
  onSetDestination: (point: LatLng) => void;
  onClearRoute: () => void;
  geoPosition?: LatLng | null;
}

type ActiveField = 'origin' | 'destination' | null;

export default function SearchBar({
  origin,
  destination,
  onSetOrigin,
  onSetDestination,
  onClearRoute,
  geoPosition = null,
}: SearchBarProps) {
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [expanded, setExpanded] = useState(false);

  const originGeocode = useGeocode();
  const destGeocode = useGeocode();

  const containerRef = useRef<HTMLDivElement>(null);
  const prevOriginRef = useRef<LatLng | null>(origin);
  const prevDestRef = useRef<LatLng | null>(destination);

  // Clear text only when coordinates are externally removed (not on every render)
  useEffect(() => {
    if (prevOriginRef.current && !origin) {
      setOriginText('');
      originGeocode.clear();
    }
    prevOriginRef.current = origin;
  }, [origin, originGeocode]);

  useEffect(() => {
    if (prevDestRef.current && !destination) {
      setDestText('');
      destGeocode.clear();
    }
    prevDestRef.current = destination;
  }, [destination, destGeocode]);

  // Show "Mi ubicación" when geolocation is used as origin
  useEffect(() => {
    if (geoPosition && origin && geoPosition.lat === origin.lat && geoPosition.lng === origin.lng) {
      setOriginText('Mi ubicación');
    }
  }, [geoPosition, origin]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveField(null);
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOriginChange = useCallback((value: string) => {
    setOriginText(value);
    originGeocode.search(value);
  }, [originGeocode]);

  const handleDestChange = useCallback((value: string) => {
    setDestText(value);
    destGeocode.search(value);
  }, [destGeocode]);

  const handleSelectResult = useCallback((result: GeocodingResult, field: ActiveField) => {
    const point: LatLng = { lat: result.lat, lng: result.lon };
    const shortName = result.display_name.split(',').slice(0, 2).join(',');

    if (field === 'origin') {
      setOriginText(shortName);
      onSetOrigin(point);
      originGeocode.clear();
      setActiveField('destination');
    } else {
      setDestText(shortName);
      onSetDestination(point);
      destGeocode.clear();
      setActiveField(null);
    }
  }, [onSetOrigin, onSetDestination, originGeocode, destGeocode]);

  const handleClearOrigin = useCallback(() => {
    setOriginText('');
    originGeocode.clear();
    onClearRoute();
  }, [originGeocode, onClearRoute]);

  const handleClearDest = useCallback(() => {
    setDestText('');
    destGeocode.clear();
    onClearRoute();
  }, [destGeocode, onClearRoute]);

  const activeResults = activeField === 'origin' ? originGeocode : destGeocode;
  const isCollapsed = !expanded && !activeField;

  return (
    <div
      ref={containerRef}
      className="absolute top-2 left-2 right-14 z-[1000] max-w-md"
      data-testid="search-bar"
    >
      {/* Collapsed toggle (mobile) */}
      {isCollapsed && (
        <button
          onClick={() => setExpanded(true)}
          className="lg:hidden flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full"
          aria-label="Abrir buscador de direcciones"
        >
          <span>🔍</span>
          <span className="truncate">Buscar dirección...</span>
        </button>
      )}

      {/* Expanded search fields — always visible on desktop */}
      <div className={`${isCollapsed ? 'hidden lg:block' : 'block'}`}>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header row with close button on mobile */}
          <div className="flex items-center justify-between px-3 pt-2 lg:hidden">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Buscar ruta</span>
            <button
              onClick={() => { setActiveField(null); setExpanded(false); }}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar buscador"
            >
              ✕
            </button>
          </div>

          {/* Origin field */}
          <div className="relative px-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0" aria-hidden="true">📍</span>
              <input
                type="text"
                value={originText}
                onChange={(e) => handleOriginChange(e.target.value)}
                onFocus={() => setActiveField('origin')}
                placeholder="Escribe una dirección en A Coruña..."
                className="flex-1 text-sm py-1.5 outline-none bg-transparent text-gray-900 placeholder-gray-400"
                aria-label="Origen"
                data-testid="origin-input"
              />
              {originText && (
                <button
                  onClick={handleClearOrigin}
                  className="text-gray-400 hover:text-gray-600 shrink-0 p-0.5"
                  aria-label="Borrar origen"
                  data-testid="clear-origin"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-gray-200" />

          {/* Destination field */}
          <div className="relative px-3 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0" aria-hidden="true">🏁</span>
              <input
                type="text"
                value={destText}
                onChange={(e) => handleDestChange(e.target.value)}
                onFocus={() => setActiveField('destination')}
                placeholder="Escribe una dirección en A Coruña..."
                className="flex-1 text-sm py-1.5 outline-none bg-transparent text-gray-900 placeholder-gray-400"
                aria-label="Destino"
                data-testid="dest-input"
              />
              {destText && (
                <button
                  onClick={handleClearDest}
                  className="text-gray-400 hover:text-gray-600 shrink-0 p-0.5"
                  aria-label="Borrar destino"
                  data-testid="clear-dest"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Autocomplete dropdown */}
        {activeField && (activeResults.results.length > 0 || activeResults.loading) && (
          <div
            className="mt-1 bg-white rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto"
            data-testid="search-results"
          >
            {activeResults.loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                <div className="animate-spin h-3 w-3 border-2 border-primary-500 border-t-transparent rounded-full" />
                Buscando...
              </div>
            )}
            {activeResults.results.map((result, i) => (
              <button
                key={`${result.lat}-${result.lon}-${i}`}
                onClick={() => handleSelectResult(result, activeField)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                data-testid={`search-result-${i}`}
              >
                <span className="text-gray-900 line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Error message */}
        {activeField && activeResults.error && (
          <div className="mt-1 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg shadow">
            {activeResults.error}
          </div>
        )}
      </div>
    </div>
  );
}
