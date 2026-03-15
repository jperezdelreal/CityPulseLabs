const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_DELAY_MS = 2_000;
const DEFAULT_MAX_RETRIES = 1;

/** Transient HTTP status codes that warrant a retry */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function isTransientError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof TypeError) return true; // network error
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout (AbortController) and retry logic for transient failures.
 * - 10s timeout per request
 * - 1 retry with 2s delay on transient errors (network failures, 5xx, 408, 429)
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { timeoutMs?: number; maxRetries?: number; retryDelayMs?: number },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxRetries) {
        lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
        await delay(retryDelayMs);
        continue;
      }

      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      lastError = error;

      if (attempt < maxRetries && isTransientError(error)) {
        await delay(retryDelayMs);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
