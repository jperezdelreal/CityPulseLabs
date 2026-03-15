import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock react-leaflet since jsdom doesn't support canvas/WebGL
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
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
