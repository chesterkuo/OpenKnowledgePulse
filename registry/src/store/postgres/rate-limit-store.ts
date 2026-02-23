import type { RateLimitStore } from "../interfaces.js";
import type { PgPool } from "./db.js";

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

export class PgRateLimitStore implements RateLimitStore {
  constructor(private pool: PgPool) {}

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

    // Get or create bucket
    const { rows } = await this.pool.query(
      "SELECT tokens, last_refill FROM rate_limit_buckets WHERE bucket_key = $1",
      [bucketKey],
    );

    let tokens: number;
    let lastRefill: number;

    if (rows.length === 0) {
      tokens = limit;
      lastRefill = now;
    } else {
      tokens = rows[0].tokens as number;
      lastRefill = Number(rows[0].last_refill);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - lastRefill) / 1000;
    tokens = Math.min(limit, tokens + elapsed * refillRate);

    if (tokens < 1) {
      const retryAfter = Math.ceil((1 - tokens) / refillRate);

      // Persist bucket state
      await this.upsertBucket(bucketKey, tokens, now);

      return {
        allowed: false,
        remaining: 0,
        limit,
        reset: Math.floor(now / 1000) + retryAfter,
        retryAfter,
      };
    }

    tokens -= 1;

    // Persist bucket state
    await this.upsertBucket(bucketKey, tokens, now);

    return {
      allowed: true,
      remaining: Math.floor(tokens),
      limit,
      reset: Math.floor(now / 1000) + 60,
    };
  }

  async get429Count(identifier: string, windowMs: number): Promise<number> {
    const cutoff = Date.now() - windowMs;
    const { rows } = await this.pool.query(
      "SELECT COUNT(*) AS cnt FROM rate_limit_violations WHERE identifier = $1 AND timestamp > $2",
      [identifier, cutoff],
    );
    return Number.parseInt(rows[0].cnt, 10);
  }

  async record429(identifier: string): Promise<void> {
    await this.pool.query(
      "INSERT INTO rate_limit_violations (identifier, timestamp) VALUES ($1, $2)",
      [identifier, Date.now()],
    );
  }

  private async upsertBucket(bucketKey: string, tokens: number, lastRefill: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO rate_limit_buckets (bucket_key, tokens, last_refill)
       VALUES ($1, $2, $3)
       ON CONFLICT (bucket_key) DO UPDATE SET
         tokens = $2,
         last_refill = $3`,
      [bucketKey, tokens, lastRefill],
    );
  }
}
