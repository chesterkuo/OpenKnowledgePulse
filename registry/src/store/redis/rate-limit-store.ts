import type Redis from "ioredis";
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

/**
 * Lua script for atomic token-bucket consume.
 * Performs refill + check + decrement in a single round-trip.
 */
const CONSUME_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('GET', key)
local tokens, lastRefill

if data then
  local decoded = cjson.decode(data)
  tokens = decoded.tokens
  lastRefill = decoded.lastRefill
else
  tokens = limit
  lastRefill = now
end

-- Refill
local elapsed = (now - lastRefill) / 1000
tokens = math.min(limit, tokens + elapsed * refillRate)
lastRefill = now

if tokens < 1 then
  -- Save state and deny
  redis.call('SET', key, cjson.encode({tokens=tokens, lastRefill=lastRefill}), 'EX', 300)
  return cjson.encode({allowed=false, remaining=0, tokens=tokens})
end

tokens = tokens - 1
redis.call('SET', key, cjson.encode({tokens=tokens, lastRefill=lastRefill}), 'EX', 300)
return cjson.encode({allowed=true, remaining=math.floor(tokens), tokens=tokens})
`;

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private redis: Redis) {}

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

    const bucketKey = `ratelimit:${identifier}:${isWrite ? "write" : "read"}`;
    const now = Date.now();
    const refillRate = limit / 60; // tokens per second

    // Use Redis EVAL to run Lua script atomically
    const resultJson = (await this.redis.call(
      "EVAL",
      CONSUME_LUA,
      "1",
      bucketKey,
      String(limit),
      String(refillRate),
      String(now),
    )) as string;

    const result = JSON.parse(resultJson) as {
      allowed: boolean;
      remaining: number;
      tokens: number;
    };

    if (!result.allowed) {
      const retryAfter = Math.ceil((1 - result.tokens) / refillRate);
      return {
        allowed: false,
        remaining: 0,
        limit,
        reset: Math.floor(now / 1000) + retryAfter,
        retryAfter,
      };
    }

    return {
      allowed: true,
      remaining: result.remaining,
      limit,
      reset: Math.floor(now / 1000) + 60,
    };
  }

  async get429Count(identifier: string, windowMs: number): Promise<number> {
    const key = `ratelimit:429:${identifier}`;
    const cutoff = Date.now() - windowMs;
    return this.redis.zcount(key, cutoff, "+inf");
  }

  private counter = 0;

  async record429(identifier: string): Promise<void> {
    const key = `ratelimit:429:${identifier}`;
    const now = Date.now();
    // Use a unique member to avoid dedup when multiple calls happen in the same ms
    const member = `${now}:${++this.counter}`;
    await this.redis.zadd(key, String(now), member);
    await this.redis.expire(key, 3600);
  }
}
