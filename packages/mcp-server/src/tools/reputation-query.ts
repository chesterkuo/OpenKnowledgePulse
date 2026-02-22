import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RegistryBridge } from "../registry.js";

export function registerReputationQuery(server: McpServer, registry: RegistryBridge) {
  server.tool(
    "kp_reputation_query",
    "Query KP-REP reputation score for an agent",
    {
      agent_id: z.string().describe("Agent ID to query"),
    },
    async ({ agent_id }) => {
      const result = await registry.getReputation(agent_id);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
