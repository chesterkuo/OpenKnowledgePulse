import type { Context, Next } from "hono";
import type { ApiKeyRecord, ApiKeyStore } from "../store/interfaces.js";

export interface AuthContext {
  authenticated: boolean;
  apiKey?: ApiKeyRecord;
  tier: string;
  agentId?: string;
}

export function authMiddleware(apiKeyStore: ApiKeyStore) {
  return async (c: Context, next: Next) => {
    // If already authenticated (e.g. by JWT middleware), skip API key check
    const existingAuth = c.get("auth") as AuthContext | undefined;
    if (existingAuth?.authenticated) {
      await next();
      return;
    }

    const authHeader = c.req.header("Authorization");
    const authCtx: AuthContext = {
      authenticated: false,
      tier: "anonymous",
    };

    if (authHeader?.startsWith("Bearer kp_")) {
      const rawKey = authHeader.slice(7); // Remove "Bearer "
      const record = await apiKeyStore.verify(rawKey);

      if (record) {
        authCtx.authenticated = true;
        authCtx.apiKey = record;
        authCtx.tier = record.tier;
        authCtx.agentId = record.agent_id;
      }
    }

    c.set("auth", authCtx);
    await next();
  };
}
