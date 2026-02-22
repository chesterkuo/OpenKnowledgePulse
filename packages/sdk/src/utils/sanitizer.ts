import { SanitizationError } from "../errors.js";

// Invisible Unicode characters to reject (PRD Section 3.5.1 T-2)
const INVISIBLE_CHARS =
  /[\u200B-\u200F\u2028-\u202F\u2060-\u2064\u2066-\u2069\uFEFF\uFFF9-\uFFFB]/g;

// HTML tag pattern
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/g;

// HTML comment pattern
const HTML_COMMENT = /<!--[\s\S]*?-->/g;

// Common prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /<<SYS>>/i,
];

export interface SanitizeResult {
  content: string;
  warnings: string[];
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

  // Check for prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new SanitizationError(
        `Content contains suspected prompt injection pattern: ${pattern.source}`,
      );
    }
  }

  return { content: sanitized, warnings };
}
