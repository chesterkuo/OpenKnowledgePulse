import { generateSkillMd, parseSkillMd } from "../../packages/sdk/src/skill-md.js";
import type { SkillMdKpExtension } from "../../packages/sdk/src/types/knowledge-unit.js";
import type { RepoMetadata } from "./types.js";

/**
 * Enrich a raw SKILL.md string by filling missing frontmatter fields
 * from repository metadata and adding/merging the `kp:` extension block.
 *
 * Rules:
 * - Existing frontmatter values are never overwritten.
 * - Existing `kp:` fields are preserved (no overwrite).
 * - Tags are merged and deduplicated (lowercased).
 */
export function enrichSkillMd(
  rawContent: string,
  repo: RepoMetadata,
  _qualityScore: number,
  domain: string,
): string {
  const parsed = parseSkillMd(rawContent);

  // ── Fill missing frontmatter fields from repo metadata ──────────

  const frontmatter = { ...parsed.frontmatter };

  // author ← repo owner (first segment of full_name) if not set
  if (!frontmatter.author) {
    frontmatter.author = repo.full_name.split("/")[0];
  }

  // license ← repo license SPDX ID if not set
  if (!frontmatter.license && repo.license?.spdx_id) {
    frontmatter.license = repo.license.spdx_id;
  }

  // tags ← merge existing tags + repo topics (deduped, lowercased)
  const existingTags = (frontmatter.tags ?? []).map((t) => t.toLowerCase());
  const repoTopics = repo.topics.map((t) => t.toLowerCase());
  const mergedTags = [...new Set([...existingTags, ...repoTopics])];
  if (mergedTags.length > 0) {
    frontmatter.tags = mergedTags;
  }

  // ── Add / merge kp extension (preserve existing fields) ─────────

  const existingKp: SkillMdKpExtension = parsed.kp ?? {};

  const kp: SkillMdKpExtension = {
    // Defaults — only applied if not already set
    domain,
    knowledge_capture: true,
    visibility: "network",
    reward_eligible: true,
    // Spread existing kp last so its fields take precedence
    ...existingKp,
  };

  return generateSkillMd(frontmatter, parsed.body, kp);
}
