import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { ValidationError } from "./errors.js";
import type { SkillMdFrontmatter, SkillMdKpExtension } from "./types/knowledge-unit.js";
import { SkillMdFrontmatterSchema, SkillMdKpExtensionSchema } from "./types/zod-schemas.js";
import { sanitizeSkillMd } from "./utils/sanitizer.js";

export interface ParsedSkillMd {
  frontmatter: SkillMdFrontmatter;
  kp?: SkillMdKpExtension;
  body: string;
  raw: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function parseSkillMd(content: string): ParsedSkillMd {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    throw new ValidationError("Invalid SKILL.md: missing YAML frontmatter delimiters (---)");
  }

  const yamlStr = match[1]!;
  const body = match[2]!;

  let yamlData: Record<string, unknown>;
  try {
    yamlData = parseYaml(yamlStr) as Record<string, unknown>;
  } catch (e) {
    throw new ValidationError(
      `Invalid SKILL.md: YAML parse error: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // Extract kp extension if present
  const kpRaw = yamlData.kp as Record<string, unknown> | undefined;
  const { kp: _, ...frontmatterRaw } = yamlData;

  // Validate frontmatter
  const fmResult = SkillMdFrontmatterSchema.safeParse(frontmatterRaw);
  if (!fmResult.success) {
    throw new ValidationError(
      "Invalid SKILL.md frontmatter",
      fmResult.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    );
  }

  // Validate kp extension if present
  let kp: SkillMdKpExtension | undefined;
  if (kpRaw) {
    const kpResult = SkillMdKpExtensionSchema.safeParse(kpRaw);
    if (!kpResult.success) {
      throw new ValidationError(
        "Invalid SKILL.md kp extension",
        kpResult.error.issues.map((i) => ({
          path: `kp.${i.path.join(".")}`,
          message: i.message,
        })),
      );
    }
    kp = kpResult.data;
  }

  return {
    frontmatter: fmResult.data,
    kp,
    body,
    raw: content,
  };
}

export function generateSkillMd(
  frontmatter: SkillMdFrontmatter,
  body: string,
  kp?: SkillMdKpExtension,
): string {
  const yamlData: Record<string, unknown> = { ...frontmatter };
  if (kp) {
    yamlData.kp = kp;
  }

  return `---\n${stringifyYaml(yamlData).trim()}\n---\n\n${body}`;
}

export function validateSkillMd(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Sanitize first
  try {
    const { warnings, injectionAssessment } = sanitizeSkillMd(content);
    errors.push(...warnings.map((w) => `Warning: ${w}`));
    // Any matched injection pattern makes validation fail
    if (injectionAssessment && injectionAssessment.patterns.length > 0) {
      return {
        valid: false,
        errors: [
          `Content contains potential prompt injection patterns: ${injectionAssessment.patterns.join(", ")}`,
          ...errors,
        ],
      };
    }
  } catch (e) {
    return {
      valid: false,
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }

  // Then parse
  try {
    parseSkillMd(content);
  } catch (e) {
    if (e instanceof ValidationError) {
      return {
        valid: false,
        errors: [e.message, ...e.issues.map((i) => `  ${i.path}: ${i.message}`)],
      };
    }
    return {
      valid: false,
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }

  return { valid: true, errors };
}
