import type { StationData } from '../types/gbfs.ts';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceScore {
  level: ConfidenceLevel;
  score: number;
  reason: string;
}

const LEVEL_ORDER: ConfidenceLevel[] = ['high', 'medium', 'low'];

function downgrade(level: ConfidenceLevel): ConfidenceLevel {
  const idx = LEVEL_ORDER.indexOf(level);
  return LEVEL_ORDER[Math.min(idx + 1, LEVEL_ORDER.length - 1)]!;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculatePickupConfidence(
  station: StationData,
  walkTimeMinutes: number,
): ConfidenceScore {
  if (!station.is_renting) {
    return { level: 'low', score: 0, reason: 'La estacion no esta alquilando' };
  }
  const capacity = station.capacity;
  if (capacity === 0) {
    return { level: 'low', score: 0, reason: 'La estacion no tiene capacidad' };
  }
  const bikes = station.num_bikes_available;
  const ratio = bikes / capacity;
  let level: ConfidenceLevel;
  let score: number;
  if (ratio > 0.5) {
    level = 'high';
    score = clamp(70 + ratio * 30, 70, 100);
  } else if (ratio >= 0.25) {
    level = 'medium';
    score = clamp(30 + ratio * 80, 30, 69);
  } else {
    level = 'low';
    score = clamp(ratio * 120, 0, 29);
  }
  if (walkTimeMinutes > 5 && bikes <= 2) {
    level = downgrade(level);
    score = clamp(score - 20, 0, 100);
  }
  const reason = buildPickupReason(bikes, walkTimeMinutes, level);
  return { level, score: Math.round(score), reason };
}

export function calculateDropoffConfidence(
  station: StationData,
  walkTimeMinutes: number,
): ConfidenceScore {
  if (!station.is_returning) {
    return { level: 'low', score: 0, reason: 'La estacion no acepta devoluciones' };
  }
  const capacity = station.capacity;
  if (capacity === 0) {
    return { level: 'low', score: 0, reason: 'La estacion no tiene capacidad' };
  }
  const docks = station.num_docks_available;
  const ratio = docks / capacity;
  let level: ConfidenceLevel;
  let score: number;
  if (ratio > 0.5) {
    level = 'high';
    score = clamp(70 + ratio * 30, 70, 100);
  } else if (ratio >= 0.25) {
    level = 'medium';
    score = clamp(30 + ratio * 80, 30, 69);
  } else {
    level = 'low';
    score = clamp(ratio * 120, 0, 29);
  }
  if (walkTimeMinutes > 5 && docks <= 2) {
    level = downgrade(level);
    score = clamp(score - 20, 0, 100);
  }
  const reason = buildDropoffReason(docks, walkTimeMinutes, level);
  return { level, score: Math.round(score), reason };
}

export function routeConfidence(
  pickup: ConfidenceScore,
  dropoff: ConfidenceScore,
): ConfidenceScore {
  const pickupIdx = LEVEL_ORDER.indexOf(pickup.level);
  const dropoffIdx = LEVEL_ORDER.indexOf(dropoff.level);
  if (pickupIdx >= dropoffIdx) {
    return { level: pickup.level, score: Math.min(pickup.score, dropoff.score), reason: pickup.reason };
  }
  return { level: dropoff.level, score: Math.min(pickup.score, dropoff.score), reason: dropoff.reason };
}

function buildPickupReason(bikes: number, walkMin: number, level: ConfidenceLevel): string {
  if (level === 'high') return bikes + ' bicis disponibles';
  if (level === 'medium') {
    return walkMin > 5
      ? 'Solo ' + bikes + ' bicis y estas a ' + Math.round(walkMin) + ' min andando'
      : bikes + ' bicis disponibles';
  }
  return walkMin > 5
    ? 'Solo ' + bikes + ' bicis disponibles y estas a ' + Math.round(walkMin) + ' min andando'
    : 'Solo ' + bikes + ' bicis disponibles';
}

function buildDropoffReason(docks: number, walkMin: number, level: ConfidenceLevel): string {
  if (level === 'high') return docks + ' huecos disponibles';
  if (level === 'medium') {
    return walkMin > 5
      ? 'Solo ' + docks + ' huecos y estas a ' + Math.round(walkMin) + ' min'
      : docks + ' huecos disponibles';
  }
  return walkMin > 5
    ? 'Solo ' + docks + ' huecos disponibles y estas a ' + Math.round(walkMin) + ' min'
    : 'Solo ' + docks + ' huecos disponibles';
}