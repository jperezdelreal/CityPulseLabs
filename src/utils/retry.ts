const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_MAX_RETRIES = 2;

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

/** Exponential backoff with jitter: base * 2^attempt + random jitter */
function backoffDelay(baseMs: number, attempt: number): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseMs * 0.5;
  return exponential + jitter;
}

export interface FetchRetryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
}

/**
 * Fetch with timeout (AbortController) and retry with exponential backoff.
 * - 10s timeout per request
 * - 2 retries with exponential backoff + jitter on transient errors
 * - Respects an external AbortSignal for cancellation
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: FetchRetryOptions,
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const externalSignal = options?.signal ?? init?.signal;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Bail early if external caller cancelled
    if (externalSignal?.aborted) {
      throw new DOMException('Request aborted', 'AbortError');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Link external signal to our internal controller
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    try {
      const { signal: _ignored, ...restInit } = init ?? {};
      const response = await fetch(input, {
        ...restInit,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxRetries) {
        lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
        await delay(backoffDelay(retryDelayMs, attempt));
        continue;
      }

      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
      lastError = error;

      // Don't retry if the external caller cancelled
      if (externalSignal?.aborted) {
        throw error;
      }

      if (attempt < maxRetries && isTransientError(error)) {
        await delay(backoffDelay(retryDelayMs, attempt));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
