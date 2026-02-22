import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { readAuth, readConfig } from "../utils/config.js";

const SKILLS_DIR = join(homedir(), ".claude", "skills");

export const installCommand = new Command("install")
  .description("Install a skill from the registry to ~/.claude/skills/")
  .argument("<skill-id>", "Skill ID to install")
  .option("-o, --output <dir>", "Custom output directory")
  .action(async (skillId: string, opts) => {
    const config = readConfig();
    const auth = readAuth();
    const headers: Record<string, string> = {};
    if (auth.apiKey) headers.Authorization = `Bearer ${auth.apiKey}`;

    try {
      const res = await fetch(`${config.registryUrl}/v1/skills/${skillId}`, { headers });
      if (!res.ok) {
        if (res.status === 404) {
          console.error(`Skill not found: ${skillId}`);
        } else {
          console.error(`Error fetching skill: ${res.status}`);
        }
        process.exit(1);
      }

      const body = (await res.json()) as { data: { name: string; content: string } };
      const skill = body.data;

      const outputDir = opts.output ?? SKILLS_DIR;
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const fileName = `${skill.name}.md`;
      const filePath = join(outputDir, fileName);
      writeFileSync(filePath, skill.content);

      console.log(`Installed ${skill.name} to ${filePath}`);
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });
