#!/usr/bin/env bun
/**
 * KnowledgePulse GitHub SKILL.md Importer
 *
 * CLI entry point that orchestrates the full import pipeline:
 *   1. Discover SKILL.md files via GitHub code search
 *   2. Process each candidate (fetch, validate, score, enrich, import)
 *   3. Report results
 *
 * Usage:
 *   bun run scripts/github-skill-importer.ts \
 *     --token $GITHUB_TOKEN \
 *     --api-key $KP_API_KEY \
 *     --registry-url http://localhost:3000 \
 *     --min-stars 5 \
 *     --min-quality 0.6 \
 *     --max-results 1000 \
 *     --concurrency 3 \
 *     --dry-run \
 *     --resume \
 *     --verbose
 */

import { join } from "node:path";
import { parseArgs } from "node:util";
// SDK imports (relative paths since scripts/ is not a workspace member):
import {
  type ParsedSkillMd,
  classifyInjectionRisk,
  parseSkillMd,
  sha256,
  validateSkillMd,
} from "../packages/sdk/src/index.js";
import { CheckpointManager } from "./lib/checkpoint.js";
import { classifyDomain } from "./lib/domain-classifier.js";
import { enrichSkillMd } from "./lib/enricher.js";
import { synthesizeFrontmatter } from "./lib/frontmatter-synthesizer.js";
import { GitHubClient } from "./lib/github-client.js";
import { computeQualityScore } from "./lib/quality-scorer.js";
import { RateLimiter } from "./lib/rate-limiter.js";
import { Reporter } from "./lib/reporter.js";
import type { Checkpoint, ImportConfig, ImportStats, SkillCandidate } from "./lib/types.js";

// ─── CLI Argument Parsing ────────────────────────────────────────

function parseCliArgs(): ImportConfig {
  const { values } = parseArgs({
    options: {
      token: { type: "string" },
      "api-key": { type: "string" },
      "registry-url": { type: "string", default: "http://localhost:3000" },
      "min-stars": { type: "string", default: "5" },
      "min-quality": { type: "string", default: "0.6" },
      "max-results": { type: "string", default: "1000" },
      concurrency: { type: "string", default: "3" },
      "dry-run": { type: "boolean", default: false },
      resume: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      repos: { type: "string" },
      "skip-paths": { type: "string" },
    },
    strict: true,
  });

  const githubToken = values.token ?? process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error("Error: --token or GITHUB_TOKEN environment variable is required");
    process.exit(1);
  }

  const apiKey = values["api-key"] ?? process.env.KP_API_KEY;
  if (!apiKey && !values["dry-run"]) {
    console.error(
      "Error: --api-key or KP_API_KEY environment variable is required (unless --dry-run)",
    );
    process.exit(1);
  }

  return {
    githubToken,
    apiKey: apiKey ?? "",
    registryUrl: values["registry-url"]!,
    minStars: validateInt(values["min-stars"]!, "min-stars"),
    minQuality: validateFloat(values["min-quality"]!, "min-quality"),
    maxResults: validateInt(values["max-results"]!, "max-results"),
    concurrency: validateInt(values.concurrency!, "concurrency"),
    dryRun: values["dry-run"]!,
    resume: values.resume!,
    verbose: values.verbose!,
    repos: values.repos ? values.repos.split(",").map((r) => r.trim()) : undefined,
    skipPaths: values["skip-paths"]
      ? values["skip-paths"].split(",").map((p) => p.trim())
      : undefined,
  };
}

// ─── Validation helpers ──────────────────────────────────────────

function validateInt(value: string, name: string): number {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) {
    console.error(`Error: --${name} must be an integer, got "${value}"`);
    process.exit(1);
  }
  return n;
}

function validateFloat(value: string, name: string): number {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) {
    console.error(`Error: --${name} must be a number, got "${value}"`);
    process.exit(1);
  }
  return n;
}

// ─── Helpers ─────────────────────────────────────────────────────

function log(config: ImportConfig, ...args: unknown[]): void {
  if (config.verbose) {
    console.log("[verbose]", ...args);
  }
}

function makeEmptyStats(): ImportStats {
  return {
    discovered: 0,
    fetched: 0,
    passed_quality: 0,
    passed_validation: 0,
    imported: 0,
    skipped_low_quality: 0,
    skipped_validation: 0,
    skipped_injection: 0,
    skipped_duplicate: 0,
    failed: 0,
  };
}

