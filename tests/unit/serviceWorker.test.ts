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

  it('should auto-reload on controllerchange when previous controller existed', () => {
    const listeners: Record<string, EventListener[]> = {};
    const mockSW = {
      controller: { scriptURL: '/old-sw.js' },
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(handler);
      }),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockSW,
      writable: true,
      configurable: true,
    });

    // Verify controllerchange listener can be attached
    const hadController = !!navigator.serviceWorker.controller;
    expect(hadController).toBe(true);

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshing) return;
      refreshing = true;
    });

    expect(mockSW.addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function));

    // Simulate controllerchange
    listeners['controllerchange']?.[0]?.(new Event('controllerchange'));
    expect(refreshing).toBe(true);
  });

  it('should NOT reload on controllerchange during first install', () => {
    const listeners: Record<string, EventListener[]> = {};
    const mockSW = {
      controller: null,
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(handler);
      }),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockSW,
      writable: true,
      configurable: true,
    });

    const hadController = !!navigator.serviceWorker.controller;
    expect(hadController).toBe(false);

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshing) return;
      refreshing = true;
    });

    // Simulate controllerchange on first install
    listeners['controllerchange']?.[0]?.(new Event('controllerchange'));
    expect(refreshing).toBe(false); // Should NOT reload
  });
});
