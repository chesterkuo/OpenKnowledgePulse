/**
 * Keyword-based domain classifier.
 *
 * Matches against tags, repo topics, and body content to assign one of
 * the predefined domain categories. Scoring uses weighted hits:
 * tags 3x, topics 2x, body keywords 1x. Highest domain wins;
 * falls back to "general" when no keywords match.
 */

const DOMAIN_MAP: Record<string, string[]> = {
  engineering: [
    "code",
    "programming",
    "debug",
    "refactor",
    "test",
    "ci",
    "devops",
    "git",
    "docker",
    "api",
    "backend",
    "frontend",
  ],
  data_science: [
    "data",
    "analytics",
    "ml",
    "machine-learning",
    "pandas",
    "statistics",
    "visualization",
  ],
  security: ["security", "vulnerability", "pentest", "owasp", "encryption", "compliance"],
  content_creation: ["writing", "blog", "seo", "marketing", "content", "copywriting"],
  design: ["design", "ui", "ux", "figma", "wireframe", "accessibility"],
  general: [], // fallback — never wins via keyword matching
};

/** Pre-compute inverted index: keyword -> domain for fast lookup */
const KEYWORD_TO_DOMAIN = new Map<string, string>();
for (const [domain, keywords] of Object.entries(DOMAIN_MAP)) {
  for (const kw of keywords) {
    KEYWORD_TO_DOMAIN.set(kw, domain);
  }
}

/** All domain keywords for body scanning */
const ALL_KEYWORDS = Array.from(KEYWORD_TO_DOMAIN.keys());

/**
 * Classify a SKILL.md into a domain category.
 *
 * @param tags     - Tags extracted from the SKILL.md front-matter (3x weight)
 * @param topics   - Repository topics from GitHub API (2x weight)
 * @param body     - Full body text of the SKILL.md (1x weight per keyword occurrence)
 * @returns The winning domain string, or "general" if no keywords match.
 */
export function classifyDomain(tags: string[], topics: string[], body: string): string {
  const scores: Record<string, number> = {};

  // Initialize all domains to 0
  for (const domain of Object.keys(DOMAIN_MAP)) {
    scores[domain] = 0;
  }

  // Tags: 3x weight
  for (const tag of tags) {
    const normalized = tag.toLowerCase();
    const domain = KEYWORD_TO_DOMAIN.get(normalized);
    if (domain) {
      scores[domain] += 3;
    }
  }

  // Topics: 2x weight
  for (const topic of topics) {
    const normalized = topic.toLowerCase();
    const domain = KEYWORD_TO_DOMAIN.get(normalized);
    if (domain) {
      scores[domain] += 2;
    }
  }

  // Body: 1x weight per keyword found (case-insensitive word boundary match)
  const bodyLower = body.toLowerCase();
  for (const kw of ALL_KEYWORDS) {
    // Use word boundary check: the keyword must appear as a standalone word
    const regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, "i");
    if (regex.test(bodyLower)) {
      const domain = KEYWORD_TO_DOMAIN.get(kw)!;
      scores[domain] += 1;
    }
  }

  // Find highest-scoring domain (excluding "general" which has no keywords)
  let bestDomain = "general";
  let bestScore = 0;

  for (const [domain, score] of Object.entries(scores)) {
    if (domain === "general") continue;
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  // If no domain scored above 0, fall back to "general"
  return bestScore > 0 ? bestDomain : "general";
}

/** Escape special regex characters in a string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
