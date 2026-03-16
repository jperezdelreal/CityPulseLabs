import type { StationData } from '../types/gbfs.ts';
import type { LatLng, MultiModalRoute, WalkingRoute, StationSummary } from '../types/index.ts';
import { haversineDistance, getWalkingRoute, getCyclingRoute } from './routing.ts';
import { type BikeType, getVehicleTypeCount } from './bikeTypeFilter.ts';

/** Thrown when ORS quota is exhausted (429) to enable user-friendly messaging */
export class QuotaExhaustedError extends Error {
  constructor() {
    super('Servicio de rutas temporalmente no disponible. Prueba de nuevo más tarde.');
    this.name = 'QuotaExhaustedError';
  }
}

const MAX_WALKING_DISTANCE_M = 1000;
const TOP_N = 2;
// Limit pickup/dropoff candidates to reduce ORS API calls (3 pickup × 1 dropoff = 3 pairs × 3 calls = 9 max)
const TOP_PICKUP_STATIONS = 3;
const TOP_DROPOFF_STATIONS = 1;
const MAX_CANDIDATE_PAIRS = 3;
// Process route pairs in parallel batches to avoid ORS rate limiting
const BATCH_SIZE = 3;
// EFIT bonus: extra score points when preferred EFIT is available
const EFIT_BONUS_SECONDS = -120;

/** Speed factor per bike type: lower = faster */
export const BIKE_TYPE_SPEED_FACTOR: Record<BikeType, number> = {
  any: 1,
  FIT: 1,
  EFIT: 0.8,
  // BOOST hidden from UI until Turbo bikes are available; kept here for type completeness
  BOOST: 1,
};

/** Human-readable label for bike type advantage */
export function getBikeTypeLabel(bikeType: BikeType): string | null {
  switch (bikeType) {
    case 'EFIT':
      return '\u26A1 El\u00E9ctrica \u2014 20% m\u00E1s r\u00E1pido en cuestas';
    // BOOST hidden until Turbo bikes are available in the network
    // case 'BOOST':
    //   return '\u{1F680} Turbo \u2014 15% m\u00E1s r\u00E1pido en cuestas';
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
  signal?: AbortSignal,
): Promise<MultiModalRoute[]> {
  const pickups = filterPickupStations(stations, origin, MAX_WALKING_DISTANCE_M, bikeType).slice(0, TOP_PICKUP_STATIONS);
  const dropoffs = filterDropoffStations(stations, destination).slice(0, TOP_DROPOFF_STATIONS);

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
    .slice(0, MAX_CANDIDATE_PAIRS);

  type ScoredRoute = MultiModalRoute & { _scoring_time: number };
  const routes: ScoredRoute[] = [];

  // Process pairs in parallel batches to reduce total wait time on mobile
  for (let i = 0; i < sortedPairs.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    const batch = sortedPairs.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ({ pickup, dropoff }) => {
        try {
          const pickupLatLng: LatLng = { lat: pickup.lat, lng: pickup.lon };
          const dropoffLatLng: LatLng = { lat: dropoff.lat, lng: dropoff.lon };

          const [walkToPickup, bikeSegment, walkToDest] = await Promise.all([
            getWalkingRoute(origin, pickupLatLng, signal),
            getCyclingRoute(pickupLatLng, dropoffLatLng, signal),
            getWalkingRoute(dropoffLatLng, destination, signal),
          ]);

          const walkTime = walkToPickup.duration_seconds + walkToDest.duration_seconds;
          const rawBikeTime = bikeSegment.duration_seconds;
          const speedFactor = BIKE_TYPE_SPEED_FACTOR[bikeType] ?? 1;
          const bikeTime = Math.round(rawBikeTime * speedFactor);

          const efitBonus =
            bikeType === 'EFIT' && getVehicleTypeCount(pickup, 'EFIT') > 0
              ? EFIT_BONUS_SECONDS
              : 0;

          return {
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
          } as ScoredRoute;
        } catch (err) {
          // If ORS quota is exhausted, stop immediately with user-friendly message
          if (err instanceof Error && (err.message.includes('429') || err.message.includes('quota'))) {
            throw new QuotaExhaustedError();
          }
          return null;
        }
      }),
    );

    for (const result of results) {
      if (result) routes.push(result);
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
  signal?: AbortSignal,
): Promise<WalkingRoute> {
  const segment = await getWalkingRoute(origin, destination, signal);
  return {
    segment,
    total_time_seconds: segment.duration_seconds,
    total_distance_meters: segment.distance_meters,
  };
}