import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StationInformation, StationStatus, StationData } from '../../src/types/gbfs';
import { mergeStationData, filterOperational } from '../../src/services/gbfs';

// --- Mock data ---------------------------------------------------------------

const mockStationInfo: StationInformation[] = [
  {
    station_id: '1',
    name: 'Plaza Mayor',
    lat: 43.362,
    lon: -8.411,
    capacity: 20,
    address: 'Calle Principal 1',
  },
  {
    station_id: '2',
    name: 'Estación Tren',
    lat: 43.353,
    lon: -8.409,
    capacity: 15,
    address: 'Rúa de la Estación',
  },
  {
    station_id: '3',
    name: 'Torre de Hércules',
    lat: 43.383,
    lon: -8.402,
    capacity: 19,
  },
  {
    station_id: '4',
    name: 'Orphan Station',
    lat: 43.370,
    lon: -8.400,
    capacity: 10,
  },
];

const mockStationStatus: StationStatus[] = [
  {
    station_id: '1',
    num_bikes_available: 8,
    num_bikes_disabled: 1,
    num_docks_available: 11,
    num_docks_disabled: 0,
    is_renting: true,
    is_returning: true,
    is_installed: true,
    last_reported: 1700000000,
    vehicle_types_available: [
      { vehicle_type_id: 'FIT', count: 5 },
      { vehicle_type_id: 'EFIT', count: 3 },
      { vehicle_type_id: 'BOOST', count: 0 },
    ],
  },
  {
    station_id: '2',
    num_bikes_available: 3,
    num_bikes_disabled: 0,
    num_docks_available: 12,
    is_renting: false, // NOT renting → non-operational
    is_returning: true,
    last_reported: 1700000010,
    vehicle_types_available: [
      { vehicle_type_id: 'FIT', count: 2 },
      { vehicle_type_id: 'EFIT', count: 1 },
    ],
  },
  {
    station_id: '3',
    num_bikes_available: 0,
    num_docks_available: 19,
    is_renting: true,
    is_returning: false, // NOT returning → non-operational
    last_reported: 1700000020,
  },
];

// --- Tests -------------------------------------------------------------------

describe('mergeStationData', () => {
  let merged: StationData[];

  beforeEach(() => {
    merged = mergeStationData(mockStationInfo, mockStationStatus);
  });

  it('merges only stations present in both info and status', () => {
    expect(merged).toHaveLength(3);
    const ids = merged.map((s) => s.station_id);
    expect(ids).toContain('1');
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    expect(ids).not.toContain('4'); // no status data
  });

  it('copies station information fields into merged object', () => {
    const station1 = merged.find((s) => s.station_id === '1')!;
    expect(station1.name).toBe('Plaza Mayor');
    expect(station1.lat).toBe(43.362);
    expect(station1.lon).toBe(-8.411);
    expect(station1.capacity).toBe(20);
    expect(station1.address).toBe('Calle Principal 1');
  });

  it('copies station status fields into merged object', () => {
    const station1 = merged.find((s) => s.station_id === '1')!;
    expect(station1.num_bikes_available).toBe(8);
    expect(station1.num_bikes_disabled).toBe(1);
    expect(station1.num_docks_available).toBe(11);
    expect(station1.num_docks_disabled).toBe(0);
    expect(station1.is_renting).toBe(true);
    expect(station1.is_returning).toBe(true);
    expect(station1.last_reported).toBe(1700000000);
  });

  it('includes vehicle_types_available with FIT/EFIT/BOOST', () => {
    const station1 = merged.find((s) => s.station_id === '1')!;
    expect(station1.vehicle_types_available).toHaveLength(3);

    const fit = station1.vehicle_types_available.find((v) => v.vehicle_type_id === 'FIT');
    const efit = station1.vehicle_types_available.find((v) => v.vehicle_type_id === 'EFIT');
    const boost = station1.vehicle_types_available.find((v) => v.vehicle_type_id === 'BOOST');

    expect(fit?.count).toBe(5);
    expect(efit?.count).toBe(3);
    expect(boost?.count).toBe(0);
  });

  it('defaults missing optional status fields', () => {
    const station3 = merged.find((s) => s.station_id === '3')!;
    expect(station3.num_bikes_disabled).toBe(0);
    expect(station3.num_docks_disabled).toBe(0);
    expect(station3.is_installed).toBe(true);
    expect(station3.vehicle_types_available).toEqual([]);
  });
});

describe('filterOperational', () => {
  let merged: StationData[];

  beforeEach(() => {
    merged = mergeStationData(mockStationInfo, mockStationStatus);
  });

  it('removes stations where is_renting is false', () => {
    const operational = filterOperational(merged);
    const ids = operational.map((s) => s.station_id);
    expect(ids).not.toContain('2'); // is_renting = false
  });

  it('removes stations where is_returning is false', () => {
    const operational = filterOperational(merged);
    const ids = operational.map((s) => s.station_id);
    expect(ids).not.toContain('3'); // is_returning = false
  });

  it('keeps stations that are both renting and returning', () => {
    const operational = filterOperational(merged);
    const ids = operational.map((s) => s.station_id);
    expect(ids).toContain('1');
  });

  it('returns correct count after filtering', () => {
    const operational = filterOperational(merged);
    expect(operational).toHaveLength(1);
  });
});

describe('type parsing', () => {
  it('StationData has all required fields from both info and status', () => {
    const merged = mergeStationData(mockStationInfo, mockStationStatus);
    const station = merged[0]!;

    // Info fields
    expect(station).toHaveProperty('station_id');
    expect(station).toHaveProperty('name');
    expect(station).toHaveProperty('lat');
    expect(station).toHaveProperty('lon');
    expect(station).toHaveProperty('capacity');

    // Status fields
    expect(station).toHaveProperty('num_bikes_available');
    expect(station).toHaveProperty('num_docks_available');
    expect(station).toHaveProperty('is_renting');
    expect(station).toHaveProperty('is_returning');
    expect(station).toHaveProperty('last_reported');
    expect(station).toHaveProperty('vehicle_types_available');
  });

  it('handles station status without vehicle_types_available', () => {
    const infoSlice = [mockStationInfo[0]!];
    const statusWithout: StationStatus[] = [
      {
        station_id: '1',
        num_bikes_available: 5,
        num_docks_available: 10,
        is_renting: true,
        is_returning: true,
        last_reported: 1700000000,
      },
    ];
    const result = mergeStationData(infoSlice, statusWithout);
    expect(result[0]!.vehicle_types_available).toEqual([]);
  });

  it('handles empty arrays gracefully', () => {
    expect(mergeStationData([], [])).toEqual([]);
    expect(mergeStationData(mockStationInfo, [])).toEqual([]);
    expect(filterOperational([])).toEqual([]);
  });
});
