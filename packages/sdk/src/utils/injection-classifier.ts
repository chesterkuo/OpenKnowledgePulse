/**
 * Pattern-based heuristic injection classifier for SKILL.md imports.
 *
 * Runs at import time (not per-query). Each matched pattern contributes a
 * weighted score; if the accumulated score exceeds a configurable threshold
 * the content is flagged as "suspicious" or "rejected".
 *
 * PRD Section 3.5.1 T-2
 */

// ─── Public types ────────────────────────────────────────────────

export interface InjectionAssessment {
  /** Normalised risk score in 0.0 – 1.0 */
  score: number;
  /** Theoretical maximum for the current pattern set */
  maxScore: number;
  /** Human-readable names of matched patterns */
  patterns: string[];
  /** Final verdict based on thresholds */
  verdict: "safe" | "suspicious" | "rejected";
}

export interface ClassifierOptions {
  /** Score >= this => "rejected". Default 0.6 */
  rejectThreshold?: number;
  /** Score >= this => "suspicious". Default 0.3 */
  suspiciousThreshold?: number;
}

// ─── Pattern definition ──────────────────────────────────────────

interface PatternRule {
  /** Human-readable name surfaced in InjectionAssessment.patterns */
  name: string;
  /** Weight added to the raw score when this rule fires */
  weight: number;
  /** Either a RegExp or a custom test function (for non-regex checks) */
  test: RegExp | ((content: string) => boolean);
  /**
   * When true the pattern is only tested against lines that look like
   * standalone instructions (beginning of a line, possibly after whitespace
   * or a markdown list marker). This reduces false positives for patterns
   * like "act as a" which can appear in normal prose.
   */
  lineStart?: boolean;
}

// Helper: build a regex that only matches at the start of a line (after
// optional whitespace / markdown list markers).
function lineStartRe(core: string): RegExp {
  return new RegExp(`(?:^|\\n)\\s*(?:[-*>]\\s*)?${core}`, "i");
}

// ─── Pattern categories ──────────────────────────────────────────

const SYSTEM_PROMPT_OVERRIDES: PatternRule[] = [
  {
    name: "ignore-previous-instructions",
    weight: 0.3,
    test: /ignore\s+(all\s+)?previous\s+instructions/i,
  },
  {
    name: "forget-instructions",
    weight: 0.3,
    test: /forget\s+(all\s+)?(your\s+|prior\s+)?instructions/i,
  },
  {
    name: "disregard-instructions",
    weight: 0.3,
    test: /disregard\s+(all\s+)?(your\s+|above\s+)?instructions/i,
  },
  {
    name: "override-prompt",
    weight: 0.3,
    test: /override\s+(your\s+|system\s+)?prompt/i,
  },
  {
    name: "new-updated-instructions",
    weight: 0.3,
    test: /(?:new|updated)\s+instructions\s*:/i,
  },
];

const ROLEPLAY_ATTACKS: PatternRule[] = [
  {
    name: "you-are-now",
    weight: 0.25,
    test: lineStartRe("you\\s+are\\s+now\\s+"),
    lineStart: true,
  },
  {
    name: "pretend-to-be",
    weight: 0.25,
    test: lineStartRe("pretend\\s+(?:you\\s+are|to\\s+be)"),
    lineStart: true,
  },
  {
    name: "act-as",
    weight: 0.25,
    test: lineStartRe("act\\s+as\\s+(?:a\\s+|an\\s+)?"),
    lineStart: true,
  },
  {
    name: "from-now-on-you",
    weight: 0.25,
    test: /from\s+now\s+on,?\s+you/i,
  },
  {
    name: "imagine-you-are",
    weight: 0.25,
    test: lineStartRe("imagine\\s+you\\s+are"),
    lineStart: true,
  },
];

const DELIMITER_ESCAPES: PatternRule[] = [
  {
    name: "llama-inst-tag",
    weight: 0.2,
    test: /\[INST\]/i,
  },
  {
    name: "llama-inst-close-tag",
    weight: 0.2,
    test: /\[\/INST\]/i,
  },
  {
    name: "chatml-im-start",
    weight: 0.2,
    test: /<\|im_start\|>/i,
  },
  {
    name: "chatml-im-end",
    weight: 0.2,
    test: /<\|im_end\|>/i,
  },
  {
    name: "llama-sys-open",
    weight: 0.2,
    test: /<<SYS>>/i,
  },
  {
    name: "llama-sys-close",
    weight: 0.2,
    test: /<<\/SYS>>/i,
  },
  {
    name: "system-tag-bracket",
    weight: 0.2,
    test: /\[SYSTEM\]/i,
  },
  {
    name: "markdown-role-header",
    weight: 0.2,
    test: /###\s*(?:System|Human|Assistant)\s*:/i,
  },
];

