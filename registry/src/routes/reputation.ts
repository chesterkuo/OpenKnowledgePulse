import { Hono } from "hono";
import type { AuthContext } from "../middleware/auth.js";
import type { AllStores } from "../store/interfaces.js";

export function reputationRoutes(stores: AllStores) {
  const app = new Hono();

  // GET /v1/reputation/leaderboard — Paginated leaderboard
  // Must be before /:agent_id to avoid treating "leaderboard" as an agent_id
  app.get("/leaderboard", async (c) => {
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 20;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : 0;
    const result = await stores.reputation.getLeaderboard({ limit, offset });
    return c.json(result);
  });

  // GET /v1/reputation/:agent_id — Query KP-REP score
  app.get("/:agent_id", async (c) => {
    const agentId = c.req.param("agent_id");
    const record = await stores.reputation.get(agentId);
    if (!record) {
      return c.json({
        data: { agent_id: agentId, score: 0, contributions: 0, validations: 0 },
      });
    }
    return c.json({ data: record });
  });

  // POST /v1/reputation/recompute — Admin trigger for EigenTrust
  app.post("/recompute", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated || !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Admin access required" }, 403);
    }
    const { computeEigenTrust } = await import("@knowledgepulse/sdk");
    const votes = await stores.reputation.getVotes();
    const result = computeEigenTrust(votes);
    for (const [agentId, score] of result.scores) {
      const existing = await stores.reputation.get(agentId);
      const currentScore = existing?.score ?? 0;
      const delta = score * 100 - currentScore;
      if (Math.abs(delta) > 0.01) {
        await stores.reputation.upsert(agentId, delta, "EigenTrust recomputation");
      }
    }
    return c.json({
      data: {
        agents_updated: result.scores.size,
        iterations: result.iterations,
        converged: result.converged,
      },
    });
  });

  return app;
}
