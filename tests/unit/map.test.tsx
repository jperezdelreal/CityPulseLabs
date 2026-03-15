import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { StationData } from '../../src/types/index';
import { getAvailabilityLevel, getMarkerColor } from '../../src/utils/stationColors';
import StationMarkers from '../../src/components/Map/StationMarkers';
import StationPopup from '../../src/components/Map/StationPopup';

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  CircleMarker: ({
    children,
    pathOptions,
  }: {
    children: React.ReactNode;
    pathOptions: { fillColor: string };
  }) => (
    <div data-testid="circle-marker" data-fill={pathOptions?.fillColor}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
}));

function makeStation(overrides: Partial<StationData> = {}): StationData {
  return {
    station_id: '1',
    name: 'Test Station',
    lat: 43.36,
    lon: -8.41,
    capacity: 20,
    num_bikes_available: 10,
    num_bikes_disabled: 0,
    num_docks_available: 10,
    num_docks_disabled: 0,
    is_renting: true,
    is_returning: true,
    is_installed: true,
    last_reported: Math.floor(Date.now() / 1000) - 30,
    vehicle_types_available: [
      { vehicle_type_id: 'FIT', count: 6 },
      { vehicle_type_id: 'EFIT', count: 4 },
    ],
    ...overrides,
  };
}

describe('getAvailabilityLevel', () => {
  it('returns "good" when >50% bikes available', () => {
    expect(getAvailabilityLevel(makeStation({ num_bikes_available: 15, capacity: 20 }))).toBe(
      'good',
    );
  });

  it('returns "limited" when 20-50% bikes available', () => {
    expect(getAvailabilityLevel(makeStation({ num_bikes_available: 6, capacity: 20 }))).toBe(
      'limited',
    );
  });

  it('returns "empty" when <20% bikes available', () => {
    expect(getAvailabilityLevel(makeStation({ num_bikes_available: 2, capacity: 20 }))).toBe(
      'empty',
    );
  });

  it('returns "offline" when station is not renting', () => {
    expect(getAvailabilityLevel(makeStation({ is_renting: false }))).toBe('offline');
  });

  it('returns "offline" when station is not installed', () => {
    expect(getAvailabilityLevel(makeStation({ is_installed: false }))).toBe('offline');
  });

  it('returns "offline" when capacity is 0', () => {
    expect(getAvailabilityLevel(makeStation({ capacity: 0 }))).toBe('offline');
  });
});

describe('getMarkerColor', () => {
  it('returns green for good availability', () => {
    expect(getMarkerColor(makeStation({ num_bikes_available: 15, capacity: 20 }))).toBe('#10B981');
  });

  it('returns amber for limited availability', () => {
    expect(getMarkerColor(makeStation({ num_bikes_available: 6, capacity: 20 }))).toBe('#F59E0B');
  });

  it('returns red for empty', () => {
    expect(getMarkerColor(makeStation({ num_bikes_available: 2, capacity: 20 }))).toBe('#EF4444');
  });

  it('returns gray for offline', () => {
    expect(getMarkerColor(makeStation({ is_renting: false }))).toBe('#9CA3AF');
  });
});

describe('StationMarkers', () => {
  it('renders correct number of markers', () => {
    const stations = [
      makeStation({ station_id: '1', name: 'Station 1' }),
      makeStation({ station_id: '2', name: 'Station 2' }),
      makeStation({ station_id: '3', name: 'Station 3' }),
    ];

    render(<StationMarkers stations={stations} />);
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(3);
  });

  it('renders no markers when stations is empty', () => {
    render(<StationMarkers stations={[]} />);
    expect(screen.queryAllByTestId('circle-marker')).toHaveLength(0);
  });
});

describe('StationPopup', () => {
  it('shows station name', () => {
    const station = makeStation({ name: 'Praza de María Pita' });
    render(<StationPopup station={station} />);
    expect(screen.getByText('Praza de María Pita')).toBeInTheDocument();
  });

  it('shows bikes and docks counts', () => {
    const station = makeStation({
      num_bikes_available: 8,
      num_docks_available: 7,
      capacity: 15,
    });
    render(<StationPopup station={station} />);
    expect(screen.getByText('8/15 bikes')).toBeInTheDocument();
    expect(screen.getByText('7/15 docks')).toBeInTheDocument();
  });

  it('shows vehicle type breakdown when available', () => {
    const station = makeStation({
      vehicle_types_available: [
        { vehicle_type_id: 'FIT', count: 6 },
        { vehicle_type_id: 'EFIT', count: 2 },
      ],
    });
    render(<StationPopup station={station} />);
    expect(screen.getByText('6 FIT')).toBeInTheDocument();
    expect(screen.getByText('2 EFIT')).toBeInTheDocument();
  });
});
