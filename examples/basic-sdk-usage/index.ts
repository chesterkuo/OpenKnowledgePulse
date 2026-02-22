/**
 * KnowledgePulse SDK — Basic Usage Example
 *
 * Demonstrates KPCapture and KPRetrieval.
 * Run: bun run examples/basic-sdk-usage/index.ts
 */
import { KPCapture, KPRetrieval, validateSkillMd } from "@knowledgepulse/sdk";

// ── 1. Knowledge Capture ───────────────────────────────

const capture = new KPCapture({
  domain: "financial_analysis",
  visibility: "network",
  valueThreshold: 0.75,
  registryUrl: "http://localhost:3000",
});

// Wrap an existing agent function
async function myAgentFn(query: string): Promise<string> {
  // Simulate agent work
  return `Analysis result for: ${query}`;
}

const wrappedAgent = capture.wrap(myAgentFn);

// Use as normal — knowledge captured automatically
const result = await wrappedAgent("Analyze TSMC Q4 2025 report");
console.log("Agent result:", result);

// ── 2. Knowledge Retrieval ─────────────────────────────

const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:3000",
  minQuality: 0.8,
  limit: 5,
});

try {
  const knowledge = await retrieval.search("financial analysis techniques");
  console.log("Found knowledge units:", knowledge.length);

  for (const unit of knowledge) {
    console.log(`  [${unit["@type"]}] ${unit.id}`);
    console.log(`    Few-shot:\n${retrieval.toFewShot(unit).slice(0, 200)}...`);
  }
} catch (_e) {
  console.log("Registry not available — run 'bun run registry/src/index.ts' first");
}

// ── 3. SKILL.md Validation ─────────────────────────────

const skillMd = `---
name: example-skill
description: A demo skill for KnowledgePulse
version: 1.0.0
tags: [demo, example]
kp:
  knowledge_capture: true
  domain: general
  quality_threshold: 0.7
---

# Example Skill

This is a demo skill showing KnowledgePulse integration.
`;

const validation = validateSkillMd(skillMd);
console.log("\nSKILL.md validation:", validation.valid ? "PASS" : "FAIL");
if (validation.errors.length > 0) {
  console.log("  Issues:", validation.errors);
}
