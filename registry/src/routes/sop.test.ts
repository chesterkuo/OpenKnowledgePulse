import { beforeEach, describe, expect, test } from "bun:test";
import type { ExpertSOP } from "@knowledgepulse/sdk";
import { Hono } from "hono";
import type { AllStores, StoredSOP } from "../store/interfaces.js";
import { createMemoryStore } from "../store/memory/index.js";
import { sopRoutes } from "./sop.js";

const KP_CONTEXT = "https://openknowledgepulse.org/schema/v1" as const;

function makeExpertSOP(overrides: Partial<ExpertSOP> = {}): ExpertSOP {
  return {
    "@context": KP_CONTEXT,
    "@type": "ExpertSOP",
    id: `kp:sop:${crypto.randomUUID()}`,
    name: "Incident Response SOP",
    domain: "devops",
    metadata: {
      created_at: new Date().toISOString(),
      agent_id: "agent-1",
      task_domain: "devops",
      success: true,
      quality_score: 0.9,
      visibility: "network",
      privacy_level: "federated",
    },
    source: {
      type: "human_expert",
      expert_id: "expert-42",
      credentials: ["kp:sbt:sre-certified"],
    },
    decision_tree: [
      {
        step: "Assess severity",
        instruction: "Determine incident severity level based on impact and urgency",
        criteria: { high: "Production down", low: "Minor degradation" },
        conditions: {
          critical: { action: "Page on-call immediately", sla_min: 5 },
          normal: { action: "Create ticket and triage", sla_min: 60 },
        },
        tool_suggestions: [{ name: "PagerDuty", when: "Critical severity detected" }],
      },
      {
        step: "Investigate root cause",
        instruction: "Analyze logs and metrics to find root cause",
      },
    ],
    ...overrides,
  };
}

function createTestApp(stores: AllStores, authOverrides: Record<string, unknown> = {}) {
  const app = new Hono();

  // Mock auth middleware
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

  app.route("/v1/sop", sopRoutes(stores));
  return app;
}

function createAdminApp(stores: AllStores) {
  return createTestApp(stores, {
    agentId: "admin-1",
    apiKey: { scopes: ["read", "write", "admin"], tier: "enterprise" },
    tier: "enterprise",
  });
}

