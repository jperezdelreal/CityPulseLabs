import { describe, it, expect } from 'vitest';
import {
  calculateCalories,
  calculateCO2Saved,
  formatDuration,
  formatDistance,
  getRouteStats,
} from '../../src/services/routeStats';
import type { MultiModalRoute } from '../../src/types/index';

describe('calculateCalories', () => {
  it('returns 0 for zero distance', () => {
    expect(calculateCalories(0, 0)).toBe(0);
  });

  it('calculates cycling calories at ~30 kcal/km', () => {
    expect(calculateCalories(5, 0)).toBe(150);
  });

  it('calculates walking calories at ~4 kcal/km', () => {
    expect(calculateCalories(0, 5)).toBe(20);
  });

  it('combines walking and cycling calories', () => {
    // 3km bike (90) + 1km walk (4) = 94
    expect(calculateCalories(3, 1)).toBe(94);
  });
});

describe('calculateCO2Saved', () => {
  it('returns 0 for zero distance', () => {
    expect(calculateCO2Saved(0)).toBe(0);
  });

  it('calculates CO₂ at 0.21 kg/km', () => {
    expect(calculateCO2Saved(1)).toBe(0.21);
  });

  it('calculates CO₂ for longer distances', () => {
    expect(calculateCO2Saved(10)).toBe(2.1);
  });
});

describe('formatDuration', () => {
  it('shows "< 1 min" for short durations', () => {
    expect(formatDuration(20)).toBe('< 1 min');
  });

  it('rounds to nearest minute', () => {
    expect(formatDuration(90)).toBe('2 min');
  });

  it('formats whole minutes', () => {
    expect(formatDuration(600)).toBe('10 min');
  });
});

describe('formatDistance', () => {
  it('shows meters for short distances', () => {
    expect(formatDistance(500)).toBe('500 m');
  });

  it('shows km with one decimal for longer distances', () => {
    expect(formatDistance(1500)).toBe('1.5 km');
  });

  it('shows km for exactly 1000m', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
  });
});

describe('getRouteStats', () => {
  const mockRoute: MultiModalRoute = {
    pickup_station: { station_id: 'p1', name: 'Pickup', lat: 43.36, lon: -8.41 },
    dropoff_station: { station_id: 'd1', name: 'Dropoff', lat: 43.37, lon: -8.40 },
    walk_to_pickup: { geometry: [], duration_seconds: 120, distance_meters: 200 },
    bike_segment: { geometry: [], duration_seconds: 300, distance_meters: 3000 },
    walk_to_destination: { geometry: [], duration_seconds: 150, distance_meters: 300 },
    total_time_seconds: 570,
    walk_time_seconds: 270,
    bike_time_seconds: 300,
    walk_distance_meters: 500,
    bike_distance_meters: 3000,
  };

  it('calculates correct distances', () => {
    const stats = getRouteStats(mockRoute);
    expect(stats.bikeDistance).toBe(3000);
    expect(stats.walkDistance).toBe(500);
    expect(stats.totalDistance).toBe(3500);
  });

  it('calculates correct calories', () => {
    const stats = getRouteStats(mockRoute);
    // 3km bike (90) + 0.5km walk (2) = 92
    expect(stats.calories).toBe(92);
  });

  it('calculates correct CO₂ saved', () => {
    const stats = getRouteStats(mockRoute);
    // 3.5km * 0.21 = 0.735 → 0.73 (toFixed rounds down at .5 per IEEE 754)
    expect(stats.co2Saved).toBe(0.73);
  });
});
