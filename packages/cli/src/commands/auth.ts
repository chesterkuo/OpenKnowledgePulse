import { Command } from "commander";
import { readAuth, readConfig, writeAuth } from "../utils/config.js";

export const authCommand = new Command("auth").description("Manage API key authentication");

authCommand
  .command("register")
  .description("Register a new API key")
  .option("--agent-id <id>", "Agent ID", `agent-${Date.now()}`)
  .option("--scopes <scopes>", "Comma-separated scopes", "read,write")
  .action(async (opts) => {
    const config = readConfig();
    const scopes = opts.scopes.split(",").filter(Boolean);

    try {
      const res = await fetch(`${config.registryUrl}/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: opts.agentId,
          scopes,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`Registration failed: ${res.status} ${body}`);
        process.exit(1);
      }

      const body = (await res.json()) as {
        data: { api_key: string; key_prefix: string };
        message: string;
      };

      writeAuth({
        apiKey: body.data.api_key,
        agentId: opts.agentId,
        keyPrefix: body.data.key_prefix,
      });

      console.log("Registered successfully!");
      console.log(`  Agent ID: ${opts.agentId}`);
      console.log(`  Key prefix: ${body.data.key_prefix}`);
      console.log(`  ${body.message}`);
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });

authCommand
  .command("revoke")
  .description("Revoke the current API key")
  .action(async () => {
    const config = readConfig();
    const auth = readAuth();

    if (!auth.apiKey) {
      console.error("Not authenticated.");
      process.exit(1);
    }

    try {
      const res = await fetch(`${config.registryUrl}/v1/auth/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.apiKey}`,
        },
        body: JSON.stringify({ key_prefix: auth.keyPrefix }),
      });

      if (res.ok) {
        writeAuth({});
        console.log("API key revoked successfully.");
      } else {
        console.error(`Revocation failed: ${res.status}`);
      }
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });

authCommand
  .command("status")
  .description("Show current authentication status")
  .action(() => {
    const auth = readAuth();
    if (auth.apiKey) {
      console.log(`Authenticated as: ${auth.agentId}`);
      console.log(`Key prefix: ${auth.keyPrefix}`);
    } else {
      console.log("Not authenticated. Run 'kp auth register' to get started.");
    }
  });
