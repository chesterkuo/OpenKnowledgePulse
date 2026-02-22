import { beforeEach, describe, expect, test } from "bun:test";
import type { ReasoningTrace } from "@knowledgepulse/sdk";
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";
import { schemaVersionMiddleware } from "../middleware/schema-version.js";
import type { AllStores } from "../store/interfaces.js";
import { createMemoryStore } from "../store/memory/index.js";
import { authRoutes } from "./auth.js";
import { knowledgeRoutes } from "./knowledge.js";

const KP_CONTEXT = "https://openknowledgepulse.org/schema/v1" as const;

function makeValidReasoningTrace(overrides: Partial<ReasoningTrace> = {}): ReasoningTrace {
  return {
    "@context": KP_CONTEXT,
    "@type": "ReasoningTrace",
    id: `kp:trace:${crypto.randomUUID()}`,
    metadata: {
      created_at: new Date().toISOString(),
      agent_id: "kp:agent:test-agent",
      task_domain: "software-engineering",
      success: true,
      quality_score: 0.85,
      visibility: "network",
      privacy_level: "aggregated",
    },
    task: {
      objective: "Implement a REST API endpoint for user management",
    },
    steps: [
      {
        step_id: 0,
        type: "thought",
        content: "Analyzing the requirements for the user management endpoint",
      },
      {
        step_id: 1,
        type: "tool_call",
        tool: { name: "file_write" },
        content: "Creating the route handler",
        output_summary: "Route handler created successfully",
        latency_ms: 150,
      },
    ],
    outcome: {
      result_summary: "Successfully implemented user management endpoint",
      confidence: 0.92,
    },
    ...overrides,
  };
}

function createTestApp(stores: AllStores) {
  const app = new Hono();

  // Auth middleware on all routes
  app.use("*", authMiddleware(stores.apiKeys));
  // Rate limiting only on API routes (not auth registration)
  app.use("/v1/knowledge/*", rateLimitMiddleware(stores.rateLimit, stores.apiKeys));
  app.use("*", schemaVersionMiddleware());

  app.route("/v1/knowledge", knowledgeRoutes(stores));
  app.route("/v1/auth", authRoutes(stores));

  return app;
}

async function registerAndGetKey(
  app: Hono,
  agentId = "kp:agent:test-agent",
  scopes: string[] = ["read", "write"],
): Promise<string> {
  const res = await app.request("/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: agentId,
      scopes,
      tier: "free",
    }),
  });
  const body = (await res.json()) as { data: { api_key: string } };
  return body.data.api_key;
}

