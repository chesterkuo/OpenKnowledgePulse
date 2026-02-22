import { Hono } from "hono";
import type { AuthContext } from "../middleware/auth.js";
import type { AllStores } from "../store/interfaces.js";

export function reputationRoutes(stores: AllStores) {
  const app = new Hono();

  // ── Static routes MUST come before parameterized routes ──

  // GET /v1/reputation/leaderboard — Paginated leaderboard
  app.get("/leaderboard", async (c) => {
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 20;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : 0;
    const result = await stores.reputation.getLeaderboard({ limit, offset });
    return c.json(result);
  });

  // GET /v1/reputation/proposals — List open certification proposals
  app.get("/proposals", async (c) => {
    const proposals = await stores.reputation.getOpenProposals();
    return c.json({ data: proposals });
  });

  // POST /v1/reputation/proposals/:proposal_id/vote — Cast vote on certification
  app.post("/proposals/:proposal_id/vote", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated || !auth.agentId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const proposalId = c.req.param("proposal_id");
    const proposal = await stores.reputation.getProposal(proposalId);
    if (!proposal) {
      return c.json({ error: "Proposal not found" }, 404);
    }

    if (proposal.status !== "open") {
      return c.json({ error: "Proposal is no longer open for voting" }, 400);
    }

    // Check 30-day cooldown
    const eligible = await stores.reputation.canVote(auth.agentId);
    if (!eligible) {
      return c.json({ error: "Voter does not meet voting requirements (30-day cooldown)" }, 403);
    }

    // Check for duplicate vote
    const alreadyVoted = proposal.votes.some((v) => v.voter_id === auth.agentId);
    if (alreadyVoted) {
      return c.json({ error: "Already voted on this proposal" }, 400);
    }

    const body = await c.req.json<{ approve: boolean }>();
    if (typeof body.approve !== "boolean") {
      return c.json({ error: "approve field must be a boolean" }, 400);
    }

    // Weight = sqrt(voter's KP-REP score)
    const voterRecord = await stores.reputation.get(auth.agentId);
    const voterScore = voterRecord?.score ?? 0;
    const weight = Math.sqrt(voterScore);

    await stores.reputation.addVoteToProposal(proposalId, {
      voter_id: auth.agentId,
      approve: body.approve,
      weight,
    });

    // Re-fetch proposal to get updated votes
    const updated = await stores.reputation.getProposal(proposalId);
    if (!updated) {
      return c.json({ error: "Proposal not found after vote" }, 500);
    }

    let autoResult: "pending" | "approved" | "rejected" = "pending";

    // Auto-approve/reject with 5+ votes
    if (updated.votes.length >= 5) {
      const totalWeight = updated.votes.reduce((sum, v) => sum + v.weight, 0);
      const approveWeight = updated.votes
        .filter((v) => v.approve)
        .reduce((sum, v) => sum + v.weight, 0);
      const rejectWeight = totalWeight - approveWeight;

      const approvalRate = totalWeight > 0 ? approveWeight / totalWeight : 0;
      const rejectRate = totalWeight > 0 ? rejectWeight / totalWeight : 0;

      if (approvalRate >= 0.6) {
        await stores.reputation.updateProposalStatus(proposalId, "approved");
        await stores.reputation.grantBadge({
          badge_id: `badge-${updated.agent_id}-${updated.domain}-${updated.target_level}`,
          agent_id: updated.agent_id,
          domain: updated.domain,
          level: updated.target_level,
          granted_at: new Date().toISOString(),
          granted_by: "community-vote",
        });
        autoResult = "approved";
      } else if (rejectRate > 0.4) {
        await stores.reputation.updateProposalStatus(proposalId, "rejected");
        autoResult = "rejected";
      }
    }

    return c.json({
      data: {
        proposal_id: proposalId,
        vote: { voter_id: auth.agentId, approve: body.approve, weight },
        total_votes: updated.votes.length,
        status: autoResult,
      },
    });
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

  // ── Parameterized routes come AFTER static routes ──

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

  // GET /v1/reputation/:agent_id/badges — List agent's badges
  app.get("/:agent_id/badges", async (c) => {
    const agentId = c.req.param("agent_id");
    const badges = await stores.reputation.getBadges(agentId);
    return c.json({ data: badges });
  });

  // POST /v1/reputation/:agent_id/certify — Create certification proposal
  app.post("/:agent_id/certify", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated || !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Admin access required" }, 403);
    }

    const agentId = c.req.param("agent_id");
    const body = await c.req.json<{ domain: string; target_level: string }>();

    if (!body.domain || !body.target_level) {
      return c.json({ error: "domain and target_level are required" }, 400);
    }

    if (body.target_level !== "gold" && body.target_level !== "authority") {
      return c.json({ error: "target_level must be 'gold' or 'authority'" }, 400);
    }

    const now = new Date();
    const closesAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const proposal = await stores.reputation.createProposal({
      proposal_id: `prop-${crypto.randomUUID()}`,
      agent_id: agentId,
      domain: body.domain,
      target_level: body.target_level as "gold" | "authority",
      proposed_by: auth.agentId!,
      votes: [],
      status: "open",
      created_at: now.toISOString(),
      closes_at: closesAt.toISOString(),
    });

    return c.json({ data: proposal }, 201);
  });

  return app;
}
