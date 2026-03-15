import { colors } from '../styles/tokens.ts';
import type { StationData } from '../types/index.ts';

export type AvailabilityLevel = 'good' | 'limited' | 'empty' | 'offline';

/** Determine availability level based on station data */
export function getAvailabilityLevel(station: StationData): AvailabilityLevel {
  if (!station.is_renting || !station.is_installed) return 'offline';

  const capacity = station.capacity;
  if (capacity === 0) return 'offline';

  const ratio = station.num_bikes_available / capacity;
  if (ratio > 0.5) return 'good';
  if (ratio >= 0.2) return 'limited';
  return 'empty';
}

/** Get the marker color for a station based on its availability */
export function getMarkerColor(station: StationData): string {
  const level = getAvailabilityLevel(station);
  return colors.availability[level];
}
