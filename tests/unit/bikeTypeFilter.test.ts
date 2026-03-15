import { describe, it, expect } from 'vitest';
import type { StationData } from '../../src/types/gbfs';
import { filterByBikeType, getVehicleTypeCount } from '../../src/services/bikeTypeFilter';

function makeStation(
  overrides: Partial<StationData> & { station_id: string },
): StationData {
  return {
    name: 'Test Station',
    lat: 43.362,
    lon: -8.411,
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

const stationMixed = makeStation({
  station_id: 'mixed',
  name: 'Mixed Station',
  num_bikes_available: 6,
  vehicle_types_available: [
    { vehicle_type_id: 'FIT', count: 3 },
    { vehicle_type_id: 'EFIT', count: 2 },
    { vehicle_type_id: 'BOOST', count: 1 },
  ],
});

const stationFitOnly = makeStation({
  station_id: 'fit-only',
  name: 'FIT Only',
  num_bikes_available: 4,
  vehicle_types_available: [
    { vehicle_type_id: 'FIT', count: 4 },
    { vehicle_type_id: 'EFIT', count: 0 },
  ],
});

const stationEfitOnly = makeStation({
  station_id: 'efit-only',
  name: 'EFIT Only',
  num_bikes_available: 2,
  vehicle_types_available: [
    { vehicle_type_id: 'FIT', count: 0 },
    { vehicle_type_id: 'EFIT', count: 2 },
  ],
});

const stationEmpty = makeStation({
  station_id: 'empty',
  name: 'Empty Station',
  num_bikes_available: 0,
  vehicle_types_available: [
    { vehicle_type_id: 'FIT', count: 0 },
    { vehicle_type_id: 'EFIT', count: 0 },
  ],
});

const stationNoTypes = makeStation({
  station_id: 'no-types',
  name: 'No Types',
  num_bikes_available: 3,
  vehicle_types_available: [],
});

const allStations = [stationMixed, stationFitOnly, stationEfitOnly, stationEmpty, stationNoTypes];

describe('getVehicleTypeCount', () => {
  it('returns total bikes for "any" type', () => {
    expect(getVehicleTypeCount(stationMixed, 'any')).toBe(6);
  });

  it('returns FIT count when type is FIT', () => {
    expect(getVehicleTypeCount(stationMixed, 'FIT')).toBe(3);
  });

  it('returns EFIT count when type is EFIT', () => {
    expect(getVehicleTypeCount(stationMixed, 'EFIT')).toBe(2);
  });

  it('returns BOOST count when type is BOOST', () => {
    expect(getVehicleTypeCount(stationMixed, 'BOOST')).toBe(1);
  });

  it('returns 0 when type is not present in vehicle_types_available', () => {
    expect(getVehicleTypeCount(stationFitOnly, 'BOOST')).toBe(0);
  });

  it('returns 0 for type with count 0', () => {
    expect(getVehicleTypeCount(stationFitOnly, 'EFIT')).toBe(0);
  });

  it('returns 0 when vehicle_types_available is empty', () => {
    expect(getVehicleTypeCount(stationNoTypes, 'FIT')).toBe(0);
  });
});

describe('filterByBikeType', () => {
  describe('with type "any"', () => {
    it('returns all stations with bikes > 0', () => {
      const result = filterByBikeType(allStations, 'any');
      const ids = result.map((s) => s.station_id);
      expect(ids).toContain('mixed');
      expect(ids).toContain('fit-only');
      expect(ids).toContain('efit-only');
      expect(ids).toContain('no-types');
      expect(ids).not.toContain('empty');
    });

    it('excludes stations with 0 bikes', () => {
      const result = filterByBikeType(allStations, 'any');
      expect(result.every((s) => s.num_bikes_available > 0)).toBe(true);
    });
  });

  describe('with type "FIT"', () => {
    it('returns only stations with FIT count > 0', () => {
      const result = filterByBikeType(allStations, 'FIT');
      const ids = result.map((s) => s.station_id);
      expect(ids).toContain('mixed');
      expect(ids).toContain('fit-only');
      expect(ids).not.toContain('efit-only');
      expect(ids).not.toContain('empty');
      expect(ids).not.toContain('no-types');
    });
  });

  describe('with type "EFIT"', () => {
    it('returns only stations with EFIT count > 0', () => {
      const result = filterByBikeType(allStations, 'EFIT');
      const ids = result.map((s) => s.station_id);
      expect(ids).toContain('mixed');
      expect(ids).toContain('efit-only');
      expect(ids).not.toContain('fit-only');
      expect(ids).not.toContain('empty');
    });

    it('excludes station where EFIT count is 0', () => {
      const result = filterByBikeType(allStations, 'EFIT');
      expect(result.find((s) => s.station_id === 'fit-only')).toBeUndefined();
    });
  });

  describe('with type "BOOST"', () => {
    it('returns only stations with BOOST count > 0', () => {
      const result = filterByBikeType(allStations, 'BOOST');
      const ids = result.map((s) => s.station_id);
      expect(ids).toContain('mixed');
      expect(ids).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('returns empty array when no stations match', () => {
      const result = filterByBikeType([stationEmpty], 'EFIT');
      expect(result).toEqual([]);
    });

    it('returns empty array for empty input', () => {
      const result = filterByBikeType([], 'any');
      expect(result).toEqual([]);
    });

    it('handles stations with no vehicle_types_available', () => {
      const result = filterByBikeType([stationNoTypes], 'EFIT');
      expect(result).toEqual([]);
    });

    it('handles stations with no vehicle_types_available for "any"', () => {
      const result = filterByBikeType([stationNoTypes], 'any');
      expect(result).toHaveLength(1);
    });
  });
});
