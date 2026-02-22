import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RegistryBridge } from "../registry.js";
import { registerContributeKnowledge } from "./contribute-knowledge.js";
import { registerContributeSkill } from "./contribute-skill.js";
import { registerDiscoverProviders } from "./discover-providers.js";
import { registerReputationQuery } from "./reputation-query.js";
import { registerSearchKnowledge } from "./search-knowledge.js";
import { registerSearchSkill } from "./search-skill.js";
import { registerValidateUnit } from "./validate-unit.js";

export function registerAllTools(server: McpServer, registry: RegistryBridge): void {
  registerSearchSkill(server, registry);
  registerSearchKnowledge(server, registry);
  registerContributeSkill(server, registry);
  registerContributeKnowledge(server, registry);
  registerValidateUnit(server, registry);
  registerReputationQuery(server, registry);
  registerDiscoverProviders(server, registry);
}
