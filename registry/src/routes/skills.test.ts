import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";
import { sanitizerMiddleware } from "../middleware/sanitizer.js";
import { schemaVersionMiddleware } from "../middleware/schema-version.js";
import type { AllStores } from "../store/interfaces.js";
import { createMemoryStore } from "../store/memory/index.js";
import { authRoutes } from "./auth.js";
import { skillRoutes } from "./skills.js";

const VALID_SKILL_MD = `---
name: React Component Generator
description: Generates React components from design specs
version: "1.0.0"
author: test-agent
tags:
  - react
  - frontend
  - code-generation
---

# React Component Generator

This skill generates React components from design specifications.

## Instructions

1. Parse the design spec
2. Generate component code
3. Add TypeScript types
4. Include unit tests
`;

const VALID_SKILL_MD_2 = `---
name: Python Data Pipeline
description: Creates Python data pipelines from requirements
version: "2.0.0"
author: test-agent
tags:
  - python
  - data
  - backend
---

# Python Data Pipeline

Build data pipelines from natural language requirements.
`;

function createTestApp(stores: AllStores) {
  const app = new Hono();

  // Auth middleware on all routes
  app.use("*", authMiddleware(stores.apiKeys));
  // Rate limiting only on API routes (not auth registration)
  app.use("/v1/skills/*", rateLimitMiddleware(stores.rateLimit, stores.apiKeys));
  app.use("*", schemaVersionMiddleware());
  app.use("/v1/skills/*", sanitizerMiddleware());

  app.route("/v1/skills", skillRoutes(stores));
  app.route("/v1/auth", authRoutes(stores));

  return app;
}

async function registerAndGetKey(app: Hono, agentId = "kp:agent:test-agent"): Promise<string> {
  const res = await app.request("/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: agentId,
      scopes: ["read", "write"],
      tier: "free",
    }),
  });
  const body = (await res.json()) as { data: { api_key: string } };
  return body.data.api_key;
}

