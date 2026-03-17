/**
 * Analytics data service with real Cosmos DB backend.
 * CosmosAnalyticsProvider queries the /api/analytics endpoint (backed by Cosmos DB).
 * MockAnalyticsProvider retained as fallback when API is unavailable.
 */

import type {
  AnalyticsData,
  AnalyticsProvider,
  HourlyUsage,
  StationDemand,
  DayTypeComparison,
  HeatmapCell,
} from '../types/analytics.ts';

// ---------------------------------------------------------------------------
// Cosmos-backed provider — queries real station data via Azure Function
// ---------------------------------------------------------------------------

const ANALYTICS_API_URL = '/api/analytics';

export class CosmosAnalyticsProvider implements AnalyticsProvider {
  async fetchAnalytics(): Promise<AnalyticsData> {
    const { fetchWithRetry } = await import('../utils/retry.ts');
    const res = await fetchWithRetry(ANALYTICS_API_URL, undefined, { timeoutMs: 10_000 });

    if (!res.ok) {
      throw new Error(`Analytics API error: ${res.status}`);
    }

    const data = await res.json() as AnalyticsData;
    return data;
  }
}

// ---------------------------------------------------------------------------
// Mock provider — fallback for development/offline
// ---------------------------------------------------------------------------

const MOCK_STATIONS = [
  { id: '1', name: 'Plaza de María Pita', lat: 43.3713, lon: -8.3964 },
  { id: '2', name: 'Estación de Tren', lat: 43.3545, lon: -8.4101 },
  { id: '3', name: 'Marineda City', lat: 43.3395, lon: -8.4178 },
  { id: '4', name: 'Torre de Hércules', lat: 43.3863, lon: -8.4065 },
  { id: '5', name: 'Paseo Marítimo', lat: 43.3679, lon: -8.4028 },
  { id: '6', name: 'Universidad', lat: 43.3322, lon: -8.4115 },
  { id: '7', name: 'Riazor', lat: 43.3647, lon: -8.4142 },
  { id: '8', name: 'Cuatro Caminos', lat: 43.3470, lon: -8.4081 },
  { id: '9', name: 'Plaza de Lugo', lat: 43.3625, lon: -8.3997 },
  { id: '10', name: 'Obelisco', lat: 43.3687, lon: -8.3948 },
];

function generateWeekdayHourly(): HourlyUsage[] {
  const pattern = [
    5, 3, 2, 1, 1, 3, 12, 35, 72, 58, 32, 28,
    35, 30, 25, 28, 42, 68, 75, 45, 28, 18, 12, 8,
  ];
  return pattern.map((base, hour) => ({
    hour,
    pickups: base + Math.floor(Math.random() * 8),
    dropoffs: base + Math.floor(Math.random() * 8 - 3),
  }));
}

function generateWeekendHourly(): HourlyUsage[] {
  const pattern = [
    3, 2, 1, 1, 1, 2, 5, 12, 22, 35, 48, 55,
    58, 52, 42, 38, 35, 30, 25, 18, 12, 8, 5, 3,
  ];
  return pattern.map((base, hour) => ({
    hour,
    pickups: base + Math.floor(Math.random() * 6),
    dropoffs: base + Math.floor(Math.random() * 6 - 2),
  }));
}

function generateTopStations(): StationDemand[] {
  const baseDemand = [120, 98, 85, 72, 68, 55, 48, 42, 38, 32];
  return MOCK_STATIONS.map((s, i) => ({
    station_id: s.id,
    name: s.name,
    totalTrips: (baseDemand[i] ?? 30) * 30 + Math.floor(Math.random() * 200),
    avgDailyTrips: (baseDemand[i] ?? 30) + Math.floor(Math.random() * 10),
  })).sort((a, b) => b.totalTrips - a.totalTrips);
}

function generateDayTypeComparison(): DayTypeComparison[] {
  return [
    {
      label: 'Lunes–Viernes',
      avgTrips: 680 + Math.floor(Math.random() * 40),
      peakHour: 18,
      avgDuration: 14 + Math.floor(Math.random() * 3),
    },
    {
      label: 'Sábado–Domingo',
      avgTrips: 420 + Math.floor(Math.random() * 30),
      peakHour: 12,
      avgDuration: 22 + Math.floor(Math.random() * 5),
    },
  ];
}

function generateHeatmap(): HeatmapCell[] {
  const intensities = [0.95, 0.82, 0.74, 0.68, 0.61, 0.53, 0.44, 0.38, 0.31, 0.22];
  return MOCK_STATIONS.map((s, i) => ({
    station_id: s.id,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    intensity: intensities[i] ?? 0.2,
  }));
}

export class MockAnalyticsProvider implements AnalyticsProvider {
  async fetchAnalytics(): Promise<AnalyticsData> {
    await new Promise((r) => setTimeout(r, 300));
    const isWeekend = [0, 6].includes(new Date().getDay());
    return {
      hourlyUsage: isWeekend ? generateWeekendHourly() : generateWeekdayHourly(),
      topStations: generateTopStations(),
      dayTypeComparison: generateDayTypeComparison(),
      heatmapCells: generateHeatmap(),
      lastUpdated: new Date().toISOString(),
      dataSource: 'mock',
    };
  }
}

// ---------------------------------------------------------------------------
// Provider management — uses Cosmos by default, falls back to mock
// ---------------------------------------------------------------------------

let activeProvider: AnalyticsProvider = new CosmosAnalyticsProvider();

export function setAnalyticsProvider(provider: AnalyticsProvider): void {
  activeProvider = provider;
}

export function getAnalyticsProvider(): AnalyticsProvider {
  return activeProvider;
}
