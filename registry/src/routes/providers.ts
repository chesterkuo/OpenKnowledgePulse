import { Hono } from "hono";
import type { AllStores } from "../store/interfaces.js";
import type { HonoEnv } from "../types.js";

export function providerRoutes(stores: AllStores) {
  const app = new Hono<HonoEnv>();

  // GET /v1/providers — List all known providers (public, no auth required)
  app.get("/", async (c) => {
    const providers = await stores.providers.getAll();
    return c.json({ data: providers, total: providers.length });
  });

  // POST /v1/providers — Register a new provider (admin only)
  app.post("/", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }
    if (!auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Admin scope required" }, 403);
    }

    const { url, name, status } = await c.req.json();
    if (!url || !name) {
      return c.json({ error: "url and name are required" }, 400);
    }

    const provider = await stores.providers.register({
      url,
      name,
      status: status ?? "unknown",
      last_heartbeat: null,
    });
    return c.json({ data: provider }, 201);
  });

  // POST /v1/providers/:id/heartbeat — Update provider heartbeat
  app.post("/:id/heartbeat", async (c) => {
    const id = c.req.param("id");
    const updated = await stores.providers.updateHeartbeat(id);
    if (!updated) {
      return c.json({ error: "Provider not found" }, 404);
    }
    return c.json({ data: { id, heartbeat: new Date().toISOString() } });
  });

  return app;
}