function createReadOnlyApp(stores: AllStores) {
  return createTestApp(stores, {
    apiKey: { scopes: ["read"], tier: "free" },
    tier: "free",
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

async function seedReputation(stores: AllStores, agentId: string, score: number) {
  // Use upsert to set initial reputation score
  await stores.reputation.upsert(agentId, score, "Initial reputation seed");
}

async function createSOP(
  app: Hono,
  sop?: ExpertSOP,
): Promise<{ res: Response; body: { data: StoredSOP } }> {
  const sopData = sop ?? makeExpertSOP();
  const res = await app.request("/v1/sop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sopData),
  });
  const body = (await res.json()) as { data: StoredSOP };
  return { res, body };
}

describe("SOP Routes", () => {
  let stores: AllStores;
  let app: Hono;
  let adminApp: Hono;

  beforeEach(async () => {
    stores = createMemoryStore();
    app = createTestApp(stores);
    adminApp = createAdminApp(stores);
    // Seed reputation for agent-1 to meet 0.3 threshold
    await seedReputation(stores, "agent-1", 0.35);
    // Seed reputation for admin-1
    await seedReputation(stores, "admin-1", 0.5);
  });

  // ── POST /v1/sop ─────────────────────────────────────

  describe("POST /v1/sop", () => {
    test("should create an ExpertSOP and return 201", async () => {
      const sop = makeExpertSOP();
      const { res, body } = await createSOP(app, sop);

      expect(res.status).toBe(201);
      expect(body.data.id).toBe(sop.id);
      expect(body.data.sop.name).toBe("Incident Response SOP");
      expect(body.data.version).toBe(1);
      expect(body.data.status).toBe("draft");
    });

    test("should reject unauthenticated requests with 401", async () => {
      const unauthApp = createUnauthApp(stores);
      const sop = makeExpertSOP();
      const res = await unauthApp.request("/v1/sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sop),
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Authentication required");
    });

    test("should reject read-only scope with 403", async () => {
      const readApp = createReadOnlyApp(stores);
      const sop = makeExpertSOP();
      const res = await readApp.request("/v1/sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sop),
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Write or admin scope required");
    });

    test("should reject low reputation (< 0.3) with 403", async () => {
      // Create a new store with low reputation
      const lowRepStores = createMemoryStore();
      await seedReputation(lowRepStores, "agent-1", 0.1);
      const lowRepApp = createTestApp(lowRepStores);

      const sop = makeExpertSOP();
      const res = await lowRepApp.request("/v1/sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sop),
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("KP-REP");
    });

    test("should return 400 for invalid ExpertSOP body", async () => {
      const invalidSOP = { name: "Missing required fields" };
      const res = await app.request("/v1/sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidSOP),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string; issues: unknown[] };
      expect(body.error).toBe("Invalid ExpertSOP");
      expect(body.issues).toBeDefined();
    });

    test("should award 0.15 reputation on successful creation", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const rep = await stores.reputation.get("agent-1");
      expect(rep).toBeDefined();
      // Initial seed (0.35) + SOP contribution (0.15) = 0.50
      expect(rep!.score).toBeCloseTo(0.5, 1);
    });

    test("should add initial version entry on creation", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const versions = await stores.sop.getVersions(sop.id);
      expect(versions).toHaveLength(1);
      expect(versions[0]!.version).toBe(1);
      expect(versions[0]!.diff_summary).toBe("Initial version");
    });
  });

  // ── GET /v1/sop ──────────────────────────────────────

  describe("GET /v1/sop", () => {
    test("should return empty list when no SOPs exist", async () => {
      const res = await app.request("/v1/sop");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: unknown[]; total: number };
      expect(body.data).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    test("should return SOPs after creation", async () => {
      await createSOP(app);
      const res = await app.request("/v1/sop");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: StoredSOP[]; total: number };
      expect(body.total).toBe(1);
      expect(body.data[0]!.sop.name).toBe("Incident Response SOP");
    });

    test("should filter by domain", async () => {
      await createSOP(app, makeExpertSOP({ domain: "devops" }));
      await createSOP(app, makeExpertSOP({ domain: "security" }));

      const res = await app.request("/v1/sop?domain=devops");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: StoredSOP[]; total: number };
      expect(body.total).toBe(1);
      expect(body.data[0]!.sop.domain).toBe("devops");
    });

    test("should filter by query text", async () => {
      await createSOP(app, makeExpertSOP({ name: "Incident Response SOP" }));
      await createSOP(app, makeExpertSOP({ name: "Deployment Checklist" }));

      const res = await app.request("/v1/sop?q=Deployment");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: StoredSOP[]; total: number };
      expect(body.total).toBe(1);
      expect(body.data[0]!.sop.name).toBe("Deployment Checklist");
    });

    test("should support pagination with limit and offset", async () => {
      await createSOP(app, makeExpertSOP());
      await createSOP(app, makeExpertSOP());
      await createSOP(app, makeExpertSOP());

      const res = await app.request("/v1/sop?limit=2&offset=0");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: StoredSOP[];
        total: number;
        limit: number;
        offset: number;
      };
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(3);
      expect(body.limit).toBe(2);
      expect(body.offset).toBe(0);
    });
  });

  // ── GET /v1/sop/:id ──────────────────────────────────

  describe("GET /v1/sop/:id", () => {
    test("should return an SOP by ID", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const res = await app.request(`/v1/sop/${sop.id}`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: StoredSOP };
      expect(body.data.id).toBe(sop.id);
      expect(body.data.sop.name).toBe(sop.name);
    });

    test("should return 404 for non-existent SOP", async () => {
      const res = await app.request("/v1/sop/kp:sop:nonexistent");
      expect(res.status).toBe(404);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("SOP not found");
    });
  });

  // ── PUT /v1/sop/:id ──────────────────────────────────

  describe("PUT /v1/sop/:id", () => {
    test("should update an SOP and increment version", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const updatedSop = makeExpertSOP({
        ...sop,
        name: "Updated Incident Response SOP",
      });

      const res = await app.request(`/v1/sop/${sop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSop),
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: StoredSOP };
      expect(body.data.version).toBe(2);
      expect(body.data.status).toBe("draft");
      expect(body.data.previous_version_id).toBe(sop.id);
      expect(body.data.sop.name).toBe("Updated Incident Response SOP");
    });

    test("should reject update from non-owner/non-admin with 403", async () => {
      const sop = makeExpertSOP({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: "other-agent",
          task_domain: "devops",
          success: true,
          quality_score: 0.9,
          visibility: "network",
          privacy_level: "federated",
        },
      });
      // Directly create in store to bypass auth/rep checks
      await stores.sop.create({
        id: sop.id,
        sop,
        version: 1,
        status: "draft",
        visibility: "network",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await app.request(`/v1/sop/${sop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sop),
      });
      expect(res.status).toBe(403);

      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("owner or admin");
    });

    test("should allow admin to update any SOP", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const updatedSop = makeExpertSOP({ ...sop, name: "Admin Updated SOP" });
      const res = await adminApp.request(`/v1/sop/${sop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSop),
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: StoredSOP };
      expect(body.data.sop.name).toBe("Admin Updated SOP");
    });

    test("should return 404 for non-existent SOP on update", async () => {
      const sop = makeExpertSOP();
      const res = await app.request("/v1/sop/kp:sop:nonexistent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sop),
      });
      expect(res.status).toBe(404);
    });

    test("should add version entry on update", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const updatedSop = makeExpertSOP({ ...sop, name: "Version 2" });
      await app.request(`/v1/sop/${sop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSop),
      });

      const versions = await stores.sop.getVersions(sop.id);
      expect(versions).toHaveLength(2);
      expect(versions[1]!.version).toBe(2);
    });

    test("should reset status to draft on update", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      // Approve via admin first
      await stores.sop.update(sop.id, { status: "approved" });

      // Then update the SOP
      const updatedSop = makeExpertSOP({ ...sop, name: "Modified" });
      const res = await app.request(`/v1/sop/${sop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSop),
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: StoredSOP };
      expect(body.data.status).toBe("draft");
    });
  });

  // ── GET /v1/sop/:id/versions ──────────────────────────

  describe("GET /v1/sop/:id/versions", () => {
    test("should return version history", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const res = await app.request(`/v1/sop/${sop.id}/versions`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: Array<{ version: number }> };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]!.version).toBe(1);
    });

    test("should return 404 for non-existent SOP versions", async () => {
      const res = await app.request("/v1/sop/kp:sop:nonexistent/versions");
      expect(res.status).toBe(404);
    });
  });

  // ── POST /v1/sop/:id/approve ──────────────────────────

  describe("POST /v1/sop/:id/approve", () => {
    test("should approve an SOP when admin", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const res = await adminApp.request(`/v1/sop/${sop.id}/approve`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: StoredSOP };
      expect(body.data.status).toBe("approved");
      expect(body.data.approved_by).toBe("admin-1");
    });

    test("should reject non-admin approval with 403", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const res = await app.request(`/v1/sop/${sop.id}/approve`, {
        method: "POST",
      });
      expect(res.status).toBe(403);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Admin scope required");
    });

    test("should return 404 when approving non-existent SOP", async () => {
      const res = await adminApp.request("/v1/sop/kp:sop:nonexistent/approve", {
        method: "POST",
      });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /v1/sop/:id/export-skill ─────────────────────

  describe("POST /v1/sop/:id/export-skill", () => {
    test("should export SOP as SKILL.md", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const res = await app.request(`/v1/sop/${sop.id}/export-skill`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: { skill_id: string; skill_md: string; sop_id: string; sop_version: number };
      };
      expect(body.data.skill_id).toMatch(/^kp:skill:/);
      expect(body.data.skill_md).toContain("Incident Response SOP");
      expect(body.data.skill_md).toContain("---");
      expect(body.data.sop_id).toBe(sop.id);
      expect(body.data.sop_version).toBe(1);
    });

    test("should create a skill in the skill store on export", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const res = await app.request(`/v1/sop/${sop.id}/export-skill`, {
        method: "POST",
      });
      const body = (await res.json()) as {
        data: { skill_id: string };
      };

      const skill = await stores.skills.getById(body.data.skill_id);
      expect(skill).toBeDefined();
      expect(skill!.name).toBe("Incident Response SOP");
      expect(skill!.tags).toContain("devops");
      expect(skill!.tags).toContain("sop");
    });

    test("should return 404 for non-existent SOP on export", async () => {
      const res = await app.request("/v1/sop/kp:sop:nonexistent/export-skill", {
        method: "POST",
      });
      expect(res.status).toBe(404);
    });

    test("should include decision tree content in exported SKILL.md", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const res = await app.request(`/v1/sop/${sop.id}/export-skill`, {
        method: "POST",
      });
      const body = (await res.json()) as { data: { skill_md: string } };

      expect(body.data.skill_md).toContain("Assess severity");
      expect(body.data.skill_md).toContain("Decision Tree");
    });
  });

  // ── DELETE /v1/sop/:id ────────────────────────────────

  describe("DELETE /v1/sop/:id", () => {
    test("should delete an SOP owned by the agent", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const res = await app.request(`/v1/sop/${sop.id}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { deleted: boolean; sop_id: string; deleted_by: string };
      expect(body.deleted).toBe(true);
      expect(body.sop_id).toBe(sop.id);
      expect(body.deleted_by).toBe("agent-1");

      // Verify it's actually gone
      const getRes = await app.request(`/v1/sop/${sop.id}`);
      expect(getRes.status).toBe(404);
    });

    test("should allow admin to delete any SOP", async () => {
      const sop = makeExpertSOP();
      await createSOP(app, sop);

      const res = await adminApp.request(`/v1/sop/${sop.id}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { deleted: boolean };
      expect(body.deleted).toBe(true);
    });

    test("should reject delete by non-owner/non-admin with 403", async () => {
      const sop = makeExpertSOP({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: "other-agent",
          task_domain: "devops",
          success: true,
          quality_score: 0.9,
          visibility: "network",
          privacy_level: "federated",
        },
      });
      await stores.sop.create({
        id: sop.id,
        sop,
        version: 1,
        status: "draft",
        visibility: "network",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await app.request(`/v1/sop/${sop.id}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(403);
    });

    test("should return 404 for non-existent SOP on delete", async () => {
      const res = await app.request("/v1/sop/kp:sop:nonexistent", {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
    });
  });
});
