import type { Context, Next } from "hono";
import type { ApiKeyStore, RateLimitStore } from "../store/interfaces.js";
import type { HonoEnv } from "../types.js";

export function rateLimitMiddleware(rateLimitStore: RateLimitStore, apiKeyStore: ApiKeyStore) {
  return async (c: Context<HonoEnv>, next: Next) => {
    // Skip rate limiting for auth registration (must be accessible without a key)
    if (c.req.path.endsWith("/auth/register") && c.req.method === "POST") {
      await next();
      return;
    }

    const auth = c.get("auth") ?? { authenticated: false as const, tier: "anonymous" };
    const identifier = auth.agentId ?? c.req.header("x-forwarded-for") ?? "unknown";
    const method = c.req.method === "POST" ? "POST" : "GET";

    const result = await rateLimitStore.consume(identifier, auth.tier, method as "GET" | "POST");

    // Set rate limit headers
    c.header("X-RateLimit-Limit", String(result.limit));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(result.reset));

    if (!result.allowed) {
      // Record 429 for auto-revoke
      await rateLimitStore.record429(identifier);

      // Auto-revoke after 3x 429 in one hour
      const count = await rateLimitStore.get429Count(identifier, 3600000);
      if (count >= 3 && auth.apiKey) {
        await apiKeyStore.revoke(auth.apiKey.key_prefix);
      }

      c.header("Retry-After", String(result.retryAfter ?? 60));
      return c.json({ error: "Rate limit exceeded", retry_after: result.retryAfter }, 429);
    }

    await next();
  };
}
