import { CircleMarker } from 'react-leaflet';
import type { StationData } from '../../types/index.ts';
import type { BikeType } from '../../services/bikeTypeFilter.ts';
import { getMarkerColor } from '../../utils/stationColors.ts';
import StationPopup from './StationPopup.tsx';

interface StationMarkersProps {
  stations: StationData[];
  selectedStationId?: string | null;
  onStationSelect?: (station: StationData) => void;
  preferredBikeType?: BikeType;
}

export default function StationMarkers({
  stations,
  selectedStationId,
  onStationSelect,
  preferredBikeType = 'any',
}: StationMarkersProps) {
  return (
    <>
      {stations.map((station) => {
        const isSelected = station.station_id === selectedStationId;
        return (
          <CircleMarker
            key={station.station_id}
            center={[station.lat, station.lon]}
            radius={isSelected ? 14 : 10}
            pathOptions={{
              fillColor: getMarkerColor(station),
              color: isSelected ? '#0A7647' : '#FFFFFF',
              weight: isSelected ? 3 : 2.5,
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => onStationSelect?.(station),
            }}
          >
            <StationPopup station={station} preferredBikeType={preferredBikeType} />
          </CircleMarker>
        );
      })}
    </>
  );
}