/**
 * KnowledgePulse MCP Client Example
 *
 * Demonstrates connecting to the KP MCP Server and calling tools.
 * Run: bun run examples/mcp-client-example/index.ts
 *
 * Prerequisites: Start the MCP server first:
 *   bun run packages/mcp-server/src/index.ts
 */

console.log("KnowledgePulse MCP Client Example");
console.log("==================================\n");

const MCP_URL = process.env.KP_MCP_URL ?? "http://localhost:3001/mcp";

// Example: Call kp_search_skill via MCP HTTP
async function callMcpTool(method: string, params: Record<string, unknown>) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: method,
      arguments: params,
    },
  };

  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    return result;
  } catch (_e) {
    console.error(`MCP server not available at ${MCP_URL}`);
    console.error("Start it first: bun run packages/mcp-server/src/index.ts");
    return null;
  }
}

// Search for skills
console.log("1. Searching for skills...");
const searchResult = await callMcpTool("kp_search_skill", {
  query: "financial analysis",
  limit: 3,
});
if (searchResult) {
  console.log("   Result:", JSON.stringify(searchResult, null, 2));
}

// Search for knowledge
console.log("\n2. Searching for knowledge...");
const knowledgeResult = await callMcpTool("kp_search_knowledge", {
  query: "debugging techniques",
  min_quality: 0.8,
  limit: 3,
});
if (knowledgeResult) {
  console.log("   Result:", JSON.stringify(knowledgeResult, null, 2));
}

// Query reputation
console.log("\n3. Querying reputation...");
const repResult = await callMcpTool("kp_reputation_query", {
  agent_id: "test-agent-1",
});
if (repResult) {
  console.log("   Result:", JSON.stringify(repResult, null, 2));
}
