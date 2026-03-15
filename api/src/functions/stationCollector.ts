import { app, type InvocationContext, type Timer } from '@azure/functions';
import { getContainer } from '../shared/cosmos-client.js';

// ---------------------------------------------------------------------------
// GBFS v2 types for station_status response
// ---------------------------------------------------------------------------

export interface VehicleTypeAvailable {
  vehicle_type_id: string;
  count: number;
}

export interface GBFSStationStatus {
  station_id: string;
  num_bikes_available: number;
  num_docks_available: number;
  vehicle_types_available?: VehicleTypeAvailable[];
  is_renting: boolean;
  is_returning: boolean;
  last_reported: number;
}

export interface GBFSStationStatusResponse {
  last_updated: number;
  ttl: number;
  data: {
    stations: GBFSStationStatus[];
  };
}

// ---------------------------------------------------------------------------
// Cosmos DB document schema
// ---------------------------------------------------------------------------

export interface StationSnapshot {
  id: string;
  stationId: string;
  timestamp: string;
  hour: number;
  dayOfWeek: number;
  bikesAvailable: number;
  docksAvailable: number;
  vehicleTypes: Record<string, number>;
  isRenting: boolean;
  isReturning: boolean;
  capacity: number;
  ttl: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TTL_90_DAYS = 7_776_000;

const GBFS_STATION_STATUS_URL =
  process.env.GBFS_STATION_STATUS_URL ??
  'https://tier-acropolis.publicbikesystem.net/customer/gbfs/v2/coruna/station_status';

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/** Deterministic document ID for idempotent upserts. */
export function buildDocumentId(stationId: string, isoTimestamp: string): string {
  return `station_${stationId}_${isoTimestamp}`;
}

/** Convert GBFS vehicle_types_available array to a keyed map. */
export function parseVehicleTypes(
  types?: VehicleTypeAvailable[],
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!types) return result;
  for (const vt of types) {
    result[vt.vehicle_type_id] = vt.count;
  }
  return result;
}

/** Build a Cosmos DB snapshot document from a GBFS station status. */
export function buildSnapshot(
  station: GBFSStationStatus,
  timestamp: Date,
): StationSnapshot {
  const isoTimestamp = timestamp.toISOString();
  return {
    id: buildDocumentId(station.station_id, isoTimestamp),
    stationId: station.station_id,
    timestamp: isoTimestamp,
    hour: timestamp.getUTCHours(),
    dayOfWeek: timestamp.getUTCDay(),
    bikesAvailable: station.num_bikes_available,
    docksAvailable: station.num_docks_available,
    vehicleTypes: parseVehicleTypes(station.vehicle_types_available),
    isRenting: station.is_renting,
    isReturning: station.is_returning,
    capacity: station.num_bikes_available + station.num_docks_available,
    ttl: TTL_90_DAYS,
  };
}

/** Fetch station_status.json from the GBFS API. */
export async function fetchStationStatus(
  url: string = GBFS_STATION_STATUS_URL,
): Promise<GBFSStationStatus[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GBFS fetch failed: ${response.status} ${response.statusText}`);
  }
  const body: GBFSStationStatusResponse = await response.json() as GBFSStationStatusResponse;
  return body.data.stations;
}

// ---------------------------------------------------------------------------
// Timer Trigger handler
// ---------------------------------------------------------------------------

export async function stationCollector(
  _timer: Timer,
  context: InvocationContext,
): Promise<void> {
  const snapshotTime = new Date();
  context.log(`Station collector triggered at ${snapshotTime.toISOString()}`);

  // 1. Fetch station data from GBFS API
  let stations: GBFSStationStatus[];
  try {
    stations = await fetchStationStatus();
    context.log(`Fetched ${stations.length} stations from GBFS API`);
  } catch (error) {
    context.error(`Failed to fetch GBFS station status: ${error}`);
    context.log('Skipping this cycle — will retry on next trigger');
    return;
  }

  // 2. Build snapshot documents
  const snapshots = stations.map((s) => buildSnapshot(s, snapshotTime));

  // 3. Batch write to Cosmos DB (upsert for idempotency)
  const container = getContainer();
  let successCount = 0;
  let failCount = 0;

  const writePromises = snapshots.map(async (doc) => {
    try {
      await container.items.upsert(doc);
      successCount++;
    } catch (error) {
      failCount++;
      context.error(`Failed to write snapshot for station ${doc.stationId}: ${error}`);
    }
  });

  await Promise.all(writePromises);

  context.log(
    `Snapshot complete: ${successCount} written, ${failCount} failed, ` +
      `${stations.length} total stations`,
  );
}

// ---------------------------------------------------------------------------
// Function registration — Azure Functions v4 programming model
// ---------------------------------------------------------------------------

app.timer('stationCollector', {
  schedule: '0 */10 * * * *',
  handler: stationCollector,
});
