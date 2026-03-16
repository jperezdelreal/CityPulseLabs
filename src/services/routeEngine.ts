import type { StationData } from '../types/gbfs.ts';
import type { LatLng, MultiModalRoute, WalkingRoute, StationSummary } from '../types/index.ts';
import { haversineDistance, getWalkingRoute, getCyclingRoute } from './routing.ts';
import { type BikeType, getVehicleTypeCount } from './bikeTypeFilter.ts';

const MAX_WALKING_DISTANCE_M = 1000;
const TOP_N = 3;
// Limit candidate pairs to avoid excessive API calls
const MAX_CANDIDATES = 6;
// EFIT bonus: extra score points when preferred EFIT is available
const EFIT_BONUS_SECONDS = -120;

/** Speed factor per bike type: lower = faster */
export const BIKE_TYPE_SPEED_FACTOR: Record<BikeType, number> = {
  any: 1,
  FIT: 1,
  EFIT: 0.8,
  BOOST: 0.85,
};

/** Human-readable label for bike type advantage */
export function getBikeTypeLabel(bikeType: BikeType): string | null {
  switch (bikeType) {
    case 'EFIT':
      return '\u26A1 El\u00E9ctrica \u2014 20% m\u00E1s r\u00E1pido en cuestas';
    case 'BOOST':
      return '\u{1F680} Turbo \u2014 15% m\u00E1s r\u00E1pido en cuestas';
    default:
      return null;
  }
}

function toStationSummary(station: StationData): StationSummary {
  return {
    station_id: station.station_id,
    name: station.name,
    lat: station.lat,
    lon: station.lon,
  };
}

/** Filter stations that have bikes available and are within walking distance of a point */
export function filterPickupStations(
  stations: StationData[],
  origin: LatLng,
  maxDistance = MAX_WALKING_DISTANCE_M,
  bikeType: BikeType = 'any',
): StationData[] {
  return stations
    .filter(
      (s) =>
        getVehicleTypeCount(s, bikeType) > 0 &&
        s.is_renting &&
        haversineDistance(origin.lat, origin.lng, s.lat, s.lon) <= maxDistance,
    )
    .sort(
      (a, b) =>
        haversineDistance(origin.lat, origin.lng, a.lat, a.lon) -
        haversineDistance(origin.lat, origin.lng, b.lat, b.lon),
    );
}

/** Filter stations that have docks available and are within walking distance of a point */
export function filterDropoffStations(
  stations: StationData[],
  destination: LatLng,
  maxDistance = MAX_WALKING_DISTANCE_M,
): StationData[] {
  return stations
    .filter(
      (s) =>
        s.num_docks_available > 0 &&
        s.is_returning &&
        haversineDistance(destination.lat, destination.lng, s.lat, s.lon) <= maxDistance,
    )
    .sort(
      (a, b) =>
        haversineDistance(destination.lat, destination.lng, a.lat, a.lon) -
        haversineDistance(destination.lat, destination.lng, b.lat, b.lon),
    );
}

/** Calculate multi-modal routes: walk -> bike -> walk */
export async function calculateMultiModalRoutes(
  origin: LatLng,
  destination: LatLng,
  stations: StationData[],
  bikeType: BikeType = 'any',
): Promise<MultiModalRoute[]> {
  const pickups = filterPickupStations(stations, origin, MAX_WALKING_DISTANCE_M, bikeType).slice(0, MAX_CANDIDATES);
  const dropoffs = filterDropoffStations(stations, destination).slice(0, MAX_CANDIDATES);

  if (pickups.length === 0 || dropoffs.length === 0) {
    return [];
  }

  // Build candidate pairs, limited to avoid rate limiting
  const pairs: { pickup: StationData; dropoff: StationData }[] = [];
  for (const pickup of pickups) {
    for (const dropoff of dropoffs) {
      if (pickup.station_id !== dropoff.station_id) {
        pairs.push({ pickup, dropoff });
      }
    }
  }

  // Sort by estimated total straight-line distance and take top candidates
  const sortedPairs = pairs
    .map((p) => ({
      ...p,
      estimatedDist:
        haversineDistance(origin.lat, origin.lng, p.pickup.lat, p.pickup.lon) +
        haversineDistance(p.pickup.lat, p.pickup.lon, p.dropoff.lat, p.dropoff.lon) +
        haversineDistance(p.dropoff.lat, p.dropoff.lon, destination.lat, destination.lng),
    }))
    .sort((a, b) => a.estimatedDist - b.estimatedDist)
    .slice(0, MAX_CANDIDATES);

  type ScoredRoute = MultiModalRoute & { _scoring_time: number };
  const routes: ScoredRoute[] = [];

  for (const { pickup, dropoff } of sortedPairs) {
    try {
      const pickupLatLng: LatLng = { lat: pickup.lat, lng: pickup.lon };
      const dropoffLatLng: LatLng = { lat: dropoff.lat, lng: dropoff.lon };

      const [walkToPickup, bikeSegment, walkToDest] = await Promise.all([
        getWalkingRoute(origin, pickupLatLng),
        getCyclingRoute(pickupLatLng, dropoffLatLng),
        getWalkingRoute(dropoffLatLng, destination),
      ]);

      const walkTime = walkToPickup.duration_seconds + walkToDest.duration_seconds;
      const rawBikeTime = bikeSegment.duration_seconds;
      const speedFactor = BIKE_TYPE_SPEED_FACTOR[bikeType] ?? 1;
      const bikeTime = Math.round(rawBikeTime * speedFactor);

      // Bonus for EFIT preference when EFIT bikes are available at station
      const efitBonus =
        bikeType === 'EFIT' && getVehicleTypeCount(pickup, 'EFIT') > 0
          ? EFIT_BONUS_SECONDS
          : 0;

      routes.push({
        pickup_station: toStationSummary(pickup),
        dropoff_station: toStationSummary(dropoff),
        walk_to_pickup: walkToPickup,
        bike_segment: bikeSegment,
        walk_to_destination: walkToDest,
        total_time_seconds: walkTime + bikeTime,
        walk_time_seconds: walkTime,
        bike_time_seconds: bikeTime,
        walk_distance_meters: walkToPickup.distance_meters + walkToDest.distance_meters,
        bike_distance_meters: bikeSegment.distance_meters,
        _scoring_time: walkTime + bikeTime + efitBonus,
      });
    } catch {
      // Skip failed route calculations
      continue;
    }
  }

  return routes
    .sort((a, b) => a._scoring_time - b._scoring_time)
    .slice(0, TOP_N)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ _scoring_time: _, ...route }) => route);
}

/** Calculate a direct walking route for comparison */
export async function calculateWalkingOnly(
  origin: LatLng,
  destination: LatLng,
): Promise<WalkingRoute> {
  const segment = await getWalkingRoute(origin, destination);
  return {
    segment,
    total_time_seconds: segment.duration_seconds,
    total_distance_meters: segment.distance_meters,
  };
}