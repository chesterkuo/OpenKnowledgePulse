import type { Context, Next } from "hono";

/**
 * MCP session -> KP API key mapping middleware.
 * In production, this extracts the MCP session token and maps it to a KP API key.
 * For dev, it passes through.
 */
export function mcpAuthMiddleware() {
  return async (c: Context, next: Next) => {
    // Extract session info from MCP transport headers
    const sessionId = c.req.header("mcp-session-id");
    const apiKey = process.env.KP_API_KEY;

    if (apiKey && !c.req.header("Authorization")) {
      // Auto-inject API key for MCP sessions
      c.req.raw.headers.set("Authorization", `Bearer ${apiKey}`);
    }

    c.set("mcpSessionId", sessionId);
    await next();
  };
}
