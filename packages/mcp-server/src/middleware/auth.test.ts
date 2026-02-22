import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { MemorySessionManager } from "../session-manager.js";
import { mcpAuthMiddleware } from "./auth.js";

describe("mcpAuthMiddleware", () => {
  let savedApiKey: string | undefined;

  beforeEach(() => {
    savedApiKey = process.env.KP_API_KEY;
    delete process.env.KP_API_KEY;
  });

  afterEach(() => {
    if (savedApiKey !== undefined) {
      process.env.KP_API_KEY = savedApiKey;
    } else {
      delete process.env.KP_API_KEY;
    }
  });

  function createTestApp(sessionManager?: MemorySessionManager) {
    const app = new Hono();
    app.use("*", mcpAuthMiddleware(sessionManager));
    app.get("/test", (c) => {
      const auth = c.req.header("Authorization");
      const sessionId = c.get("mcpSessionId");
      return c.json({ auth: auth ?? null, sessionId: sessionId ?? null });
    });
    return app;
  }

  test("injects API key from resolved session token", async () => {
    const manager = new MemorySessionManager();
    const token = await manager.createSession("session-api-key-123");
    const app = createTestApp(manager);

    const res = await app.request("/test", {
      headers: { "mcp-session-id": token },
    });
    const body = await res.json();

    expect(body.auth).toBe("Bearer session-api-key-123");
    expect(body.sessionId).toBe(token);
  });

  test("falls back to KP_API_KEY env var when no session token", async () => {
    process.env.KP_API_KEY = "env-api-key-456";
    const manager = new MemorySessionManager();
    const app = createTestApp(manager);

    const res = await app.request("/test");
    const body = await res.json();

    expect(body.auth).toBe("Bearer env-api-key-456");
    expect(body.sessionId).toBeNull();
  });

  test("falls back to KP_API_KEY env var when session token is invalid", async () => {
    process.env.KP_API_KEY = "fallback-key";
    const manager = new MemorySessionManager();
    const app = createTestApp(manager);

    const res = await app.request("/test", {
      headers: { "mcp-session-id": "invalid-token" },
    });
    const body = await res.json();

    expect(body.auth).toBe("Bearer fallback-key");
    expect(body.sessionId).toBe("invalid-token");
  });

  test("passes through with no auth when no session and no env var", async () => {
    const manager = new MemorySessionManager();
    const app = createTestApp(manager);

    const res = await app.request("/test");
    const body = await res.json();

    expect(body.auth).toBeNull();
    expect(body.sessionId).toBeNull();
  });

  test("does not override existing Authorization header", async () => {
    const manager = new MemorySessionManager();
    const token = await manager.createSession("session-key");
    const app = createTestApp(manager);

    const res = await app.request("/test", {
      headers: {
        "mcp-session-id": token,
        Authorization: "Bearer existing-key",
      },
    });
    const body = await res.json();

    expect(body.auth).toBe("Bearer existing-key");
  });

  test("does not override existing Authorization header with env var", async () => {
    process.env.KP_API_KEY = "env-key";
    const app = createTestApp();

    const res = await app.request("/test", {
      headers: {
        Authorization: "Bearer custom-key",
      },
    });
    const body = await res.json();

    expect(body.auth).toBe("Bearer custom-key");
  });

  test("works without session manager (backward compatibility)", async () => {
    process.env.KP_API_KEY = "compat-key";
    const app = createTestApp(); // no session manager

    const res = await app.request("/test");
    const body = await res.json();

    expect(body.auth).toBe("Bearer compat-key");
  });

  test("sets mcpSessionId context variable", async () => {
    const manager = new MemorySessionManager();
    const app = createTestApp(manager);

    const res = await app.request("/test", {
      headers: { "mcp-session-id": "my-session-123" },
    });
    const body = await res.json();

    expect(body.sessionId).toBe("my-session-123");
  });
});
