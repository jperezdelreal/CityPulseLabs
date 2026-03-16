/** Analytics data types — designed for easy mock → Cosmos DB switch */

export interface HourlyUsage {
  hour: number; // 0–23
  pickups: number;
  dropoffs: number;
}

export interface StationDemand {
  station_id: string;
  name: string;
  totalTrips: number;
  avgDailyTrips: number;
}

export interface DayTypeComparison {
  label: string; // 'Lunes-Viernes' | 'Sábado-Domingo'
  avgTrips: number;
  peakHour: number;
  avgDuration: number; // minutes
}

export interface HeatmapCell {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  intensity: number; // 0–1 normalized usage
}

export interface AnalyticsData {
  hourlyUsage: HourlyUsage[];
  topStations: StationDemand[];
  dayTypeComparison: DayTypeComparison[];
  heatmapCells: HeatmapCell[];
  lastUpdated: string;
  dataSource: 'mock' | 'cosmos';
}

/**
 * Analytics data provider interface.
 * Implementations: MockAnalyticsProvider (now), CosmosAnalyticsProvider (future).
 */
export interface AnalyticsProvider {
  fetchAnalytics(): Promise<AnalyticsData>;
}
