import { Hono } from "hono";
import type { AuthContext } from "../middleware/auth.js";
import type { AllStores } from "../store/interfaces.js";

export function exportRoutes(stores: AllStores) {
  const app = new Hono();

  // GET /v1/export/:agent_id — GDPR Art. 20 data portability
  app.get("/:agent_id", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const agentId = c.req.param("agent_id");

    // Only the agent themselves or admin can export
    if (auth.agentId !== agentId && !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Forbidden: can only export your own data" }, 403);
    }

    const knowledgeUnits = await stores.knowledge.getByAgentId(agentId);
    const reputation = await stores.reputation.get(agentId);
    const apiKeys = await stores.apiKeys.getByAgentId(agentId);

    const exportData = {
      "@context": "https://openknowledgepulse.org/export/v1",
      agent_id: agentId,
      exported_at: new Date().toISOString(),
      total_contributions: knowledgeUnits.length,
      knowledge_units: knowledgeUnits.map((e) => e.unit),
      reputation: reputation ?? { score: 0, contributions: 0, validations: 0, history: [] },
      api_keys: apiKeys.map(({ key_hash: _hash, ...rest }) => rest),
    };

    return c.json({ data: exportData });
  });

  return app;
}
