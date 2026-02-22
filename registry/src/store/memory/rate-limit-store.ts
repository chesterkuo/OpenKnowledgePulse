import type { RateLimitStore } from "../interfaces.js";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface TierConfig {
  readPerMin: number;
  writePerMin: number;
  burstLimit: number;
}

const TIER_CONFIGS: Record<string, TierConfig> = {
  anonymous: { readPerMin: 60, writePerMin: 0, burstLimit: 10 },
  free: { readPerMin: 300, writePerMin: 30, burstLimit: 30 },
  pro: { readPerMin: 1000, writePerMin: 200, burstLimit: 100 },
  enterprise: { readPerMin: 10000, writePerMin: 2000, burstLimit: 1000 },
};

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>();
  private violations = new Map<string, number[]>(); // identifier -> timestamps of 429s

  async consume(
    identifier: string,
    tier: string,
    method: "GET" | "POST",
  ): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    reset: number;
    retryAfter?: number;
  }> {
    const config = TIER_CONFIGS[tier] ?? TIER_CONFIGS.anonymous!;
    const isWrite = method === "POST";
    const limit = isWrite ? config.writePerMin : config.readPerMin;

    if (limit === 0) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        reset: Math.floor(Date.now() / 1000) + 60,
        retryAfter: 60,
      };
    }

    const bucketKey = `${identifier}:${isWrite ? "write" : "read"}`;
    const now = Date.now();
    const refillRate = limit / 60; // tokens per second

    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      bucket = { tokens: limit, lastRefill: now };
      this.buckets.set(bucketKey, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const retryAfter = Math.ceil((1 - bucket.tokens) / refillRate);
      return {
        allowed: false,
        remaining: 0,
        limit,
        reset: Math.floor(now / 1000) + retryAfter,
        retryAfter,
      };
    }

    bucket.tokens -= 1;

    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      limit,
      reset: Math.floor(now / 1000) + 60,
    };
  }

  async get429Count(identifier: string, windowMs: number): Promise<number> {
    const timestamps = this.violations.get(identifier) ?? [];
    const cutoff = Date.now() - windowMs;
    return timestamps.filter((t) => t > cutoff).length;
  }

  async record429(identifier: string): Promise<void> {
    const timestamps = this.violations.get(identifier) ?? [];
    timestamps.push(Date.now());
    // Keep only last hour
    const cutoff = Date.now() - 3600000;
    this.violations.set(
      identifier,
      timestamps.filter((t) => t > cutoff),
    );
  }
}
