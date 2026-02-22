import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RegistryBridge } from "../registry.js";

export function registerContributeSkill(server: McpServer, registry: RegistryBridge) {
  server.tool(
    "kp_contribute_skill",
    "Contribute a new Skill to the network (auto-validates SKILL.md format)",
    {
      skill_md_content: z.string().describe("Complete SKILL.md content"),
      visibility: z
        .enum(["private", "org", "network"])
        .default("network")
        .describe("Visibility level"),
    },
    async ({ skill_md_content, visibility }) => {
      const result = await registry.contributeSkill({ skill_md_content, visibility });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    },
  );
}
