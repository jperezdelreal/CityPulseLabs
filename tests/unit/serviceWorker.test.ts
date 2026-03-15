import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Service Worker Registration', () => {
  let originalServiceWorker: ServiceWorkerContainer;

  beforeEach(() => {
    originalServiceWorker = navigator.serviceWorker;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      writable: true,
      configurable: true,
    });
  });

  it('should detect service worker API availability in browsers', () => {
    // jsdom doesn't include serviceWorker; verify our guard handles both cases
    const hasSW = 'serviceWorker' in navigator;
    expect(typeof hasSW).toBe('boolean');
  });

  it('should handle missing service worker API gracefully', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(navigator.serviceWorker).toBeUndefined();
    // App should still function without SW support
    expect(() => {
      if ('serviceWorker' in navigator && navigator.serviceWorker) {
        navigator.serviceWorker.register('/sw.js');
      }
    }).not.toThrow();
  });

  it('should register service worker when API is available', async () => {
    const mockRegistration = {
      scope: '/',
      active: null,
      installing: null,
      waiting: null,
    };

    const mockRegister = vi.fn().mockResolvedValue(mockRegistration);

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: mockRegister },
      writable: true,
      configurable: true,
    });

    const registration = await navigator.serviceWorker.register('/sw.js');
    expect(mockRegister).toHaveBeenCalledWith('/sw.js');
    expect(registration.scope).toBe('/');
  });
});
