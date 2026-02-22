import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { AllStores } from "../store/interfaces.js";
import { createMemoryStore } from "../store/memory/index.js";
import { MemoryReputationStore } from "../store/memory/reputation-store.js";
import { reputationRoutes } from "./reputation.js";

// biome-ignore lint/suspicious/noExplicitAny: test helper for JSON response parsing
type Json = any;

/** Create test app with mock auth middleware */
function createTestApp(
  stores: AllStores,
  authOverrides: Record<string, unknown> = {},
) {
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

  app.route("/v1/reputation", reputationRoutes(stores));
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

/**
 * Helper: set up an agent with a reputation score and a creation date
 * old enough to pass the 30-day canVote check.
 */
async function seedVotableAgent(
  stores: AllStores,
  agentId: string,
  score: number,
) {
  await stores.reputation.upsert(agentId, score, "Seed reputation");
  // Backdate the created_at by 31 days so canVote passes
  const repStore = stores.reputation as MemoryReputationStore;
  repStore._setCreatedAt(agentId, new Date(Date.now() - 31 * 24 * 60 * 60 * 1000));
}

describe("Badge & Certification Routes", () => {
  let stores: AllStores;
  let adminApp: Hono;
  let userApp: Hono;
  let unauthApp: Hono;

  beforeEach(async () => {
    stores = createMemoryStore();
    adminApp = createAdminApp(stores);
    userApp = createTestApp(stores);
    unauthApp = createUnauthApp(stores);
  });

  // ── GET /v1/reputation/:agent_id/badges ─────────────

  describe("GET /v1/reputation/:agent_id/badges", () => {
    test("returns empty array for new agent", async () => {
      const res = await userApp.request("/v1/reputation/new-agent/badges");
      expect(res.status).toBe(200);
      const body: Json = await res.json();
      expect(body.data).toEqual([]);
    });

    test("returns granted badges", async () => {
      await stores.reputation.grantBadge({
        badge_id: "badge-agent-1-typescript-bronze",
        agent_id: "agent-1",
        domain: "typescript",
        level: "bronze",
        granted_at: new Date().toISOString(),
        granted_by: "system",
      });

      const res = await userApp.request("/v1/reputation/agent-1/badges");
      expect(res.status).toBe(200);
      const body: Json = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].domain).toBe("typescript");
      expect(body.data[0].level).toBe("bronze");
    });
  });

  // ── POST /v1/reputation/:agent_id/certify ───────────

  describe("POST /v1/reputation/:agent_id/certify", () => {
    test("creates proposal when admin", async () => {
      const res = await adminApp.request("/v1/reputation/agent-1/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "typescript", target_level: "gold" }),
      });
      expect(res.status).toBe(201);
      const body: Json = await res.json();
      expect(body.data.agent_id).toBe("agent-1");
      expect(body.data.domain).toBe("typescript");
      expect(body.data.target_level).toBe("gold");
      expect(body.data.status).toBe("open");
      expect(body.data.proposed_by).toBe("admin-1");
      expect(body.data.votes).toEqual([]);
      // Verify 7-day window
      const created = new Date(body.data.created_at).getTime();
      const closes = new Date(body.data.closes_at).getTime();
      const diff = closes - created;
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      expect(Math.abs(diff - sevenDays)).toBeLessThan(1000); // within 1 second
    });

    test("rejected for non-admin", async () => {
      const res = await userApp.request("/v1/reputation/agent-1/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "typescript", target_level: "gold" }),
      });
      expect(res.status).toBe(403);
      const body: Json = await res.json();
      expect(body.error).toContain("Admin");
    });

    test("rejects invalid target_level", async () => {
      const res = await adminApp.request("/v1/reputation/agent-1/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "typescript", target_level: "bronze" }),
      });
      expect(res.status).toBe(400);
      const body: Json = await res.json();
      expect(body.error).toContain("target_level");
    });
  });

  // ── GET /v1/reputation/proposals ────────────────────

  describe("GET /v1/reputation/proposals", () => {
    test("lists open proposals", async () => {
      // Create two proposals via admin
      await adminApp.request("/v1/reputation/agent-1/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "typescript", target_level: "gold" }),
      });
      await adminApp.request("/v1/reputation/agent-2/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "python", target_level: "authority" }),
      });

      const res = await userApp.request("/v1/reputation/proposals");
      expect(res.status).toBe(200);
      const body: Json = await res.json();
      expect(body.data).toHaveLength(2);
    });

    test("does not list closed proposals", async () => {
      // Create a proposal
      const createRes = await adminApp.request("/v1/reputation/agent-1/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "typescript", target_level: "gold" }),
      });
      const created: Json = await createRes.json();
      // Manually close it
      await stores.reputation.updateProposalStatus(created.data.proposal_id, "approved");

      const res = await userApp.request("/v1/reputation/proposals");
      expect(res.status).toBe(200);
      const body: Json = await res.json();
      expect(body.data).toHaveLength(0);
    });
  });

  // ── POST /v1/reputation/proposals/:proposal_id/vote ─

  describe("POST /v1/reputation/proposals/:proposal_id/vote", () => {
    let proposalId: string;

    beforeEach(async () => {
      // Create a proposal via admin
      const createRes = await adminApp.request("/v1/reputation/agent-target/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "typescript", target_level: "gold" }),
      });
      const created: Json = await createRes.json();
      proposalId = created.data.proposal_id;
    });

    test("adds weighted vote", async () => {
      // Set up agent-1 as votable with score 16 (sqrt = 4)
      await seedVotableAgent(stores, "agent-1", 16);

      const res = await userApp.request(
        `/v1/reputation/proposals/${proposalId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approve: true }),
        },
      );
      expect(res.status).toBe(200);
      const body: Json = await res.json();
      expect(body.data.vote.voter_id).toBe("agent-1");
      expect(body.data.vote.approve).toBe(true);
      expect(body.data.vote.weight).toBeCloseTo(4, 1); // sqrt(16) = 4
      expect(body.data.total_votes).toBe(1);
      expect(body.data.status).toBe("pending"); // <5 votes, no auto-resolve
    });

    test("auto-approves with 5+ weighted votes > 60%", async () => {
      // Create 5 agents that can vote, all approving
      for (let i = 1; i <= 5; i++) {
        const agentId = `voter-${i}`;
        await seedVotableAgent(stores, agentId, 9); // sqrt(9)=3

        const voterApp = createTestApp(stores, {
          agentId,
          apiKey: { scopes: ["read", "write"], tier: "pro" },
          tier: "pro",
        });

        const res = await voterApp.request(
          `/v1/reputation/proposals/${proposalId}/vote`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approve: true }),
          },
        );
        expect(res.status).toBe(200);
      }

      // Check last vote triggered auto-approve
      const proposal = await stores.reputation.getProposal(proposalId);
      expect(proposal!.status).toBe("approved");

      // Check badge was granted
      const badges = await stores.reputation.getBadges("agent-target");
      expect(badges).toHaveLength(1);
      expect(badges[0]!.domain).toBe("typescript");
      expect(badges[0]!.level).toBe("gold");
      expect(badges[0]!.granted_by).toBe("community-vote");
    });

    test("rejected when voter cant vote (30-day cooldown)", async () => {
      // Create agent-1 with reputation but NOT backdating (too new)
      await stores.reputation.upsert("agent-1", 10, "Seed reputation");
      // Don't backdate — agent is too new, canVote returns false

      const res = await userApp.request(
        `/v1/reputation/proposals/${proposalId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approve: true }),
        },
      );
      expect(res.status).toBe(403);
      const body: Json = await res.json();
      expect(body.error).toContain("30-day");
    });

    test("auto-rejects when approval < 60% with 5+ votes", async () => {
      // 2 approve, 3 reject => 40% approval < 60%, reject > 40%
      for (let i = 1; i <= 5; i++) {
        const agentId = `voter-${i}`;
        await seedVotableAgent(stores, agentId, 4); // sqrt(4)=2, all equal weight

        const voterApp = createTestApp(stores, {
          agentId,
          apiKey: { scopes: ["read", "write"], tier: "pro" },
          tier: "pro",
        });

        const approve = i <= 2; // first 2 approve, last 3 reject

        const res = await voterApp.request(
          `/v1/reputation/proposals/${proposalId}/vote`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approve }),
          },
        );
        expect(res.status).toBe(200);
      }

      // Check auto-reject
      const proposal = await stores.reputation.getProposal(proposalId);
      expect(proposal!.status).toBe("rejected");

      // No badge should be granted
      const badges = await stores.reputation.getBadges("agent-target");
      expect(badges).toHaveLength(0);
    });

    test("rejects unauthenticated vote", async () => {
      const res = await unauthApp.request(
        `/v1/reputation/proposals/${proposalId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approve: true }),
        },
      );
      expect(res.status).toBe(401);
    });

    test("returns 404 for non-existent proposal", async () => {
      await seedVotableAgent(stores, "agent-1", 10);

      const res = await userApp.request(
        "/v1/reputation/proposals/non-existent/vote",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approve: true }),
        },
      );
      expect(res.status).toBe(404);
    });
  });
});
