export type {
  StationInformation,
  StationStatus,
  StationData,
  GBFSResponse,
  GBFSFeed,
  GBFSDiscoveryData,
  VehicleTypeAvailable,
  VehicleDockAvailable,
  GeofencingRule,
  GeofencingZoneProperties,
  GeofencingZoneFeature,
  GeofencingZonesCollection,
} from './gbfs.ts';

// Backward-compatible aliases
export type { StationInformation as StationInfo } from './gbfs.ts';
export type { StationData as Station } from './gbfs.ts';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteSegment {
  geometry: [number, number][];
  duration_seconds: number;
  distance_meters: number;
}

export interface StationSummary {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface MultiModalRoute {
  pickup_station: StationSummary;
  dropoff_station: StationSummary;
  walk_to_pickup: RouteSegment;
  bike_segment: RouteSegment;
  walk_to_destination: RouteSegment;
  total_time_seconds: number;
  walk_time_seconds: number;
  bike_time_seconds: number;
  walk_distance_meters: number;
  bike_distance_meters: number;
}

export interface WalkingRoute {
  segment: RouteSegment;
  total_time_seconds: number;
  total_distance_meters: number;
}

