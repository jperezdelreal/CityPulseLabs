import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileRoutePanel from '../../src/components/RoutePanel/MobileRoutePanel';
import type { MultiModalRoute, WalkingRoute, StationData } from '../../src/types/index';

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

function makeRoute(overrides: Partial<MultiModalRoute> = {}): MultiModalRoute {
  const pickupStation = makeStation({ station_id: 'pickup', name: 'Pickup Station' });
  const dropoffStation = makeStation({ station_id: 'dropoff', name: 'Dropoff Station' });

  return {
    pickup_station: pickupStation,
    dropoff_station: dropoffStation,
    walk_to_pickup: {
      distance_meters: 200,
      duration_seconds: 150,
      path: [[43.36, -8.41], [43.361, -8.411]],
    },
    bike_segment: {
      distance_meters: 2000,
      duration_seconds: 480,
      path: [[43.361, -8.411], [43.37, -8.42]],
    },
    walk_to_destination: {
      distance_meters: 100,
      duration_seconds: 75,
      path: [[43.37, -8.42], [43.371, -8.421]],
    },
    total_time_seconds: 705,
    total_distance_meters: 2300,
    walk_time_seconds: 225,
    bike_time_seconds: 480,
    ...overrides,
  };
}

function makeWalkingRoute(): WalkingRoute {
  return {
    total_time_seconds: 1500,
    total_distance_meters: 1800,
    path: [[43.36, -8.41], [43.371, -8.421]],
  };
}

describe('MobileRoutePanel — Bottom Sheet Behavior', () => {
  const defaultProps = {
    routes: [],
    walkingRoute: null,
    stations: [],
    routeLoading: false,
    routeError: null,
    selectedRouteIndex: 0,
    onSelectRoute: vi.fn(),
    onRetryRoutes: vi.fn(),
    bikeType: 'any' as const,
    selectedStation: null,
    stationsLoading: false,
    stationsError: null,
    lastUpdated: null,
    onCloseStation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when no routes, loading, error, or selectedStation', () => {
    const { container } = render(<MobileRoutePanel {...defaultProps} />);
    expect(container.querySelector('[data-testid="mobile-route-panel"]')).toBeNull();
  });

  it('renders panel when routes are available', () => {
    const routes = [makeRoute()];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);
    expect(screen.getByTestId('mobile-route-panel')).toBeInTheDocument();
  });

  it('bottom sheet starts collapsed (height: 80px) when routes arrive', () => {
    const routes = [makeRoute()];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    const { container } = render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);
    const panel = container.querySelector('[data-testid="mobile-route-panel"]') as HTMLElement;
    
    // Should start collapsed
    expect(panel.style.height).toBe('80px');
  });

  it('bottom sheet auto-expands when selectedStation changes', () => {
    const routes = [makeRoute()];
    const stations = [makeStation({ station_id: 'pickup', name: 'Pickup Station' })];
    const selectedStation = makeStation({ station_id: 'selected', name: 'Selected Station' });

    const { container, rerender } = render(
      <MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />
    );

    // Initially collapsed
    const panel = container.querySelector('[data-testid="mobile-route-panel"]') as HTMLElement;
    expect(panel.style.height).toBe('80px');

    // Select a station → should auto-expand
    rerender(
      <MobileRoutePanel
        {...defaultProps}
        routes={routes}
        stations={stations}
        selectedStation={selectedStation}
      />
    );

    expect(panel.style.height).toBe('65vh');
  });

  it('peek bar tap expands the sheet', () => {
    const routes = [makeRoute()];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    const { container } = render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);
    
    // Initially collapsed
    const panel = container.querySelector('[data-testid="mobile-route-panel"]') as HTMLElement;
    expect(panel.style.height).toBe('80px');

    // Click peek bar button
    const peekButton = screen.getByText(/Toca para ver/i).closest('button');
    fireEvent.click(peekButton!);

    // Should expand
    expect(panel.style.height).toBe('65vh');
  });

  it('drag handle click toggles expansion', () => {
    const routes = [makeRoute()];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    const { container } = render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);
    
    const panel = container.querySelector('[data-testid="mobile-route-panel"]') as HTMLElement;
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;

    // Initially collapsed
    expect(panel.style.height).toBe('80px');

    // Click drag handle → expand
    fireEvent.click(dragHandle);
    expect(panel.style.height).toBe('65vh');

    // Click again → collapse
    fireEvent.click(dragHandle);
    expect(panel.style.height).toBe('80px');
  });
});