function makeEmptyCheckpoint(): Checkpoint {
  return {
    started_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    phase: "discover",
    completed_queries: [],
    candidates: {},
    stats: makeEmptyStats(),
  };
}

/**
 * Count ## headings in a markdown body string.
 */
function countSections(body: string): number {
  const matches = body.match(/^## /gm);
  return matches ? matches.length : 0;
}

/**
 * Check if body contains instruction-like keywords.
 */
function hasInstructions(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes("## instructions") ||
    lower.includes("## steps") ||
    lower.includes("## how to") ||
    lower.includes("## usage") ||
    lower.includes("## guide")
  );
}

// ─── Process Single Candidate ────────────────────────────────────

async function processCandidate(
  candidate: SkillCandidate,
  config: ImportConfig,
  github: GitHubClient,
  checkpointMgr: CheckpointManager,
  stats: ImportStats,
  trustedRepo = false,
): Promise<void> {
  const { key, repoFullName, filePath } = candidate;

  try {
    // (0) Check skip-paths filter
    if (config.skipPaths?.length) {
      const pathLower = filePath.toLowerCase();
      if (config.skipPaths.some((p) => pathLower.includes(p.toLowerCase()))) {
        log(config, `[skip] ${key}: matches skip-path filter`);
        checkpointMgr.updateCandidate(key, { status: "skipped", reason: "skip-path filter" });
        return;
      }
    }

    // (a) Fetch repo metadata (cached per-repo)
    let repoMeta: Awaited<ReturnType<typeof github.getRepoMetadata>> | undefined;
    try {
      repoMeta = await github.getRepoMetadata(repoFullName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // GitHub 404 — repo deleted since indexed
      if (msg.includes("HTTP 404")) {
        log(config, `[skip] ${key}: repo not found (404)`);
        checkpointMgr.updateCandidate(key, { status: "skipped", reason: "repo not found (404)" });
        return;
      }
      throw err;
    }

    // (b) Hard filter via computeQualityScore hard filters
    //     We need the SKILL.md body for full scoring, but hard filters on repo
    //     metadata (stars, archived, last push) can reject early without fetching content.
    //     Use placeholder content values for the early hard-filter check.
    const earlyCheck = computeQualityScore(repoMeta, 1000, 3, true, config.minStars, trustedRepo);
    if (earlyCheck.rejected) {
      log(config, `[skip] ${key}: hard filter — ${earlyCheck.reason}`);
      checkpointMgr.updateCandidate(key, { status: "skipped", reason: earlyCheck.reason });
      stats.skipped_low_quality++;
      return;
    }

    // (c) Fetch raw SKILL.md content
    let content: string;
    try {
      content = await github.getFileContent(repoFullName, filePath);
      stats.fetched++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("HTTP 404")) {
        log(config, `[skip] ${key}: file not found (404)`);
        checkpointMgr.updateCandidate(key, { status: "skipped", reason: "file not found (404)" });
        return;
      }
      throw err;
    }

    // (c2) Synthesize frontmatter if missing
    const synthesized = synthesizeFrontmatter(content, repoFullName, repoMeta.topics);
    if (synthesized === null) {
      log(config, `[skip] ${key}: content too minimal to synthesize frontmatter`);
      checkpointMgr.updateCandidate(key, { status: "skipped", reason: "content too minimal" });
      stats.skipped_validation++;
      return;
    }
    content = synthesized;

    // (d) validateSkillMd(content) — skip if invalid
    const validation = validateSkillMd(content);
    if (!validation.valid) {
      log(config, `[skip] ${key}: validation failed — ${validation.errors.join("; ")}`);
      checkpointMgr.updateCandidate(key, {
        status: "skipped",
        reason: `validation: ${validation.errors[0]}`,
      });
      stats.skipped_validation++;
      return;
    }
    stats.passed_validation++;

    // (e) classifyInjectionRisk(content) — skip if verdict != "safe"
    const injection = classifyInjectionRisk(content);
    if (injection.verdict !== "safe") {
      log(
        config,
        `[skip] ${key}: injection risk — verdict=${injection.verdict}, score=${injection.score}, patterns=${injection.patterns.join(",")}`,
      );
      checkpointMgr.updateCandidate(key, {
        status: "skipped",
        reason: `injection: ${injection.verdict} (score ${injection.score})`,
      });
      stats.skipped_injection++;
      return;
    }

    // (f) computeQualityScore with real content data
    let parsed: ParsedSkillMd | undefined;
    try {
      parsed = parseSkillMd(content);
    } catch {
      // parseSkillMd can throw even if validateSkillMd passed (edge case)
      log(config, `[skip] ${key}: parse failed after validation passed`);
      checkpointMgr.updateCandidate(key, { status: "skipped", reason: "parse failed" });
      stats.skipped_validation++;
      return;
    }

    const bodyLength = parsed.body.length;
    const sectionCount = countSections(parsed.body);
    const hasInstr = hasInstructions(parsed.body);

    const quality = computeQualityScore(
      repoMeta,
      bodyLength,
      sectionCount,
      hasInstr,
      config.minStars,
      trustedRepo,
    );
    if (quality.rejected) {
      log(config, `[skip] ${key}: quality rejected — ${quality.reason}`);
      checkpointMgr.updateCandidate(key, { status: "skipped", reason: quality.reason });
      stats.skipped_low_quality++;
      return;
    }

    if (quality.score < config.minQuality) {
      log(config, `[skip] ${key}: quality score ${quality.score} < min ${config.minQuality}`);
      checkpointMgr.updateCandidate(key, {
        status: "skipped",
        reason: `quality ${quality.score} < ${config.minQuality}`,
        qualityScore: quality.score,
      });
      stats.skipped_low_quality++;
      return;
    }
    stats.passed_quality++;

    // (g) classifyDomain
    const tags = parsed.frontmatter.tags ?? [];
    const domain = classifyDomain(tags, repoMeta.topics, parsed.body);

    // (h) enrichSkillMd
    const enrichedContent = enrichSkillMd(content, repoMeta, quality.score, domain);

    // (h2) Fetch sibling files (scripts, templates, references)
    let siblingFiles: Record<string, string> = {};
    try {
      siblingFiles = await github.fetchSiblingFiles(repoFullName, filePath);
      if (Object.keys(siblingFiles).length > 0) {
        log(
          config,
          `[files] ${key}: found ${Object.keys(siblingFiles).length} bundled files: ${Object.keys(siblingFiles).join(", ")}`,
        );
      }
    } catch (err: unknown) {
      // Non-fatal: proceed without sibling files
      log(config, `[files] ${key}: failed to fetch siblings — ${err instanceof Error ? err.message : String(err)}`);
    }

    // (i) If not --dry-run: POST to registry
    if (!config.dryRun) {
      const idempotencyKey = await sha256(`${key}:${quality.score}`);

      const postBody: Record<string, unknown> = {
        skill_md_content: enrichedContent,
        visibility: "network",
        quality_score: quality.score,
      };
      if (Object.keys(siblingFiles).length > 0) {
        postBody.files = siblingFiles;
      }

      const response = await fetch(`${config.registryUrl}/v1/skills`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(postBody),
      });

      if (response.status === 401 || response.status === 403) {
        // Fatal — bad API key, abort all
        const body = await response.text();
        throw new FatalError(
          `Registry auth error (HTTP ${response.status}): ${body}. Check your API key.`,
        );
      }

      if (response.status === 409) {
        // Duplicate — already imported
        log(config, `[dup] ${key}: already exists in registry`);
        checkpointMgr.updateCandidate(key, {
          status: "skipped",
          reason: "duplicate (409)",
          qualityScore: quality.score,
          domain,
        });
        stats.skipped_duplicate++;
        return;
      }

      if (!response.ok) {
        // Registry 400 or other: log, mark failed, continue
        const body = await response.text();
        console.error(`[fail] ${key}: registry HTTP ${response.status} — ${body}`);
        checkpointMgr.updateCandidate(key, {
          status: "failed",
          reason: `registry HTTP ${response.status}`,
          qualityScore: quality.score,
          domain,
        });
        stats.failed++;
        return;
      }

      // Success — extract skill ID from response
      let skillId: string | undefined;
      try {
        const data = (await response.json()) as { id?: string; skill_id?: string };
        skillId = data.id ?? data.skill_id;
      } catch {
        // Response might not be JSON; that's OK
      }

      checkpointMgr.updateCandidate(key, {
        status: "imported",
        skillId,
        qualityScore: quality.score,
        domain,
      });
      stats.imported++;
      console.log(
        `[imported] ${key} — quality=${quality.score}, domain=${domain}${skillId ? `, id=${skillId}` : ""}`,
      );
    } else {
      // Dry run — log what would happen but don't mark as imported
      // so that a subsequent non-dry-run with --resume will re-process
      checkpointMgr.updateCandidate(key, {
        status: "skipped",
        reason: `dry-run: would import (quality=${quality.score}, domain=${domain})`,
        qualityScore: quality.score,
        domain,
      });
      stats.imported++;
      console.log(`[dry-run] ${key} — quality=${quality.score}, domain=${domain}`);
    }

    // (j) Checkpoint is updated by calls above
  } catch (err: unknown) {
    // FatalError propagates up to abort the pipeline
    if (err instanceof FatalError) {
      throw err;
    }

    // All other errors: catch, mark failed, continue (don't crash the pipeline)
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[error] ${key}: ${msg}`);
    checkpointMgr.updateCandidate(key, {
      status: "failed",
      reason: msg.slice(0, 200),
    });
    stats.failed++;
  }
}

// ─── Fatal Error ─────────────────────────────────────────────────

class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalError";
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const config = parseCliArgs();
  const startTime = new Date();

  const repoMode = !!config.repos?.length;

  console.log("KnowledgePulse GitHub SKILL.md Importer");
  console.log("========================================");
  console.log(`  Registry:    ${config.registryUrl}`);
  console.log(
    `  Mode:        ${repoMode ? `repo-list (${config.repos!.join(", ")})` : "code search"}`,
  );
  console.log(`  Min stars:   ${config.minStars}`);
  console.log(`  Min quality: ${config.minQuality}`);
  console.log(`  Max results: ${config.maxResults}`);
  console.log(`  Concurrency: ${config.concurrency}`);
  console.log(`  Dry run:     ${config.dryRun}`);
  console.log(`  Resume:      ${config.resume}`);
  console.log(`  Verbose:     ${config.verbose}`);
  if (config.skipPaths?.length) {
    console.log(`  Skip paths:  ${config.skipPaths.join(", ")}`);
  }
  console.log();

  // ── Initialize components ──

  const searchLimiter = new RateLimiter(10); // GitHub code search: 10 req/min
  const apiLimiter = new RateLimiter(30); // GitHub API: 30 req/min (conservative)
  const github = new GitHubClient(config.githubToken, searchLimiter, apiLimiter);

  const checkpointPath = join(import.meta.dir, ".github-import-checkpoint.json");
  const checkpointMgr = new CheckpointManager(checkpointPath);

  const reporter = new Reporter(startTime);

  // ── Load or create checkpoint ──

  let checkpoint: Checkpoint;
  if (config.resume) {
    const loaded = checkpointMgr.load();
    if (loaded) {
      checkpoint = loaded;
      const candidateCount = Object.keys(checkpoint.candidates).length;
      const pendingCount = Object.values(checkpoint.candidates).filter(
        (c) => c.status === "pending",
      ).length;
      console.log(
        `Resuming from checkpoint: ${candidateCount} candidates (${pendingCount} pending)`,
      );
      console.log(`  Phase: ${checkpoint.phase}`);
      console.log();
    } else {
      console.log("No checkpoint found, starting fresh.");
      checkpoint = makeEmptyCheckpoint();
      checkpointMgr.save(checkpoint);
    }
  } else {
    checkpoint = makeEmptyCheckpoint();
    checkpointMgr.save(checkpoint);
  }

  const stats = checkpoint.stats;

  // ── DISCOVER PHASE ──

  if (checkpoint.phase === "discover") {
    console.log(
      `Phase 1: Discovering SKILL.md files${repoMode ? " (repo-list mode)" : " (code search)"}...`,
    );

    let discoveredCount = Object.keys(checkpoint.candidates).length;

    /** Helper to add a discovered result to the checkpoint */
    function addCandidate(result: { fullName: string; filePath: string }): boolean {
      // Filter: only accept files named exactly SKILL.md (case-insensitive)
      const basename = result.filePath.split("/").pop() ?? "";
      if (basename.toLowerCase() !== "skill.md") {
        return false;
      }

      const key = `${result.fullName}:${result.filePath}`;

      // Skip if already in checkpoint (from a previous partial run)
      if (checkpoint.candidates[key]) {
        return false;
      }

      const candidate: SkillCandidate = {
        repoFullName: result.fullName,
        filePath: result.filePath,
        key,
        status: "pending",
      };
      checkpoint.candidates[key] = candidate;
      discoveredCount++;
      stats.discovered++;

      log(config, `[discover] ${key}`);

      // Save checkpoint periodically (every 50 discoveries)
      if (discoveredCount % 50 === 0) {
        checkpointMgr.save(checkpoint);
        console.log(`  ...discovered ${discoveredCount} candidates so far`);
      }

      return discoveredCount >= config.maxResults;
    }

    try {
      if (repoMode) {
        // Repo-list mode: iterate specific repos using Git Trees API
        for (const repoFullName of config.repos!) {
          console.log(`  Scanning repo: ${repoFullName}`);
          let hitLimit = false;
          for await (const result of github.discoverSkillFilesInRepo(repoFullName)) {
            if (addCandidate(result)) {
              hitLimit = true;
              break;
            }
          }
          if (hitLimit) {
            console.log(`  Reached maxResults limit (${config.maxResults}), stopping discovery.`);
            break;
          }
        }
      } else {
        // Code search mode: discover across GitHub
        for await (const result of github.discoverSkillFiles()) {
          if (addCandidate(result)) {
            console.log(`  Reached maxResults limit (${config.maxResults}), stopping discovery.`);
            break;
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Discovery error: ${msg}`);
      console.log(
        "Saving checkpoint and continuing to process phase with discovered candidates...",
      );
    }

    // Transition to process phase
    checkpoint.phase = "process";
    stats.discovered = Object.keys(checkpoint.candidates).length;
    checkpointMgr.save(checkpoint);

    console.log(`Discovery complete: ${stats.discovered} candidates found.`);
    console.log();
  }

  // ── PROCESS PHASE ──

  if (checkpoint.phase === "process") {
    console.log("Phase 2: Processing candidates...");

    const pending = Object.values(checkpoint.candidates).filter((c) => c.status === "pending");
    console.log(`  ${pending.length} pending candidates to process.`);
    console.log();

    // Build set of trusted repos for quality scoring
    const trustedRepos = new Set(config.repos?.map((r) => r.toLowerCase()) ?? []);

    // Concurrency-limited worker pool
    const queue = [...pending];
    let fatalError: FatalError | null = null;

    async function processNext(): Promise<void> {
      while (queue.length > 0) {
        // Check if another worker hit a fatal error
        if (fatalError) {
          return;
        }

        const candidate = queue.shift()!;
        const isTrusted = trustedRepos.has(candidate.repoFullName.toLowerCase());
        try {
          await processCandidate(candidate, config, github, checkpointMgr, stats, isTrusted);
        } catch (err: unknown) {
          if (err instanceof FatalError) {
            fatalError = err;
            return;
          }
          // Non-fatal errors are handled inside processCandidate,
          // but just in case something slips through:
          console.error(
            `[unexpected] ${candidate.key}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    // Start N workers
    const workers = Array.from({ length: config.concurrency }, () => processNext());
    await Promise.all(workers);

    if (fatalError) {
      console.error();
      console.error(`FATAL: ${fatalError.message}`);
      console.error("Saving checkpoint before exit...");
      checkpointMgr.save(checkpoint);
      // Still print report before exiting
      reporter.printSummary(stats, checkpoint.candidates);
      reporter.writeReport(stats, checkpoint.candidates);
      process.exit(1);
    }

    // Transition to complete phase
    checkpoint.phase = "complete";
    checkpointMgr.save(checkpoint);

    console.log();
    console.log("Processing complete.");
    console.log();
  }

  // ── REPORT PHASE ──

  reporter.printSummary(stats, checkpoint.candidates);
  reporter.writeReport(stats, checkpoint.candidates);
}

// ── Entry point ──────────────────────────────────────────────────

main().catch((err) => {
  console.error("Unhandled error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
