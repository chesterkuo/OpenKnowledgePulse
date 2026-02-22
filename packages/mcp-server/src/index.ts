import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Hono } from "hono";
import { createRegistryBridge } from "./registry.js";
import { registerAllTools } from "./tools/index.js";

const PORT = Number(process.env.KP_MCP_PORT ?? 3001);

// Create MCP server
const mcpServer = new McpServer({
  name: "knowledgepulse",
  version: "1.1.0",
});

// Create registry bridge (proxy or standalone)
const registry = createRegistryBridge();

// Register all MCP tools
registerAllTools(mcpServer, registry);

// Create Hono app for HTTP transport
const app = new Hono();

// Health check
app.get("/health", (c) => c.json({ status: "ok", name: "knowledgepulse-mcp", version: "1.1.0" }));

// MCP endpoint via Streamable HTTP
app.post("/mcp", async (c) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });
  await mcpServer.connect(transport);

  const body = await c.req.json();
  const response = await transport.handleRequest(c.req.raw, body);

  return response;
});

console.log(`KnowledgePulse MCP Server running on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};

export { mcpServer, app, registry };
