import type { PrivacyLevel } from "../types/knowledge-unit.js";

export interface PiiCleanResult {
  cleaned: string;
  redactions: Array<{ type: string; count: number }>;
}

// ── Secret patterns (always redacted, even at "private" level) ─────────

// Connection strings — must run BEFORE generic password patterns
const CONNECTION_STRING =
  /(?:postgresql|postgres|mysql|redis|rediss|mongodb|mongodb\+srv|amqp|amqps):\/\/[^\s'"`,)}\]]+/gi;

// Bearer tokens — but NOT `Bearer kp_*` (handled as KP API keys)
const BEARER_TOKEN = /Bearer\s+(?!kp_)[A-Za-z0-9_\-.~+/=]{20,}/g;

// OpenAI keys
const OPENAI_KEY = /sk-[A-Za-z0-9]{20,}/g;

// GitHub tokens
const GITHUB_TOKEN = /gh[poas]_[A-Za-z0-9]{36,}/g;

// AWS access keys
const AWS_KEY = /AKIA[A-Z0-9]{16}/g;

// KP API keys
const KP_KEY = /kp_[a-f0-9]{16,}/g;

// Slack tokens
const SLACK_TOKEN = /xox[bpras]-[A-Za-z0-9\-]+/g;

// Generic password/secret/token/api_key assignment patterns.
// Requires `=` or `:` separator between key and value.
// The value can be quoted (single or double) or unquoted.
// Negative lookahead after separator prevents matching already-redacted placeholders.
// Excludes `[` from unquoted values to avoid matching `[REDACTED:...]` fragments.
const GENERIC_PASSWORD =
  /\b(?<key>password|passwd|secret|token|api_key|apikey|api_secret|access_token|auth_token)(?<sep>\s*[=:]\s*)(?!\[REDACTED)(?:(?<qchar>['"])(?<qval>[^'"]*)\k<qchar>|(?<uval>[^\s'"`,;)}\[\]]{2,}))/gi;

// ── Identifier patterns (redacted at "aggregated" and "federated", kept at "private") ─

// Email addresses
const EMAIL = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Phone numbers — US/NANP format with optional country code
// Matches: (555) 123-4567, 555-234-5678, +1-555-234-5678, +1 555 234 5678
const US_PHONE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\s?\d{3}[-.\s]\d{4}\b/g;

// International phone numbers: + followed by 7-15 digits (no spaces/dashes)
const INTL_PHONE = /\+[1-9]\d{6,14}\b/g;

// IPv4 addresses — four octets 0-255
const IPV4 =
  /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;

// File paths with usernames
const UNIX_PATH = /\/(?:home|Users)\/[a-zA-Z0-9._\-]+(?:\/[^\s'"`,;)}\]]*)?/g;
const WINDOWS_PATH = /[A-Z]:\\Users\\[a-zA-Z0-9._\-]+(?:\\[^\s'"`,;)}\]]*)*/g;

type PatternEntry = {
  pattern: RegExp;
  type: string;
  replacement: string;
  /** Optional replacer function (overrides `replacement` string when set) */
  replacer?: (match: string, ...args: unknown[]) => string;
  category: "secret" | "identifier";
};

const PATTERNS: PatternEntry[] = [
  // ── Secrets (order matters: connection strings before generic password) ─
  {
    pattern: CONNECTION_STRING,
    type: "connection_string",
    replacement: "[REDACTED:connection_string]",
    category: "secret",
  },
  {
    pattern: BEARER_TOKEN,
    type: "bearer_token",
    replacement: "Bearer [REDACTED:bearer_token]",
    replacer: (_match: string) => "Bearer [REDACTED:bearer_token]",
    category: "secret",
  },
  { pattern: OPENAI_KEY, type: "api_key", replacement: "[REDACTED:api_key]", category: "secret" },
  { pattern: GITHUB_TOKEN, type: "api_key", replacement: "[REDACTED:api_key]", category: "secret" },
  { pattern: AWS_KEY, type: "api_key", replacement: "[REDACTED:api_key]", category: "secret" },
  { pattern: KP_KEY, type: "api_key", replacement: "[REDACTED:api_key]", category: "secret" },
  { pattern: SLACK_TOKEN, type: "api_key", replacement: "[REDACTED:api_key]", category: "secret" },
  {
    pattern: GENERIC_PASSWORD,
    type: "password",
    replacement: "",
    replacer: (_match: string, ...args: unknown[]) => {
      // Named groups: key, sep, qchar, qval, uval
      const groups = args[args.length - 1] as Record<string, string>;
      return `${groups.key}${groups.sep}[REDACTED:password]`;
    },
    category: "secret",
  },

  // ── Identifiers ─
  { pattern: EMAIL, type: "email", replacement: "[REDACTED:email]", category: "identifier" },
  { pattern: US_PHONE, type: "phone", replacement: "[REDACTED:phone]", category: "identifier" },
  { pattern: INTL_PHONE, type: "phone", replacement: "[REDACTED:phone]", category: "identifier" },
  { pattern: IPV4, type: "ip", replacement: "[REDACTED:ip]", category: "identifier" },
  {
    pattern: UNIX_PATH,
    type: "filepath",
    replacement: "[REDACTED:filepath]",
    category: "identifier",
  },
  {
    pattern: WINDOWS_PATH,
    type: "filepath",
    replacement: "[REDACTED:filepath]",
    category: "identifier",
  },
];

/**
 * Clean PII from text based on the privacy level.
 *
 * - Secrets (API keys, tokens, connection strings, passwords) are **always** redacted.
 * - Identifiers (emails, phone numbers, IPs, file paths) are redacted at
 *   `"aggregated"` (default) and `"federated"` levels, but kept at `"private"`.
 */
export function cleanPii(text: string, level?: PrivacyLevel): PiiCleanResult {
  if (!text) {
    return { cleaned: text, redactions: [] };
  }

  const effectiveLevel: PrivacyLevel = level ?? "aggregated";
  const redactionMap = new Map<string, number>();
  let cleaned = text;

  for (const entry of PATTERNS) {
    // At "private" level, skip identifier patterns
    if (effectiveLevel === "private" && entry.category === "identifier") {
      continue;
    }

    // Count matches first (using a fresh copy to avoid lastIndex issues)
    const countRegex = new RegExp(entry.pattern.source, entry.pattern.flags);
    const matches = cleaned.match(countRegex);

    if (matches && matches.length > 0) {
      // Apply replacements
      const replaceRegex = new RegExp(entry.pattern.source, entry.pattern.flags);
      if (entry.replacer) {
        cleaned = cleaned.replace(replaceRegex, entry.replacer);
      } else {
        cleaned = cleaned.replace(replaceRegex, entry.replacement);
      }

      const currentCount = redactionMap.get(entry.type) ?? 0;
      redactionMap.set(entry.type, currentCount + matches.length);
    }
  }

  const redactions = Array.from(redactionMap.entries()).map(([type, count]) => ({
    type,
    count,
  }));

  return { cleaned, redactions };
}
