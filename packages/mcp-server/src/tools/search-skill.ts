import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RegistryBridge } from "../registry.js";

export function registerSearchSkill(server: McpServer, registry: RegistryBridge) {
  server.tool(
    "kp_search_skill",
    "Search the SKILL.md skill registry (compatible with SkillsMP format)",
    {
      query: z.string().describe("Semantic search query"),
      domain: z.string().optional().describe("Filter by domain"),
      tags: z.array(z.string()).optional().describe("Filter by tags"),
      min_quality: z.number().min(0).max(1).default(0.7).describe("Minimum quality score"),
      limit: z.number().max(20).default(5).describe("Maximum results"),
    },
    async ({ query, domain, tags, min_quality, limit }) => {
      const results = await registry.searchSkills({ query, domain, tags, min_quality, limit });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}
