import { useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import type { Layer, PathOptions } from 'leaflet';
import type { GeofencingZonesCollection } from '../../types/index.ts';
import {
  parseGeofencingFeatures,
  classifyZone,
  getZoneStyle,
  getZoneTooltip,
} from '../../services/geofencing.ts';

interface GeofencingOverlayProps {
  zones: GeofencingZonesCollection | null;
  loading: boolean;
}

export default function GeofencingOverlay({
  zones,
  loading,
}: GeofencingOverlayProps) {
  const [visible, setVisible] = useState(true);

  if (loading) return null;

  const hasZones = zones && parseGeofencingFeatures(zones).length > 0;

  return (
    <>
      {/* Toggle control */}
      <div className="absolute bottom-24 left-3 z-[1000]">
        <button
          onClick={() => setVisible((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-md text-xs font-medium transition-colors ${
            visible
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title="Mostrar/ocultar zonas"
        >
          <span className="text-sm">📍</span>
          Zones
        </button>
      </div>

      {/* Zones layer */}
      {visible && hasZones && (
        <GeoJSON
          key={JSON.stringify(zones)}
          data={zones!}
          style={(feature) => {
            if (!feature) return {};
            const classification = classifyZone(feature as any);
            return getZoneStyle(classification) as PathOptions;
          }}
          onEachFeature={(feature, layer: Layer) => {
            const tooltip = getZoneTooltip(feature as any);
            layer.bindTooltip(tooltip, {
              sticky: true,
              direction: 'top',
              className: 'geofencing-tooltip',
            });
          }}
        />
      )}

      {/* No zones message */}
      {visible && !hasZones && !loading && (
        <div className="absolute bottom-36 left-3 z-[1000] bg-white/90 px-3 py-2 rounded-lg shadow-md text-xs text-gray-500 max-w-48">
          No hay zonas de geofencing disponibles para este sistema
        </div>
      )}
    </>
  );
}
