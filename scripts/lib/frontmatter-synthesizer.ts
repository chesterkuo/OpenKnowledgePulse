/**
 * Frontmatter Synthesizer
 *
 * Converts plain markdown SKILL.md files (without YAML frontmatter) into
 * valid SKILL.md format by inferring frontmatter fields from the content.
 */

const FRONTMATTER_RE = /^---\n/;
const H1_RE = /^#\s+(.+)$/m;
const H2_RE = /^##\s+(.+)$/m;

/**
 * Title-case a string: capitalize the first letter of each word.
 * E.g. "my cool tool" -> "My Cool Tool"
 */
function titleCase(str: string): string {
  return str
    .split(/\s+/)
    .map((word) => (word.length === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(" ");
}

/**
 * Extract the first non-empty paragraph after the first heading in the content.
 * A paragraph is a block of non-empty lines separated by blank lines.
 * Returns up to 200 characters, or null if no suitable paragraph is found.
 */
function extractDescription(content: string): string | null {
  const lines = content.split("\n");
  let foundHeading = false;
  const paragraphLines: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Look for the first heading
    if (!foundHeading) {
      if (/^#{1,2}\s+/.test(trimmed)) {
        foundHeading = true;
      }
      continue;
    }

    // After heading, look for the first non-empty paragraph
    if (trimmed === "") {
      if (inParagraph && paragraphLines.length > 0) {
        // End of paragraph
        break;
      }
      continue;
    }

    // Skip lines that are headings, code blocks, lists, etc.
    if (/^#{1,6}\s+/.test(trimmed) || trimmed.startsWith("```")) {
      if (inParagraph && paragraphLines.length > 0) {
        break;
      }
      continue;
    }

    // This is a content line — part of a paragraph
    inParagraph = true;
    paragraphLines.push(trimmed);
  }

  if (paragraphLines.length === 0) {
    return null;
  }

  const full = paragraphLines.join(" ");
  if (full.length <= 200) {
    return full;
  }
  // Truncate to 200 chars at a word boundary
  const truncated = full.slice(0, 200);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 100 ? `${truncated.slice(0, lastSpace)}...` : `${truncated}...`;
}

/**
 * Attempts to add YAML frontmatter to a plain markdown SKILL.md file.
 * Returns the original content unchanged if it already has frontmatter.
 * Returns synthesized content if frontmatter was inferred successfully.
 * Returns null if the content is too minimal to synthesize from.
 */
export function synthesizeFrontmatter(
  rawContent: string,
  repoFullName: string,
  repoTopics: string[],
): string | null {
  // 1. If content already has frontmatter, return unchanged
  if (FRONTMATTER_RE.test(rawContent)) {
    return rawContent;
  }

  // Check if content is too minimal (empty or < 20 chars)
  if (rawContent.trim().length < 20) {
    return null;
  }

  // 2. Extract name from headings or repo name
  let name: string;
  const h1Match = rawContent.match(H1_RE);
  if (h1Match) {
    name = h1Match[1]!.trim();
  } else {
    const h2Match = rawContent.match(H2_RE);
    if (h2Match) {
      name = h2Match[1]!.trim();
    } else {
      // Derive from repo name
      const repoName = repoFullName.split("/")[1] ?? repoFullName;
      name = titleCase(repoName.replace(/[-_]/g, " "));
    }
  }

  // 3. Extract description from first paragraph after heading
  const description = extractDescription(rawContent) ?? `Skill from ${repoFullName}`;

  // 4. Build tags from repoTopics (lowercased, deduped)
  const tags = [...new Set(repoTopics.map((t) => t.toLowerCase()))];

  // 5. Extract owner from repoFullName
  const owner = repoFullName.split("/")[0] ?? "unknown";

  // 6. Construct the frontmatter
  let frontmatter = `---\nname: "${name.replace(/"/g, '\\"')}"\ndescription: "${description.replace(/"/g, '\\"')}"\nversion: "1.0.0"\nauthor: ${owner}`;
  if (tags.length > 0) {
    frontmatter += "\ntags:";
    for (const tag of tags) {
      frontmatter += `\n  - ${tag}`;
    }
  }
  frontmatter += "\n---";

  // 7. Prepend frontmatter to original content
  return `${frontmatter}\n\n${rawContent}`;
}
