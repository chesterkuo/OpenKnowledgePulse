import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Hono } from "hono";
import Redis from "ioredis";
import { idempotencyMiddleware } from "./idempotency.js";

const REDIS_URL = "redis://:bibi5566778800@localhost:6379/0";
const TEST_PREFIX = "kp:test:idemp:";

describe("idempotencyMiddleware", () => {
  let redis: Redis;
  let app: Hono;
  let handlerCallCount: number;

  beforeAll(() => {
    redis = new Redis(REDIS_URL, { keyPrefix: TEST_PREFIX });
  });

  afterAll(async () => {
    const keys = await redis.keys(`${TEST_PREFIX}*`);
    if (keys.length > 0) {
      const rawKeys = keys.map((k) => k.slice(TEST_PREFIX.length));
      await redis.del(...rawKeys);
    }
    await redis.quit();
  });

  beforeEach(async () => {
    // Clean up test keys
    const keys = await redis.keys(`${TEST_PREFIX}*`);
    if (keys.length > 0) {
      const rawKeys = keys.map((k) => k.slice(TEST_PREFIX.length));
      await redis.del(...rawKeys);
    }

    handlerCallCount = 0;

    // Create fresh app for each test
    app = new Hono();
    app.use("*", idempotencyMiddleware(redis));

    app.post("/test", (c) => {
      handlerCallCount++;
      return c.json({ result: "created", count: handlerCallCount }, 201);
    });

    app.put("/test", (c) => {
      handlerCallCount++;
      return c.json({ result: "updated", count: handlerCallCount }, 200);
    });

    app.get("/test", (c) => {
      handlerCallCount++;
      return c.json({ result: "fetched", count: handlerCallCount }, 200);
    });
  });

  it("should execute handler on first POST with Idempotency-Key", async () => {
    const res = await app.request("/test", {
      method: "POST",
      headers: {
        "Idempotency-Key": "test-key-1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "hello" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.result).toBe("created");
    expect(body.count).toBe(1);
    expect(handlerCallCount).toBe(1);
    expect(res.headers.get("Idempotency-Replayed")).toBeNull();
  });

  it("should return cached response on second POST with same key", async () => {
    // First request
    await app.request("/test", {
      method: "POST",
      headers: {
        "Idempotency-Key": "test-key-2",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "hello" }),
    });

    expect(handlerCallCount).toBe(1);

    // Second request with same key
    const res = await app.request("/test", {
      method: "POST",
      headers: {
        "Idempotency-Key": "test-key-2",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "hello" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.result).toBe("created");
    expect(body.count).toBe(1); // Same response as first call
    expect(handlerCallCount).toBe(1); // Handler was NOT called again
    expect(res.headers.get("Idempotency-Replayed")).toBe("true");
  });

  it("should execute handler normally for POST without Idempotency-Key", async () => {
    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "hello" }),
    });

    expect(res.status).toBe(201);
    expect(handlerCallCount).toBe(1);
    expect(res.headers.get("Idempotency-Replayed")).toBeNull();
  });

  it("should bypass middleware for GET requests", async () => {
    const res = await app.request("/test", {
      method: "GET",
      headers: { "Idempotency-Key": "test-key-get" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toBe("fetched");
    expect(handlerCallCount).toBe(1);
    expect(res.headers.get("Idempotency-Replayed")).toBeNull();
  });

  it("should work with PUT requests", async () => {
    // First PUT
    await app.request("/test", {
      method: "PUT",
      headers: {
        "Idempotency-Key": "test-key-put",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "update" }),
    });

    expect(handlerCallCount).toBe(1);

    // Second PUT with same key
    const res = await app.request("/test", {
      method: "PUT",
      headers: {
        "Idempotency-Key": "test-key-put",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "update" }),
    });

    expect(res.status).toBe(200);
    expect(handlerCallCount).toBe(1);
    expect(res.headers.get("Idempotency-Replayed")).toBe("true");
  });

  it("should allow different keys to execute independently", async () => {
    await app.request("/test", {
      method: "POST",
      headers: {
        "Idempotency-Key": "key-a",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    await app.request("/test", {
      method: "POST",
      headers: {
        "Idempotency-Key": "key-b",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(handlerCallCount).toBe(2);
  });
});
