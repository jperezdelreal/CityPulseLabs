/** GBFS v2 types for BiciCoruña bike-sharing system */

export interface VehicleTypeAvailable {
  vehicle_type_id: 'FIT' | 'EFIT' | 'BOOST' | string;
  count: number;
}

export interface VehicleDockAvailable {
  vehicle_type_ids: string[];
  count: number;
}

/** Static station metadata from station_information.json */
export interface StationInformation {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  address?: string;
  post_code?: string;
  short_name?: string;
  physical_configuration?: string;
  is_charging_station?: boolean;
  rental_methods?: string[];
}

/** Real-time station availability from station_status.json */
export interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_bikes_disabled?: number;
  num_docks_available: number;
  num_docks_disabled?: number;
  is_renting: boolean;
  is_returning: boolean;
  is_installed?: boolean;
  last_reported: number;
  status?: string;
  vehicle_types_available?: VehicleTypeAvailable[];
  vehicle_docks_available?: VehicleDockAvailable[];
}

/** Combined station info + status for enriched station objects */
export interface StationData extends StationInformation {
  num_bikes_available: number;
  num_bikes_disabled: number;
  num_docks_available: number;
  num_docks_disabled: number;
  is_renting: boolean;
  is_returning: boolean;
  is_installed: boolean;
  last_reported: number;
  vehicle_types_available: VehicleTypeAvailable[];
}

/** GBFS v2 response wrapper */
export interface GBFSResponse<T> {
  last_updated: number;
  ttl: number;
  data: T;
  version?: string;
}

/** GBFS discovery feed entry */
export interface GBFSFeed {
  name: string;
  url: string;
}

/** GBFS discovery response structure */
export interface GBFSDiscoveryData {
  [language: string]: {
    feeds: GBFSFeed[];
  };
}
