import type Redis from "ioredis";
import { RedisCache } from "./cache.js";
import { createRedisClient } from "./client.js";
import { RedisRateLimitStore } from "./rate-limit-store.js";

export interface RedisStores {
  redis: Redis;
  rateLimit: RedisRateLimitStore;
  cache: RedisCache;
}

export async function createRedisStores(url: string, prefix = "kp:"): Promise<RedisStores> {
  const redis = createRedisClient(url, prefix);
  // Verify connection
  await redis.ping();
  return {
    redis,
    rateLimit: new RedisRateLimitStore(redis),
    cache: new RedisCache(redis),
  };
}

// Re-export individual classes for direct use
export { createRedisClient } from "./client.js";
export { RedisRateLimitStore } from "./rate-limit-store.js";
export { RedisCache } from "./cache.js";
