import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";
import type { AllStores } from "../store/interfaces.js";
import { createMemoryStore } from "../store/memory/index.js";
import { authRoutes } from "./auth.js";

function createTestApp(stores: AllStores) {
  const app = new Hono();

  // Auth middleware on all routes
  app.use("*", authMiddleware(stores.apiKeys));
  // Rate limiting only on revoke route (not registration, which must be open)
  app.use("/v1/auth/revoke", rateLimitMiddleware(stores.rateLimit, stores.apiKeys));

  app.route("/v1/auth", authRoutes(stores));

  return app;
}

describe("Auth Routes", () => {
  let app: Hono;
  let stores: AllStores;

  beforeEach(() => {
    stores = createMemoryStore();
    app = createTestApp(stores);
  });

  describe("POST /v1/auth/register", () => {
    test("should register a new API key with defaults", async () => {
      const res = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: "kp:agent:new-agent" }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as {
        data: {
          api_key: string;
          key_prefix: string;
          scopes: string[];
          tier: string;
          created_at: string;
        };
        message: string;
      };

      expect(body.data.api_key).toMatch(/^kp_/);
      expect(body.data.key_prefix).toMatch(/^kp_/);
      expect(body.data.scopes).toEqual(["read"]);
      expect(body.data.tier).toBe("free");
      expect(body.data.created_at).toBeTruthy();
      expect(body.message).toContain("Store this API key securely");
    });

    test("should register with custom scopes and tier", async () => {
      const res = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "kp:agent:pro-agent",
          scopes: ["read", "write", "admin"],
          tier: "pro",
        }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as {
        data: { scopes: string[]; tier: string };
      };
      expect(body.data.scopes).toEqual(["read", "write", "admin"]);
      expect(body.data.tier).toBe("pro");
    });

    test("should return 400 when agent_id is missing", async () => {
      const res = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("agent_id is required");
    });

    test("should return 400 when agent_id is not a string", async () => {
      const res = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: 123 }),
      });
      expect(res.status).toBe(400);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("agent_id is required");
    });

    test("should filter out invalid scopes", async () => {
      const res = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "kp:agent:scope-test",
          scopes: ["read", "invalid_scope", "write"],
        }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as { data: { scopes: string[] } };
      expect(body.data.scopes).toEqual(["read", "write"]);
    });

    test("should return 400 when all scopes are invalid", async () => {
      const res = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "kp:agent:bad-scopes",
          scopes: ["invalid1", "invalid2"],
        }),
      });
      expect(res.status).toBe(400);

      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("valid scope");
    });

    test("should initialize reputation for new agents", async () => {
      const agentId = "kp:agent:rep-init";
      await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId }),
      });

      const rep = await stores.reputation.get(agentId);
      expect(rep).toBeDefined();
      expect(rep?.score).toBeCloseTo(0.1, 2);
      expect(rep?.history[0]?.reason).toBe("Initial registration bonus");
    });

    test("should return a unique key for each registration", async () => {
      const res1 = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: "kp:agent:multi-1" }),
      });
      const res2 = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: "kp:agent:multi-2" }),
      });

      const body1 = (await res1.json()) as { data: { api_key: string } };
      const body2 = (await res2.json()) as { data: { api_key: string } };

      expect(body1.data.api_key).not.toBe(body2.data.api_key);
    });

    test("registered key should work for authenticated requests", async () => {
      const regRes = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "kp:agent:auth-test",
          scopes: ["read", "write"],
        }),
      });

      const regBody = (await regRes.json()) as { data: { api_key: string } };
      const apiKey = regBody.data.api_key;

      // Verify the key works by checking the API key store
      const record = await stores.apiKeys.verify(apiKey);
      expect(record).toBeDefined();
      expect(record?.agent_id).toBe("kp:agent:auth-test");
      expect(record?.scopes).toEqual(["read", "write"]);
    });
  });

  describe("POST /v1/auth/revoke", () => {
    test("should block unauthenticated revoke request (anonymous tier has 0 writes/min)", async () => {
      const res = await app.request("/v1/auth/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_prefix: "kp_abcdef01" }),
      });
      // Anonymous tier has writePerMin=0, so rate limiter blocks before auth check
      expect(res.status).toBe(429);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Rate limit exceeded");
    });

    test("should revoke an existing key by prefix", async () => {
      // Register a key
      const regRes = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "kp:agent:revoke-test",
          scopes: ["read", "write"],
        }),
      });
      const regBody = (await regRes.json()) as {
        data: { api_key: string; key_prefix: string };
      };
      const apiKey = regBody.data.api_key;
      const keyPrefix = regBody.data.key_prefix;

      // Revoke it (using itself for auth before revocation)
      const res = await app.request("/v1/auth/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ key_prefix: keyPrefix }),
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: { revoked: boolean; key_prefix: string } };
      expect(body.data.revoked).toBe(true);
      expect(body.data.key_prefix).toBe(keyPrefix);
    });

    test("should return 404 for non-existent key prefix", async () => {
      // Register a key to authenticate with
      const regRes = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "kp:agent:revoke-auth",
          scopes: ["read", "write"],
        }),
      });
      const regBody = (await regRes.json()) as { data: { api_key: string } };
      const apiKey = regBody.data.api_key;

      const res = await app.request("/v1/auth/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ key_prefix: "kp_nonexist" }),
      });
      expect(res.status).toBe(404);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Key not found");
    });

    test("should return 400 when key_prefix is missing", async () => {
      const regRes = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "kp:agent:revoke-missing",
          scopes: ["read", "write"],
        }),
      });
      const regBody = (await regRes.json()) as { data: { api_key: string } };
      const apiKey = regBody.data.api_key;

      const res = await app.request("/v1/auth/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("key_prefix is required");
    });

    test("revoked key should no longer authenticate", async () => {
      // Register
      const regRes = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "kp:agent:revoke-verify",
          scopes: ["read", "write"],
        }),
      });
      const regBody = (await regRes.json()) as {
        data: { api_key: string; key_prefix: string };
      };
      const apiKey = regBody.data.api_key;
      const keyPrefix = regBody.data.key_prefix;

      // Revoke
      await app.request("/v1/auth/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ key_prefix: keyPrefix }),
      });

      // Verify revoked key cannot authenticate
      const record = await stores.apiKeys.verify(apiKey);
      expect(record).toBeUndefined();
    });
  });
});
