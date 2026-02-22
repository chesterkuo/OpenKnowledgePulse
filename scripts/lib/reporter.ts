import { join, dirname } from "node:path";
import type { ImportStats, SkillCandidate } from "./types.js";

/**
 * Console summary + JSON report file for the GitHub SKILL.md import run.
 */
export class Reporter {
  private readonly startTime: Date;

  constructor(startTime: Date) {
    this.startTime = startTime;
  }

  /**
   * Print a formatted console summary table.
   */
  printSummary(stats: ImportStats, candidates: Record<string, SkillCandidate>): void {
    const duration = this.formatDuration();
    const hardFiltered = stats.discovered - stats.fetched;
    const topDomains = this.computeTopDomains(candidates, 3);
    const topDomainsStr = topDomains
      .map(([domain, pct]) => `${domain} ${pct}%`)
      .join(", ");

    const W = 50; // box width (inner)
    const line = "\u2550".repeat(W);
    const thin = "\u2500".repeat(W);

    const rows: string[] = [
      `\u2550${line}\u2550`,
      center("KnowledgePulse GitHub Skill Import Report", W + 2),
      `\u2550${line}\u2550`,
      pad("Duration:", duration, W + 2),
      pad("Discovered:", String(stats.discovered) + " repos", W + 2),
      pad("Hard-filtered:", `${hardFiltered}`, W + 2),
      pad("Fetched SKILL.md:", String(stats.fetched), W + 2),
      `  ${thin}`,
      pad("Passed validation:", `${stats.passed_validation}  (failed: ${stats.skipped_validation})`, W + 2),
      pad("Passed injection:", `${stats.passed_validation - stats.skipped_injection}  (flagged: ${stats.skipped_injection})`, W + 2),
      pad("Passed quality:", `${stats.passed_quality}  (below 0.6: ${stats.skipped_low_quality})`, W + 2),
      `  ${thin}`,
      pad("Imported:", String(stats.imported), W + 2),
      pad("Duplicates:", String(stats.skipped_duplicate), W + 2),
      pad("Top domains:", topDomainsStr || "N/A", W + 2),
      `\u2550${line}\u2550`,
    ];

    console.log();
    for (const row of rows) {
      console.log(row);
    }
    console.log();
  }

  /**
   * Write a JSON report to scripts/.github-import-report-{timestamp}.json
   */
  writeReport(stats: ImportStats, candidates: Record<string, SkillCandidate>): void {
    const now = new Date();
    const durationSeconds = Math.round((now.getTime() - this.startTime.getTime()) / 1000);
    const topDomains = this.computeTopDomains(candidates, 5);

    const importedSkills = Object.values(candidates)
      .filter((c) => c.status === "imported")
      .map((c) => ({
        key: c.key,
        skillId: c.skillId,
        qualityScore: c.qualityScore,
        domain: undefined as string | undefined,
      }));

    const report = {
      generated_at: now.toISOString(),
      duration_seconds: durationSeconds,
      stats,
      top_domains: Object.fromEntries(topDomains),
      imported_skills: importedSkills,
    };

    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const reportPath = join(dirname(import.meta.dir), `.github-import-report-${timestamp}.json`);

    Bun.write(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report written to ${reportPath}`);
  }

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  /**
   * Format elapsed duration as "Xm Ys".
   */
  private formatDuration(): string {
    const elapsed = Math.round((Date.now() - this.startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Count domains from imported candidates, return top N with percentages.
   */
  private computeTopDomains(
    candidates: Record<string, SkillCandidate>,
    topN: number,
  ): [string, number][] {
    const domainCounts: Record<string, number> = {};
    let total = 0;

    for (const candidate of Object.values(candidates)) {
      if (candidate.status !== "imported") continue;

      // Domain is stored in reason field as "domain:xxx" or we infer from key
      // Since SkillCandidate doesn't have a domain field, we look for it in
      // the reason or default to "general". The orchestrator is expected to
      // store domain info; here we parse what's available.
      const domain = extractDomain(candidate);
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      total++;
    }

    if (total === 0) return [];

    return Object.entries(domainCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .map(([domain, count]) => [domain, Math.round((count / total) * 100)]);
  }
}

/**
 * Extract domain from a SkillCandidate.
 *
 * The orchestrator stores domain as `reason` prefixed with "domain:" on
 * imported candidates, or we fall back to "general".
 */
function extractDomain(candidate: SkillCandidate): string {
  if (candidate.reason && candidate.reason.startsWith("domain:")) {
    return candidate.reason.slice(7);
  }
  return "general";
}

// ------------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------------

/** Center text within a given width, padded with spaces. */
function center(text: string, width: number): string {
  const padding = Math.max(0, width - text.length);
  const left = Math.floor(padding / 2);
  return " ".repeat(left) + text + " ".repeat(padding - left);
}

/** Left-align a label + right-align a value within a given width. */
function pad(label: string, value: string, width: number): string {
  const prefix = "  ";
  const inner = width - prefix.length * 2;
  const gap = Math.max(1, inner - label.length - value.length);
  return prefix + label + " ".repeat(gap) + value;
}
