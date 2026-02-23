import { SanitizationError } from "../errors.js";
import { type InjectionAssessment, classifyInjectionRisk } from "./injection-classifier.js";

// Invisible Unicode characters to reject (PRD Section 3.5.1 T-2)
const INVISIBLE_CHARS =
  /[\u200B-\u200F\u2028-\u202F\u2060-\u2064\u2066-\u2069\uFEFF\uFFF9-\uFFFB]/g;

// HTML tag pattern
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/g;

// HTML comment pattern
const HTML_COMMENT = /<!--[\s\S]*?-->/g;

export interface SanitizeResult {
  content: string;
  warnings: string[];
  injectionAssessment?: InjectionAssessment;
}

export function sanitizeSkillMd(content: string): SanitizeResult {
  const warnings: string[] = [];
  let sanitized = content;

  // Strip HTML comments
  if (HTML_COMMENT.test(sanitized)) {
    warnings.push("Removed HTML comments");
    sanitized = sanitized.replace(HTML_COMMENT, "");
  }

  // Strip HTML tags
  if (HTML_TAG.test(sanitized)) {
    warnings.push("Removed HTML tags");
    sanitized = sanitized.replace(HTML_TAG, "");
  }

  // Reject invisible characters
  if (INVISIBLE_CHARS.test(sanitized)) {
    throw new SanitizationError(
      "Content contains invisible Unicode characters that may be used for steganography",
    );
  }

  // Normalize Unicode to NFC
  sanitized = sanitized.normalize("NFC");

  // Run injection classifier (scoring model) — replaces the old hard-coded
  // INJECTION_PATTERNS array with a richer, scored pattern set.
  const assessment = classifyInjectionRisk(sanitized);
  if (assessment.verdict === "rejected") {
    throw new SanitizationError(
      `Content flagged as potential prompt injection (risk score: ${assessment.score.toFixed(2)}). Matched patterns: ${assessment.patterns.join(", ")}`,
    );
  }
  if (assessment.verdict === "suspicious") {
    warnings.push(
      `Injection risk assessment: suspicious (score: ${assessment.score.toFixed(2)}). Patterns: ${assessment.patterns.join(", ")}`,
    );
  }

  return { content: sanitized, warnings, injectionAssessment: assessment };
}
