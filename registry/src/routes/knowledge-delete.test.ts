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

  app.use("*", authMiddleware(stores.apiKeys));
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

describe("Knowledge Delete Routes - Structured Receipt", () => {
  let app: Hono;
  let stores: AllStores;

  beforeEach(() => {
    stores = createMemoryStore();
    app = createTestApp(stores);
  });

  test("should return structured delete receipt with unit_id, deleted_at, and deleted_by", async () => {
    const agentId = "kp:agent:delete-receipt";
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

    const beforeDelete = new Date().toISOString();

    // Delete it
    const res = await app.request(`/v1/knowledge/${unit.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      deleted: boolean;
      unit_id: string;
      deleted_at: string;
      deleted_by: string;
    };

    expect(body.deleted).toBe(true);
    expect(body.unit_id).toBe(unit.id);
    expect(body.deleted_by).toBe(agentId);

    // deleted_at should be a valid ISO timestamp
    expect(body.deleted_at).toBeDefined();
    const deletedAt = new Date(body.deleted_at);
    expect(deletedAt.toISOString()).toBe(body.deleted_at);

    // deleted_at should be reasonably recent (within a few seconds)
    const afterDelete = new Date().toISOString();
    expect(body.deleted_at >= beforeDelete).toBe(true);
    expect(body.deleted_at <= afterDelete).toBe(true);
  });

  test("admin delete receipt should show admin as deleted_by", async () => {
    const ownerAgent = "kp:agent:unit-owner-receipt";
    const adminAgent = "kp:agent:admin-receipt";
    const ownerKey = await registerAndGetKey(app, ownerAgent);

    // Register admin
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

    const body = (await res.json()) as {
      deleted: boolean;
      unit_id: string;
      deleted_at: string;
      deleted_by: string;
    };

    expect(body.deleted).toBe(true);
    expect(body.unit_id).toBe(unit.id);
    expect(body.deleted_by).toBe(adminAgent);
  });
});
