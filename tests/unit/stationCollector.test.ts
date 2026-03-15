import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Azure modules BEFORE any imports that reference them.
// vi.mock is hoisted by vitest so the factories run first.
// ---------------------------------------------------------------------------

vi.mock('@azure/functions', () => ({
  app: { timer: vi.fn() },
}));

const mockUpsert = vi.fn();

vi.mock('../../api/src/shared/cosmos-client.js', () => ({
  getContainer: vi.fn(() => ({
    items: { upsert: mockUpsert },
  })),
}));

// ---------------------------------------------------------------------------
// Now import the module under test
// ---------------------------------------------------------------------------

import {
  buildDocumentId,
  parseVehicleTypes,
  buildSnapshot,
  fetchStationStatus,
  stationCollector,
  type GBFSStationStatus,
  type StationSnapshot,
} from '../../api/src/functions/stationCollector';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStation(overrides: Partial<GBFSStationStatus> = {}): GBFSStationStatus {
  return {
    station_id: '42',
    num_bikes_available: 10,
    num_docks_available: 5,
    is_renting: true,
    is_returning: true,
    last_reported: 1700000000,
    vehicle_types_available: [
      { vehicle_type_id: 'FIT', count: 6 },
      { vehicle_type_id: 'EFIT', count: 4 },
      { vehicle_type_id: 'BOOST', count: 0 },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stationCollector', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUpsert.mockResolvedValue({ resource: {} });
  });

  // ----- Document ID generation -----

  describe('buildDocumentId', () => {
    it('should produce a deterministic id from stationId and timestamp', () => {
      const id = buildDocumentId('42', '2026-03-15T20:10:00.000Z');
      expect(id).toBe('station_42_2026-03-15T20:10:00.000Z');
    });

    it('should handle different station ids', () => {
      const a = buildDocumentId('1', '2026-01-01T00:00:00.000Z');
      const b = buildDocumentId('99', '2026-01-01T00:00:00.000Z');
      expect(a).not.toBe(b);
    });

    it('should handle different timestamps for the same station', () => {
      const a = buildDocumentId('1', '2026-01-01T00:00:00.000Z');
      const b = buildDocumentId('1', '2026-01-01T00:10:00.000Z');
      expect(a).not.toBe(b);
    });
  });

  // ----- GBFS response parsing -----

  describe('parseVehicleTypes', () => {
    it('should convert vehicle_types_available to a keyed map', () => {
      const types = [
        { vehicle_type_id: 'FIT', count: 6 },
        { vehicle_type_id: 'EFIT', count: 4 },
        { vehicle_type_id: 'BOOST', count: 0 },
      ];
      expect(parseVehicleTypes(types)).toEqual({ FIT: 6, EFIT: 4, BOOST: 0 });
    });

    it('should return empty object when types is undefined', () => {
      expect(parseVehicleTypes(undefined)).toEqual({});
    });

    it('should return empty object when types is an empty array', () => {
      expect(parseVehicleTypes([])).toEqual({});
    });
  });

  // ----- Batch document creation -----

  describe('buildSnapshot', () => {
    const timestamp = new Date('2026-03-15T20:10:00.000Z');

    it('should build a valid StationSnapshot document', () => {
      const station = makeStation();
      const doc: StationSnapshot = buildSnapshot(station, timestamp);

      expect(doc.id).toBe('station_42_2026-03-15T20:10:00.000Z');
      expect(doc.stationId).toBe('42');
      expect(doc.timestamp).toBe('2026-03-15T20:10:00.000Z');
      expect(doc.hour).toBe(20);
      expect(doc.dayOfWeek).toBe(0); // Sunday
      expect(doc.bikesAvailable).toBe(10);
      expect(doc.docksAvailable).toBe(5);
      expect(doc.vehicleTypes).toEqual({ FIT: 6, EFIT: 4, BOOST: 0 });
      expect(doc.isRenting).toBe(true);
      expect(doc.isReturning).toBe(true);
      expect(doc.capacity).toBe(15);
      expect(doc.ttl).toBe(7_776_000);
    });

    it('should compute capacity as bikes + docks', () => {
      const station = makeStation({
        num_bikes_available: 3,
        num_docks_available: 12,
      });
      expect(buildSnapshot(station, timestamp).capacity).toBe(15);
    });

    it('should handle stations with no vehicle types', () => {
      const station = makeStation({ vehicle_types_available: undefined });
      const doc = buildSnapshot(station, timestamp);
      expect(doc.vehicleTypes).toEqual({});
    });

    it('should create unique ids for different stations at the same time', () => {
      const a = buildSnapshot(makeStation({ station_id: '1' }), timestamp);
      const b = buildSnapshot(makeStation({ station_id: '2' }), timestamp);
      expect(a.id).not.toBe(b.id);
    });

    it('should set TTL to 90 days (7 776 000 seconds)', () => {
      const doc = buildSnapshot(makeStation(), timestamp);
      expect(doc.ttl).toBe(90 * 24 * 60 * 60);
    });
  });

  // ----- fetchStationStatus -----

  describe('fetchStationStatus', () => {
    it('should parse a valid GBFS station_status response', async () => {
      const mockStations = [makeStation(), makeStation({ station_id: '99' })];
      const mockResponse = {
        last_updated: 1700000000,
        ttl: 0,
        data: { stations: mockStations },
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const stations = await fetchStationStatus('https://example.com/station_status');
      expect(stations).toHaveLength(2);
      expect(stations[0].station_id).toBe('42');
      expect(stations[1].station_id).toBe('99');
    });

    it('should throw on non-OK HTTP response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        }),
      );

      await expect(
        fetchStationStatus('https://example.com/station_status'),
      ).rejects.toThrow('GBFS fetch failed: 503 Service Unavailable');
    });
  });

  // ----- stationCollector handler (integration-style with mocked deps) -----

  describe('stationCollector handler', () => {
    function makeContext() {
      return {
        log: vi.fn(),
        error: vi.fn(),
      } as unknown as import('@azure/functions').InvocationContext;
    }

    const timer = { isPastDue: false } as import('@azure/functions').Timer;

    it('should skip gracefully when GBFS fetch fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('network down')),
      );

      const ctx = makeContext();
      await stationCollector(timer, ctx);

      expect(ctx.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch GBFS station status'),
      );
      expect(ctx.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipping this cycle'),
      );
    });

    it('should write snapshot documents for all stations on success', async () => {
      const mockStations = [
        makeStation({ station_id: '1' }),
        makeStation({ station_id: '2' }),
        makeStation({ station_id: '3' }),
      ];

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              last_updated: 1700000000,
              ttl: 0,
              data: { stations: mockStations },
            }),
        }),
      );

      process.env.GBFS_STATION_STATUS_URL = 'https://example.com/station_status';

      const ctx = makeContext();
      await stationCollector(timer, ctx);

      expect(ctx.log).toHaveBeenCalledWith(
        expect.stringContaining('Fetched 3 stations'),
      );
      expect(ctx.log).toHaveBeenCalledWith(
        expect.stringContaining('3 written'),
      );
      expect(mockUpsert).toHaveBeenCalledTimes(3);
    });
  });
});