describe("Knowledge Routes", () => {
  let app: Hono;
  let stores: AllStores;

  beforeEach(() => {
    stores = createMemoryStore();
    app = createTestApp(stores);
  });

  describe("POST /v1/knowledge", () => {
    test("should block unauthenticated write via rate limiter (anonymous tier has 0 writes/min)", async () => {
      const unit = makeValidReasoningTrace();

      const res = await app.request("/v1/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unit),
      });
      // Anonymous tier has writePerMin=0, so rate limiter blocks before auth check
      expect(res.status).toBe(429);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Rate limit exceeded");
    });

    test("should require write scope", async () => {
      const apiKey = await registerAndGetKey(app, "kp:agent:readonly", ["read"]);
      const unit = makeValidReasoningTrace();

      const res = await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(unit),
      });
      expect(res.status).toBe(403);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Write scope required");
    });

    test("should create a valid ReasoningTrace knowledge unit", async () => {
      const agentId = "kp:agent:contributor";
      const apiKey = await registerAndGetKey(app, agentId);
      const unit = makeValidReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: agentId,
          task_domain: "software-engineering",
          success: true,
          quality_score: 0.85,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });

      const res = await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(unit),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as {
        data: { id: string; unit: { "@type": string } };
        quality_score: number;
      };
      expect(body.data.id).toBe(unit.id);
      expect(body.data.unit["@type"]).toBe("ReasoningTrace");
      expect(body.quality_score).toBe(0.85);
    });

    test("should return 400 for invalid KnowledgeUnit schema", async () => {
      const apiKey = await registerAndGetKey(app, "kp:agent:bad-data");

      const invalidUnit = {
        "@context": KP_CONTEXT,
        "@type": "ReasoningTrace",
        // Missing required fields: id, metadata, task, steps, outcome
      };

      const res = await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(invalidUnit),
      });
      expect(res.status).toBe(400);

      const body = (await res.json()) as {
        error: string;
        issues: Array<{ path: string; message: string }>;
      };
      expect(body.error).toBe("Invalid KnowledgeUnit");
      expect(body.issues).toBeDefined();
      expect(body.issues.length).toBeGreaterThan(0);
    });

    test("should require minimum reputation to contribute", async () => {
      const agentId = "kp:agent:no-rep";
      // Register the key but reset reputation to 0
      const apiKey = await registerAndGetKey(app, agentId);
      // The registration gives 0.1 rep bonus. We need to verify the
      // contribution works because the agent has enough rep (0.1).
      // Let's create a different scenario: manually set rep to 0.
      // We'll test by directly manipulating the store.
      const rep = await stores.reputation.get(agentId);
      if (rep) {
        // Force score below threshold
        rep.score = 0.0;
      }

      const unit = makeValidReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: agentId,
          task_domain: "testing",
          success: true,
          quality_score: 0.5,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });

      const res = await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(unit),
      });
      expect(res.status).toBe(403);

      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("Minimum KP-REP score");
    });

    test("should award reputation for successful contribution", async () => {
      const agentId = "kp:agent:rep-contributor";
      const apiKey = await registerAndGetKey(app, agentId);
      const unit = makeValidReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: agentId,
          task_domain: "testing",
          success: true,
          quality_score: 0.8,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });

      await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(unit),
      });

      const rep = await stores.reputation.get(agentId);
      expect(rep).toBeDefined();
      // Registration bonus (0.1) + knowledge contribution (0.2) = 0.3
      expect(rep?.score).toBeCloseTo(0.3, 1);
    });
  });

  describe("GET /v1/knowledge", () => {
    test("should return empty list when no knowledge exists", async () => {
      const res = await app.request("/v1/knowledge");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: unknown[]; total: number };
      expect(body.data).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    test("should return knowledge units after creation", async () => {
      const agentId = "kp:agent:lister";
      const apiKey = await registerAndGetKey(app, agentId);
      const unit = makeValidReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: agentId,
          task_domain: "software-engineering",
          success: true,
          quality_score: 0.85,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });

      await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(unit),
      });

      const res = await app.request("/v1/knowledge");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: Array<{ id: string }>; total: number };
      expect(body.total).toBe(1);
      expect(body.data[0]?.id).toBe(unit.id);
    });

    test("should filter by types query parameter", async () => {
      const agentId = "kp:agent:type-filter";
      const apiKey = await registerAndGetKey(app, agentId);
      const unit = makeValidReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: agentId,
          task_domain: "software-engineering",
          success: true,
          quality_score: 0.85,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });

      await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(unit),
      });

      // Search for ReasoningTrace - should find it
      const res1 = await app.request("/v1/knowledge?types=ReasoningTrace");
      const body1 = (await res1.json()) as { total: number };
      expect(body1.total).toBe(1);

      // Search for ToolCallPattern - should not find it
      const res2 = await app.request("/v1/knowledge?types=ToolCallPattern");
      const body2 = (await res2.json()) as { total: number };
      expect(body2.total).toBe(0);
    });

    test("should filter by domain query parameter", async () => {
      const agentId = "kp:agent:domain-filter";
      const apiKey = await registerAndGetKey(app, agentId);
      const unit = makeValidReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: agentId,
          task_domain: "software-engineering",
          success: true,
          quality_score: 0.85,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });

      await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(unit),
      });

      const res = await app.request("/v1/knowledge?domain=software-engineering");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { total: number };
      expect(body.total).toBe(1);
    });

    test("should support pagination", async () => {
      const res = await app.request("/v1/knowledge?limit=5&offset=0");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { limit: number; offset: number };
      expect(body.limit).toBe(5);
      expect(body.offset).toBe(0);
    });
  });

  describe("GET /v1/knowledge/:id", () => {
    test("should return 404 for non-existent unit", async () => {
      const res = await app.request("/v1/knowledge/kp:trace:nonexistent");
      expect(res.status).toBe(404);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Knowledge unit not found");
    });

    test("should return a knowledge unit by id", async () => {
      const agentId = "kp:agent:getter";
      const apiKey = await registerAndGetKey(app, agentId);
      const unit = makeValidReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: agentId,
          task_domain: "software-engineering",
          success: true,
          quality_score: 0.85,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });

      await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(unit),
      });

      const res = await app.request(`/v1/knowledge/${unit.id}`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: { id: string; unit: { "@type": string } } };
      expect(body.data.id).toBe(unit.id);
      expect(body.data.unit["@type"]).toBe("ReasoningTrace");
    });
  });

  describe("DELETE /v1/knowledge/:id", () => {
    test("should require authentication", async () => {
      const res = await app.request("/v1/knowledge/kp:trace:some-id", {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });

    test("should return 404 for non-existent unit", async () => {
      const apiKey = await registerAndGetKey(app);

      const res = await app.request("/v1/knowledge/kp:trace:nonexistent", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      expect(res.status).toBe(404);
    });

    test("should allow owner to delete their own knowledge unit", async () => {
      const agentId = "kp:agent:deleter";
      const apiKey = await registerAndGetKey(app, agentId);
      const unit = makeValidReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: agentId,
          task_domain: "testing",
          success: true,
          quality_score: 0.8,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });

      // Create the unit
      await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(unit),
      });

      // Delete it
      const res = await app.request(`/v1/knowledge/${unit.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { deleted: boolean };
      expect(body.deleted).toBe(true);

      // Verify it's gone
      const getRes = await app.request(`/v1/knowledge/${unit.id}`);
      expect(getRes.status).toBe(404);
    });

    test("should forbid non-owner from deleting a knowledge unit", async () => {
      const ownerAgent = "kp:agent:owner";
      const otherAgent = "kp:agent:other";
      const ownerKey = await registerAndGetKey(app, ownerAgent);
      const otherKey = await registerAndGetKey(app, otherAgent);

      const unit = makeValidReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: ownerAgent,
          task_domain: "testing",
          success: true,
          quality_score: 0.8,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });

      // Create as owner
      await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerKey}`,
        },
        body: JSON.stringify(unit),
      });

      // Try to delete as other agent
      const res = await app.request(`/v1/knowledge/${unit.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${otherKey}` },
      });
      expect(res.status).toBe(403);

      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("Forbidden");
    });

    test("should allow admin to delete any knowledge unit", async () => {
      const ownerAgent = "kp:agent:unit-owner";
      const adminAgent = "kp:agent:admin-user";
      const ownerKey = await registerAndGetKey(app, ownerAgent);

      // Register admin with admin scope
      const adminRegRes = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: adminAgent,
          scopes: ["read", "write", "admin"],
          tier: "pro",
        }),
      });
      const adminBody = (await adminRegRes.json()) as { data: { api_key: string } };
      const adminKey = adminBody.data.api_key;

      const unit = makeValidReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: ownerAgent,
          task_domain: "testing",
          success: true,
          quality_score: 0.8,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });

      // Create as owner
      await app.request("/v1/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerKey}`,
        },
        body: JSON.stringify(unit),
      });

      // Delete as admin
      const res = await app.request(`/v1/knowledge/${unit.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { deleted: boolean };
      expect(body.deleted).toBe(true);
    });
  });
});
