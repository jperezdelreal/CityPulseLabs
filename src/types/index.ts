export type {
  StationInformation,
  StationStatus,
  StationData,
  GBFSResponse,
  GBFSFeed,
  GBFSDiscoveryData,
  VehicleTypeAvailable,
  VehicleDockAvailable,
} from './gbfs.ts';

// Backward-compatible aliases
export type { StationInformation as StationInfo } from './gbfs.ts';
export type { StationData as Station } from './gbfs.ts';

export interface Route {
  walkToStation: { station_id: string; name: string; lat: number; lon: number; capacity: number };
  bikeToStation: { station_id: string; name: string; lat: number; lon: number; capacity: number };
  walkToDest: number;
  totalDistance: number;
  totalTime: number;
}