describe('MobileRoutePanel — Peek Bar Content', () => {
  const defaultProps = {
    routes: [],
    walkingRoute: null,
    stations: [],
    routeLoading: false,
    routeError: null,
    selectedRouteIndex: 0,
    onSelectRoute: vi.fn(),
    onRetryRoutes: vi.fn(),
    bikeType: 'any' as const,
    selectedStation: null,
    stationsLoading: false,
    stationsError: null,
    lastUpdated: null,
    onCloseStation: vi.fn(),
  };

  it('peek bar shows route count (singular)', () => {
    const routes = [makeRoute()];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);
    expect(screen.getByText(/1 ruta disponible/i)).toBeInTheDocument();
  });

  it('peek bar shows route count (plural)', () => {
    const routes = [makeRoute({ total_time_seconds: 600 }), makeRoute({ total_time_seconds: 700 })];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);
    expect(screen.getByText(/2 rutas disponibles/i)).toBeInTheDocument();
  });

  it('peek bar shows fastest route duration', () => {
    const routes = [makeRoute({ total_time_seconds: 705 })];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);
    // 705 seconds = 11m 45s → should show "12 min" (rounded)
    expect(screen.getByText(/12 min/i)).toBeInTheDocument();
  });

  it('peek bar shows loading message when routeLoading=true', () => {
    render(<MobileRoutePanel {...defaultProps} routeLoading={true} />);
    expect(screen.getByText(/Calculando rutas/i)).toBeInTheDocument();
  });
});

describe('MobileRoutePanel — Route Cards Vertical List', () => {
  const defaultProps = {
    routes: [],
    walkingRoute: null,
    stations: [],
    routeLoading: false,
    routeError: null,
    selectedRouteIndex: 0,
    onSelectRoute: vi.fn(),
    onRetryRoutes: vi.fn(),
    bikeType: 'any' as const,
    selectedStation: null,
    stationsLoading: false,
    stationsError: null,
    lastUpdated: null,
    onCloseStation: vi.fn(),
  };

  it('route cards render in vertical list (no horizontal scroll)', () => {
    const routes = [makeRoute({ total_time_seconds: 600 }), makeRoute({ total_time_seconds: 700 })];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    const { container } = render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);

    // Expand to see cards
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;
    fireEvent.click(dragHandle);

    // Find the route cards container
    const cardsContainer = container.querySelector('.space-y-3');
    expect(cardsContainer).toBeInTheDocument();

    // Should NOT have horizontal scroll classes
    expect(cardsContainer?.className).not.toContain('overflow-x-auto');
    expect(cardsContainer?.className).not.toContain('snap-x');
  });

  it('selected route has green left border (border-l-[3px] border-primary-500)', () => {
    const routes = [makeRoute({ total_time_seconds: 600 }), makeRoute({ total_time_seconds: 700 })];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    const { container } = render(
      <MobileRoutePanel {...defaultProps} routes={routes} stations={stations} selectedRouteIndex={1} />
    );

    // Expand to see cards
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;
    fireEvent.click(dragHandle);

    // Find all route card buttons
    const routeButtons = container.querySelectorAll('button[class*="rounded-2xl"]');
    expect(routeButtons.length).toBe(2);

    // First route (not selected) should have transparent border
    const firstRouteClasses = routeButtons[0].className;
    expect(firstRouteClasses).toContain('border-transparent');

    // Second route (selected) should have green border
    const secondRouteClasses = routeButtons[1].className;
    expect(secondRouteClasses).toContain('border-primary-500');
    expect(secondRouteClasses).toContain('border-l-[3px]');
  });

  it('clicking a route card calls onSelectRoute with correct index', () => {
    const routes = [makeRoute({ total_time_seconds: 600 }), makeRoute({ total_time_seconds: 700 })];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];
    const onSelectRoute = vi.fn();

    const { container } = render(
      <MobileRoutePanel {...defaultProps} routes={routes} stations={stations} onSelectRoute={onSelectRoute} />
    );

    // Expand to see cards
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;
    fireEvent.click(dragHandle);

    // Click second route card
    const routeButtons = container.querySelectorAll('button[class*="rounded-2xl"]');
    fireEvent.click(routeButtons[1]);

    expect(onSelectRoute).toHaveBeenCalledWith(1);
  });

  it('all route cards are visible without scrolling horizontally', () => {
    const routes = [
      makeRoute({ total_time_seconds: 600 }),
      makeRoute({ total_time_seconds: 700 }),
      makeRoute({ total_time_seconds: 800 }),
    ];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    const { container } = render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);

    // Expand to see cards
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;
    fireEvent.click(dragHandle);

    // All route cards should be present in the DOM (no virtualization/hidden cards)
    const routeButtons = container.querySelectorAll('button[class*="rounded-2xl"]');
    expect(routeButtons.length).toBe(3);

    // No pagination dots should exist
    expect(container.querySelector('[class*="pagination"]')).toBeNull();
    expect(container.querySelector('[class*="dot"]')).toBeNull();
  });
});

