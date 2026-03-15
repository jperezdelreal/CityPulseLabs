import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StationData } from '../../src/types/gbfs';
import {
  filterPickupStations,
  filterDropoffStations,
  calculateMultiModalRoutes,
  calculateWalkingOnly,
} from '../../src/services/routeEngine';
import { haversineDistance } from '../../src/services/routing';

// Mock the routing module's fetch-based functions
vi.mock('../../src/services/routing', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/services/routing')>();
  return {
    ...original,
    getWalkingRoute: vi.fn(),
    getCyclingRoute: vi.fn(),
  };
});

import { getWalkingRoute, getCyclingRoute } from '../../src/services/routing';

const mockedGetWalkingRoute = vi.mocked(getWalkingRoute);
const mockedGetCyclingRoute = vi.mocked(getCyclingRoute);

// --- Mock station data -------------------------------------------------------

function makeStation(overrides: Partial<StationData> & { station_id: string; name: string; lat: number; lon: number }): StationData {
  return {
    capacity: 20,
    num_bikes_available: 5,
    num_bikes_disabled: 0,
    num_docks_available: 10,
    num_docks_disabled: 0,
    is_renting: true,
    is_returning: true,
    is_installed: true,
    last_reported: Date.now(),
    vehicle_types_available: [],
    ...overrides,
  };
}

// Stations near origin (43.362, -8.411) within ~500m
const stationNearOrigin = makeStation({
  station_id: 'pickup-1',
  name: 'Plaza Mayor',
  lat: 43.3630,
  lon: -8.4120,
  num_bikes_available: 8,
  num_docks_available: 5,
});

const stationNearOrigin2 = makeStation({
  station_id: 'pickup-2',
  name: 'Parque Europa',
  lat: 43.3625,
  lon: -8.4100,
  num_bikes_available: 3,
  num_docks_available: 12,
});

// Station near destination (43.370, -8.400) within ~500m
const stationNearDest = makeStation({
  station_id: 'dropoff-1',
  name: 'Marina',
  lat: 43.3710,
  lon: -8.4010,
  num_bikes_available: 2,
  num_docks_available: 15,
});

const stationNearDest2 = makeStation({
  station_id: 'dropoff-2',
  name: 'Puerto',
  lat: 43.3695,
  lon: -8.3990,
  num_bikes_available: 0,
  num_docks_available: 8,
});

// Station with no bikes
const stationNoBikes = makeStation({
  station_id: 'empty-1',
  name: 'Vacia',
  lat: 43.3628,
  lon: -8.4118,
  num_bikes_available: 0,
  num_docks_available: 20,
});

// Station with no docks
const stationNoDocks = makeStation({
  station_id: 'full-1',
  name: 'Llena',
  lat: 43.3705,
  lon: -8.4005,
  num_bikes_available: 20,
  num_docks_available: 0,
});

// Station far from everything (>2km)
const stationFarAway = makeStation({
  station_id: 'far-1',
  name: 'Lejos',
  lat: 43.390,
  lon: -8.430,
  num_bikes_available: 10,
  num_docks_available: 10,
});

// Station not renting
const stationNotRenting = makeStation({
  station_id: 'offline-1',
  name: 'Offline',
  lat: 43.3632,
  lon: -8.4115,
  is_renting: false,
  num_bikes_available: 5,
});

const allStations = [
  stationNearOrigin,
  stationNearOrigin2,
  stationNearDest,
  stationNearDest2,
  stationNoBikes,
  stationNoDocks,
  stationFarAway,
  stationNotRenting,
];

const origin = { lat: 43.362, lng: -8.411 };
const destination = { lat: 43.370, lng: -8.400 };

// --- Tests -------------------------------------------------------------------

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(43.362, -8.411, 43.362, -8.411)).toBe(0);
  });

  it('calculates reasonable distance between nearby points', () => {
    const dist = haversineDistance(43.362, -8.411, 43.370, -8.400);
    expect(dist).toBeGreaterThan(800);
    expect(dist).toBeLessThan(1500);
  });
});

