import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { AllStores, QuarantineStatus, StoredKnowledgeUnit } from "../store/interfaces.js";
import { createMemoryStore } from "../store/memory/index.js";
import { quarantineRoutes, adminQuarantineRoutes } from "./quarantine.js";

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
  app.route("/v1/knowledge", quarantineRoutes(stores));
  app.route("/v1/admin/quarantine", adminQuarantineRoutes(stores));
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

function createAgentApp(stores: AllStores, agentId: string) {
  return createTestApp(stores, {
    agentId,
    apiKey: { scopes: ["read", "write"], tier: "pro" },
    tier: "pro",
  });
}

async function createKnowledgeUnit(stores: AllStores, id = "kp:trace:test-unit-1"): Promise<StoredKnowledgeUnit> {
  const now = new Date().toISOString();
  const entry: StoredKnowledgeUnit = {
    id,
    unit: {
      "@context": "https://openknowledgepulse.org/schema/v1",
      "@type": "ReasoningTrace",
      id,
      metadata: {
        created_at: now,
        agent_id: "kp:agent:contributor",
        task_domain: "software-engineering",
        success: true,
        quality_score: 0.85,
        visibility: "network",
        privacy_level: "aggregated",
      },
      task: { objective: "Test objective" },
      steps: [
        {
          step_id: 0,
          type: "thought",
          content: "Test step",
        },
      ],
      outcome: {
        result_summary: "Test result",
        confidence: 0.9,
      },
    } as StoredKnowledgeUnit["unit"],
    visibility: "network",
    created_at: now,
    updated_at: now,
  };
  return stores.knowledge.create(entry);
}

// ── Tests ────────────────────────────────────────────────

