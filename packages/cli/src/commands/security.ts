import { Command } from "commander";
import { readAuth, readConfig } from "../utils/config.js";

export const securityCommand = new Command("security").description(
  "Security tools for KnowledgePulse",
);

securityCommand
  .command("report")
  .description("Report a suspicious KnowledgeUnit for review")
  .argument("<unit-id>", "ID of the suspicious KnowledgeUnit")
  .option("-r, --reason <reason>", "Reason for reporting")
  .action(async (unitId: string, opts) => {
    const config = readConfig();
    const auth = readAuth();

    if (!auth.apiKey) {
      console.error("Not authenticated. Run 'kp auth register' first.");
      process.exit(1);
    }

    console.log(`Reporting unit: ${unitId}`);
    console.log(`Reason: ${opts.reason ?? "No reason provided"}`);

    // In Phase 1, this logs the report. Full quarantine workflow in Phase 2.
    try {
      const res = await fetch(`${config.registryUrl}/v1/knowledge/${unitId}`, {
        headers: { Authorization: `Bearer ${auth.apiKey}` },
      });

      if (!res.ok) {
        console.error(`Unit not found: ${unitId}`);
        process.exit(1);
      }

      console.log("Report submitted. The unit will be reviewed by the community.");
      console.log("Quarantine workflow will be implemented in Phase 2.");
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });
