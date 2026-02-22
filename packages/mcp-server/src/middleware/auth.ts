import type { Context, Next } from "hono";
import type { McpSessionManager } from "../session-manager.js";

/**
 * MCP session -> KP API key mapping middleware.
 *
 * Resolution order:
 * 1. If a session manager is provided and `mcp-session-id` header is present,
 *    resolve the session token to an API key.
 * 2. Fall back to `KP_API_KEY` environment variable.
 * 3. If an `Authorization` header already exists, do not override it.
 */
export function mcpAuthMiddleware(sessionManager?: McpSessionManager) {
  return async (c: Context, next: Next) => {
    const sessionToken = c.req.header("mcp-session-id");

    // If we have a session manager and a session token, resolve it
    if (sessionManager && sessionToken) {
      const apiKey = await sessionManager.resolveSession(sessionToken);
      if (apiKey && !c.req.header("Authorization")) {
        c.req.raw.headers.set("Authorization", `Bearer ${apiKey}`);
      }
    }

    // Fallback: use env var API key
    if (!c.req.header("Authorization")) {
      const envApiKey = process.env.KP_API_KEY;
      if (envApiKey) {
        c.req.raw.headers.set("Authorization", `Bearer ${envApiKey}`);
      }
    }

    c.set("mcpSessionId", sessionToken);
    await next();
  };
}
