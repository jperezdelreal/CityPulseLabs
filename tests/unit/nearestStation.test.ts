import { describe, it, expect } from 'vitest';
import type { StationData } from '../../src/types/gbfs.ts';
import { findNearestStation } from '../../src/utils/nearestStation.ts';

function makeStation(overrides: Partial<StationData> & { station_id: string; name: string; lat: number; lon: number }): StationData {
  return {
    capacity: 20,
    num_bikes_available: 5,
    num_bikes_disabled: 0,
    num_docks_available: 15,
    num_docks_disabled: 0,
    is_renting: true,
    is_returning: true,
    is_installed: true,
    last_reported: 1700000000,
    vehicle_types_available: [],
    ...overrides,
  };
}

describe('findNearestStation', () => {
  const userPosition = { lat: 43.3623, lng: -8.4115 };

  const stations: StationData[] = [
    makeStation({ station_id: '1', name: 'Plaza Mayor', lat: 43.363, lon: -8.411, num_bikes_available: 5 }),
    makeStation({ station_id: '2', name: 'Estación Tren', lat: 43.353, lon: -8.409, num_bikes_available: 3 }),
    makeStation({ station_id: '3', name: 'Torre de Hércules', lat: 43.383, lon: -8.402, num_bikes_available: 0 }),
    makeStation({ station_id: '4', name: 'Orzán', lat: 43.370, lon: -8.400, num_bikes_available: 2, is_renting: false }),
  ];

  it('finds the nearest station with available bikes', () => {
    const result = findNearestStation(userPosition, stations);
    expect(result).not.toBeNull();
    expect(result!.station.station_id).toBe('1');
  });

  it('skips stations with no bikes available', () => {
    const result = findNearestStation(userPosition, stations);
    expect(result!.station.station_id).not.toBe('3');
  });

  it('skips stations that are not renting', () => {
    const result = findNearestStation(userPosition, stations);
    expect(result!.station.station_id).not.toBe('4');
  });

  it('returns distance and walking time', () => {
    const result = findNearestStation(userPosition, stations);
    expect(result!.distanceMeters).toBeGreaterThan(0);
    expect(result!.walkingMinutes).toBeGreaterThanOrEqual(0);
  });

  it('returns null when no stations have bikes', () => {
    const emptyStations = stations.map((s) => ({ ...s, num_bikes_available: 0 }));
    const result = findNearestStation(userPosition, emptyStations);
    expect(result).toBeNull();
  });

  it('returns null for empty station list', () => {
    const result = findNearestStation(userPosition, []);
    expect(result).toBeNull();
  });

  it('handles user position far from all stations', () => {
    const farPosition = { lat: 40.4168, lng: -3.7038 };
    const result = findNearestStation(farPosition, stations);
    expect(result).not.toBeNull();
    expect(result!.distanceMeters).toBeGreaterThan(100000);
  });
});