describe('filterPickupStations', () => {
  it('only includes stations with bikes available', () => {
    const result = filterPickupStations(allStations, origin);
    const ids = result.map((s) => s.station_id);
    expect(ids).not.toContain('empty-1');
  });

  it('only includes stations that are renting', () => {
    const result = filterPickupStations(allStations, origin);
    const ids = result.map((s) => s.station_id);
    expect(ids).not.toContain('offline-1');
  });

  it('excludes stations beyond max walking distance', () => {
    const result = filterPickupStations(allStations, origin);
    const ids = result.map((s) => s.station_id);
    expect(ids).not.toContain('far-1');
  });

  it('includes valid nearby stations', () => {
    const result = filterPickupStations(allStations, origin);
    const ids = result.map((s) => s.station_id);
    expect(ids).toContain('pickup-1');
    expect(ids).toContain('pickup-2');
  });

  it('sorts by distance from origin (closest first)', () => {
    const result = filterPickupStations(allStations, origin);
    if (result.length >= 2) {
      const dist0 = haversineDistance(origin.lat, origin.lng, result[0].lat, result[0].lon);
      const dist1 = haversineDistance(origin.lat, origin.lng, result[1].lat, result[1].lon);
      expect(dist0).toBeLessThanOrEqual(dist1);
    }
  });
});

describe('filterDropoffStations', () => {
  it('only includes stations with docks available', () => {
    const result = filterDropoffStations(allStations, destination);
    const ids = result.map((s) => s.station_id);
    expect(ids).not.toContain('full-1');
  });

  it('includes valid nearby stations with docks', () => {
    const result = filterDropoffStations(allStations, destination);
    const ids = result.map((s) => s.station_id);
    expect(ids).toContain('dropoff-1');
    expect(ids).toContain('dropoff-2');
  });

  it('excludes stations beyond max walking distance', () => {
    const result = filterDropoffStations(allStations, destination);
    const ids = result.map((s) => s.station_id);
    expect(ids).not.toContain('far-1');
  });
});

