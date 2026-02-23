import type { Context, Next } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { HonoEnv } from "../types.js";
import type { AuthContext } from "./auth.js";

export interface JwtAuthConfig {
  issuer: string;
  audience: string;
  jwksUrl: string;
}

export function jwtAuthMiddleware(config: JwtAuthConfig) {
  const JWKS = createRemoteJWKSet(new URL(config.jwksUrl));

  return async (c: Context<HonoEnv>, next: Next) => {
    const authHeader = c.req.header("Authorization");

    // Only intercept Bearer tokens that are NOT API keys (kp_ prefix)
    if (!authHeader?.startsWith("Bearer ") || authHeader.startsWith("Bearer kp_")) {
      // Let the API key middleware handle it
      await next();
      return;
    }

    const token = authHeader.slice(7);

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: config.issuer,
        audience: config.audience,
      });

      // Map JWT claims to auth context
      const authCtx: AuthContext = {
        authenticated: true,
        tier: (payload.kp_tier as string) ?? "pro",
        agentId: (payload.agent_id as string) ?? (payload.sub as string),
        // JWT users get full scopes by default
        apiKey: {
          key_hash: "",
          key_prefix: "jwt",
          agent_id: (payload.agent_id as string) ?? (payload.sub as string) ?? "",
          scopes: (payload.scopes as Array<"read" | "write" | "admin">) ?? ["read", "write"],
          tier: ((payload.kp_tier as string) ?? "pro") as "free" | "pro" | "enterprise",
          created_at: new Date().toISOString(),
          revoked: false,
        },
      };

      c.set("auth", authCtx);
      await next();
    } catch (error) {
      return c.json(
        {
          error: "Invalid JWT token",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        401,
      );
    }
  };
}
