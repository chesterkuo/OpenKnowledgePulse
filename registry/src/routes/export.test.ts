import { beforeEach, describe, expect, test } from "bun:test";
import type { ReasoningTrace } from "@knowledgepulse/sdk";
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";
import { schemaVersionMiddleware } from "../middleware/schema-version.js";
import type { AllStores } from "../store/interfaces.js";
import { createMemoryStore } from "../store/memory/index.js";
import { authRoutes } from "./auth.js";
import { exportRoutes } from "./export.js";
import { knowledgeRoutes } from "./knowledge.js";

const KP_CONTEXT = "https://knowledgepulse.dev/schema/v1" as const;

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
  app.route("/v1/export", exportRoutes(stores));
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

describe("Export Routes", () => {
  let app: Hono;
  let stores: AllStores;

  beforeEach(() => {
    stores = createMemoryStore();
    app = createTestApp(stores);
  });

  describe("GET /v1/export/:agent_id", () => {
    test("should include API key summaries without key_hash", async () => {
      const agentId = "kp:agent:export-keys";
      const apiKey = await registerAndGetKey(app, agentId);

      const res = await app.request(`/v1/export/${agentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: {
          api_keys: Array<{
            key_prefix: string;
            scopes: string[];
            tier: string;
            created_at: string;
            revoked: boolean;
            key_hash?: string;
          }>;
        };
      };

      expect(body.data.api_keys).toBeDefined();
      expect(body.data.api_keys.length).toBe(1);

      const keySummary = body.data.api_keys[0];
      expect(keySummary.key_prefix).toBeDefined();
      expect(keySummary.scopes).toEqual(["read", "write"]);
      expect(keySummary.tier).toBe("free");
      expect(keySummary.created_at).toBeDefined();
      expect(keySummary.revoked).toBe(false);

      // CRITICAL: key_hash must NOT be included
      expect(keySummary.key_hash).toBeUndefined();
    });

    test("should include total_contributions count", async () => {
      const agentId = "kp:agent:export-contrib";
      const apiKey = await registerAndGetKey(app, agentId);

      // Create two knowledge units
      for (let i = 0; i < 2; i++) {
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
      }

      const res = await app.request(`/v1/export/${agentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: { total_contributions: number; knowledge_units: unknown[] };
      };

      expect(body.data.total_contributions).toBe(2);
      expect(body.data.knowledge_units).toHaveLength(2);
    });

    test("should include reputation history", async () => {
      const agentId = "kp:agent:export-rep";
      const apiKey = await registerAndGetKey(app, agentId);

      const res = await app.request(`/v1/export/${agentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: {
          reputation: {
            score: number;
            contributions: number;
            validations: number;
            history: Array<{ timestamp: string; delta: number; reason: string }>;
          };
        };
      };

      expect(body.data.reputation).toBeDefined();
      expect(body.data.reputation.history).toBeDefined();
      expect(Array.isArray(body.data.reputation.history)).toBe(true);
      // Registration bonus should appear in history
      expect(body.data.reputation.history.length).toBeGreaterThanOrEqual(1);
      expect(body.data.reputation.history[0].reason).toBe("Initial registration bonus");
    });
  });
});