describe('calculateMultiModalRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRouteResponse(durationSeconds: number, distanceMeters: number) {
    return {
      geometry: [[43.36, -8.41] as [number, number], [43.37, -8.40] as [number, number]],
      duration_seconds: durationSeconds,
      distance_meters: distanceMeters,
    };
  }

  it('returns empty array when no pickup stations available', async () => {
    const stationsNoBikes = allStations.map((s) => ({ ...s, num_bikes_available: 0 }));
    const result = await calculateMultiModalRoutes(origin, destination, stationsNoBikes);
    expect(result).toEqual([]);
  });

  it('returns empty array when no dropoff stations available', async () => {
    const stationsNoDocks = allStations.map((s) => ({ ...s, num_docks_available: 0 }));
    const result = await calculateMultiModalRoutes(origin, destination, stationsNoDocks);
    expect(result).toEqual([]);
  });

  it('returns routes sorted by total time (shortest first)', async () => {
    mockedGetWalkingRoute
      .mockResolvedValueOnce(mockRouteResponse(120, 200))
      .mockResolvedValueOnce(mockRouteResponse(300, 500))
      .mockResolvedValueOnce(mockRouteResponse(90, 150))
      .mockResolvedValueOnce(mockRouteResponse(180, 300));

    mockedGetCyclingRoute
      .mockResolvedValueOnce(mockRouteResponse(600, 2000))
      .mockResolvedValueOnce(mockRouteResponse(400, 1500));

    const result = await calculateMultiModalRoutes(origin, destination, allStations);

    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(3);

    for (let i = 1; i < result.length; i++) {
      expect(result[i].total_time_seconds).toBeGreaterThanOrEqual(result[i - 1].total_time_seconds);
    }
  });

  it('includes correct station info in results', async () => {
    mockedGetWalkingRoute.mockResolvedValue(mockRouteResponse(120, 200));
    mockedGetCyclingRoute.mockResolvedValue(mockRouteResponse(300, 1000));

    const result = await calculateMultiModalRoutes(origin, destination, allStations);

    if (result.length > 0) {
      const route = result[0];
      expect(route.pickup_station).toHaveProperty('station_id');
      expect(route.pickup_station).toHaveProperty('name');
      expect(route.dropoff_station).toHaveProperty('station_id');
      expect(route.dropoff_station).toHaveProperty('name');
    }
  });

  it('calculates walk and bike time/distance correctly', async () => {
    mockedGetWalkingRoute
      .mockResolvedValueOnce(mockRouteResponse(100, 150))
      .mockResolvedValueOnce(mockRouteResponse(200, 300));
    mockedGetCyclingRoute
      .mockResolvedValueOnce(mockRouteResponse(400, 2000));

    const limitedStations = [stationNearOrigin, stationNearDest];
    const result = await calculateMultiModalRoutes(origin, destination, limitedStations);

    expect(result.length).toBe(1);
    const route = result[0];
    expect(route.walk_time_seconds).toBe(300);
    expect(route.bike_time_seconds).toBe(400);
    expect(route.total_time_seconds).toBe(700);
    expect(route.walk_distance_meters).toBe(450);
    expect(route.bike_distance_meters).toBe(2000);
  });

  it('returns at most 3 routes', async () => {
    mockedGetWalkingRoute.mockResolvedValue(mockRouteResponse(100, 150));
    mockedGetCyclingRoute.mockResolvedValue(mockRouteResponse(300, 1000));

    const result = await calculateMultiModalRoutes(origin, destination, allStations);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('handles API failures gracefully by skipping failed routes', async () => {
    mockedGetWalkingRoute
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValue(mockRouteResponse(100, 150));
    mockedGetCyclingRoute.mockResolvedValue(mockRouteResponse(300, 1000));

    const result = await calculateMultiModalRoutes(origin, destination, allStations);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('calculateWalkingOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns walking route with correct time and distance', async () => {
    mockedGetWalkingRoute.mockResolvedValue({
      geometry: [[43.362, -8.411] as [number, number], [43.370, -8.400] as [number, number]],
      duration_seconds: 1680,
      distance_meters: 1400,
    });

    const result = await calculateWalkingOnly(origin, destination);
    expect(result.total_time_seconds).toBe(1680);
    expect(result.total_distance_meters).toBe(1400);
    expect(result.segment.geometry).toHaveLength(2);
  });
});

describe('walking comparison logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bike route faster than walking shows positive time savings', async () => {
    mockedGetWalkingRoute
      .mockResolvedValueOnce({
        geometry: [[0, 0] as [number, number]],
        duration_seconds: 120,
        distance_meters: 100,
      })
      .mockResolvedValueOnce({
        geometry: [[0, 0] as [number, number]],
        duration_seconds: 120,
        distance_meters: 100,
      })
      .mockResolvedValueOnce({
        geometry: [[0, 0] as [number, number]],
        duration_seconds: 1680,
        distance_meters: 1400,
      });
    mockedGetCyclingRoute.mockResolvedValue({
      geometry: [[0, 0] as [number, number]],
      duration_seconds: 480,
      distance_meters: 2000,
    });

    const limitedStations = [stationNearOrigin, stationNearDest];
    const [routes, walking] = await Promise.all([
      calculateMultiModalRoutes(origin, destination, limitedStations),
      calculateWalkingOnly(origin, destination),
    ]);

    if (routes.length > 0 && walking) {
      const bikeMinutes = Math.round(routes[0].total_time_seconds / 60);
      const walkMinutes = Math.round(walking.total_time_seconds / 60);
      const timeSaved = walkMinutes - bikeMinutes;
      expect(timeSaved).toBeGreaterThan(0);
    }
  });
});
