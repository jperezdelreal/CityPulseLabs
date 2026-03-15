import type { MultiModalRoute } from '../types/index.ts';

const CYCLING_KCAL_PER_KM = 30;
const WALKING_KCAL_PER_KM = 4;
const CO2_KG_PER_KM = 0.21;

/** Estimate calories burned cycling a given distance. */
export function calculateCalories(bikeDistanceKm: number, walkDistanceKm: number): number {
  return Math.round(bikeDistanceKm * CYCLING_KCAL_PER_KM + walkDistanceKm * WALKING_KCAL_PER_KM);
}

/** Estimate CO₂ saved vs driving the total distance by car. */
export function calculateCO2Saved(totalDistanceKm: number): number {
  return parseFloat((totalDistanceKm * CO2_KG_PER_KM).toFixed(2));
}

/** Format duration in seconds to a human-readable string. */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  return `${mins} min`;
}

/** Format distance in meters to a human-readable string. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Compute stats summary for a multi-modal route. */
export function getRouteStats(route: MultiModalRoute) {
  const bikeKm = route.bike_distance_meters / 1000;
  const walkKm = route.walk_distance_meters / 1000;
  const totalKm = bikeKm + walkKm;

  return {
    bikeDistance: route.bike_distance_meters,
    walkDistance: route.walk_distance_meters,
    totalDistance: route.bike_distance_meters + route.walk_distance_meters,
    calories: calculateCalories(bikeKm, walkKm),
    co2Saved: calculateCO2Saved(totalKm),
  };
}
