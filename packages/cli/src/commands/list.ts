import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { parseSkillMd } from "@knowledgepulse/sdk";

const SKILLS_DIR = join(homedir(), ".claude", "skills");

export const listCommand = new Command("list")
  .description("List installed skills from ~/.claude/skills/")
  .option("--json", "Output as JSON")
  .option("-d, --dir <dir>", "Custom skills directory")
  .action(async (opts) => {
    const skillsDir = opts.dir ?? SKILLS_DIR;

    if (!existsSync(skillsDir)) {
      console.log("No skills directory found. Install skills with: kp install <skill-id>");
      return;
    }

    const files = readdirSync(skillsDir).filter((f) => f.endsWith(".md"));

    if (files.length === 0) {
      console.log("No skills installed. Install skills with: kp install <skill-id>");
      return;
    }

    const skills = [];
    for (const file of files) {
      const filePath = join(skillsDir, file);
      try {
        const content = readFileSync(filePath, "utf-8");
        const parsed = parseSkillMd(content);
        skills.push({
          file,
          name: parsed.frontmatter.name,
          version: parsed.frontmatter.version ?? "-",
          domain: parsed.kp?.domain ?? "-",
          tags: parsed.frontmatter.tags ?? [],
        });
      } catch {
        // If parsing fails, show file with "invalid" marker
        skills.push({
          file,
          name: file.replace(/\.md$/, ""),
          version: "?",
          domain: "?",
          tags: [],
        });
      }
    }

    if (opts.json) {
      console.log(JSON.stringify(skills, null, 2));
      return;
    }

    // Table output
    console.log(`Installed skills (${skills.length}):\n`);

    // Calculate column widths
    const nameWidth = Math.max(4, ...skills.map((s) => s.name.length));
    const versionWidth = Math.max(7, ...skills.map((s) => s.version.length));
    const domainWidth = Math.max(6, ...skills.map((s) => s.domain.length));

    // Header
    const header = `  ${"Name".padEnd(nameWidth)}  ${"Version".padEnd(versionWidth)}  ${"Domain".padEnd(domainWidth)}  Tags`;
    console.log(header);
    console.log(
      `  ${"-".repeat(nameWidth)}  ${"-".repeat(versionWidth)}  ${"-".repeat(domainWidth)}  ----`,
    );

    for (const skill of skills) {
      const tags = skill.tags.length > 0 ? skill.tags.join(", ") : "-";
      console.log(
        `  ${skill.name.padEnd(nameWidth)}  ${skill.version.padEnd(versionWidth)}  ${skill.domain.padEnd(domainWidth)}  ${tags}`,
      );
    }
  });
