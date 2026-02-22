import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RegistryBridge } from "../registry.js";

export function registerSearchKnowledge(server: McpServer, registry: RegistryBridge) {
  server.tool(
    "kp_search_knowledge",
    "Search KnowledgeUnits (ReasoningTrace / ToolCallPattern / ExpertSOP)",
    {
      query: z.string().describe("Search query"),
      types: z
        .array(z.enum(["ReasoningTrace", "ToolCallPattern", "ExpertSOP"]))
        .optional()
        .describe("Filter by knowledge type"),
      domain: z.string().optional().describe("Filter by domain"),
      min_quality: z.number().min(0).max(1).default(0.75).describe("Minimum quality score"),
      limit: z.number().max(10).default(5).describe("Maximum results"),
      schema_version: z.string().optional().describe("Requested schema version"),
    },
    async ({ query, types, domain, min_quality, limit, schema_version }) => {
      const results = await registry.searchKnowledge({
        query,
        knowledge_types: types,
        domain,
        min_quality,
        limit,
        schema_version,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}
