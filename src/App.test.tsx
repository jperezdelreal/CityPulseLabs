import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock react-leaflet since jsdom doesn't support canvas/WebGL
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  ZoomControl: () => <div data-testid="zoom-control" />,
  CircleMarker: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="circle-marker">{children}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  Marker: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  Polyline: () => <div data-testid="polyline" />,
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  useMapEvents: () => null,
  useMap: () => ({ setView: () => {}, getZoom: () => 14 }),
  GeoJSON: () => <div data-testid="geojson-layer" />,
}));

// Mock useStations hook
vi.mock('./hooks/useStations', () => ({
  useStations: () => ({
    stations: [],
    loading: false,
    error: null,
    staleWarning: null,
    lastUpdated: null,
  }),
}));

// Mock useRoutes hook
vi.mock('./hooks/useRoutes', () => ({
  useRoutes: () => ({
    routes: [],
    walkingRoute: null,
    loading: false,
    error: null,
  }),
}));

// Mock useGeolocation hook
vi.mock('./hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    position: null,
    accuracy: null,
    loading: false,
    error: null,
    supported: false,
    permissionDenied: false,
    requestPosition: () => {},
  }),
}));

describe('App', () => {
  it('renders the BiciCoru\u00F1a header', () => {
    render(<App />);
    expect(screen.getByText(/BiciCoru\u00F1a/)).toBeInTheDocument();
  });

  it('renders the map container', () => {
    render(<App />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
});
