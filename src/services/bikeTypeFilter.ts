import type { StationData } from '../types/gbfs.ts';

export type BikeType = 'any' | 'FIT' | 'EFIT' | 'BOOST';

export function getVehicleTypeCount(station: StationData, type: BikeType): number {
  if (type === 'any') {
    return station.num_bikes_available;
  }
  return (
    station.vehicle_types_available.find((v) => v.vehicle_type_id === type)?.count ?? 0
  );
}

export function filterByBikeType(
  stations: StationData[],
  preferredType: BikeType,
): StationData[] {
  if (preferredType === 'any') {
    return stations.filter((s) => s.num_bikes_available > 0);
  }
  return stations.filter((s) => getVehicleTypeCount(s, preferredType) > 0);
}
