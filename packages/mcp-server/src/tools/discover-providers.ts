import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RegistryBridge } from "../registry.js";

export function registerDiscoverProviders(server: McpServer, registry: RegistryBridge): void {
  server.tool(
    "kp_provider_discover",
    "Discover known KnowledgePulse registry providers in the federated network",
    {},
    async () => {
      const providers = await registry.discoverProviders();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(providers, null, 2) }],
      };
    },
  );
}
