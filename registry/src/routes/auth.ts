import { Hono } from "hono";
import type { AuthContext } from "../middleware/auth.js";
import type { AllStores } from "../store/interfaces.js";

export function authRoutes(stores: AllStores) {
  const app = new Hono();

  // POST /v1/auth/register — Register a new API key
  app.post("/register", async (c) => {
    const body = await c.req.json();
    const { agent_id, scopes = ["read"], tier = "free" } = body;

    if (!agent_id || typeof agent_id !== "string") {
      return c.json({ error: "agent_id is required" }, 400);
    }

    const validScopes = ["read", "write", "admin"] as const;
    const requestedScopes = (scopes as string[]).filter((s): s is "read" | "write" | "admin" =>
      validScopes.includes(s as "read" | "write" | "admin"),
    );

    if (requestedScopes.length === 0) {
      return c.json({ error: "At least one valid scope required (read, write, admin)" }, 400);
    }

    const { raw_key, record } = await stores.apiKeys.create(
      agent_id,
      requestedScopes,
      tier as "free" | "pro" | "enterprise",
    );

    // Initialize reputation for new agents
    await stores.reputation.upsert(agent_id, 0.1, "Initial registration bonus");

    return c.json(
      {
        data: {
          api_key: raw_key,
          key_prefix: record.key_prefix,
          scopes: record.scopes,
          tier: record.tier,
          created_at: record.created_at,
        },
        message: "Store this API key securely — it cannot be retrieved again",
      },
      201,
    );
  });

  // POST /v1/auth/revoke — Revoke an API key
  app.post("/revoke", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const { key_prefix } = await c.req.json();
    if (!key_prefix) {
      return c.json({ error: "key_prefix is required" }, 400);
    }

    const revoked = await stores.apiKeys.revoke(key_prefix);
    if (!revoked) {
      return c.json({ error: "Key not found" }, 404);
    }

    return c.json({ data: { revoked: true, key_prefix } });
  });

  return app;
}
