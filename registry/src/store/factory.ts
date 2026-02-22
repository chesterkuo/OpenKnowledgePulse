import type { AllStores } from "./interfaces.js";

/**
 * Extended AllStores with optional Redis references.
 * When KP_REDIS_URL is set, the Redis client and cache are attached
 * for use by middleware (e.g. idempotency).
 */
export interface AllStoresWithRedis extends AllStores {
  _redis?: import("ioredis").default;
  _cache?: import("./redis/cache.js").RedisCache;
}

/**
 * If KP_REDIS_URL is set, layer Redis rate limiting and cache on top of
 * the given stores, and attach the Redis client + cache for middleware use.
 */
async function layerRedis(stores: AllStores): Promise<AllStoresWithRedis> {
  const redisUrl = process.env.KP_REDIS_URL;
  if (!redisUrl) return stores;

  const { createRedisStores } = await import("./redis/index.js");
  const prefix = process.env.KP_REDIS_PREFIX ?? "kp:";
  const redisStores = await createRedisStores(redisUrl, prefix);

  const result: AllStoresWithRedis = {
    ...stores,
    rateLimit: redisStores.rateLimit,
    _redis: redisStores.redis,
    _cache: redisStores.cache,
  };
  return result;
}

/**
 * Create a store backend based on the KP_STORE_BACKEND environment variable.
 *
 * Supported backends:
 * - "memory" (default): In-memory stores, data lost on restart.
 * - "sqlite": SQLite-backed stores. Path controlled by KP_SQLITE_PATH (default: "knowledgepulse.db").
 * - "postgres": PostgreSQL-backed stores. Requires KP_DATABASE_URL.
 *
 * When KP_REDIS_URL is set, Redis is layered on top for:
 * - Rate limiting (replaces in-memory/PG rate limiter)
 * - Response caching
 * - Idempotency key storage
 */
export async function createStore(): Promise<AllStoresWithRedis> {
  const backend = process.env.KP_STORE_BACKEND ?? "memory";

  switch (backend) {
    case "sqlite": {
      const { createSqliteStore } = await import("./sqlite/index.js");
      const dbPath = process.env.KP_SQLITE_PATH ?? "knowledgepulse.db";
      const stores = await createSqliteStore(dbPath);
      return layerRedis(stores);
    }
    case "postgres": {
      const { createPostgresStore } = await import("./postgres/index.js");
      const dbUrl = process.env.KP_DATABASE_URL;
      if (!dbUrl) throw new Error("KP_DATABASE_URL is required when KP_STORE_BACKEND=postgres");
      const stores = await createPostgresStore(dbUrl);
      return layerRedis(stores);
    }
    default: {
      const { createMemoryStore } = await import("./memory/index.js");
      const stores = await createMemoryStore();
      return layerRedis(stores);
    }
  }
}
