import { describe, it, expect } from 'vitest';
import {
  calculatePickupConfidence,
  calculateDropoffConfidence,
  calculatePredictiveConfidence,
  routeConfidence,
} from '../../src/services/confidenceScore.ts';
import type { StationPrediction } from '../../src/services/confidenceScore.ts';
import type { StationData } from '../../src/types/gbfs.ts';

function makeStation(overrides: Partial<StationData> = {}): StationData {
  return {
    station_id: 'test-1',
    name: 'Test Station',
    lat: 43.37,
    lon: -8.4,
    capacity: 20,
    num_bikes_available: 10,
    num_bikes_disabled: 0,
    num_docks_available: 10,
    num_docks_disabled: 0,
    is_renting: true,
    is_returning: true,
    is_installed: true,
    last_reported: Date.now() / 1000,
    vehicle_types_available: [],
    ...overrides,
  };
}

describe('calculatePickupConfidence', () => {
  it('returns high when ratio > 0.5', () => {
    const s = makeStation({ num_bikes_available: 15, capacity: 20 });
    const r = calculatePickupConfidence(s, 3);
    expect(r.level).toBe('high');
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.score).toBeLessThanOrEqual(100);
  });
  it('returns medium when ratio 0.25-0.5', () => {
    const s = makeStation({ num_bikes_available: 8, capacity: 20 });
    const r = calculatePickupConfidence(s, 3);
    expect(r.level).toBe('medium');
    expect(r.score).toBeGreaterThanOrEqual(30);
    expect(r.score).toBeLessThan(70);
  });
  it('returns low when ratio < 0.25', () => {
    const s = makeStation({ num_bikes_available: 2, capacity: 20 });
    const r = calculatePickupConfidence(s, 3);
    expect(r.level).toBe('low');
    expect(r.score).toBeLessThan(30);
  });
  it('returns low/0 when not renting', () => {
    const s = makeStation({ is_renting: false, num_bikes_available: 15 });
    const r = calculatePickupConfidence(s, 1);
    expect(r.level).toBe('low');
    expect(r.score).toBe(0);
  });
  it('returns low/0 when zero capacity', () => {
    const s = makeStation({ capacity: 0 });
    const r = calculatePickupConfidence(s, 1);
    expect(r.level).toBe('low');
    expect(r.score).toBe(0);
  });
  it('downgrades when walkTime > 5 and bikes <= 2', () => {
    const s = makeStation({ num_bikes_available: 2, capacity: 8 });
    const short_ = calculatePickupConfidence(s, 3);
    const long_ = calculatePickupConfidence(s, 8);
    expect(short_.level).toBe('medium');
    expect(long_.level).toBe('low');
    expect(long_.score).toBeLessThan(short_.score);
  });
  it('does NOT downgrade when bikes > 2', () => {
    const s = makeStation({ num_bikes_available: 6, capacity: 20 });
    expect(calculatePickupConfidence(s, 3).level).toBe('medium');
    expect(calculatePickupConfidence(s, 8).level).toBe('medium');
  });
  it('handles 0 bikes as low', () => {
    const s = makeStation({ num_bikes_available: 0, capacity: 20 });
    const r = calculatePickupConfidence(s, 1);
    expect(r.level).toBe('low');
    expect(r.score).toBe(0);
  });
  it('handles full station as high', () => {
    const s = makeStation({ num_bikes_available: 20, capacity: 20 });
    const r = calculatePickupConfidence(s, 1);
    expect(r.level).toBe('high');
    expect(r.score).toBeGreaterThanOrEqual(70);
  });
});

describe('calculateDropoffConfidence', () => {
  it('returns high when ratio > 0.5', () => {
    const s = makeStation({ num_docks_available: 15, capacity: 20 });
    expect(calculateDropoffConfidence(s, 3).level).toBe('high');
  });
  it('returns medium when ratio 0.25-0.5', () => {
    const s = makeStation({ num_docks_available: 8, capacity: 20 });
    expect(calculateDropoffConfidence(s, 3).level).toBe('medium');
  });
  it('returns low when ratio < 0.25', () => {
    const s = makeStation({ num_docks_available: 2, capacity: 20 });
    expect(calculateDropoffConfidence(s, 3).level).toBe('low');
  });
  it('returns low/0 when not returning', () => {
    const s = makeStation({ is_returning: false, num_docks_available: 15 });
    const r = calculateDropoffConfidence(s, 1);
    expect(r.level).toBe('low');
    expect(r.score).toBe(0);
  });
  it('downgrades when walkTime > 5 and docks <= 2', () => {
    const s = makeStation({ num_docks_available: 2, capacity: 8 });
    expect(calculateDropoffConfidence(s, 3).level).toBe('medium');
    expect(calculateDropoffConfidence(s, 8).level).toBe('low');
  });
});

