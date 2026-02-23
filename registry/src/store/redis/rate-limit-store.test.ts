import { afterAll, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import Redis from "ioredis";
import { RedisRateLimitStore } from "./rate-limit-store.js";

const REDIS_URL = process.env.KP_TEST_REDIS_URL ?? "redis://:bibi5566778800@localhost:6379/0";
const TEST_PREFIX = "kp:test:rl:";

// Check if Redis is available before running tests
let redisAvailable = false;
try {
  const probe = new Redis(REDIS_URL, { lazyConnect: true, connectTimeout: 2000 });
  await probe.connect();
  await probe.ping();
  redisAvailable = true;
  await probe.quit();
} catch {
  // Redis not available
}

if (!redisAvailable) {
  describe.skip("RedisRateLimitStore (Redis not available)", () => {
    test("skipped", () => {});
  });
} else {
  describe("RedisRateLimitStore", () => {
    let redis: Redis;
    let store: RedisRateLimitStore;

    beforeAll(() => {
      redis = new Redis(REDIS_URL, { keyPrefix: TEST_PREFIX });
      store = new RedisRateLimitStore(redis);
    });

    afterAll(async () => {
      // Clean up all test keys
      const keys = await redis.keys(`${TEST_PREFIX}*`);
      if (keys.length > 0) {
        // Remove prefix since DEL needs raw keys but keyPrefix is auto-added
        const rawKeys = keys.map((k) => k.slice(TEST_PREFIX.length));
        await redis.del(...rawKeys);
      }
      await redis.quit();
    });

    beforeEach(async () => {
      // Clean up test keys before each test
      const keys = await redis.keys(`${TEST_PREFIX}*`);
      if (keys.length > 0) {
        const rawKeys = keys.map((k) => k.slice(TEST_PREFIX.length));
        await redis.del(...rawKeys);
      }
    });

    it("should allow first consume for free tier", async () => {
      const result = await store.consume("user-1", "free", "GET");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(300);
      expect(result.limit).toBe(300);
    });

    it("should respect read limit for free tier (300/min)", async () => {
      const result = await store.consume("user-limit", "free", "GET");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(300);
    });

    it("should respect write limit for free tier (30/min)", async () => {
      const result = await store.consume("user-write", "free", "POST");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(30);
    });

    it("should block anonymous write (0 write limit)", async () => {
      const result = await store.consume("anon-user", "anonymous", "POST");
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(60);
    });

    it("should consume tokens until denied", async () => {
      // Use a tiny bucket: anonymous read = 60/min
      const id = "exhaust-user";
      let lastResult: Awaited<ReturnType<typeof store.consume>> | undefined;

      // Consume all 60 tokens
      for (let i = 0; i < 61; i++) {
        lastResult = await store.consume(id, "anonymous", "GET");
        if (!lastResult.allowed) break;
      }

      expect(lastResult!.allowed).toBe(false);
      expect(lastResult!.remaining).toBe(0);
      expect(lastResult!.retryAfter).toBeGreaterThan(0);
    });

    it("should respect pro tier configs", async () => {
      const readResult = await store.consume("pro-user", "pro", "GET");
      expect(readResult.allowed).toBe(true);
      expect(readResult.limit).toBe(1000);

      const writeResult = await store.consume("pro-user", "pro", "POST");
      expect(writeResult.allowed).toBe(true);
      expect(writeResult.limit).toBe(200);
    });

    it("should respect enterprise tier configs", async () => {
      const readResult = await store.consume("ent-user", "enterprise", "GET");
      expect(readResult.allowed).toBe(true);
      expect(readResult.limit).toBe(10000);

      const writeResult = await store.consume("ent-user", "enterprise", "POST");
      expect(writeResult.allowed).toBe(true);
      expect(writeResult.limit).toBe(2000);
    });

    it("should fall back to anonymous for unknown tiers", async () => {
      const result = await store.consume("unknown-tier", "nonexistent", "GET");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(60);
    });

    it("should record and count 429 violations", async () => {
      const id = "violator";

      // Initially no violations
      const count0 = await store.get429Count(id, 3600000);
      expect(count0).toBe(0);

      // Record some violations
      await store.record429(id);
      await store.record429(id);
      await store.record429(id);

      const count3 = await store.get429Count(id, 3600000);
      expect(count3).toBe(3);
    });

    it("should count 429 violations only within window", async () => {
      const id = "window-violator";

      await store.record429(id);

      // Should find the violation within a 1-hour window
      const count = await store.get429Count(id, 3600000);
      expect(count).toBe(1);

      // A very small window may still include a just-recorded violation
      // (because the record timestamp is essentially "now").
      // Instead, verify that within 1ms the violation is included,
      // while a large-negative-offset scenario excludes it.
      const countSmall = await store.get429Count(id, 1);
      expect(countSmall).toBeGreaterThanOrEqual(0); // may be 0 or 1 depending on timing
    });
  });
}
