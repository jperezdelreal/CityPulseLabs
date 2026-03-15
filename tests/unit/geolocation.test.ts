import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from '../../src/hooks/useGeolocation.ts';

function createMockPosition(lat: number, lng: number, accuracy = 10): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
}

describe('useGeolocation', () => {
  let mockGetCurrentPosition: ReturnType<typeof vi.fn>;
  let mockWatchPosition: ReturnType<typeof vi.fn>;
  let mockClearWatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetCurrentPosition = vi.fn();
    mockWatchPosition = vi.fn().mockReturnValue(42);
    mockClearWatch = vi.fn();

    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
        watchPosition: mockWatchPosition,
        clearWatch: mockClearWatch,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should report geolocation as supported', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.supported).toBe(true);
  });

  it('should start with no position and not loading', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.position).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set loading when requestPosition is called', () => {
    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestPosition();
    });

    expect(result.current.loading).toBe(true);
    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('should set position on success', () => {
    mockGetCurrentPosition.mockImplementation(
      (success: PositionCallback) => {
        success(createMockPosition(43.3623, -8.4115, 25));
      },
    );

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestPosition();
    });

    expect(result.current.position).toEqual({ lat: 43.3623, lng: -8.4115 });
    expect(result.current.accuracy).toBe(25);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set error on permission denied', () => {
    mockGetCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        const posError = {
          code: 1,
          message: 'User denied',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError;
        error(posError);
      },
    );

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestPosition();
    });

    expect(result.current.error).toBe('Permiso de ubicación denegado');
    expect(result.current.permissionDenied).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('should set error on position unavailable', () => {
    mockGetCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        const posError = {
          code: 2,
          message: 'Position unavailable',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError;
        error(posError);
      },
    );

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestPosition();
    });

    expect(result.current.error).toBe('Ubicación no disponible');
    expect(result.current.permissionDenied).toBe(false);
  });

  it('should set error on timeout', () => {
    mockGetCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        const posError = {
          code: 3,
          message: 'Timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError;
        error(posError);
      },
    );

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestPosition();
    });

    expect(result.current.error).toBe('Tiempo de espera agotado para obtener ubicación');
  });

  it('should start watchPosition when requesting position', () => {
    mockGetCurrentPosition.mockImplementation(
      (success: PositionCallback) => {
        success(createMockPosition(43.3623, -8.4115));
      },
    );

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestPosition();
    });

    expect(mockWatchPosition).toHaveBeenCalledTimes(1);
  });

  it('should clear watch on unmount', () => {
    mockGetCurrentPosition.mockImplementation(
      (success: PositionCallback) => {
        success(createMockPosition(43.3623, -8.4115));
      },
    );

    const { result, unmount } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestPosition();
    });

    unmount();

    expect(mockClearWatch).toHaveBeenCalledWith(42);
  });
});