describe('routeConfidence', () => {
  it('returns worst (pickup worse)', () => {
    const p = { level: 'low' as const, score: 15, reason: 'x' };
    const d = { level: 'high' as const, score: 90, reason: 'y' };
    const r = routeConfidence(p, d);
    expect(r.level).toBe('low');
    expect(r.score).toBe(15);
  });
  it('returns worst (dropoff worse)', () => {
    const p = { level: 'high' as const, score: 85, reason: 'x' };
    const d = { level: 'medium' as const, score: 45, reason: 'y' };
    const r = routeConfidence(p, d);
    expect(r.level).toBe('medium');
    expect(r.score).toBe(45);
  });
  it('returns high when both high', () => {
    const p = { level: 'high' as const, score: 90, reason: 'x' };
    const d = { level: 'high' as const, score: 85, reason: 'y' };
    const r = routeConfidence(p, d);
    expect(r.level).toBe('high');
    expect(r.score).toBe(85);
  });
  it('returns low when both low', () => {
    const p = { level: 'low' as const, score: 10, reason: 'x' };
    const d = { level: 'low' as const, score: 5, reason: 'y' };
    const r = routeConfidence(p, d);
    expect(r.level).toBe('low');
    expect(r.score).toBe(5);
  });
});

describe('calculatePredictiveConfidence', () => {
  it('falls back to basic confidence when no prediction provided', () => {
    const s = makeStation({ num_bikes_available: 15, capacity: 20 });
    const result = calculatePredictiveConfidence(s, 3);
    expect(result.level).toBe('high');
    expect(result.predictedLevel).toBeUndefined();
    expect(result.predictedReason).toBeUndefined();
  });

  it('falls back to basic confidence when prediction is undefined', () => {
    const s = makeStation({ num_bikes_available: 15, capacity: 20 });
    const result = calculatePredictiveConfidence(s, 3, undefined);
    expect(result.level).toBe('high');
    expect(result.predictedLevel).toBeUndefined();
  });

  it('downgrades from high to medium when prediction shows drop', () => {
    const s = makeStation({ num_bikes_available: 15, capacity: 20 });
    const prediction: StationPrediction = {
      predicted_bikes_available: 6,
      predicted_docks_available: 14,
      minutes_ahead: 30,
    };
    const result = calculatePredictiveConfidence(s, 3, prediction);
    expect(result.level).toBe('medium');
    expect(result.predictedLevel).toBe('medium');
    expect(result.predictedReason).toContain('15');
    expect(result.predictedReason).toContain('6');
  });

  it('downgrades from high to low when prediction shows severe drop', () => {
    const s = makeStation({ num_bikes_available: 15, capacity: 20 });
    const prediction: StationPrediction = {
      predicted_bikes_available: 2,
      predicted_docks_available: 18,
      minutes_ahead: 30,
    };
    const result = calculatePredictiveConfidence(s, 3, prediction);
    expect(result.level).toBe('low');
    expect(result.predictedLevel).toBe('low');
  });

  it('does not upgrade when prediction is better than current', () => {
    const s = makeStation({ num_bikes_available: 4, capacity: 20 });
    const prediction: StationPrediction = {
      predicted_bikes_available: 15,
      predicted_docks_available: 5,
      minutes_ahead: 30,
    };
    const result = calculatePredictiveConfidence(s, 3, prediction);
    expect(result.level).toBe('low');
    expect(result.predictedLevel).toBeUndefined();
  });

  it('keeps current level when prediction is same tier', () => {
    const s = makeStation({ num_bikes_available: 15, capacity: 20 });
    const prediction: StationPrediction = {
      predicted_bikes_available: 12,
      predicted_docks_available: 8,
      minutes_ahead: 30,
    };
    const result = calculatePredictiveConfidence(s, 3, prediction);
    expect(result.level).toBe('high');
    expect(result.predictedLevel).toBeUndefined();
  });

  it('returns basic confidence for zero-capacity station even with prediction', () => {
    const s = makeStation({ num_bikes_available: 0, capacity: 0 });
    const prediction: StationPrediction = {
      predicted_bikes_available: 5,
      predicted_docks_available: 5,
      minutes_ahead: 30,
    };
    const result = calculatePredictiveConfidence(s, 3, prediction);
    expect(result.level).toBe('low');
    expect(result.score).toBe(0);
  });

  it('blends scores when prediction causes downgrade', () => {
    const s = makeStation({ num_bikes_available: 15, capacity: 20 });
    const prediction: StationPrediction = {
      predicted_bikes_available: 6,
      predicted_docks_available: 14,
      minutes_ahead: 30,
    };
    const basic = calculatePickupConfidence(s, 3);
    const predictive = calculatePredictiveConfidence(s, 3, prediction);
    expect(predictive.score).toBeLessThan(basic.score);
  });
});