describe("Quarantine Routes", () => {
  let stores: AllStores;
  let app: Hono;
  let adminApp: Hono;
  let unauthApp: Hono;

  beforeEach(() => {
    stores = createMemoryStore();
    app = createTestApp(stores);
    adminApp = createAdminApp(stores);
    unauthApp = createUnauthApp(stores);
  });

  // ── POST /v1/knowledge/:id/report ─────────────────────

  describe("POST /v1/knowledge/:id/report", () => {
    test("should create a report with authentication", async () => {
      await createKnowledgeUnit(stores);

      const res = await app.request("/v1/knowledge/kp:trace:test-unit-1/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Suspicious content" }),
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: { id: string; unit_id: string; reporter_id: string; reason: string };
        report_count: number;
        threshold: number;
        quarantine_status: string;
      };
      expect(body.data.unit_id).toBe("kp:trace:test-unit-1");
      expect(body.data.reporter_id).toBe("agent-1");
      expect(body.data.reason).toBe("Suspicious content");
      expect(body.report_count).toBe(1);
      expect(body.threshold).toBe(3);
      expect(body.quarantine_status).toBe("flagged");
    });

    test("should return 401 without authentication", async () => {
      await createKnowledgeUnit(stores);

      const res = await unauthApp.request("/v1/knowledge/kp:trace:test-unit-1/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "test" }),
      });
      expect(res.status).toBe(401);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Authentication required");
    });

    test("should return 404 for unknown unit", async () => {
      const res = await app.request("/v1/knowledge/kp:trace:nonexistent/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "test" }),
      });
      expect(res.status).toBe(404);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Knowledge unit not found");
    });

    test("should set status to 'flagged' after first report", async () => {
      await createKnowledgeUnit(stores);

      const res = await app.request("/v1/knowledge/kp:trace:test-unit-1/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Flagging" }),
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { quarantine_status: string };
      expect(body.quarantine_status).toBe("flagged");

      const status = await stores.knowledge.getQuarantineStatus?.("kp:trace:test-unit-1");
      expect(status).toBe("flagged");
    });

    test("should set status to 'quarantined' after reaching threshold", async () => {
      await createKnowledgeUnit(stores);

      // Submit reports from 3 different agents (threshold is 3)
      for (let i = 0; i < 3; i++) {
        const agentApp = createAgentApp(stores, `agent-${i}`);
        await agentApp.request("/v1/knowledge/kp:trace:test-unit-1/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: `Report ${i}` }),
        });
      }

      const status = await stores.knowledge.getQuarantineStatus?.("kp:trace:test-unit-1");
      expect(status).toBe("quarantined");
    });

    test("should deduplicate reports from the same agent", async () => {
      await createKnowledgeUnit(stores);

      // Same agent reports twice
      await app.request("/v1/knowledge/kp:trace:test-unit-1/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "First reason" }),
      });

      const res = await app.request("/v1/knowledge/kp:trace:test-unit-1/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Updated reason" }),
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { report_count: number };
      expect(body.report_count).toBe(1); // Still 1, not 2
    });
  });

  // ── GET /v1/admin/quarantine ──────────────────────────

  describe("GET /v1/admin/quarantine", () => {
    test("should return flagged units for admin", async () => {
      await createKnowledgeUnit(stores);

      // Submit a report
      await app.request("/v1/knowledge/kp:trace:test-unit-1/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Suspicious" }),
      });

      const res = await adminApp.request("/v1/admin/quarantine");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: Array<{ unit_id: string; count: number; status: QuarantineStatus }>;
        total: number;
      };
      expect(body.total).toBe(1);
      expect(body.data[0]!.unit_id).toBe("kp:trace:test-unit-1");
      expect(body.data[0]!.count).toBe(1);
    });

    test("should return 403 for non-admin", async () => {
      const res = await app.request("/v1/admin/quarantine");
      expect(res.status).toBe(403);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Admin scope required");
    });
  });

  // ── POST /v1/admin/quarantine/:id/resolve ─────────────

  describe("POST /v1/admin/quarantine/:id/resolve", () => {
    test("should clear unit with 'keep' verdict", async () => {
      await createKnowledgeUnit(stores);

      // Submit a report first
      await app.request("/v1/knowledge/kp:trace:test-unit-1/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Suspicious" }),
      });

      const res = await adminApp.request("/v1/admin/quarantine/kp:trace:test-unit-1/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict: "keep" }),
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { unit_id: string; verdict: string; resolved: boolean };
      expect(body.unit_id).toBe("kp:trace:test-unit-1");
      expect(body.verdict).toBe("keep");
      expect(body.resolved).toBe(true);

      // Unit should still exist
      const unit = await stores.knowledge.getById("kp:trace:test-unit-1");
      expect(unit).toBeDefined();

      // Status should be cleared
      const status = await stores.knowledge.getQuarantineStatus?.("kp:trace:test-unit-1");
      expect(status).toBe("cleared");
    });

    test("should delete unit with 'remove' verdict", async () => {
      await createKnowledgeUnit(stores);

      // Submit a report first
      await app.request("/v1/knowledge/kp:trace:test-unit-1/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Malicious" }),
      });

      const res = await adminApp.request("/v1/admin/quarantine/kp:trace:test-unit-1/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict: "remove" }),
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { unit_id: string; verdict: string; resolved: boolean };
      expect(body.verdict).toBe("remove");
      expect(body.resolved).toBe(true);

      // Unit should be deleted
      const unit = await stores.knowledge.getById("kp:trace:test-unit-1");
      expect(unit).toBeUndefined();
    });

    test("should return 400 for invalid verdict", async () => {
      const res = await adminApp.request("/v1/admin/quarantine/kp:trace:test-unit-1/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict: "invalid" }),
      });
      expect(res.status).toBe(400);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("verdict must be 'keep' or 'remove'");
    });

    test("should return 403 for non-admin", async () => {
      const res = await app.request("/v1/admin/quarantine/kp:trace:test-unit-1/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict: "keep" }),
      });
      expect(res.status).toBe(403);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Admin scope required");
    });
  });
});
