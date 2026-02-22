import type { Database } from "bun:sqlite";
import type { RateLimitStore } from "../interfaces.js";

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

export class SqliteRateLimitStore implements RateLimitStore {
  constructor(private db: Database) {}

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

    // Try to get existing bucket
    const row = this.db
      .query("SELECT tokens, last_refill FROM rate_limit_buckets WHERE bucket_key = $key")
      .get({ $key: bucketKey }) as { tokens: number; last_refill: number } | null;

    let tokens: number;

    if (!row) {
      // New bucket starts full
      tokens = limit;
      this.db
        .query(
          "INSERT INTO rate_limit_buckets (bucket_key, tokens, last_refill) VALUES ($key, $tokens, $refill)",
        )
        .run({ $key: bucketKey, $tokens: tokens, $refill: now });
    } else {
      // Refill tokens based on elapsed time
      const elapsed = (now - row.last_refill) / 1000;
      tokens = Math.min(limit, row.tokens + elapsed * refillRate);
    }

    if (tokens < 1) {
      const retryAfter = Math.ceil((1 - tokens) / refillRate);
      // Update the bucket with current state
      this.db
        .query(
          "UPDATE rate_limit_buckets SET tokens = $tokens, last_refill = $refill WHERE bucket_key = $key",
        )
        .run({ $key: bucketKey, $tokens: tokens, $refill: now });

      return {
        allowed: false,
        remaining: 0,
        limit,
        reset: Math.floor(now / 1000) + retryAfter,
        retryAfter,
      };
    }

    tokens -= 1;

    // Update bucket
    this.db
      .query(
        "UPDATE rate_limit_buckets SET tokens = $tokens, last_refill = $refill WHERE bucket_key = $key",
      )
      .run({ $key: bucketKey, $tokens: tokens, $refill: now });

    return {
      allowed: true,
      remaining: Math.floor(tokens),
      limit,
      reset: Math.floor(now / 1000) + 60,
    };
  }

  async get429Count(identifier: string, windowMs: number): Promise<number> {
    const cutoff = Date.now() - windowMs;
    const row = this.db
      .query(
        "SELECT COUNT(*) as count FROM rate_limit_violations WHERE identifier = $id AND timestamp > $cutoff",
      )
      .get({ $id: identifier, $cutoff: cutoff }) as { count: number };
    return row.count;
  }

  async record429(identifier: string): Promise<void> {
    const now = Date.now();
    this.db
      .query("INSERT INTO rate_limit_violations (identifier, timestamp) VALUES ($id, $ts)")
      .run({ $id: identifier, $ts: now });

    // Auto-cleanup: remove violations older than 1 hour
    const cutoff = now - 3600000;
    this.db
      .query("DELETE FROM rate_limit_violations WHERE identifier = $id AND timestamp <= $cutoff")
      .run({ $id: identifier, $cutoff: cutoff });
  }
}
