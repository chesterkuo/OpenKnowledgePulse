#!/usr/bin/env bun
/**
 * Re-import bundled files for skills that have sibling files on GitHub.
 *
 * - Patches existing skills via psql (execFile, no shell injection risk)
 * - Imports new high-value skills with bundled files via POST API
 *
 * Usage:
 *   source .env && bun run scripts/reimport-bundled-files.ts
 */

import { execFileSync } from "node:child_process";

const GITHUB_API = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const KP_API_KEY = process.env.KP_API_KEY;
const REGISTRY_URL = "http://localhost:3000";

const PG_HOST = "172.31.9.157";
const PG_DB = "knowledgepulse";
const PG_USER = "knowledgepulse_user";

if (!GITHUB_TOKEN) {
  console.error("Error: GITHUB_TOKEN environment variable is required");
  process.exit(1);
}
if (!KP_API_KEY) {
  console.error("Error: KP_API_KEY environment variable is required");
  process.exit(1);
}

const ghHeaders: Record<string, string> = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  "User-Agent": "KnowledgePulse-Reimport/1.0",
  "X-GitHub-Api-Version": "2022-11-28",
};

// Skills already in DB that need files added
const SKILLS_TO_PATCH = [
  { name: "Verify Changes", repo: "google/ground-android", dir: ".agent/skills/verify_changes" },
];

// New high-value skills to import with bundled files
const NEW_SKILLS = [
  { repo: "danielmiessler/Personal_AI_Infrastructure", dir: "Releases/v3.0/.claude/skills/Prompting" },
  { repo: "datasette/skill", dir: "." },
  { repo: "blacktop/mcp-tts", dir: "skill" },
  { repo: "upstash/vector-js", dir: "skills" },
  { repo: "EnactProtocol/enact", dir: "tools/hello-rust" },
];

const SKIP_NAMES = new Set(["SKILL.md", "metadata.json", "_meta.json", "_expected.json", ".gitkeep"]);
const BINARY_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
  ".ttf", ".eot", ".zip", ".tar", ".gz", ".pdf", ".lock", ".bin",
]);

async function githubJson(url: string): Promise<unknown> {
  const resp = await fetch(url, { headers: ghHeaders });
  if (!resp.ok) throw new Error(`GitHub HTTP ${resp.status}: ${url}`);
  return resp.json();
}

async function githubRaw(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { ...ghHeaders, Accept: "application/vnd.github.raw+json" },
  });
  if (!resp.ok) throw new Error(`GitHub HTTP ${resp.status}: ${url}`);
  return resp.text();
}

async function fetchSiblingFiles(
  repo: string,
  dir: string,
  relPrefix = "",
  depth = 0,
): Promise<Record<string, string>> {
  if (depth > 2) return {};
  const files: Record<string, string> = {};

  const entries = (await githubJson(
    `${GITHUB_API}/repos/${repo}/contents/${dir}`,
  )) as Array<{ name: string; path: string; type: string; size: number }>;

  for (const entry of entries) {
    if (SKIP_NAMES.has(entry.name)) continue;

    if (entry.type === "dir") {
      const subRel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      Object.assign(files, await fetchSiblingFiles(repo, entry.path, subRel, depth + 1));
    } else if (entry.type === "file") {
      const ext = entry.name.includes(".") ? `.${entry.name.split(".").pop()!.toLowerCase()}` : "";
      if (BINARY_EXTS.has(ext)) continue;
      if (entry.size > 50_000) continue;

      try {
        const content = await githubRaw(`${GITHUB_API}/repos/${repo}/contents/${entry.path}`);
        const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
        files[relPath] = content;
      } catch { /* skip */ }
    }
  }
  return files;
}

