import { Hono } from "hono";
import type { AllStores, MarketplaceListing } from "../store/interfaces.js";
import type { HonoEnv } from "../types.js";

/** Default revenue share for contributors (70%) */
const DEFAULT_REVENUE_SHARE = 0.7;

/** Credit refill amounts by tier */
const REFILL_AMOUNTS: Record<string, number> = {
  free: 100,
  pro: 1000,
  enterprise: 5000,
};

/** Refill interval in milliseconds (30 days) */
const REFILL_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

function getRevenueShare(): number {
  const envVal = process.env.KP_MARKETPLACE_REVENUE_SHARE;
  if (envVal !== undefined) {
    const parsed = Number.parseFloat(envVal);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
  }
  return DEFAULT_REVENUE_SHARE;
}

export function marketplaceRoutes(stores: AllStores) {
  const app = new Hono<HonoEnv>();

  // GET /v1/marketplace/listings — Browse listings
  app.get("/listings", async (c) => {
    const domain = c.req.query("domain");
    const access_model = c.req.query("access_model");
    const query = c.req.query("q");
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 20;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : 0;

    const result = await stores.marketplace.search({
      domain,
      access_model,
      query,
      pagination: { offset, limit },
    });

    return c.json(result);
  });

  // GET /v1/marketplace/my-listings — Current user's listings
  app.get("/my-listings", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const listings = await stores.marketplace.getByContributor(auth.agentId!);
    return c.json({ data: listings, total: listings.length, offset: 0, limit: listings.length });
  });

  // GET /v1/marketplace/listings/:id — Listing detail
  app.get("/listings/:id", async (c) => {
    const id = c.req.param("id");
    const listing = await stores.marketplace.getListing(id);
    if (!listing) {
      return c.json({ error: "Listing not found" }, 404);
    }
    return c.json({ data: listing });
  });

  // POST /v1/marketplace/listings — Create listing
  app.post("/listings", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }
    if (!auth.apiKey?.scopes.includes("write") && !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Write or admin scope required" }, 403);
    }

    const body = await c.req.json();
    const now = new Date().toISOString();

    const listing: MarketplaceListing = {
      id: `kp:listing:${crypto.randomUUID()}`,
      knowledge_unit_id: body.knowledge_unit_id,
      contributor_id: auth.agentId!,
      price_credits: body.price_credits,
      access_model: body.access_model,
      domain: body.domain,
      title: body.title,
      description: body.description,
      purchases: 0,
      created_at: now,
      updated_at: now,
    };

    const created = await stores.marketplace.createListing(listing);
    return c.json({ data: created }, 201);
  });

  // POST /v1/marketplace/purchase/:id — Buy with credits
  app.post("/purchase/:id", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const id = c.req.param("id");
    const listing = await stores.marketplace.getListing(id);
    if (!listing) {
      return c.json({ error: "Listing not found" }, 404);
    }

    // Free listings don't require purchase
    if (listing.access_model === "free" || listing.price_credits === 0) {
      return c.json({
        purchased: true,
        credits_spent: 0,
        contributor_payout: 0,
        message: "Free listing — no credits required",
      });
    }

    // Subscription-tier listings require active subscription
    if (listing.access_model === "subscription") {
      const hasAccess = await stores.subscriptions.hasAccess(auth.agentId!, listing.domain);
      if (hasAccess) {
        // Subscription covers this — record access but no charge
        await stores.marketplace.recordPurchase(id, auth.agentId!);
        return c.json({ purchased: true, credits_spent: 0, via_subscription: true });
      }
      return c.json(
        {
          error: "Subscription required",
          domain: listing.domain,
          message: "Subscribe to this domain via POST /v1/marketplace/subscribe",
        },
        402,
      );
    }

    // Deduct credits from buyer
    const deducted = await stores.credits.deductCredits(
      auth.agentId!,
      listing.price_credits,
      `Purchase listing: ${listing.title}`,
    );

    if (!deducted) {
      const balance = await stores.credits.getBalance(auth.agentId!);
      return c.json(
        {
          error: "Insufficient credits",
          balance,
          required: listing.price_credits,
        },
        402,
      );
    }

    // Revenue share
    const revenueShare = getRevenueShare();
    const contributorPayout = Math.floor(listing.price_credits * revenueShare);
    const platformFee = listing.price_credits - contributorPayout;

    // Credit contributor
    await stores.credits.addCredits(
      listing.contributor_id,
      contributorPayout,
      `Payout for listing: ${listing.title}`,
    );

    // Record purchase
    await stores.marketplace.recordPurchase(id, auth.agentId!);

    return c.json({
      purchased: true,
      credits_spent: listing.price_credits,
      contributor_payout: contributorPayout,
      platform_fee: platformFee,
    });
  });

  // GET /v1/marketplace/balance — Credit balance with auto-refill
  app.get("/balance", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const agentId = auth.agentId!;
    const tier = auth.apiKey?.tier ?? "free";

    // Auto-refill check
    const lastRefill = await stores.credits.getLastRefill(agentId);
    const now = new Date();
    let refilled = false;

    if (!lastRefill) {
      // Never refilled — do initial refill
      const amount = REFILL_AMOUNTS[tier] ?? REFILL_AMOUNTS.free ?? 100;
      await stores.credits.addCredits(agentId, amount, `Initial credit refill (${tier} tier)`);
      await stores.credits.setLastRefill(agentId, now.toISOString());
      refilled = true;
    } else {
      const lastRefillDate = new Date(lastRefill);
      const elapsed = now.getTime() - lastRefillDate.getTime();
      if (elapsed > REFILL_INTERVAL_MS) {
        const amount = REFILL_AMOUNTS[tier] ?? REFILL_AMOUNTS.free ?? 100;
        await stores.credits.addCredits(agentId, amount, `Monthly credit refill (${tier} tier)`);
        await stores.credits.setLastRefill(agentId, now.toISOString());
        refilled = true;
      }
    }

    const balance = await stores.credits.getBalance(agentId);
    const currentLastRefill = await stores.credits.getLastRefill(agentId);

    return c.json({
      balance,
      tier,
      last_refill: currentLastRefill ?? null,
      refilled,
    });
  });

  // GET /v1/marketplace/earnings — Contributor earnings
  app.get("/earnings", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const agentId = auth.agentId!;
    const transactions = await stores.credits.getTransactions(agentId, {
      offset: 0,
      limit: 1000,
    });

    // Filter to payout/earned transactions
    const payouts = transactions.data.filter((tx) => tx.type === "earned" || tx.type === "payout");

    const totalEarnings = payouts.reduce((sum, tx) => sum + tx.amount, 0);

    return c.json({
      agent_id: agentId,
      total_earnings: totalEarnings,
      transactions: payouts,
    });
  });

  // POST /v1/marketplace/credits — Admin add credits
  app.post("/credits", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }
    if (!auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Admin scope required" }, 403);
    }

    const body = await c.req.json();
    const { agent_id, amount, reason } = body;

    if (!agent_id || typeof amount !== "number" || !reason) {
      return c.json({ error: "Missing required fields: agent_id, amount, reason" }, 400);
    }

    await stores.credits.addCredits(agent_id, amount, reason);
    const balance = await stores.credits.getBalance(agent_id);

    return c.json({
      agent_id,
      amount,
      reason,
      new_balance: balance,
    });
  });

  // POST /v1/marketplace/subscribe — Create domain subscription
  app.post("/subscribe", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) return c.json({ error: "Authentication required" }, 401);

    const { domain, credits_per_month } = await c.req.json();
    if (!domain) return c.json({ error: "domain is required" }, 400);

    const price = credits_per_month ?? Number(process.env.KP_SUBSCRIPTION_DEFAULT_CREDITS ?? 50);

    // Deduct first month
    const deducted = await stores.credits.deductCredits(
      auth.agentId!,
      price,
      `Subscription: ${domain} (first month)`,
    );
    if (!deducted) {
      const balance = await stores.credits.getBalance(auth.agentId!);
      return c.json({ error: "Insufficient credits", balance, required: price }, 402);
    }

    const sub = await stores.subscriptions.subscribe(auth.agentId!, domain, price);
    return c.json({ data: sub }, 201);
  });

  // DELETE /v1/marketplace/subscribe/:id — Cancel subscription
  app.delete("/subscribe/:id", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) return c.json({ error: "Authentication required" }, 401);

    const cancelled = await stores.subscriptions.unsubscribe(c.req.param("id"));
    if (!cancelled) return c.json({ error: "Subscription not found" }, 404);
    return c.json({ cancelled: true });
  });

  // GET /v1/marketplace/subscriptions — List active subscriptions
  app.get("/subscriptions", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) return c.json({ error: "Authentication required" }, 401);

    const subs = await stores.subscriptions.getActive(auth.agentId!);
    return c.json({ data: subs });
  });

  return app;
}
