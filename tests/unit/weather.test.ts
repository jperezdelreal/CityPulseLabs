import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWeather } from '../../src/services/weather';

describe('fetchWeather', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns max probability and minutes until rain', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          precipitation_probability: [20, 50, 80, 40],
          times: ['12:00', '12:15', '12:30', '12:45'],
        }),
    });

    const result = await fetchWeather();
    expect(result.precipitationProbability).toBe(80);
    // First slot >= 60 is index 2 → 2 * 15 = 30 minutes
    expect(result.minutesUntilRain).toBe(30);
  });

  it('returns null minutesUntilRain when no slot exceeds threshold', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          precipitation_probability: [10, 20, 30, 40],
          times: ['12:00', '12:15', '12:30', '12:45'],
        }),
    });

    const result = await fetchWeather();
    expect(result.precipitationProbability).toBe(40);
    expect(result.minutesUntilRain).toBeNull();
  });

  it('returns 0 minutes when first slot exceeds threshold', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          precipitation_probability: [90, 80, 70],
          times: ['12:00', '12:15', '12:30'],
        }),
    });

    const result = await fetchWeather();
    expect(result.precipitationProbability).toBe(90);
    expect(result.minutesUntilRain).toBe(0);
  });

  it('handles empty probabilities array', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          precipitation_probability: [],
          times: [],
        }),
    });

    const result = await fetchWeather();
    expect(result.precipitationProbability).toBe(0);
    expect(result.minutesUntilRain).toBeNull();
  });

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });

    await expect(fetchWeather()).rejects.toThrow('Weather API error: 502');
  });
});
