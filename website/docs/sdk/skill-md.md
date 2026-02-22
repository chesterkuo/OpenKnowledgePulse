---
sidebar_position: 3
title: SKILL.md
description: Parse, generate, and validate SKILL.md files with KnowledgePulse extensions.
---

# SKILL.md

SKILL.md is a standard file format that describes an agent skill using YAML frontmatter and a Markdown body. The KnowledgePulse SDK adds an optional `kp:` extension block to the frontmatter, enabling knowledge capture configuration while remaining fully backward-compatible with non-KP tools.

## Functions

### `parseSkillMd(content)`

Parses a SKILL.md string into its structured components.

```ts
function parseSkillMd(content: string): ParsedSkillMd
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `content` | `string` | The raw SKILL.md file content |

**Returns:** `ParsedSkillMd`

```ts
interface ParsedSkillMd {
  frontmatter: SkillMdFrontmatter;  // Standard YAML fields
  kp?: SkillMdKpExtension;          // KnowledgePulse extension (if present)
  body: string;                      // Markdown content after frontmatter
  raw: string;                       // Original input string
}
```

**Throws:** `ValidationError` if the frontmatter is missing, the YAML is malformed, or required fields are absent.

**Example:**

```ts
import { parseSkillMd } from "@knowledgepulse/sdk";

const content = `---
name: code-reviewer
description: Reviews pull requests for code quality issues
version: "1.0.0"
author: acme-corp
tags:
  - code-review
  - quality
allowed-tools:
  - github_pr_read
  - github_pr_comment
kp:
  knowledge_capture: true
  domain: code-review
  quality_threshold: 0.8
  privacy_level: aggregated
  visibility: network
  reward_eligible: true
---

## Instructions

You are a code review assistant. Analyze the given pull request
and provide actionable feedback on code quality, security, and
best practices.
`;

const parsed = parseSkillMd(content);

console.log(parsed.frontmatter.name);       // "code-reviewer"
console.log(parsed.frontmatter.tags);        // ["code-review", "quality"]
console.log(parsed.kp?.knowledge_capture);   // true
console.log(parsed.kp?.quality_threshold);   // 0.8
console.log(parsed.body);                    // "\n## Instructions\n\nYou are a ..."
```

---

### `generateSkillMd(frontmatter, body, kp?)`

Generates a SKILL.md string from structured components.

```ts
function generateSkillMd(
  frontmatter: SkillMdFrontmatter,
  body: string,
  kp?: SkillMdKpExtension,
): string
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `frontmatter` | `SkillMdFrontmatter` | Standard YAML frontmatter fields |
| `body` | `string` | Markdown body content |
| `kp` | `SkillMdKpExtension` | _(optional)_ KnowledgePulse extension fields |

**Returns:** A complete SKILL.md string with YAML frontmatter delimiters (`---`).

**Example:**

```ts
import { generateSkillMd } from "@knowledgepulse/sdk";

const skillMd = generateSkillMd(
  {
    name: "data-analyst",
    description: "Analyzes datasets and produces insights",
    version: "0.2.0",
    tags: ["analytics", "data"],
    "allowed-tools": ["sql_query", "chart_render"],
  },
  "## Instructions\n\nAnalyze the provided dataset and generate a summary report.",
  {
    knowledge_capture: true,
    domain: "data-analysis",
    quality_threshold: 0.7,
    visibility: "org",
  },
);

console.log(skillMd);
// ---
// name: data-analyst
// description: Analyzes datasets and produces insights
// version: "0.2.0"
// tags:
//   - analytics
//   - data
// allowed-tools:
//   - sql_query
//   - chart_render
// kp:
//   knowledge_capture: true
//   domain: data-analysis
//   quality_threshold: 0.7
//   visibility: org
// ---
//
// ## Instructions
//
// Analyze the provided dataset and generate a summary report.
```

---

### `validateSkillMd(content)`

Validates a SKILL.md string without throwing. Runs both sanitization and schema validation, collecting all errors.

```ts
function validateSkillMd(content: string): {
  valid: boolean;
  errors: string[];
}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `content` | `string` | The raw SKILL.md file content |

**Returns:** An object with `valid` (boolean) and `errors` (array of human-readable strings). When `valid` is `true`, the `errors` array may still contain non-fatal warnings (e.g., "Warning: Removed HTML comments").

**Example:**

```ts
import { validateSkillMd } from "@knowledgepulse/sdk";

// Valid document
const good = validateSkillMd(`---
name: my-skill
description: A helpful skill
---

Instructions here.
`);
console.log(good.valid);   // true
console.log(good.errors);  // []

// Invalid document (missing required fields)
const bad = validateSkillMd(`---
name: my-skill
---

No description field.
`);
console.log(bad.valid);    // false
console.log(bad.errors);
// [
//   "Invalid SKILL.md frontmatter",
//   "  description: Required"
// ]
```

## SKILL.md Format

A SKILL.md file consists of two sections separated by YAML frontmatter delimiters (`---`):

```
---
<YAML frontmatter>
---

<Markdown body>
```

### Standard Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique skill identifier |
| `description` | `string` | Yes | Human-readable description |
| `version` | `string` | No | Semantic version |
| `author` | `string` | No | Author or organization |
| `license` | `string` | No | SPDX license identifier |
| `tags` | `string[]` | No | Searchable tags |
| `allowed-tools` | `string[]` | No | MCP tools this skill may invoke |

### KnowledgePulse Extension (`kp:`)

The `kp:` block is an optional nested object within the frontmatter. It configures how the KnowledgePulse protocol interacts with this skill.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `knowledge_capture` | `boolean` | -- | Enable automatic knowledge capture for this skill |
| `domain` | `string` | -- | Task domain used for knowledge classification |
| `quality_threshold` | `number` | -- | Minimum quality score (0.0-1.0) for captured knowledge to be contributed |
| `privacy_level` | `PrivacyLevel` | -- | Privacy level for captured knowledge |
| `visibility` | `Visibility` | -- | Visibility scope for captured knowledge |
| `reward_eligible` | `boolean` | -- | Whether contributions from this skill are eligible for token rewards |

## Backward Compatibility

The `kp:` extension is designed to be fully backward-compatible:

- Tools that do not understand the `kp:` key will simply ignore it during YAML parsing.
- The `kp:` fields are all optional; a SKILL.md file works without them.
- Standard fields (`name`, `description`, `tags`, etc.) remain unchanged.

This means you can add KnowledgePulse configuration to any existing SKILL.md file without breaking tools that consume the standard format.

## Error Handling

When `parseSkillMd` encounters invalid input, it throws a `ValidationError` with a structured `issues` array:

```ts
import { parseSkillMd, ValidationError } from "@knowledgepulse/sdk";

try {
  parseSkillMd(invalidContent);
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.message);
    // "Invalid SKILL.md frontmatter"

    for (const issue of err.issues) {
      console.error(`  ${issue.path}: ${issue.message}`);
      // "description: Required"
      // "kp.quality_threshold: Number must be less than or equal to 1"
    }
  }
}
```

Each entry in the `issues` array contains:

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Dot-delimited path to the invalid field (e.g., `"kp.quality_threshold"`) |
| `message` | `string` | Human-readable description of the validation failure |

For `kp:` extension errors, paths are prefixed with `kp.` to distinguish them from standard frontmatter errors.
