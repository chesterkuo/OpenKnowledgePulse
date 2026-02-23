import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { AllStores, MarketplaceListing } from "../store/interfaces.js";
import { createMemoryStore } from "../store/memory/index.js";
import { marketplaceRoutes } from "./marketplace.js";

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
  app.route("/v1/marketplace", marketplaceRoutes(stores));
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

function createFreeApp(stores: AllStores) {
  return createTestApp(stores, {
    agentId: "free-agent",
    apiKey: { scopes: ["read", "write"], tier: "free" },
    tier: "free",
  });
}

function createEntApp(stores: AllStores) {
  return createTestApp(stores, {
    agentId: "ent-agent",
    apiKey: { scopes: ["read", "write"], tier: "enterprise" },
    tier: "enterprise",
  });
}

function makeListing(overrides: Partial<MarketplaceListing> = {}) {
  return {
    knowledge_unit_id: `kp:ku:${crypto.randomUUID()}`,
    price_credits: 50,
    access_model: "org" as const,
    domain: "devops",
    title: "Kubernetes Deployment Guide",
    description: "Expert guide to K8s deployments",
    ...overrides,
  };
}

async function postListing(app: Hono, body: Record<string, unknown> = makeListing()) {
  const res = await app.request("/v1/marketplace/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { res, body: (await res.json()) as { data: MarketplaceListing } };
}

// ── Tests ────────────────────────────────────────────────

describe("Marketplace Routes", () => {
  let stores: AllStores;
  let app: Hono;
  let adminApp: Hono;

  beforeEach(() => {
    stores = createMemoryStore();
    app = createTestApp(stores);
    adminApp = createAdminApp(stores);
  });

  const savedEnv = process.env.KP_MARKETPLACE_REVENUE_SHARE;

  afterEach(() => {
    if (savedEnv === undefined) {
      process.env.KP_MARKETPLACE_REVENUE_SHARE = undefined;
    } else {
      process.env.KP_MARKETPLACE_REVENUE_SHARE = savedEnv;
    }
  });

  // ── POST /v1/marketplace/listings ─────────────────────

  describe("POST /v1/marketplace/listings", () => {
    test("should create a listing and return 201", async () => {
      const { res, body } = await postListing(app);

      expect(res.status).toBe(201);
      expect(body.data.id).toMatch(/^kp:listing:/);
      expect(body.data.title).toBe("Kubernetes Deployment Guide");
      expect(body.data.contributor_id).toBe("agent-1");
      expect(body.data.purchases).toBe(0);
      expect(body.data.price_credits).toBe(50);
      expect(body.data.access_model).toBe("org");
    });

    test("should reject unauthenticated create with 401", async () => {
      const unauthApp = createUnauthApp(stores);
      const res = await unauthApp.request("/v1/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makeListing()),
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Authentication required");
    });

    test("should reject read-only scope with 403", async () => {
      const readApp = createReadOnlyApp(stores);
      const res = await readApp.request("/v1/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makeListing()),
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Write or admin scope required");
    });
  });

  // ── GET /v1/marketplace/listings ──────────────────────

  describe("GET /v1/marketplace/listings", () => {
    test("should return empty list when no listings exist", async () => {
      const res = await app.request("/v1/marketplace/listings");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: MarketplaceListing[];
        total: number;
      };
      expect(body.data).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    test("should return listings after creation", async () => {
      await postListing(app);
      const res = await app.request("/v1/marketplace/listings");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: MarketplaceListing[];
        total: number;
      };
      expect(body.total).toBe(1);
      expect(body.data[0]!.title).toBe("Kubernetes Deployment Guide");
    });

    test("should filter by domain", async () => {
      await postListing(app, makeListing({ domain: "devops" }));
      await postListing(app, makeListing({ domain: "security" }));

      const res = await app.request("/v1/marketplace/listings?domain=devops");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: MarketplaceListing[];
        total: number;
      };
      expect(body.total).toBe(1);
      expect(body.data[0]!.domain).toBe("devops");
    });

    test("should filter by access_model", async () => {
      await postListing(app, makeListing({ access_model: "free", title: "Free Guide" }));
      await postListing(app, makeListing({ access_model: "org", title: "Org Guide" }));

      const res = await app.request("/v1/marketplace/listings?access_model=free");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: MarketplaceListing[];
        total: number;
      };
      expect(body.total).toBe(1);
      expect(body.data[0]!.title).toBe("Free Guide");
    });

    test("should search by query text", async () => {
      await postListing(app, makeListing({ title: "Kubernetes Guide", description: "K8s stuff" }));
      await postListing(
        app,
        makeListing({
          title: "Docker Compose",
          description: "Container orchestration",
        }),
      );

      const res = await app.request("/v1/marketplace/listings?q=docker");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: MarketplaceListing[];
        total: number;
      };
      expect(body.total).toBe(1);
      expect(body.data[0]!.title).toBe("Docker Compose");
    });

    test("should support pagination with limit and offset", async () => {
      await postListing(app, makeListing({ title: "Guide 1" }));
      await postListing(app, makeListing({ title: "Guide 2" }));
      await postListing(app, makeListing({ title: "Guide 3" }));

      const res = await app.request("/v1/marketplace/listings?limit=2&offset=0");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: MarketplaceListing[];
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

  // ── GET /v1/marketplace/listings/:id ──────────────────

  describe("GET /v1/marketplace/listings/:id", () => {
    test("should return a listing by ID", async () => {
      const { body: created } = await postListing(app);
      const res = await app.request(`/v1/marketplace/listings/${created.data.id}`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: MarketplaceListing };
      expect(body.data.id).toBe(created.data.id);
      expect(body.data.title).toBe("Kubernetes Deployment Guide");
    });

    test("should return 404 for non-existent listing", async () => {
      const res = await app.request("/v1/marketplace/listings/kp:listing:nonexistent");
      expect(res.status).toBe(404);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Listing not found");
    });
  });

  // ── POST /v1/marketplace/purchase/:id ─────────────────

  describe("POST /v1/marketplace/purchase/:id", () => {
    test("should purchase a listing and deduct credits", async () => {
      // Seed buyer credits
      await stores.credits.addCredits("agent-1", 200, "seed");

      const { body: created } = await postListing(app);
      const listingId = created.data.id;

      const res = await app.request(`/v1/marketplace/purchase/${listingId}`, { method: "POST" });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        purchased: boolean;
        credits_spent: number;
        contributor_payout: number;
        platform_fee: number;
      };
      expect(body.purchased).toBe(true);
      expect(body.credits_spent).toBe(50);
      // Default 70% revenue share: floor(50 * 0.70) = 35
      expect(body.contributor_payout).toBe(35);
      expect(body.platform_fee).toBe(15);
    });

    test("should apply correct 70/30 revenue split", async () => {
      await stores.credits.addCredits("agent-1", 1000, "seed");

      const { body: created } = await postListing(app, makeListing({ price_credits: 100 }));

      const res = await app.request(`/v1/marketplace/purchase/${created.data.id}`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        contributor_payout: number;
        platform_fee: number;
        credits_spent: number;
      };
      expect(body.contributor_payout).toBe(70); // 100 * 0.70
      expect(body.platform_fee).toBe(30); // 100 - 70
      expect(body.credits_spent).toBe(100);
    });

    test("should use KP_MARKETPLACE_REVENUE_SHARE env var", async () => {
      process.env.KP_MARKETPLACE_REVENUE_SHARE = "0.80";
      await stores.credits.addCredits("agent-1", 1000, "seed");

      const { body: created } = await postListing(app, makeListing({ price_credits: 100 }));

      const res = await app.request(`/v1/marketplace/purchase/${created.data.id}`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        contributor_payout: number;
        platform_fee: number;
      };
      expect(body.contributor_payout).toBe(80); // 100 * 0.80
      expect(body.platform_fee).toBe(20);
    });

    test("should return 402 when insufficient credits", async () => {
      // Don't seed credits — balance is 0
      const { body: created } = await postListing(app);

      const res = await app.request(`/v1/marketplace/purchase/${created.data.id}`, {
        method: "POST",
      });
      expect(res.status).toBe(402);

      const body = (await res.json()) as {
        error: string;
        balance: number;
        required: number;
      };
      expect(body.error).toBe("Insufficient credits");
      expect(body.balance).toBe(0);
      expect(body.required).toBe(50);
    });

    test("should skip credit deduction for free listings", async () => {
      const { body: created } = await postListing(
        app,
        makeListing({ access_model: "free", price_credits: 0 }),
      );

      const res = await app.request(`/v1/marketplace/purchase/${created.data.id}`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        purchased: boolean;
        credits_spent: number;
        message: string;
      };
      expect(body.purchased).toBe(true);
      expect(body.credits_spent).toBe(0);
      expect(body.message).toContain("Free");
    });

    test("should skip credit deduction for free access_model listings", async () => {
      // Even if price_credits > 0, access_model=free should be free
      const { body: created } = await postListing(
        app,
        makeListing({ access_model: "free", price_credits: 50 }),
      );

      const res = await app.request(`/v1/marketplace/purchase/${created.data.id}`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        purchased: boolean;
        credits_spent: number;
      };
      expect(body.purchased).toBe(true);
      expect(body.credits_spent).toBe(0);
    });

    test("should return 404 for non-existent listing on purchase", async () => {
      const res = await app.request("/v1/marketplace/purchase/kp:listing:nonexistent", {
        method: "POST",
      });
      expect(res.status).toBe(404);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Listing not found");
    });

    test("should require authentication for purchase", async () => {
      const unauthApp = createUnauthApp(stores);
      const { body: created } = await postListing(app);

      const res = await unauthApp.request(`/v1/marketplace/purchase/${created.data.id}`, {
        method: "POST",
      });
      expect(res.status).toBe(401);
    });

    test("should increment purchase count on listing after purchase", async () => {
      await stores.credits.addCredits("agent-1", 500, "seed");
      const { body: created } = await postListing(app);

      await app.request(`/v1/marketplace/purchase/${created.data.id}`, { method: "POST" });

      const listing = await stores.marketplace.getListing(created.data.id);
      expect(listing!.purchases).toBe(1);
    });

    test("should credit contributor after purchase", async () => {
      await stores.credits.addCredits("agent-1", 500, "seed");

      // Create listing by agent-1 (contributor)
      const { body: created } = await postListing(app, makeListing({ price_credits: 100 }));

      // Purchase by a different agent
      const buyerApp = createTestApp(stores, {
        agentId: "buyer-1",
        apiKey: { scopes: ["read", "write"], tier: "pro" },
      });
      await stores.credits.addCredits("buyer-1", 500, "seed");

      await buyerApp.request(`/v1/marketplace/purchase/${created.data.id}`, { method: "POST" });

      // Contributor (agent-1) should have received 70% payout
      const contributorBalance = await stores.credits.getBalance("agent-1");
      // Started with 500, got 70 from payout = 570
      expect(contributorBalance).toBe(570);
    });
  });

  // ── GET /v1/marketplace/balance ───────────────────────

  describe("GET /v1/marketplace/balance", () => {
    test("should return balance and trigger initial refill for pro tier", async () => {
      const res = await app.request("/v1/marketplace/balance");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        balance: number;
        tier: string;
        last_refill: string;
        refilled: boolean;
      };
      expect(body.balance).toBe(1000); // Pro tier initial refill
      expect(body.tier).toBe("pro");
      expect(body.last_refill).toBeTruthy();
      expect(body.refilled).toBe(true);
    });

    test("should refill 100 credits for free tier", async () => {
      const freeApp = createFreeApp(stores);
      const res = await freeApp.request("/v1/marketplace/balance");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { balance: number; tier: string };
      expect(body.balance).toBe(100);
      expect(body.tier).toBe("free");
    });

    test("should refill 5000 credits for enterprise tier", async () => {
      const entApp = createEntApp(stores);
      const res = await entApp.request("/v1/marketplace/balance");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { balance: number; tier: string };
      expect(body.balance).toBe(5000);
      expect(body.tier).toBe("enterprise");
    });

    test("should not refill if last refill was less than 30 days ago", async () => {
      // First call triggers refill
      await app.request("/v1/marketplace/balance");

      // Second call should not refill
      const res = await app.request("/v1/marketplace/balance");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        balance: number;
        refilled: boolean;
      };
      expect(body.balance).toBe(1000); // Should stay at 1000, not 2000
      expect(body.refilled).toBe(false);
    });

    test("should refill if last refill was more than 30 days ago", async () => {
      // Set last refill to 31 days ago
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
      await stores.credits.setLastRefill("agent-1", thirtyOneDaysAgo.toISOString());

      const res = await app.request("/v1/marketplace/balance");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        balance: number;
        refilled: boolean;
      };
      expect(body.balance).toBe(1000); // Pro refill amount
      expect(body.refilled).toBe(true);
    });

    test("should require authentication for balance", async () => {
      const unauthApp = createUnauthApp(stores);
      const res = await unauthApp.request("/v1/marketplace/balance");
      expect(res.status).toBe(401);
    });
  });

  // ── GET /v1/marketplace/earnings ──────────────────────

  describe("GET /v1/marketplace/earnings", () => {
    test("should return empty earnings when no transactions", async () => {
      const res = await app.request("/v1/marketplace/earnings");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        agent_id: string;
        total_earnings: number;
        transactions: unknown[];
      };
      expect(body.agent_id).toBe("agent-1");
      expect(body.total_earnings).toBe(0);
      expect(body.transactions).toHaveLength(0);
    });

    test("should return earnings after receiving payouts", async () => {
      // Simulate payouts by adding credits
      await stores.credits.addCredits("agent-1", 70, "Payout for listing: Guide");
      await stores.credits.addCredits("agent-1", 35, "Payout for listing: Tutorial");

      const res = await app.request("/v1/marketplace/earnings");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        agent_id: string;
        total_earnings: number;
        transactions: unknown[];
      };
      expect(body.total_earnings).toBe(105);
      expect(body.transactions).toHaveLength(2);
    });

    test("should require authentication for earnings", async () => {
      const unauthApp = createUnauthApp(stores);
      const res = await unauthApp.request("/v1/marketplace/earnings");
      expect(res.status).toBe(401);
    });
  });

  // ── POST /v1/marketplace/credits ──────────────────────

  describe("POST /v1/marketplace/credits", () => {
    test("should allow admin to add credits", async () => {
      const res = await adminApp.request("/v1/marketplace/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "agent-1",
          amount: 500,
          reason: "Bonus credits",
        }),
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        agent_id: string;
        amount: number;
        reason: string;
        new_balance: number;
      };
      expect(body.agent_id).toBe("agent-1");
      expect(body.amount).toBe(500);
      expect(body.new_balance).toBe(500);
    });

    test("should reject non-admin with 403", async () => {
      const res = await app.request("/v1/marketplace/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "agent-1",
          amount: 500,
          reason: "Bonus",
        }),
      });
      expect(res.status).toBe(403);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Admin scope required");
    });

    test("should reject unauthenticated with 401", async () => {
      const unauthApp = createUnauthApp(stores);
      const res = await unauthApp.request("/v1/marketplace/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "agent-1",
          amount: 500,
          reason: "Bonus",
        }),
      });
      expect(res.status).toBe(401);
    });

    test("should return 400 for missing required fields", async () => {
      const res = await adminApp.request("/v1/marketplace/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: "agent-1" }),
      });
      expect(res.status).toBe(400);

      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("Missing required fields");
    });

    test("should accumulate credits on multiple additions", async () => {
      await adminApp.request("/v1/marketplace/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "agent-1",
          amount: 300,
          reason: "First bonus",
        }),
      });
      const res = await adminApp.request("/v1/marketplace/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "agent-1",
          amount: 200,
          reason: "Second bonus",
        }),
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { new_balance: number };
      expect(body.new_balance).toBe(500);
    });
  });

  // ── Subscription endpoints ────────────────────────────

  describe("Subscription endpoints", () => {
    test("POST /v1/marketplace/subscribe creates a subscription", async () => {
      // Seed credits first
      await stores.credits.addCredits("agent-1", 200, "seed");
      const res = await app.request("/v1/marketplace/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "devops", credits_per_month: 50 }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.domain).toBe("devops");
      expect(body.data.status).toBe("active");
    });

    test("POST /v1/marketplace/subscribe returns 402 if insufficient credits", async () => {
      // No credits seeded
      const res = await app.request("/v1/marketplace/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "devops" }),
      });
      expect(res.status).toBe(402);
    });

    test("POST /v1/marketplace/subscribe returns 400 if domain missing", async () => {
      const res = await app.request("/v1/marketplace/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    test("POST /v1/marketplace/subscribe requires auth", async () => {
      const unauthApp = createUnauthApp(stores);
      const res = await unauthApp.request("/v1/marketplace/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "devops" }),
      });
      expect(res.status).toBe(401);
    });

    test("DELETE /v1/marketplace/subscribe/:id cancels subscription", async () => {
      await stores.credits.addCredits("agent-1", 200, "seed");
      const subRes = await app.request("/v1/marketplace/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "devops", credits_per_month: 50 }),
      });
      const sub = await subRes.json();

      const delRes = await app.request(`/v1/marketplace/subscribe/${sub.data.id}`, {
        method: "DELETE",
      });
      expect(delRes.status).toBe(200);
      const delBody = await delRes.json();
      expect(delBody.cancelled).toBe(true);
    });

    test("DELETE /v1/marketplace/subscribe/:id returns 404 for unknown", async () => {
      const res = await app.request("/v1/marketplace/subscribe/unknown-id", {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
    });

    test("GET /v1/marketplace/subscriptions lists active subscriptions", async () => {
      await stores.credits.addCredits("agent-1", 500, "seed");
      await app.request("/v1/marketplace/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "devops", credits_per_month: 50 }),
      });
      await app.request("/v1/marketplace/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "security", credits_per_month: 30 }),
      });

      const res = await app.request("/v1/marketplace/subscriptions");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
    });

    test("purchase with subscription access_model succeeds when subscribed", async () => {
      await stores.credits.addCredits("agent-1", 500, "seed");
      // Subscribe to devops domain
      await app.request("/v1/marketplace/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "devops", credits_per_month: 50 }),
      });
      // Create subscription-tier listing
      const { body: created } = await postListing(
        app,
        makeListing({
          access_model: "subscription",
          domain: "devops",
          price_credits: 100,
        }),
      );
      // Purchase — should succeed via subscription
      const res = await app.request(`/v1/marketplace/purchase/${created.data.id}`, {
        method: "POST",
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.purchased).toBe(true);
      expect(body.credits_spent).toBe(0);
      expect(body.via_subscription).toBe(true);
    });

    test("purchase with subscription access_model returns 402 without subscription", async () => {
      const { body: created } = await postListing(
        app,
        makeListing({
          access_model: "subscription",
          domain: "devops",
          price_credits: 100,
        }),
      );
      const res = await app.request(`/v1/marketplace/purchase/${created.data.id}`, {
        method: "POST",
      });
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error).toBe("Subscription required");
      expect(body.domain).toBe("devops");
    });
  });
});
