import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { AllStores, ProviderRecord } from "../store/interfaces.js";
import { createMemoryStore } from "../store/memory/index.js";
import { providerRoutes } from "./providers.js";

// ── Test helpers ─────────────────────────────────────────

function createTestApp(stores: AllStores, authOverrides: Record<string, unknown> = {}) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("auth", {
      authenticated: true,
      agentId: "agent-1",
      apiKey: { scopes: ["read", "write"], tier: "pro" },
      tier: "pro",
      ...authOverrides,
    });
    await next();
  });
  app.route("/v1/providers", providerRoutes(stores));
  return app;
}

function createAdminApp(stores: AllStores) {
  return createTestApp(stores, {
    agentId: "admin-1",
    apiKey: { scopes: ["read", "write", "admin"], tier: "enterprise" },
    tier: "enterprise",
  });
}

function createUnauthApp(stores: AllStores) {
  return createTestApp(stores, {
    authenticated: false,
    agentId: undefined,
    apiKey: undefined,
    tier: "anonymous",
  });
}

// ── Tests ────────────────────────────────────────────────

describe("Provider Routes", () => {
  let stores: AllStores;
  let adminApp: Hono;
  let app: Hono;
  let unauthApp: Hono;

  beforeEach(() => {
    stores = createMemoryStore();
    adminApp = createAdminApp(stores);
    app = createTestApp(stores);
    unauthApp = createUnauthApp(stores);
  });

  // ── GET /v1/providers ─────────────────────────────────

  describe("GET /v1/providers", () => {
    test("should return empty list initially", async () => {
      const res = await app.request("/v1/providers");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: ProviderRecord[]; total: number };
      expect(body.data).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    test("should list registered providers", async () => {
      // Register a provider via admin
      await adminApp.request("/v1/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://registry.example.com",
          name: "Example Registry",
        }),
      });

      const res = await app.request("/v1/providers");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: ProviderRecord[]; total: number };
      expect(body.total).toBe(1);
      expect(body.data[0]!.name).toBe("Example Registry");
      expect(body.data[0]!.url).toBe("https://registry.example.com");
      expect(body.data[0]!.status).toBe("unknown");
    });

    test("should be accessible without authentication", async () => {
      const res = await unauthApp.request("/v1/providers");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: ProviderRecord[]; total: number };
      expect(body.data).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  // ── POST /v1/providers ────────────────────────────────

  describe("POST /v1/providers", () => {
    test("should register a new provider with admin auth", async () => {
      const res = await adminApp.request("/v1/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://registry.example.com",
          name: "Example Registry",
          status: "active",
        }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as { data: ProviderRecord };
      expect(body.data.id).toMatch(/^kp:provider:/);
      expect(body.data.url).toBe("https://registry.example.com");
      expect(body.data.name).toBe("Example Registry");
      expect(body.data.status).toBe("active");
      expect(body.data.last_heartbeat).toBeNull();
      expect(body.data.registered_at).toBeTruthy();
    });

    test("should default status to unknown when not provided", async () => {
      const res = await adminApp.request("/v1/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://registry2.example.com",
          name: "Another Registry",
        }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as { data: ProviderRecord };
      expect(body.data.status).toBe("unknown");
    });

    test("should reject non-admin with 403", async () => {
      const res = await app.request("/v1/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://registry.example.com",
          name: "Example Registry",
        }),
      });
      expect(res.status).toBe(403);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Admin scope required");
    });

    test("should reject unauthenticated with 401", async () => {
      const res = await unauthApp.request("/v1/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://registry.example.com",
          name: "Example Registry",
        }),
      });
      expect(res.status).toBe(401);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Authentication required");
    });

    test("should reject missing url with 400", async () => {
      const res = await adminApp.request("/v1/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Example Registry" }),
      });
      expect(res.status).toBe(400);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("url and name are required");
    });

    test("should reject missing name with 400", async () => {
      const res = await adminApp.request("/v1/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://registry.example.com" }),
      });
      expect(res.status).toBe(400);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("url and name are required");
    });
  });

  // ── POST /v1/providers/:id/heartbeat ──────────────────

  describe("POST /v1/providers/:id/heartbeat", () => {
    test("should update heartbeat for existing provider", async () => {
      // First register a provider
      const createRes = await adminApp.request("/v1/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://registry.example.com",
          name: "Example Registry",
        }),
      });
      const created = (await createRes.json()) as { data: ProviderRecord };
      const providerId = created.data.id;

      // Send heartbeat
      const res = await app.request(`/v1/providers/${providerId}/heartbeat`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: { id: string; heartbeat: string } };
      expect(body.data.id).toBe(providerId);
      expect(body.data.heartbeat).toBeTruthy();

      // Verify provider status was updated to active
      const listRes = await app.request("/v1/providers");
      const listBody = (await listRes.json()) as { data: ProviderRecord[] };
      const provider = listBody.data.find((p) => p.id === providerId);
      expect(provider!.status).toBe("active");
      expect(provider!.last_heartbeat).toBeTruthy();
    });

    test("should return 404 for unknown provider", async () => {
      const res = await app.request("/v1/providers/kp:provider:nonexistent/heartbeat", {
        method: "POST",
      });
      expect(res.status).toBe(404);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Provider not found");
    });
  });
});