describe("Skills Routes", () => {
  let app: Hono;
  let stores: AllStores;

  beforeEach(() => {
    stores = createMemoryStore();
    app = createTestApp(stores);
  });

  describe("GET /v1/skills", () => {
    test("should return empty list when no skills exist", async () => {
      const res = await app.request("/v1/skills");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: unknown[]; total: number };
      expect(body.data).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    test("should return skills after they are created", async () => {
      const apiKey = await registerAndGetKey(app);

      // Create a skill
      await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD }),
      });

      const res = await app.request("/v1/skills");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: Array<{ name: string }>; total: number };
      expect(body.total).toBe(1);
      expect(body.data[0]?.name).toBe("React Component Generator");
    });

    test("should filter skills by query parameter", async () => {
      const apiKey = await registerAndGetKey(app);

      // Create two skills
      await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD }),
      });
      await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD_2 }),
      });

      const res = await app.request("/v1/skills?q=React");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: Array<{ name: string }>; total: number };
      expect(body.total).toBe(1);
      expect(body.data[0]?.name).toBe("React Component Generator");
    });

    test("should filter skills by tags", async () => {
      const apiKey = await registerAndGetKey(app);

      await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD }),
      });
      await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD_2 }),
      });

      const res = await app.request("/v1/skills?tags=python");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: Array<{ name: string }>; total: number };
      expect(body.total).toBe(1);
      expect(body.data[0]?.name).toBe("Python Data Pipeline");
    });

    test("should support pagination with limit and offset", async () => {
      const apiKey = await registerAndGetKey(app);

      await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD }),
      });
      await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD_2 }),
      });

      const res = await app.request("/v1/skills?limit=1&offset=0");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: unknown[];
        total: number;
        limit: number;
        offset: number;
      };
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(2);
      expect(body.limit).toBe(1);
      expect(body.offset).toBe(0);
    });

    test("should include rate limit headers", async () => {
      const res = await app.request("/v1/skills");
      expect(res.headers.get("X-RateLimit-Limit")).toBeTruthy();
      expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
      expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
    });

    test("should include schema version header", async () => {
      const res = await app.request("/v1/skills");
      expect(res.headers.get("KP-Schema-Version")).toBe("v1");
    });
  });

  describe("GET /v1/skills/:id", () => {
    test("should return 404 for non-existent skill", async () => {
      const res = await app.request("/v1/skills/kp:skill:nonexistent");
      expect(res.status).toBe(404);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Skill not found");
    });

    test("should return a skill by its id", async () => {
      const apiKey = await registerAndGetKey(app);

      const createRes = await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD }),
      });

      const createBody = (await createRes.json()) as { data: { id: string; name: string } };
      const skillId = createBody.data.id;

      const res = await app.request(`/v1/skills/${skillId}`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: { id: string; name: string } };
      expect(body.data.id).toBe(skillId);
      expect(body.data.name).toBe("React Component Generator");
    });
  });

  describe("POST /v1/skills", () => {
    test("should block unauthenticated write via rate limiter (anonymous tier has 0 writes/min)", async () => {
      const res = await app.request("/v1/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD }),
      });
      // Anonymous tier has writePerMin=0, so rate limiter blocks before auth check
      expect(res.status).toBe(429);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Rate limit exceeded");
    });

    test("should require write scope", async () => {
      // Register with read-only scope
      const registerRes = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "kp:agent:readonly",
          scopes: ["read"],
          tier: "free",
        }),
      });
      const registerBody = (await registerRes.json()) as { data: { api_key: string } };
      const apiKey = registerBody.data.api_key;

      const res = await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD }),
      });
      expect(res.status).toBe(403);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Write scope required");
    });

    test("should create a skill with valid SKILL.md content", async () => {
      const apiKey = await registerAndGetKey(app);

      const res = await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as {
        data: { id: string; name: string; tags: string[]; quality_score: number };
      };
      expect(body.data.id).toMatch(/^kp:skill:/);
      expect(body.data.name).toBe("React Component Generator");
      expect(body.data.tags).toContain("react");
      expect(body.data.quality_score).toBe(0.5);
    });

    test("should return 400 when skill_md_content is missing", async () => {
      const apiKey = await registerAndGetKey(app);

      const res = await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({}),
      });

      // The sanitizer middleware will process the body first.
      // If skill_md_content is missing, the route handler will return 400.
      expect(res.status).toBe(400);
    });

    test("should return 400 for invalid SKILL.md format", async () => {
      const apiKey = await registerAndGetKey(app);

      const res = await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: "not a valid skill.md" }),
      });
      expect(res.status).toBe(400);
    });

    test("should set default visibility to 'network'", async () => {
      const apiKey = await registerAndGetKey(app);

      const res = await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as { data: { visibility: string } };
      expect(body.data.visibility).toBe("network");
    });

    test("should accept custom visibility", async () => {
      const apiKey = await registerAndGetKey(app);

      const res = await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          skill_md_content: VALID_SKILL_MD,
          visibility: "org",
        }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as { data: { visibility: string } };
      expect(body.data.visibility).toBe("org");
    });

    test("non-admin POST ignores quality_score field (gets 0.5)", async () => {
      const apiKey = await registerAndGetKey(app);

      const res = await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD, quality_score: 0.9 }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as { data: { quality_score: number } };
      expect(body.data.quality_score).toBe(0.5);
    });

    test("admin POST with quality_score sets custom value", async () => {
      const registerRes = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "kp:agent:admin-qs",
          scopes: ["read", "write", "admin"],
          tier: "free",
        }),
      });
      const registerBody = (await registerRes.json()) as { data: { api_key: string } };
      const apiKey = registerBody.data.api_key;

      const res = await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD, quality_score: 0.85 }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as { data: { quality_score: number } };
      expect(body.data.quality_score).toBe(0.85);
    });

    test("admin POST with quality_score > 1 gets clamped to 1", async () => {
      const registerRes = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "kp:agent:admin-clamp",
          scopes: ["read", "write", "admin"],
          tier: "free",
        }),
      });
      const registerBody = (await registerRes.json()) as { data: { api_key: string } };
      const apiKey = registerBody.data.api_key;

      const res = await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD, quality_score: 1.5 }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as { data: { quality_score: number } };
      expect(body.data.quality_score).toBe(1);
    });

    test("should award reputation to the contributing agent", async () => {
      const agentId = "kp:agent:rep-test";
      const apiKey = await registerAndGetKey(app, agentId);

      await app.request("/v1/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ skill_md_content: VALID_SKILL_MD }),
      });

      const rep = await stores.reputation.get(agentId);
      expect(rep).toBeDefined();
      // Initial registration bonus (0.1) + skill contribution (0.1) = 0.2
      expect(rep?.score).toBeCloseTo(0.2, 1);
    });
  });
});
