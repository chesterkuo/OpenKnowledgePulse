import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import { mcpAuthMiddleware } from "./middleware/auth.js";
import { createRegistryBridge } from "./registry.js";
import {
  type McpSessionManager,
  MemorySessionManager,
  RedisSessionManager,
} from "./session-manager.js";
import { registerAllTools } from "./tools/index.js";

const PORT = Number(process.env.KP_MCP_PORT ?? 3001);
const SESSION_TTL = Number(process.env.KP_MCP_SESSION_TTL ?? 3600);

// Create MCP server
const mcpServer = new McpServer({
  name: "knowledgepulse",
  version: "1.1.0",
});

// Create registry bridge (proxy or standalone)
const registry = createRegistryBridge();

// Register all MCP tools
registerAllTools(mcpServer, registry);

// Create session manager (Redis if available, memory fallback)
let sessionManager: McpSessionManager;
const redisUrl = process.env.KP_REDIS_URL;
if (redisUrl) {
  const Redis = (await import("ioredis")).default;
  const prefix = `${process.env.KP_REDIS_PREFIX ?? "kp:"}mcp-session:`;
  const redis = new Redis(redisUrl);
  sessionManager = new RedisSessionManager(redis, { prefix, ttlSeconds: SESSION_TTL });
} else {
  sessionManager = new MemorySessionManager(SESSION_TTL);
}

// Create Hono app for HTTP transport
const app = new Hono();

// Apply auth middleware globally
app.use("*", mcpAuthMiddleware(sessionManager));

// Health check
app.get("/health", (c) => c.json({ status: "ok", name: "knowledgepulse-mcp", version: "1.1.0" }));

// POST /mcp/session - Initialize session with API key
app.post("/mcp/session", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const { api_key } = body;
  if (!api_key || typeof api_key !== "string") {
    return c.json({ error: "api_key is required" }, 400);
  }
  const token = await sessionManager.createSession(api_key);
  return c.json({ session_token: token, ttl_seconds: SESSION_TTL });
});

// DELETE /mcp/session - Destroy session
app.delete("/mcp/session", async (c) => {
  const sessionToken = c.req.header("mcp-session-id");
  if (sessionToken) {
    await sessionManager.destroySession(sessionToken);
  }
  return c.json({ destroyed: true });
});

// MCP endpoint via Streamable HTTP
app.post("/mcp", async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });
  await mcpServer.connect(transport);

  const body = await c.req.json();
  const response = await transport.handleRequest(c.req.raw, { parsedBody: body });

  return response;
});

console.log(`KnowledgePulse MCP Server running on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};

export { mcpServer, app, registry, sessionManager };
