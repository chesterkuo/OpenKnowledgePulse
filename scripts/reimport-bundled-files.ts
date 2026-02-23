#!/usr/bin/env bun
/**
 * Re-import bundled files for skills that have sibling files on GitHub.
 *
 * Updates skills directly via psql (no API rate limiting issues).
 *
 * Usage:
 *   source .env && bun run scripts/reimport-bundled-files.ts
 */

import { execFileSync } from "node:child_process";

const GITHUB_API = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const PG_HOST = "172.31.9.157";
const PG_DB = "knowledgepulse";
const PG_USER = "knowledgepulse_user";
const PG_PASS = "KPulse2026Secure";

if (!GITHUB_TOKEN) {
  console.error("Error: GITHUB_TOKEN environment variable is required");
  process.exit(1);
}

const ghHeaders: Record<string, string> = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  "User-Agent": "KnowledgePulse-Reimport/1.0",
  "X-GitHub-Api-Version": "2022-11-28",
};

// Skills to patch with bundled files: use ID for precision (handles duplicates)
const SKILLS_TO_PATCH = [
  { id: "kp:skill:bf470d93-d839-45cf-97ad-119d094f3524", label: "Verify Changes", repo: "google/ground-android", dir: ".agent/skills/verify_changes" },
  { id: "kp:skill:5d2439ee-1879-4d47-bb31-7df98274f482", label: "Verify Changes (dup)", repo: "google/ground-android", dir: ".agent/skills/verify_changes" },
  { id: "kp:skill:9f0ea630-931b-4694-9c44-a09c55c6e860", label: "Prompting", repo: "danielmiessler/Personal_AI_Infrastructure", dir: "Releases/v3.0/.claude/skills/Prompting" },
  { id: "kp:skill:6e408d4c-86b4-4a8f-b4ba-9f13972aeab9", label: "datasette-plugins", repo: "datasette/skill", dir: "." },
  { id: "kp:skill:71a55d34-a966-4360-a95d-1b898b258a0b", label: "datasette-plugins (dup)", repo: "datasette/skill", dir: "." },
  { id: "kp:skill:319f0478-05cd-40a7-ad7a-45239b733731", label: "tts (blacktop/mcp-tts)", repo: "blacktop/mcp-tts", dir: "skill" },
  { id: "kp:skill:166f9d83-0fdd-48e7-a3c7-6a2c53dacc38", label: "tts (dup)", repo: "blacktop/mcp-tts", dir: "skill" },
  { id: "kp:skill:d52cc2b3-6caf-447a-9927-322cd1278c8d", label: "upstash/vector TypeScript SDK", repo: "upstash/vector-js", dir: "skills" },
  { id: "kp:skill:8d4bfff4-28e8-4046-aa58-323618ca6170", label: "Hello Rust (EnactProtocol)", repo: "EnactProtocol/enact", dir: "tools/hello-rust" },
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

/** Run a SQL file via psql using execFileSync (no shell injection). */
function psqlFile(sqlFile: string): string {
  return execFileSync("psql", ["-h", PG_HOST, "-U", PG_USER, "-d", PG_DB, "-t", "-A", "-f", sqlFile], {
    encoding: "utf-8",
    env: { ...process.env, PGPASSWORD: PG_PASS },
  }).trim();
}

function psqlQuery(sql: string): string {
  return execFileSync("psql", ["-h", PG_HOST, "-U", PG_USER, "-d", PG_DB, "-t", "-A", "-c", sql], {
    encoding: "utf-8",
    env: { ...process.env, PGPASSWORD: PG_PASS },
  }).trim();
}

async function main() {
  console.log("KnowledgePulse Bundled Files Re-importer");
  console.log("=========================================\n");

  console.log("--- Patching skills with bundled files ---\n");
  let patched = 0;

  // Cache fetched files by repo+dir to avoid re-fetching for duplicates
  const fileCache = new Map<string, Record<string, string>>();

  for (const skill of SKILLS_TO_PATCH) {
    console.log(`${skill.label} [${skill.id}] (${skill.repo}/${skill.dir}/)`);
    try {
      const cacheKey = `${skill.repo}:${skill.dir}`;
      let files = fileCache.get(cacheKey);
      if (!files) {
        files = await fetchSiblingFiles(skill.repo, skill.dir);
        fileCache.set(cacheKey, files);
      } else {
        console.log("  (using cached files)");
      }

      const count = Object.keys(files).length;
      if (count === 0) { console.log("  No files found.\n"); continue; }

      console.log(`  ${count} files: ${Object.keys(files).join(", ")}`);

      // Write SQL to a temp file to avoid quoting issues
      const filesJson = JSON.stringify(files);
      const escapedJson = filesJson.replace(/'/g, "''");
      const escapedId = skill.id.replace(/'/g, "''");
      const safeSql = `UPDATE skills SET files = '${escapedJson}'::jsonb, updated_at = NOW() WHERE id = '${escapedId}' RETURNING id, name;`;
      const sqlFile = `/tmp/kp-update-${Date.now()}.sql`;
      await Bun.write(sqlFile, safeSql);

      const result = psqlFile(sqlFile);

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

  // Summary
  console.log("=== Summary ===");
  console.log(`Patched: ${patched}`);

  const withFiles = psqlQuery(
    "SELECT COUNT(*) FROM skills WHERE files IS NOT NULL AND files::text != 'null' AND files::text != '{}'",
  );
  console.log(`Total skills with bundled files: ${withFiles}`);

  // Show which skills have files
  const skillsWithFiles = psqlQuery(
    "SELECT name, jsonb_object_keys(files) FROM skills WHERE files IS NOT NULL AND files::text != 'null' AND files::text != '{}' LIMIT 30",
  );
  if (skillsWithFiles) {
    console.log("\nSkills with bundled files:");
    console.log(skillsWithFiles);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