const HIDDEN_INSTRUCTIONS: PatternRule[] = [
  {
    name: "long-base64-block",
    weight: 0.15,
    // A base64-encoded block longer than 100 chars (could hide instructions).
    // We look for runs of base64 characters (at least 100).
    test: (content: string): boolean => {
      // Match base64 runs of 100+ chars (letters, digits, +, /, =)
      const base64Run = /[A-Za-z0-9+/=]{100,}/;
      return base64Run.test(content);
    },
  },
  {
    name: "bidi-override-chars",
    weight: 0.15,
    // Unicode bidirectional override characters U+202A-U+202E, U+2066-U+2069
    test: /[\u202A-\u202E\u2066-\u2069]/,
  },
  {
    name: "zero-width-steganography",
    weight: 0.15,
    // Three or more zero-width characters in sequence (steganography carrier).
    // Individual ZW chars are caught by the sanitizer's invisible-char check
    // before we get here, but we keep this for defense-in-depth in case the
    // classifier is called independently.
    test: /(?:\u200B|\u200C|\u200D|\uFEFF){3,}/,
  },
  {
    name: "excessive-whitespace-encoding",
    weight: 0.15,
    // More than 20 consecutive spaces or tabs (could encode data)
    test: /[ \t]{21,}/,
  },
];

const DATA_EXFILTRATION: PatternRule[] = [
  {
    name: "send-data-pattern",
    weight: 0.2,
    test: /send\s+(?:this|the|all)\s+(?:to|via)\b/i,
  },
  {
    name: "output-to-endpoint",
    weight: 0.2,
    test: /output\s+(?:(?:to|the)\s+)+(?:following|this)\s+(?:url|endpoint|webhook)/i,
  },
  {
    name: "suspicious-url-in-code-block",
    weight: 0.2,
    // URLs in fenced code blocks that point to non-documentation-like hosts.
    // We detect http(s) URLs inside ``` blocks that don't look like typical
    // docs/example hosts (localhost, example.com, github, etc.).
    test: (content: string): boolean => {
      const codeBlockRe = /```[\s\S]*?```/g;
      const urlRe = /https?:\/\/([^\s/)"'`]+)/g;
      const safeHosts = [
        "localhost",
        "127.0.0.1",
        "example.com",
        "example.org",
        "github.com",
        "githubusercontent.com",
        "npmjs.com",
        "knowledgepulse.org",
        "openknowledgepulse.org",
        "schemas.openknowledgepulse.org",
      ];
      let block: RegExpExecArray | null = codeBlockRe.exec(content);
      while (block !== null) {
        let urlMatch: RegExpExecArray | null;
        // Reset the URL regex for each block
        urlRe.lastIndex = 0;
        urlMatch = urlRe.exec(block[0]);
        while (urlMatch !== null) {
          const host = (urlMatch[1]?.toLowerCase() ?? "").replace(/:\d+$/, "");
          if (!safeHosts.some((safe) => host === safe || host.endsWith(`.${safe}`))) {
            return true;
          }
          urlMatch = urlRe.exec(block[0]);
        }
        block = codeBlockRe.exec(content);
      }
      return false;
    },
  },
];

// ─── All rules combined ──────────────────────────────────────────

const ALL_RULES: PatternRule[] = [
  ...SYSTEM_PROMPT_OVERRIDES,
  ...ROLEPLAY_ATTACKS,
  ...DELIMITER_ESCAPES,
  ...HIDDEN_INSTRUCTIONS,
  ...DATA_EXFILTRATION,
];

/** Theoretical maximum raw score (all rules fire). */
const MAX_RAW_SCORE = ALL_RULES.reduce((sum, r) => sum + r.weight, 0);

// ─── Classifier ──────────────────────────────────────────────────

export function classifyInjectionRisk(
  content: string,
  options?: ClassifierOptions,
): InjectionAssessment {
  const rejectThreshold = options?.rejectThreshold ?? 0.6;
  const suspiciousThreshold = options?.suspiciousThreshold ?? 0.3;

  let rawScore = 0;
  const matched: string[] = [];

  for (const rule of ALL_RULES) {
    const hit = typeof rule.test === "function" ? rule.test(content) : rule.test.test(content);

    if (hit) {
      rawScore += rule.weight;
      matched.push(rule.name);
    }
  }

  // Normalise to 0-1 range
  const score = Math.min(rawScore / MAX_RAW_SCORE, 1);

  let verdict: InjectionAssessment["verdict"] = "safe";
  if (score >= rejectThreshold) {
    verdict = "rejected";
  } else if (score >= suspiciousThreshold) {
    verdict = "suspicious";
  }

  return {
    score: Math.round(score * 1000) / 1000, // three decimal places
    maxScore: MAX_RAW_SCORE,
    patterns: matched,
    verdict,
  };
}