describe('MobileRoutePanel — Route Card Content', () => {
  const defaultProps = {
    routes: [],
    walkingRoute: null,
    stations: [],
    routeLoading: false,
    routeError: null,
    selectedRouteIndex: 0,
    onSelectRoute: vi.fn(),
    onRetryRoutes: vi.fn(),
    bikeType: 'any' as const,
    selectedStation: null,
    stationsLoading: false,
    stationsError: null,
    lastUpdated: null,
    onCloseStation: vi.fn(),
  };

  it('route card displays total duration', () => {
    const routes = [makeRoute({ total_time_seconds: 720 })]; // 12 minutes
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    const { container } = render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);

    // Expand to see cards
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;
    fireEvent.click(dragHandle);

    expect(screen.getByText(/12 min/i)).toBeInTheDocument();
  });

  it('route card displays station names', () => {
    const pickupStation = makeStation({ station_id: 'pickup', name: 'Plaza Mayor' });
    const dropoffStation = makeStation({ station_id: 'dropoff', name: 'Estación Sur' });
    
    const route = {
      ...makeRoute(),
      pickup_station: pickupStation,
      dropoff_station: dropoffStation,
    };
    
    const routes = [route];
    const stations = [pickupStation, dropoffStation];

    const { container } = render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);

    // Expand to see cards
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;
    fireEvent.click(dragHandle);

    expect(screen.getByText(/Plaza Mayor/i)).toBeInTheDocument();
    expect(screen.getByText(/Estación Sur/i)).toBeInTheDocument();
  });

  it('route card shows walk + bike segment durations', () => {
    const routes = [makeRoute({ walk_time_seconds: 180, bike_time_seconds: 420 })];
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    const { container } = render(<MobileRoutePanel {...defaultProps} routes={routes} stations={stations} />);

    // Expand to see cards
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;
    fireEvent.click(dragHandle);

    // 180s = 3 min walk, 420s = 7 min bike
    expect(screen.getByText(/3 min/i)).toBeInTheDocument();
    expect(screen.getByText(/7 min/i)).toBeInTheDocument();
  });

  it('route card shows time saved vs walking', () => {
    const routes = [makeRoute({ total_time_seconds: 600 })]; // 10 min by bike
    const walkingRoute = makeWalkingRoute(); // 1500s = 25 min walking
    const stations = [
      makeStation({ station_id: 'pickup', name: 'Pickup Station' }),
      makeStation({ station_id: 'dropoff', name: 'Dropoff Station' }),
    ];

    const { container } = render(
      <MobileRoutePanel {...defaultProps} routes={routes} stations={stations} walkingRoute={walkingRoute} />
    );

    // Expand to see cards
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;
    fireEvent.click(dragHandle);

    // 25 - 10 = 15 minutes saved
    expect(screen.getByText(/Ahorras 15 min vs caminar/i)).toBeInTheDocument();
  });
});

describe('MobileRoutePanel — Loading & Error States', () => {
  const defaultProps = {
    routes: [],
    walkingRoute: null,
    stations: [],
    routeLoading: false,
    routeError: null,
    selectedRouteIndex: 0,
    onSelectRoute: vi.fn(),
    onRetryRoutes: vi.fn(),
    bikeType: 'any' as const,
    selectedStation: null,
    stationsLoading: false,
    stationsError: null,
    lastUpdated: null,
    onCloseStation: vi.fn(),
  };

  it('shows loading state with skeleton shimmer', () => {
    const { container } = render(<MobileRoutePanel {...defaultProps} routeLoading={true} />);

    // Expand to see loading state
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;
    fireEvent.click(dragHandle);

    const skeletons = container.querySelectorAll('.skeleton-shimmer');
    expect(skeletons.length).toBe(3); // 3 skeleton cards
  });

  it('shows error message when routeError is set', () => {
    const { container } = render(
      <MobileRoutePanel {...defaultProps} routeError="Network timeout" />
    );

    // Expand to see error
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;
    fireEvent.click(dragHandle);

    expect(screen.getByText(/No pudimos calcular las rutas/i)).toBeInTheDocument();
    expect(screen.getByText(/Network timeout/i)).toBeInTheDocument();
  });

  it('retry button calls onRetryRoutes', () => {
    const onRetryRoutes = vi.fn();
    const { container } = render(
      <MobileRoutePanel {...defaultProps} routeError="Failed to fetch" onRetryRoutes={onRetryRoutes} />
    );

    // Expand to see error
    const dragHandle = container.querySelector('.cursor-grab') as HTMLElement;
    fireEvent.click(dragHandle);

    const retryButton = screen.getByText(/Reintentar/i);
    fireEvent.click(retryButton);

    expect(onRetryRoutes).toHaveBeenCalledOnce();
  });
});
