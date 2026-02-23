import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { validateSkillMd } from "@knowledgepulse/sdk";
import { Command } from "commander";
import { readAuth, readConfig } from "../utils/config.js";

/**
 * Recursively collect all files under a directory, returning
 * an array of { relativePath, absolutePath } entries.
 */
function collectFiles(
  dir: string,
  base: string = dir,
): Array<{ relativePath: string; absolutePath: string }> {
  const results: Array<{ relativePath: string; absolutePath: string }> = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectFiles(fullPath, base));
    } else {
      results.push({ relativePath: relative(base, fullPath), absolutePath: fullPath });
    }
  }
  return results;
}

export const contributeCommand = new Command("contribute")
  .description("Contribute a SKILL.md, directory bundle, or KnowledgeUnit to the registry")
  .argument("<file>", "Path to SKILL.md, skill directory, or KnowledgeUnit JSON file")
  .option("-v, --visibility <level>", "Visibility: private, org, network", "network")
  .action(async (file: string, opts) => {
    const config = readConfig();
    const auth = readAuth();

    if (!auth.apiKey) {
      console.error("Not authenticated. Run 'kp auth register' first.");
      process.exit(1);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.apiKey}`,
    };

    try {
      let stat!: ReturnType<typeof statSync>;
      try {
        stat = statSync(file);
      } catch {
        console.error(`Cannot access: ${file}`);
        process.exit(1);
      }

      if (stat.isDirectory()) {
        // Directory bundle: find SKILL.md, collect other files
        const allFiles = collectFiles(file);
        const skillFile = allFiles.find(
          (f) => f.relativePath === "SKILL.md" || f.relativePath.endsWith(".SKILL.md"),
        );

        if (!skillFile) {
          console.error(`No SKILL.md found in directory: ${file}`);
          process.exit(1);
          return; // unreachable, helps TypeScript narrow skillFile
        }

        const content = readFileSync(skillFile.absolutePath, "utf-8");
        const validation = validateSkillMd(content);
        if (!validation.valid) {
          console.error("Validation failed:");
          for (const e of validation.errors) console.error(`  ${e}`);
          process.exit(1);
        }

        // Collect all non-SKILL.md files as the bundle
        const files: Record<string, string> = {};
        for (const f of allFiles) {
          if (f.absolutePath === skillFile.absolutePath) continue;
          files[f.relativePath] = readFileSync(f.absolutePath, "utf-8");
        }

        const res = await fetch(`${config.registryUrl}/v1/skills`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            skill_md_content: content,
            files: Object.keys(files).length > 0 ? files : undefined,
            visibility: opts.visibility,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error(`Failed to contribute: ${res.status} ${body}`);
          process.exit(1);
        }

        const result = await res.json();
        const fileCount = Object.keys(files).length;
        console.log(
          `Skill bundle contributed successfully! (${fileCount} bundled file${fileCount !== 1 ? "s" : ""})`,
        );
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Single file
        let content!: string;
        try {
          content = readFileSync(file, "utf-8");
        } catch {
          console.error(`Cannot read file: ${file}`);
          process.exit(1);
        }

        const isJson = file.endsWith(".json");

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
      }
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });
