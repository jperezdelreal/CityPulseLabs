/**
 * MobileSearchBar — Touch-optimized search for origin/destination
 *
 * Designed for mobile-first: large touch targets (48px min),
 * full-width layout, always visible at top of screen.
 */
import { useCallback } from 'react';
import { useGeocode } from '../../hooks/useGeocode.ts';
import type { GeocodingResult } from '../../services/geocoding.ts';
import type { LatLng } from '../../types/index.ts';

type ActiveField = 'origin' | 'destination' | null;

interface MobileSearchBarProps {
  originText: string;
  destText: string;
  activeField: ActiveField;
  onOriginTextChange: (text: string) => void;
  onDestTextChange: (text: string) => void;
  onSetActiveField: (field: ActiveField) => void;
  onSelectOrigin: (point: LatLng, label: string) => void;
  onSelectDestination: (point: LatLng, label: string) => void;
  onClearAll: () => void;
  showClear: boolean;
}

export default function MobileSearchBar({
  originText,
  destText,
  activeField,
  onOriginTextChange,
  onDestTextChange,
  onSetActiveField,
  onSelectOrigin,
  onSelectDestination,
  onClearAll,
  showClear,
}: MobileSearchBarProps) {
  const originGeocode = useGeocode();
  const destGeocode = useGeocode();

  const handleOriginChange = useCallback((value: string) => {
    onOriginTextChange(value);
    originGeocode.search(value);
  }, [onOriginTextChange, originGeocode]);

  const handleDestChange = useCallback((value: string) => {
    onDestTextChange(value);
    destGeocode.search(value);
  }, [onDestTextChange, destGeocode]);

  const handleSelectResult = useCallback((result: GeocodingResult, field: ActiveField) => {
    const point: LatLng = { lat: result.lat, lng: result.lon };
    const shortName = result.display_name.split(',').slice(0, 2).join(',');

    if (field === 'origin') {
      onSelectOrigin(point, shortName);
      originGeocode.clear();
      onSetActiveField('destination');
    } else {
      onSelectDestination(point, shortName);
      destGeocode.clear();
      onSetActiveField(null);
    }
  }, [onSelectOrigin, onSelectDestination, originGeocode, destGeocode, onSetActiveField]);

  const activeResults = activeField === 'origin' ? originGeocode : destGeocode;
  const showResults = activeField && (activeResults.results.length > 0 || activeResults.loading);

  return (
    <div className="mobile-search-bar" data-testid="mobile-search-bar">
      {/* Search fields */}
      <div className="bg-white rounded-2xl shadow-lg mx-3 overflow-hidden border border-gray-100">
        {/* Origin */}
        <div className="flex items-center gap-3 px-4">
          <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
          <input
            type="text"
            value={originText}
            onChange={(e) => handleOriginChange(e.target.value)}
            onFocus={() => onSetActiveField('origin')}
            placeholder="¿Dónde estás?"
            className="flex-1 text-base py-3 outline-none bg-transparent text-gray-900 placeholder-gray-400 min-h-[48px]"
            aria-label="Origen"
            data-testid="mobile-origin-input"
            autoComplete="off"
          />
          {showClear && (
            <button
              onClick={onClearAll}
              className="text-gray-400 active:text-gray-600 shrink-0 w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
              aria-label="Borrar ruta"
              data-testid="mobile-clear-route"
            >
              ✕
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center px-4">
          <div className="w-3 flex justify-center shrink-0">
            <div className="w-0.5 h-2 bg-gray-300" />
          </div>
          <div className="flex-1 ml-3 border-t border-gray-100" />
        </div>

        {/* Destination */}
        <div className="flex items-center gap-3 px-4">
          <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200 shrink-0" />
          <input
            type="text"
            value={destText}
            onChange={(e) => handleDestChange(e.target.value)}
            onFocus={() => onSetActiveField('destination')}
            placeholder="¿A dónde vas?"
            className="flex-1 text-base py-3 outline-none bg-transparent text-gray-900 placeholder-gray-400 min-h-[48px]"
            aria-label="Destino"
            data-testid="mobile-dest-input"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Autocomplete results — full-width overlay */}
      {showResults && (
        <div className="mx-3 mt-2 bg-white rounded-2xl shadow-lg overflow-hidden max-h-[40vh] overflow-y-auto border border-gray-100" data-testid="mobile-search-results">
          {activeResults.loading && (
            <div className="flex items-center gap-3 px-4 py-4 text-sm text-gray-500">
              <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
              Buscando...
            </div>
          )}
          {activeResults.results.map((result, i) => (
            <button
              key={`${result.lat}-${result.lon}-${i}`}
              onClick={() => handleSelectResult(result, activeField)}
              className="w-full text-left px-4 py-4 text-sm active:bg-gray-100 transition-colors border-b border-gray-50 last:border-b-0 min-h-[52px] flex items-center gap-3"
              data-testid={`mobile-search-result-${i}`}
            >
              <span className="text-gray-400 text-lg">📍</span>
              <span className="text-gray-900 line-clamp-2">{result.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Geocoding error */}
      {activeField && activeResults.error && (
        <div className="mx-3 mt-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-2xl border border-red-100">
          ⚠️ {activeResults.error}
        </div>
      )}
    </div>
  );
}
