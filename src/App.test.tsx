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
}));

// Mock useStations hook
vi.mock('./hooks/useStations', () => ({
  useStations: () => ({
    stations: [],
    loading: false,
    error: null,
    lastUpdated: null,
  }),
}));

describe('App', () => {
  it('renders the BiciCoruña header', () => {
    render(<App />);
    expect(screen.getByText(/BiciCoruña/)).toBeInTheDocument();
  });

  it('renders the map container', () => {
    render(<App />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
});
