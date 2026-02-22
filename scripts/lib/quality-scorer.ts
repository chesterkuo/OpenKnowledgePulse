import type { RepoMetadata } from "./types.js";

export interface QualityResult {
  score: number; // 0.0-1.0
  rejected: boolean;
  reason?: string; // reason for rejection
}

/** AI/agent-related keywords for topics scoring */
const AI_KEYWORDS = new Set([
  "ai",
  "llm",
  "agent",
  "gpt",
  "claude",
  "ml",
  "machine-learning",
  "deep-learning",
  "nlp",
  "chatbot",
  "automation",
]);

/** Permissive licenses (score 1.0) */
const PERMISSIVE_LICENSES = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD"]);

/** Copyleft licenses (score 0.7) */
const COPYLEFT_LICENSES = new Set(["GPL-2.0", "GPL-3.0", "LGPL-2.1", "LGPL-3.0", "MPL-2.0", "AGPL-3.0"]);

/** Days since a date string */
function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60 * 24);
}

/** Stars sub-score: log scale, 10=~0.33, 100=~0.67, 1000=1.0 */
function scoreStars(stars: number): number {
  return Math.min(1, Math.log10(stars + 1) / Math.log10(1000));
}

/** Recency sub-score based on pushed_at */
function scoreRecency(pushedAt: string): number {
  const days = daysSince(pushedAt);
  if (days <= 30) return 1.0;
  if (days <= 90) return 0.8;
  if (days <= 365) return 0.5;
  if (days <= 730) return 0.3;
  return 0.1;
}

/** Content depth sub-score */
function scoreContentDepth(
  bodyLength: number,
  sectionCount: number,
  hasInstructions: boolean,
): number {
  const lengthPart = (bodyLength / 2000) * 0.5;
  const sectionPart = (sectionCount / 5) * 0.3;
  const instructionPart = hasInstructions ? 0.2 : 0;
  return Math.min(1, lengthPart + sectionPart + instructionPart);
}

/** License sub-score */
function scoreLicense(license: { spdx_id: string } | null): number {
  if (!license || !license.spdx_id || license.spdx_id === "NOASSERTION") return 0.0;
  const id = license.spdx_id;
  if (PERMISSIVE_LICENSES.has(id)) return 1.0;
  if (COPYLEFT_LICENSES.has(id)) return 0.7;
  return 0.5;
}

/** Forks sub-score: log scale, 100 forks = 1.0 */
function scoreForks(forks: number): number {
  return Math.min(1, Math.log10(forks + 1) / Math.log10(100));
}

/** Topics sub-score */
function scoreTopics(topics: string[]): number {
  if (!topics || topics.length === 0) return 0.0;
  const hasAI = topics.some((t) => AI_KEYWORDS.has(t.toLowerCase()));
  return hasAI ? 1.0 : 0.5;
}

const THREE_YEARS_DAYS = 365 * 3;

/**
 * Compute 0.0-1.0 quality score from repo signals + SKILL.md content analysis.
 *
 * Hard filters reject immediately (return rejected=true with reason).
 * Otherwise a weighted score is computed from 6 signals.
 */
export function computeQualityScore(
  repo: RepoMetadata,
  bodyLength: number,
  sectionCount: number,
  hasInstructions: boolean,
  minStars: number = 5,
): QualityResult {
  // --- Hard filters ---
  if (repo.stargazers_count < minStars) {
    return { score: 0, rejected: true, reason: `stars ${repo.stargazers_count} < minStars ${minStars}` };
  }
  if (repo.archived) {
    return { score: 0, rejected: true, reason: "repository is archived" };
  }
  if (bodyLength < 100) {
    return { score: 0, rejected: true, reason: `body too short (${bodyLength} < 100 chars)` };
  }
  if (sectionCount < 1) {
    return { score: 0, rejected: true, reason: "no ## headings found (sectionCount < 1)" };
  }
  if (daysSince(repo.pushed_at) > THREE_YEARS_DAYS) {
    return { score: 0, rejected: true, reason: "last push older than 3 years" };
  }

  // --- Weighted scoring ---
  const stars = scoreStars(repo.stargazers_count) * 0.25;
  const recency = scoreRecency(repo.pushed_at) * 0.20;
  const depth = scoreContentDepth(bodyLength, sectionCount, hasInstructions) * 0.25;
  const license = scoreLicense(repo.license) * 0.10;
  const forks = scoreForks(repo.forks_count) * 0.10;
  const topics = scoreTopics(repo.topics) * 0.10;

  const score = Math.round((stars + recency + depth + license + forks + topics) * 1000) / 1000;

  return { score, rejected: false };
}
