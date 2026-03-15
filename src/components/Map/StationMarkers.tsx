import { CircleMarker } from 'react-leaflet';
import type { StationData } from '../../types/index.ts';
import { getMarkerColor } from '../../utils/stationColors.ts';
import StationPopup from './StationPopup.tsx';

interface StationMarkersProps {
  stations: StationData[];
  selectedStationId?: string | null;
  onStationSelect?: (station: StationData) => void;
}

export default function StationMarkers({
  stations,
  selectedStationId,
  onStationSelect,
}: StationMarkersProps) {
  return (
    <>
      {stations.map((station) => {
        const isSelected = station.station_id === selectedStationId;
        return (
          <CircleMarker
            key={station.station_id}
            center={[station.lat, station.lon]}
            radius={isSelected ? 10 : 7}
            pathOptions={{
              fillColor: getMarkerColor(station),
              color: isSelected ? '#1F2937' : '#FFFFFF',
              weight: isSelected ? 3 : 2,
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => onStationSelect?.(station),
            }}
          >
            <StationPopup station={station} />
          </CircleMarker>
        );
      })}
    </>
  );
}
