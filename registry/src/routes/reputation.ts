import { Hono } from "hono";
import type { AllStores } from "../store/interfaces.js";

export function reputationRoutes(stores: AllStores) {
  const app = new Hono();

  // GET /v1/reputation/:agent_id — Query KP-REP score
  app.get("/:agent_id", async (c) => {
    const agentId = c.req.param("agent_id");
    const record = await stores.reputation.get(agentId);

    if (!record) {
      return c.json({
        data: {
          agent_id: agentId,
          score: 0,
          contributions: 0,
          validations: 0,
        },
      });
    }

    return c.json({ data: record });
  });

  return app;
}
