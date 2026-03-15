import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../../src/utils/retry.ts';

describe('fetchWithRetry', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('returns response on successful fetch', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    globalThis.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry('https://example.com');
    expect(result.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 500 status and succeeds on second attempt', async () => {
    const failResponse = new Response('error', { status: 500, statusText: 'Internal Server Error' });
    const successResponse = new Response('ok', { status: 200 });

    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(successResponse);

    const result = await fetchWithRetry('https://example.com', undefined, {
      retryDelayMs: 10,
    });

    expect(result.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 503 status', async () => {
    const failResponse = new Response('unavailable', { status: 503, statusText: 'Service Unavailable' });
    const successResponse = new Response('ok', { status: 200 });

    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(successResponse);

    const result = await fetchWithRetry('https://example.com', undefined, {
      retryDelayMs: 10,
    });

    expect(result.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('returns error response after max retries exhausted', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('error', { status: 502, statusText: 'Bad Gateway' }))
      .mockResolvedValueOnce(new Response('still bad', { status: 502, statusText: 'Bad Gateway' }));

    const result = await fetchWithRetry('https://example.com', undefined, {
      retryDelayMs: 10,
      maxRetries: 1,
    });

    expect(result.status).toBe(502);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 404 status (non-transient)', async () => {
    const notFoundResponse = new Response('not found', { status: 404 });
    globalThis.fetch = vi.fn().mockResolvedValueOnce(notFoundResponse);

    const result = await fetchWithRetry('https://example.com', undefined, {
      retryDelayMs: 10,
    });

    expect(result.status).toBe(404);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on network error (TypeError) and succeeds', async () => {
    const successResponse = new Response('ok', { status: 200 });

    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(successResponse);

    const result = await fetchWithRetry('https://example.com', undefined, {
      retryDelayMs: 10,
    });

    expect(result.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws after all retries exhausted for network error', async () => {
    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      fetchWithRetry('https://example.com', undefined, {
        retryDelayMs: 10,
        maxRetries: 1,
      }),
    ).rejects.toThrow('Failed to fetch');

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('uses AbortController for timeout', async () => {
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        }, 50);
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }
      });
    });

    await expect(
      fetchWithRetry('https://example.com', undefined, {
        timeoutMs: 100,
        retryDelayMs: 10,
        maxRetries: 0,
      }),
    ).rejects.toThrow('aborted');
  });

  it('passes through request init options', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    globalThis.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    await fetchWithRetry('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
});
