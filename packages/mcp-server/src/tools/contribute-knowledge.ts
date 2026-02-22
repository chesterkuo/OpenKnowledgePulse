import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RegistryBridge } from "../registry.js";

export function registerContributeKnowledge(server: McpServer, registry: RegistryBridge) {
  server.tool(
    "kp_contribute_knowledge",
    "Contribute a KnowledgeUnit (with pre-quality scoring)",
    {
      unit: z.record(z.unknown()).describe("KnowledgeUnit JSON object"),
      visibility: z.enum(["private", "org", "network"]).describe("Visibility level"),
    },
    async ({ unit, visibility }) => {
      const result = await registry.contributeKnowledge({ unit, visibility });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    },
  );
}