/** Run a parameterized SQL query via psql using execFileSync (no shell injection). */
function psqlQuery(sql: string): string {
  return execFileSync("psql", ["-h", PG_HOST, "-U", PG_USER, "-d", PG_DB, "-t", "-A", "-c", sql], {
    encoding: "utf-8",
    env: { ...process.env, PGPASSWORD: "KPulse2026Secure" },
  }).trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("KnowledgePulse Bundled Files Re-importer");
  console.log("=========================================\n");

  let patched = 0;
  let imported = 0;

  // 1. Patch existing skills
  console.log("--- Patching existing skills with bundled files ---\n");
  for (const skill of SKILLS_TO_PATCH) {
    console.log(`${skill.name} (${skill.repo}/${skill.dir}/)`);
    try {
      const files = await fetchSiblingFiles(skill.repo, skill.dir);
      const count = Object.keys(files).length;
      if (count === 0) { console.log("  No files found.\n"); continue; }

      console.log(`  ${count} files: ${Object.keys(files).join(", ")}`);

      // Use a temp file to pass the JSON safely to psql (avoids any quoting issues)
      const tmpFile = `/tmp/kp-files-${Date.now()}.json`;
      await Bun.write(tmpFile, JSON.stringify(files));

      const sql = `UPDATE skills SET files = (SELECT pg_read_file('${tmpFile}'))::jsonb, updated_at = NOW() WHERE name = '${skill.name.replace(/'/g, "''")}' RETURNING id`;

      // Alternative: use psql variable binding via echo + pipe
      const filesJson = JSON.stringify(files);
      const updateSql = `UPDATE skills SET files = $1::jsonb, updated_at = NOW() WHERE name = $2 RETURNING id`;

      // Use psql with -v for variable passing is not available, so use a simple approach:
      // Write a SQL file with the escaped content
      const safeSql = `UPDATE skills SET files = '${filesJson.replace(/'/g, "''")}'::jsonb, updated_at = NOW() WHERE name = '${skill.name.replace(/'/g, "''")}' RETURNING id`;
      const sqlFile = `/tmp/kp-update-${Date.now()}.sql`;
      await Bun.write(sqlFile, safeSql);

      const result = execFileSync("psql", ["-h", PG_HOST, "-U", PG_USER, "-d", PG_DB, "-t", "-A", "-f", sqlFile], {
        encoding: "utf-8",
        env: { ...process.env, PGPASSWORD: "KPulse2026Secure" },
      }).trim();

      if (result) {
        console.log(`  Patched: ${result}\n`);
        patched++;
      } else {
        console.log(`  Not found in DB.\n`);
      }
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  // 2. Import new skills with bundled files via API
  console.log("--- Importing new skills with bundled files ---\n");
  for (const entry of NEW_SKILLS) {
    console.log(`${entry.repo}/${entry.dir}/`);
    try {
      const skillMdPath = entry.dir === "." ? "SKILL.md" : `${entry.dir}/SKILL.md`;
      const content = await githubRaw(`${GITHUB_API}/repos/${entry.repo}/contents/${skillMdPath}`);
      const files = await fetchSiblingFiles(entry.repo, entry.dir);
      const count = Object.keys(files).length;

      console.log(`  SKILL.md: ${content.length} bytes, files: ${count}`);
      if (count > 0) console.log(`  ${Object.keys(files).join(", ")}`);

      // Wait to avoid rate limiting
      await sleep(2000);

      const resp = await fetch(`${REGISTRY_URL}/v1/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KP_API_KEY}` },
        body: JSON.stringify({
          skill_md_content: content,
          visibility: "network",
          quality_score: 0.7,
          ...(count > 0 ? { files } : {}),
        }),
      });

      if (resp.status === 409) { console.log("  Already exists (409).\n"); continue; }
      if (!resp.ok) {
        console.log(`  Failed (HTTP ${resp.status}): ${await resp.text()}\n`);
        continue;
      }

      const data = (await resp.json()) as { data: { id: string; name: string } };
      console.log(`  Imported: ${data.data.id} (${data.data.name})\n`);
      imported++;
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  // Summary
  console.log("=== Summary ===");
  console.log(`Patched: ${patched}`);
  console.log(`Imported: ${imported}`);

  const withFiles = psqlQuery(
    "SELECT COUNT(*) FROM skills WHERE files IS NOT NULL AND files::text != 'null' AND files::text != '{}'",
  );
  console.log(`Total skills with bundled files: ${withFiles}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
