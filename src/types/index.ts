/** GBFS v2 types for BiciCoruña station data */

export interface StationInfo {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  address?: string;
}

export interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_docks_available: number;
  is_renting: boolean;
  is_returning: boolean;
  last_reported: number;
}

export interface Station extends StationInfo {
  status?: StationStatus;
}

export interface Route {
  walkToStation: StationInfo;
  bikeToStation: StationInfo;
  walkToDest: number; // meters
  totalDistance: number; // meters
  totalTime: number; // seconds
}

export interface GBFSResponse<T> {
  last_updated: number;
  ttl: number;
  data: T;
}
