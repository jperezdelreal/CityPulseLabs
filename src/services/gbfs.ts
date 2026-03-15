import type {
  GBFSResponse,
  GBFSDiscoveryData,
  GBFSFeed,
  StationInformation,
  StationStatus,
  StationData,
} from '../types/index.ts';

const GBFS_DISCOVERY_URL =
  'https://acoruna.publicbikesystem.net/customer/gbfs/v2/gbfs.json';
const DEFAULT_LANGUAGE = 'en';
const DEFAULT_POLL_INTERVAL_MS = 30_000;

/** Resolve station_information and station_status URLs from the GBFS discovery feed */
export async function discoverFeedUrls(
  language = DEFAULT_LANGUAGE,
): Promise<{ stationInformationUrl: string; stationStatusUrl: string }> {
  const res = await fetch(GBFS_DISCOVERY_URL);
  if (!res.ok) throw new Error(`GBFS discovery failed: ${res.status}`);
  const json: GBFSResponse<GBFSDiscoveryData> = await res.json();

  const feeds = json.data[language]?.feeds ?? json.data[Object.keys(json.data)[0]!]?.feeds;
  if (!feeds) throw new Error('No feeds found in GBFS discovery response');

  const infoFeed = feeds.find((f: GBFSFeed) => f.name === 'station_information');
  const statusFeed = feeds.find((f: GBFSFeed) => f.name === 'station_status');
  if (!infoFeed || !statusFeed) {
    throw new Error('Missing station_information or station_status feeds');
  }

  return {
    stationInformationUrl: infoFeed.url,
    stationStatusUrl: statusFeed.url,
  };
}

/** Fetch station information (static metadata) */
export async function fetchStationInformation(
  url: string,
): Promise<StationInformation[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`station_information fetch failed: ${res.status}`);
  const json: GBFSResponse<{ stations: StationInformation[] }> = await res.json();
  return json.data.stations;
}

/** Fetch station status (real-time availability) */
export async function fetchStationStatus(
  url: string,
): Promise<StationStatus[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`station_status fetch failed: ${res.status}`);
  const json: GBFSResponse<{ stations: StationStatus[] }> = await res.json();
  return json.data.stations;
}

/** Merge station information with station status into enriched station objects */
export function mergeStationData(
  info: StationInformation[],
  status: StationStatus[],
): StationData[] {
  const statusMap = new Map(status.map((s) => [s.station_id, s]));

  return info
    .filter((station) => statusMap.has(station.station_id))
    .map((station) => {
      const s = statusMap.get(station.station_id)!;
      return {
        ...station,
        num_bikes_available: s.num_bikes_available,
        num_bikes_disabled: s.num_bikes_disabled ?? 0,
        num_docks_available: s.num_docks_available,
        num_docks_disabled: s.num_docks_disabled ?? 0,
        is_renting: s.is_renting,
        is_returning: s.is_returning,
        is_installed: s.is_installed ?? true,
        last_reported: s.last_reported,
        vehicle_types_available: s.vehicle_types_available ?? [],
      };
    });
}

/** Filter out stations that are not currently renting or returning */
export function filterOperational(stations: StationData[]): StationData[] {
  return stations.filter((s) => s.is_renting && s.is_returning);
}

/** Fetch, merge, and filter all station data in one call */
export async function fetchAllStations(): Promise<StationData[]> {
  const { stationInformationUrl, stationStatusUrl } = await discoverFeedUrls();
  const [info, status] = await Promise.all([
    fetchStationInformation(stationInformationUrl),
    fetchStationStatus(stationStatusUrl),
  ]);
  return filterOperational(mergeStationData(info, status));
}

// --- Auto-refresh support ---

type StationListener = (stations: StationData[]) => void;

export class GBFSPoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private cachedInfo: StationInformation[] = [];
  private feedUrls: { stationInformationUrl: string; stationStatusUrl: string } | null = null;
  private pollIntervalMs: number;

  constructor(pollIntervalMs = DEFAULT_POLL_INTERVAL_MS) {
    this.pollIntervalMs = pollIntervalMs;
  }

  async start(listener: StationListener): Promise<void> {
    this.feedUrls = await discoverFeedUrls();

    // Initial full fetch (info + status)
    this.cachedInfo = await fetchStationInformation(this.feedUrls.stationInformationUrl);
    const status = await fetchStationStatus(this.feedUrls.stationStatusUrl);
    listener(filterOperational(mergeStationData(this.cachedInfo, status)));

    // Poll only status on subsequent ticks
    this.intervalId = setInterval(async () => {
      try {
        const freshStatus = await fetchStationStatus(this.feedUrls!.stationStatusUrl);
        listener(filterOperational(mergeStationData(this.cachedInfo, freshStatus)));
      } catch {
        // Silently skip failed poll; UI keeps previous data
      }
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
