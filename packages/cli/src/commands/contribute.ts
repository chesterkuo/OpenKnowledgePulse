import { readFileSync } from "node:fs";
import { validateSkillMd } from "@knowledgepulse/sdk";
import { Command } from "commander";
import { readAuth, readConfig } from "../utils/config.js";

export const contributeCommand = new Command("contribute")
  .description("Contribute a SKILL.md or KnowledgeUnit to the registry")
  .argument("<file>", "Path to SKILL.md or KnowledgeUnit JSON file")
  .option("-v, --visibility <level>", "Visibility: private, org, network", "network")
  .action(async (file: string, opts) => {
    const config = readConfig();
    const auth = readAuth();

    if (!auth.apiKey) {
      console.error("Not authenticated. Run 'kp auth register' first.");
      process.exit(1);
    }

    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      console.error(`Cannot read file: ${file}`);
      process.exit(1);
    }

    const isJson = file.endsWith(".json");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.apiKey}`,
    };

    try {
      if (isJson) {
        // KnowledgeUnit JSON
        const unit = JSON.parse(content);
        const res = await fetch(`${config.registryUrl}/v1/knowledge`, {
          method: "POST",
          headers,
          body: JSON.stringify(unit),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error(`Failed to contribute: ${res.status} ${body}`);
          process.exit(1);
        }

        const result = await res.json();
        console.log("Knowledge unit contributed successfully!");
        console.log(JSON.stringify(result, null, 2));
      } else {
        // SKILL.md
        const validation = validateSkillMd(content);
        if (!validation.valid) {
          console.error("Validation failed:");
          for (const e of validation.errors) console.error(`  ${e}`);
          process.exit(1);
        }

        const res = await fetch(`${config.registryUrl}/v1/skills`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            skill_md_content: content,
            visibility: opts.visibility,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error(`Failed to contribute: ${res.status} ${body}`);
          process.exit(1);
        }

        const result = await res.json();
        console.log("Skill contributed successfully!");
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });
