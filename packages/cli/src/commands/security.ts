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

    try {
      const res = await fetch(`${config.registryUrl}/v1/knowledge/${unitId}/report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: opts.reason ?? "" }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(`Error: ${(body as { error?: string }).error ?? res.statusText}`);
        process.exit(1);
      }

      const body = (await res.json()) as {
        report_count: number;
        threshold: number;
        quarantine_status: string;
      };
      console.log(`Report submitted for unit: ${unitId}`);
      console.log(
        `Reports: ${body.report_count}/${body.threshold} (status: ${body.quarantine_status})`,
      );
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });
