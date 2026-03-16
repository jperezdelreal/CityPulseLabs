import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  GeofencingZonesCollection,
  GeofencingZoneFeature,
} from '../../src/types/gbfs';
import {
  parseGeofencingFeatures,
  classifyZone,
  getZoneStyle,
  getZoneTooltip,
} from '../../src/services/geofencing';

// --- Mock data ---------------------------------------------------------------

const makeFeature = (
  name: string,
  rules?: GeofencingZoneFeature['properties']['rules'],
  geometryType: 'MultiPolygon' | 'Polygon' = 'MultiPolygon',
): GeofencingZoneFeature => ({
  type: 'Feature',
  geometry: {
    type: geometryType,
    coordinates:
      geometryType === 'MultiPolygon'
        ? [[[[-8.42, 43.36], [-8.40, 43.36], [-8.40, 43.37], [-8.42, 43.37], [-8.42, 43.36]]]]
        : [[[-8.42, 43.36], [-8.40, 43.36], [-8.40, 43.37], [-8.42, 43.37], [-8.42, 43.36]]],
  },
  properties: { name, rules },
});

const mockServiceArea = makeFeature('A Coruña Service Area', [
  { ride_allowed: true, ride_through_allowed: true },
]);

const mockRestrictedZone = makeFeature('Port Restricted Zone', [
  { ride_allowed: false, ride_through_allowed: false },
]);

const mockSpeedLimitZone = makeFeature('Old Town Speed Limit', [
  { ride_allowed: true, ride_through_allowed: true, maximum_speed_kph: 10 },
]);

const mockNoParkingZone = makeFeature('Plaza María Pita', [
  { ride_allowed: true, ride_through_allowed: true, station_parking: false },
]);

const mockNoRulesZone = makeFeature('Default Zone');

const mockCollection: GeofencingZonesCollection = {
  type: 'FeatureCollection',
  features: [
    mockServiceArea,
    mockRestrictedZone,
    mockSpeedLimitZone,
    mockNoParkingZone,
  ],
};

const emptyCollection: GeofencingZonesCollection = {
  type: 'FeatureCollection',
  features: [],
};

// --- Tests: parseGeofencingFeatures ------------------------------------------

describe('parseGeofencingFeatures', () => {
  it('returns all valid features from a collection', () => {
    const features = parseGeofencingFeatures(mockCollection);
    expect(features).toHaveLength(4);
  });

  it('returns empty array for an empty FeatureCollection', () => {
    const features = parseGeofencingFeatures(emptyCollection);
    expect(features).toHaveLength(0);
  });

  it('filters out features with invalid type', () => {
    const collection: GeofencingZonesCollection = {
      type: 'FeatureCollection',
      features: [
        mockServiceArea,
        { ...mockRestrictedZone, type: 'Invalid' as any },
      ],
    };
    const features = parseGeofencingFeatures(collection);
    expect(features).toHaveLength(1);
    expect(features[0].properties.name).toBe('A Coruña Service Area');
  });

  it('filters out features with null geometry', () => {
    const collection: GeofencingZonesCollection = {
      type: 'FeatureCollection',
      features: [
        mockServiceArea,
        { ...mockRestrictedZone, geometry: null as any },
      ],
    };
    const features = parseGeofencingFeatures(collection);
    expect(features).toHaveLength(1);
  });

  it('accepts both Polygon and MultiPolygon geometries', () => {
    const polygonFeature = makeFeature('Polygon Zone', [], 'Polygon');
    const collection: GeofencingZonesCollection = {
      type: 'FeatureCollection',
      features: [mockServiceArea, polygonFeature],
    };
    const features = parseGeofencingFeatures(collection);
    expect(features).toHaveLength(2);
  });

  it('returns empty for non-FeatureCollection type', () => {
    const bad = { type: 'Other', features: [mockServiceArea] } as any;
    const features = parseGeofencingFeatures(bad);
    expect(features).toHaveLength(0);
  });
});

// --- Tests: classifyZone -----------------------------------------------------

describe('classifyZone', () => {
  it('classifies a service area zone', () => {
    expect(classifyZone(mockServiceArea)).toBe('service-area');
  });

  it('classifies a restricted zone', () => {
    expect(classifyZone(mockRestrictedZone)).toBe('restricted');
  });

  it('classifies a speed limit zone', () => {
    expect(classifyZone(mockSpeedLimitZone)).toBe('speed-limit');
  });

  it('classifies a no-parking zone', () => {
    expect(classifyZone(mockNoParkingZone)).toBe('no-parking');
  });

  it('defaults to service-area for zones without rules', () => {
    expect(classifyZone(mockNoRulesZone)).toBe('service-area');
  });

  it('classifies as restricted when ride_allowed is false', () => {
    const zone = makeFeature('Test', [
      { ride_allowed: false, ride_through_allowed: true },
    ]);
    expect(classifyZone(zone)).toBe('restricted');
  });
});

// --- Tests: getZoneStyle -----------------------------------------------------

describe('getZoneStyle', () => {
  it('returns green style for service-area', () => {
    const style = getZoneStyle('service-area');
    expect(style.color).toBe('#22C55E');
    expect(style.fillOpacity).toBe(0.1);
    expect(style.dashArray).toBeUndefined();
  });

  it('returns red dashed style for restricted', () => {
    const style = getZoneStyle('restricted');
    expect(style.color).toBe('#EF4444');
    expect(style.fillOpacity).toBe(0.15);
    expect(style.dashArray).toBe('8 4');
  });

  it('returns amber style for speed-limit', () => {
    const style = getZoneStyle('speed-limit');
    expect(style.color).toBe('#F59E0B');
  });

  it('returns purple style for no-parking', () => {
    const style = getZoneStyle('no-parking');
    expect(style.color).toBe('#8B5CF6');
  });

  it('returns gray style for unknown', () => {
    const style = getZoneStyle('unknown');
    expect(style.color).toBe('#6B7280');
  });
});

// --- Tests: getZoneTooltip ---------------------------------------------------

describe('getZoneTooltip', () => {
  it('returns zone name for a zone without rules', () => {
    expect(getZoneTooltip(mockNoRulesZone)).toBe('Default Zone');
  });

  it('includes riding restriction for restricted zone', () => {
    const tooltip = getZoneTooltip(mockRestrictedZone);
    expect(tooltip).toContain('Port Restricted Zone');
    expect(tooltip).toContain('Riding not allowed');
  });

  it('includes speed limit info', () => {
    const tooltip = getZoneTooltip(mockSpeedLimitZone);
    expect(tooltip).toContain('Old Town Speed Limit');
    expect(tooltip).toContain('10 km/h');
  });

  it('includes no parking info', () => {
    const tooltip = getZoneTooltip(mockNoParkingZone);
    expect(tooltip).toContain('No parking');
  });

  it('returns "Unnamed zone" when name is empty', () => {
    const zone = makeFeature('', [{ ride_allowed: true, ride_through_allowed: true }]);
    expect(getZoneTooltip(zone)).toContain('Unnamed zone');
  });
});

// --- Tests: GeofencingOverlay component render --------------------------------

// Mock react-leaflet to avoid Leaflet DOM initialization in jsdom
vi.mock('react-leaflet', () => ({
  GeoJSON: ({ data, style, onEachFeature }: any) => (
    <div data-testid="geojson-layer" data-feature-count={data?.features?.length ?? 0} />
  ),
  Tooltip: ({ children }: any) => <span>{children}</span>,
}));

// Dynamic import after mock
const { default: GeofencingOverlay } = await import(
  '../../src/components/Map/GeofencingOverlay.tsx'
);

describe('GeofencingOverlay', () => {
  it('renders toggle button', () => {
    render(<GeofencingOverlay zones={mockCollection} loading={false} />);
    expect(screen.getByText('Zones')).toBeInTheDocument();
  });

  it('renders GeoJSON layer when zones are available and visible', () => {
    render(<GeofencingOverlay zones={mockCollection} loading={false} />);
    expect(screen.getByTestId('geojson-layer')).toBeInTheDocument();
  });

  it('hides GeoJSON layer after clicking toggle', () => {
    render(<GeofencingOverlay zones={mockCollection} loading={false} />);
    fireEvent.click(screen.getByText('Zones'));
    expect(screen.queryByTestId('geojson-layer')).not.toBeInTheDocument();
  });

  it('shows re-enabled GeoJSON layer after toggling twice', () => {
    render(<GeofencingOverlay zones={mockCollection} loading={false} />);
    const button = screen.getByText('Zones');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByTestId('geojson-layer')).toBeInTheDocument();
  });

  it('renders nothing when collection is empty', () => {
    const { container } = render(<GeofencingOverlay zones={emptyCollection} loading={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when zones is null', () => {
    const { container } = render(<GeofencingOverlay zones={null} loading={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when loading', () => {
    const { container } = render(
      <GeofencingOverlay zones={null} loading={true} />,
    );
    expect(container.innerHTML).toBe('');
  });
});
