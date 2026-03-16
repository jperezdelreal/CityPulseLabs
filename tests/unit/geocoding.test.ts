import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchAddress, debounce } from '../../src/services/geocoding.ts';

const MOCK_NOMINATIM_RESULTS = [
  { display_name: 'Calle Real, A Coruña', lat: '43.3710', lon: '-8.3960' },
  { display_name: 'Plaza de María Pita, A Coruña', lat: '43.3713', lon: '-8.3965' },
];

describe('geocoding service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty array for empty query', async () => {
    const results = await searchAddress('');
    expect(results).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should return empty array for whitespace query', async () => {
    const results = await searchAddress('   ');
    expect(results).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should call Nominatim with correct parameters', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_NOMINATIM_RESULTS),
    } as Response);

    await searchAddress('Calle Real');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    const urlStr = url as string;
    expect(urlStr).toContain('nominatim.openstreetmap.org/search');
    expect(urlStr).toContain('q=Calle+Real');
    expect(urlStr).toContain('format=json');
    expect(urlStr).toContain('limit=5');
    expect(urlStr).toContain('countrycodes=es');
    expect(urlStr).toContain('bounded=1');
    expect((options as RequestInit).headers).toEqual({ 'User-Agent': 'BiciCoruna/1.0' });
  });

  it('should parse results with numeric lat/lon', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_NOMINATIM_RESULTS),
    } as Response);

    const results = await searchAddress('Calle Real');

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      display_name: 'Calle Real, A Coruña',
      lat: 43.371,
      lon: -8.396,
    });
    expect(typeof results[0].lat).toBe('number');
    expect(typeof results[0].lon).toBe('number');
  });

  it('should throw on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
    } as Response);

    await expect(searchAddress('test')).rejects.toThrow('Geocoding error: 429');
  });

  it('should pass AbortSignal to fetch', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    const controller = new AbortController();
    await searchAddress('test', controller.signal);

    const [, options] = vi.mocked(fetch).mock.calls[0];
    // fetchWithRetry wraps the external signal in its own controller;
    // verify a signal is present (abort linkage is tested in retry.test.ts)
    expect((options as RequestInit).signal).toBeDefined();
    expect((options as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('a');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledWith('a');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous call when called again', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('a');
    vi.advanceTimersByTime(200);
    debounced('b');
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b');
  });
});
