import { beforeEach, describe, expect, test } from "bun:test";
import { MemoryRateLimitStore } from "./rate-limit-store.js";

describe("MemoryRateLimitStore", () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  describe("consume", () => {
    test("should allow a GET request for anonymous tier", async () => {
      const result = await store.consume("user-1", "anonymous", "GET");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(60);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.reset).toBeGreaterThan(0);
    });

    test("should deny a POST (write) request for anonymous tier", async () => {
      const result = await store.consume("user-1", "anonymous", "POST");
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(60);
    });

    test("should allow a GET request for free tier", async () => {
      const result = await store.consume("user-2", "free", "GET");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(300);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    test("should allow a POST request for free tier", async () => {
      const result = await store.consume("user-2", "free", "POST");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(30);
    });

    test("should allow a GET request for pro tier with correct limit", async () => {
      const result = await store.consume("user-3", "pro", "GET");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1000);
    });

    test("should allow a POST request for pro tier with correct limit", async () => {
      const result = await store.consume("user-3", "pro", "POST");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(200);
    });

    test("should allow a GET request for enterprise tier with correct limit", async () => {
      const result = await store.consume("user-4", "enterprise", "GET");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10000);
    });

    test("should fall back to anonymous tier for unknown tier", async () => {
      const result = await store.consume("user-5", "unknown-tier", "GET");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(60);
    });

    test("should decrement remaining tokens on each consume", async () => {
      const result1 = await store.consume("user-6", "free", "GET");
      const result2 = await store.consume("user-6", "free", "GET");

      expect(result2.remaining).toBeLessThan(result1.remaining);
    });

    test("should deny after bucket is exhausted", async () => {
      // anonymous GET limit is 60 per minute, bucket starts full
      // Consume all 60 tokens rapidly
      const identifier = "exhaust-user";
      let lastResult: Awaited<ReturnType<typeof store.consume>> | undefined;
      for (let i = 0; i < 61; i++) {
        lastResult = await store.consume(identifier, "anonymous", "GET");
      }

      // After 61 requests with a bucket of 60, the last should be denied
      expect(lastResult?.allowed).toBe(false);
      expect(lastResult?.remaining).toBe(0);
      expect(lastResult?.retryAfter).toBeGreaterThan(0);
    });

    test("should use separate buckets for read and write operations", async () => {
      const identifier = "rw-user";

      // Consume a read token
      const readResult = await store.consume(identifier, "free", "GET");
      expect(readResult.allowed).toBe(true);
      expect(readResult.limit).toBe(300);

      // Consume a write token (separate bucket)
      const writeResult = await store.consume(identifier, "free", "POST");
      expect(writeResult.allowed).toBe(true);
      expect(writeResult.limit).toBe(30);

      // Both should have their own remaining counts
      expect(readResult.remaining).toBeGreaterThanOrEqual(298);
      expect(writeResult.remaining).toBeGreaterThanOrEqual(28);
    });

    test("should use separate buckets for different identifiers", async () => {
      const result1 = await store.consume("alice", "free", "GET");
      const result2 = await store.consume("bob", "free", "GET");

      // Both should start with a full bucket
      expect(result1.remaining).toBeGreaterThanOrEqual(298);
      expect(result2.remaining).toBeGreaterThanOrEqual(298);
    });
  });

  describe("record429 and get429Count", () => {
    test("should record a 429 and retrieve the count", async () => {
      await store.record429("violator-1");

      const count = await store.get429Count("violator-1", 60000); // 1 minute window
      expect(count).toBe(1);
    });

    test("should accumulate 429 records", async () => {
      await store.record429("violator-2");
      await store.record429("violator-2");
      await store.record429("violator-2");

      const count = await store.get429Count("violator-2", 60000);
      expect(count).toBe(3);
    });

    test("should return 0 for identifiers with no violations", async () => {
      const count = await store.get429Count("clean-user", 60000);
      expect(count).toBe(0);
    });

    test("should not count violations outside the time window", async () => {
      await store.record429("violator-3");

      // Get count with a very small window (0ms) — the timestamp just recorded
      // should be at the edge. Use windowMs=0 to check boundary.
      const count = await store.get429Count("violator-3", 0);
      expect(count).toBe(0);
    });

    test("should count violations within the time window", async () => {
      await store.record429("violator-4");
      await store.record429("violator-4");

      // 1 hour window should capture recent records
      const count = await store.get429Count("violator-4", 3600000);
      expect(count).toBe(2);
    });

    test("should isolate violations between different identifiers", async () => {
      await store.record429("user-a");
      await store.record429("user-a");
      await store.record429("user-b");

      const countA = await store.get429Count("user-a", 60000);
      const countB = await store.get429Count("user-b", 60000);

      expect(countA).toBe(2);
      expect(countB).toBe(1);
    });
  });

  describe("tier configurations", () => {
    test("anonymous tier: 60 reads/min, 0 writes/min", async () => {
      const read = await store.consume("anon", "anonymous", "GET");
      const write = await store.consume("anon", "anonymous", "POST");

      expect(read.limit).toBe(60);
      expect(read.allowed).toBe(true);
      expect(write.limit).toBe(0);
      expect(write.allowed).toBe(false);
    });

    test("free tier: 300 reads/min, 30 writes/min", async () => {
      const read = await store.consume("free-user", "free", "GET");
      const write = await store.consume("free-user", "free", "POST");

      expect(read.limit).toBe(300);
      expect(read.allowed).toBe(true);
      expect(write.limit).toBe(30);
      expect(write.allowed).toBe(true);
    });

    test("pro tier: 1000 reads/min, 200 writes/min", async () => {
      const read = await store.consume("pro-user", "pro", "GET");
      const write = await store.consume("pro-user", "pro", "POST");

      expect(read.limit).toBe(1000);
      expect(read.allowed).toBe(true);
      expect(write.limit).toBe(200);
      expect(write.allowed).toBe(true);
    });

    test("enterprise tier: 10000 reads/min, 2000 writes/min", async () => {
      const read = await store.consume("ent-user", "enterprise", "GET");
      const write = await store.consume("ent-user", "enterprise", "POST");

      expect(read.limit).toBe(10000);
      expect(read.allowed).toBe(true);
      expect(write.limit).toBe(2000);
      expect(write.allowed).toBe(true);
    });
  });
});
