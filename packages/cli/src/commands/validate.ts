import { readFileSync } from "node:fs";
import { validateSkillMd } from "@knowledgepulse/sdk";
import { Command } from "commander";

export const validateCommand = new Command("validate")
  .description("Validate a SKILL.md file")
  .argument("<file>", "Path to SKILL.md file")
  .action(async (file: string) => {
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      console.error(`Cannot read file: ${file}`);
      process.exit(1);
    }

    const result = validateSkillMd(content);

    if (result.valid) {
      console.log("Valid SKILL.md");
      if (result.errors.length > 0) {
        console.log("\nWarnings:");
        for (const w of result.errors) {
          console.log(`  ${w}`);
        }
      }
      process.exit(0);
    } else {
      console.error("Invalid SKILL.md:");
      for (const e of result.errors) {
        console.error(`  ${e}`);
      }
      process.exit(1);
    }
  });
