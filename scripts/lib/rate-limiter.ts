/**
 * Sliding-window rate limiter.
 *
 * Ensures no more than `maxPerMinute` requests are made within
 * any rolling 60-second window.
 */
export class RateLimiter {
  private readonly maxPerMinute: number;
  private readonly timestamps: number[] = [];

  constructor(maxPerMinute: number) {
    if (maxPerMinute <= 0) {
      throw new Error("maxPerMinute must be a positive number");
    }
    this.maxPerMinute = maxPerMinute;
  }

  /**
   * Acquire a token. Blocks (awaits) until a slot is available
   * within the current sliding window.
   */
  async acquire(): Promise<void> {
    while (true) {
      const now = Date.now();
      const windowStart = now - 60_000;

      // Evict timestamps older than the 60-second window
      while (this.timestamps.length > 0 && this.timestamps[0] <= windowStart) {
        this.timestamps.shift();
      }

      if (this.timestamps.length < this.maxPerMinute) {
        // Slot available — consume it
        this.timestamps.push(now);
        return;
      }

      // No slot available. Wait until the oldest timestamp exits the window.
      const oldestInWindow = this.timestamps[0];
      const waitMs = oldestInWindow - windowStart + 1;
      await sleep(waitMs);
    }
  }
}

/**
 * Retry wrapper for fetch calls with exponential backoff.
 *
 * Retries on 403 (GitHub secondary rate limit), 429, and 503 status codes.
 * Respects the `Retry-After` header when present; otherwise uses exponential
 * backoff with jitter (base delays of 1s, 2s, 4s).
 *
 * Note: GitHub returns 403 for both rate limits and genuinely forbidden
 * resources. The caller (GitHubClient) should handle permanent 403s at a
 * higher level; this wrapper treats them as potentially transient.
 *
 * @param fn - An async function that returns a Response (e.g., a fetch call)
 * @param maxAttempts - Maximum number of attempts (default 3)
 * @returns The successful Response
 * @throws The last error if all attempts fail
 */
export async function withRetry(
  fn: () => Promise<Response>,
  maxAttempts: number = 3,
): Promise<Response> {
  const retryableStatuses = new Set([403, 429, 503]);

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fn();

      if (response.ok) {
        return response;
      }

      if (retryableStatuses.has(response.status) && attempt < maxAttempts - 1) {
        const retryAfter = response.headers.get("Retry-After");
        let delayMs: number;
        if (retryAfter) {
          delayMs = (parseInt(retryAfter, 10) || 1) * 1000;
        } else {
          const baseDelayMs = 1000 * Math.pow(2, attempt);
          delayMs = baseDelayMs + Math.random() * baseDelayMs * 0.5;
        }

        await sleep(delayMs);
        continue;
      }

      // Non-retryable status or final attempt — return the response as-is
      // so the caller can inspect status/body
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts - 1) {
        const baseDelayMs = 1000 * Math.pow(2, attempt);
        const jitter = Math.random() * baseDelayMs * 0.5;
        await sleep(baseDelayMs + jitter);
      }
    }
  }

  throw lastError ?? new Error("withRetry: all attempts failed");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
