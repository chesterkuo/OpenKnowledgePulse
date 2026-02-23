import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Command } from "commander";
import { readAuth, readConfig } from "../utils/config.js";
import {
  SUPPORTED_TOOLS,
  TOOL_CONFIGS,
  formatGenericGuidance,
  formatToolGuidance,
} from "../utils/tools.js";

const DEFAULT_SKILLS_DIR = join(homedir(), ".claude", "skills");

export const installCommand = new Command("install")
  .description("Install a skill from the registry to ~/.claude/skills/")
  .argument("<skill-id>", "Skill ID to install")
  .option("-o, --output <dir>", "Custom output directory")
  .option("-f, --for <tool>", `Target tool: ${SUPPORTED_TOOLS.join(", ")}`)
  .action(async (skillId: string, opts) => {
    // Validate --for flag
    if (opts.for && !TOOL_CONFIGS[opts.for]) {
      console.error(`Unknown tool: ${opts.for}. Supported: ${SUPPORTED_TOOLS.join(", ")}`);
      process.exit(1);
    }

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

      const body = (await res.json()) as {
        data: { name: string; content: string; files?: Record<string, string> };
      };
      const skill = body.data;

      // Resolve output directory: -o wins > --for > default
      let outputDir: string;
      if (opts.output) {
        outputDir = opts.output;
      } else if (opts.for) {
        outputDir = TOOL_CONFIGS[opts.for]!.getSkillsDir();
      } else {
        outputDir = DEFAULT_SKILLS_DIR;
      }

      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Always install as directory + SKILL.md (required by Claude Code skill discovery)
      const skillSlug = skill.name.replace(/\s+/g, "-").toLowerCase();
      const skillDir = join(outputDir, skillSlug);
      mkdirSync(skillDir, { recursive: true });

      // Write SKILL.md (the entrypoint)
      writeFileSync(join(skillDir, "SKILL.md"), skill.content);

      // Write bundled files if any
      const bundledFiles = skill.files ? Object.keys(skill.files) : [];
      for (const [relativePath, fileContent] of Object.entries(skill.files ?? {})) {
        const filePath = join(skillDir, relativePath);
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, fileContent);
      }

      const installPath = `${skillDir}/`;
      const fileCount = bundledFiles.length;
      if (fileCount > 0) {
        console.log(`Installed ${skill.name} to ${skillDir}/ (${fileCount} bundled files)`);
      } else {
        console.log(`Installed ${skill.name} to ${skillDir}/`);
      }

      // Print post-install guidance
      if (opts.for) {
        console.log(formatToolGuidance(opts.for, installPath));
      } else {
        console.log(formatGenericGuidance(installPath));
      }
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });
