import type { StationData } from '../types/gbfs.ts';
import type { LatLng } from '../types/index.ts';
import { haversineDistance } from '../services/routing.ts';

export interface NearestStationResult {
  station: StationData;
  distanceMeters: number;
  walkingMinutes: number;
}

const AVG_WALKING_SPEED_MPS = 1.4; // ~5 km/h

/**
 * Find the nearest station with available bikes from a given position.
 * Returns null if no stations have bikes available.
 */
export function findNearestStation(
  position: LatLng,
  stations: StationData[],
): NearestStationResult | null {
  let nearest: NearestStationResult | null = null;

  for (const station of stations) {
    if (station.num_bikes_available <= 0 || !station.is_renting) continue;

    const dist = haversineDistance(position.lat, position.lng, station.lat, station.lon);

    if (!nearest || dist < nearest.distanceMeters) {
      nearest = {
        station,
        distanceMeters: Math.round(dist),
        walkingMinutes: Math.round(dist / AVG_WALKING_SPEED_MPS / 60),
      };
    }
  }

  return nearest;
}
