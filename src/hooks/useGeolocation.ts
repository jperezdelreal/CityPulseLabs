import { useState, useEffect, useCallback, useRef } from 'react';
import type { LatLng } from '../types/index.ts';

export interface GeolocationState {
  position: LatLng | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  supported: boolean;
  permissionDenied: boolean;
}

export interface UseGeolocationReturn extends GeolocationState {
  requestPosition: () => void;
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Permiso de ubicación denegado';
    case error.POSITION_UNAVAILABLE:
      return 'Ubicación no disponible';
    case error.TIMEOUT:
      return 'Tiempo de espera agotado para obtener ubicación';
    default:
      return 'Error al obtener ubicación';
  }
}

export function useGeolocation(): UseGeolocationReturn {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const [position, setPosition] = useState<LatLng | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setAccuracy(pos.coords.accuracy);
    setLoading(false);
    setError(null);
    setPermissionDenied(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(getErrorMessage(err));
    setLoading(false);
    if (err.code === err.PERMISSION_DENIED) {
      setPermissionDenied(true);
    }
  }, []);

  const requestPosition = useCallback(() => {
    if (!supported) return;

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      GEOLOCATION_OPTIONS,
    );

    // Start watching for updates if not already watching
    if (watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        GEOLOCATION_OPTIONS,
      );
    }
  }, [supported, handleSuccess, handleError]);

  // Clean up watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    position,
    accuracy,
    loading,
    error,
    supported,
    permissionDenied,
    requestPosition,
  };
}
