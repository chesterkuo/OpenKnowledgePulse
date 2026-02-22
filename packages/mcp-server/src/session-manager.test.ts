import { beforeEach, describe, expect, test } from "bun:test";
import { MemorySessionManager } from "./session-manager.js";

describe("MemorySessionManager", () => {
  let manager: MemorySessionManager;

  beforeEach(() => {
    manager = new MemorySessionManager(3600);
  });

  test("creates a session and returns a UUID token", async () => {
    const token = await manager.createSession("test-api-key-123");
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    // UUID v4 format
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test("resolves a valid session to the associated API key", async () => {
    const apiKey = "kp-key-abc";
    const token = await manager.createSession(apiKey);

    const resolved = await manager.resolveSession(token);
    expect(resolved).toBe(apiKey);
  });

  test("returns null for an unknown session token", async () => {
    const result = await manager.resolveSession("nonexistent-token");
    expect(result).toBeNull();
  });

  test("returns null for an expired session", async () => {
    // Create manager with a very short TTL (1 second)
    const shortManager = new MemorySessionManager(0);
    const token = await shortManager.createSession("expired-key");

    // Session should already be expired (0 seconds TTL)
    // Wait a tiny bit to ensure Date.now() moves past expiration
    await new Promise((resolve) => setTimeout(resolve, 5));

    const result = await shortManager.resolveSession(token);
    expect(result).toBeNull();
  });

  test("destroys a session so it can no longer be resolved", async () => {
    const token = await manager.createSession("destroy-me-key");

    // Session exists before destroy
    expect(await manager.resolveSession(token)).toBe("destroy-me-key");

    await manager.destroySession(token);

    // Session is gone after destroy
    expect(await manager.resolveSession(token)).toBeNull();
  });

  test("destroying a nonexistent session does not throw", async () => {
    // Should not throw
    await manager.destroySession("does-not-exist");
  });

  test("creates unique tokens for different sessions", async () => {
    const token1 = await manager.createSession("key-1");
    const token2 = await manager.createSession("key-2");

    expect(token1).not.toBe(token2);
  });

  test("multiple sessions can coexist with different API keys", async () => {
    const token1 = await manager.createSession("key-alpha");
    const token2 = await manager.createSession("key-beta");

    expect(await manager.resolveSession(token1)).toBe("key-alpha");
    expect(await manager.resolveSession(token2)).toBe("key-beta");
  });

  test("exposes TTL as sessionTtlSeconds", () => {
    expect(manager.sessionTtlSeconds).toBe(3600);

    const custom = new MemorySessionManager(7200);
    expect(custom.sessionTtlSeconds).toBe(7200);
  });
});
