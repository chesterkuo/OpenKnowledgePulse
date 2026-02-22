import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RegistryBridge } from "../registry.js";

export function registerValidateUnit(server: McpServer, registry: RegistryBridge) {
  server.tool(
    "kp_validate_unit",
    "Submit validation result for a KnowledgeUnit",
    {
      unit_id: z.string().describe("KnowledgeUnit ID to validate"),
      valid: z.boolean().describe("Whether the unit is valid"),
      feedback: z.string().optional().describe("Optional feedback"),
    },
    async ({ unit_id, valid, feedback }) => {
      const result = await registry.validateUnit({ unit_id, valid, feedback });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    },
  );
}
