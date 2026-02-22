/**
 * KnowledgePulse — OpenClaw Integration Example
 *
 * Demonstrates using the @knowledgepulse/sdk directly from a TypeScript
 * agent framework. Shows capture wrapping, retrieval with few-shot
 * formatting, and graceful error handling when the registry is offline.
 *
 * Run: bun run examples/openclaw-integration/index.ts
 *
 * Prerequisites:
 *   Start the registry: bun run registry/src/index.ts
 */

import { KPCapture, KPRetrieval } from "@knowledgepulse/sdk";

// ── 1. Configure Knowledge Capture ──────────────────────────

const capture = new KPCapture({
  domain: "code_review",
  visibility: "network",
  valueThreshold: 0.75,
  registryUrl: "http://localhost:8080",
});

// ── 2. Configure Knowledge Retrieval ────────────────────────

const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:8080",
  minQuality: 0.8,
  limit: 5,
});

// ── 3. Agent function ───────────────────────────────────────

/**
 * Simulates an OpenClaw agent that reviews code.
 * Before performing its task, it searches KnowledgePulse for
 * relevant prior knowledge and injects it as few-shot context.
 */
async function codeReviewAgent(codeSnippet: string): Promise<string> {
  // Search for relevant knowledge to augment the agent
  let fewShotContext = "";
  try {
    const knowledge = await retrieval.search("code review patterns", "code_review");
    if (knowledge.length > 0) {
      console.log(`  Found ${knowledge.length} relevant knowledge unit(s)`);
      // Format the best result as few-shot text for LLM prompting
      fewShotContext = retrieval.toFewShot(knowledge[0]);
      console.log(`  Few-shot preview: ${fewShotContext.slice(0, 120)}...`);
    }
  } catch {
    console.log("  No prior knowledge available (registry offline)");
  }

  // Simulate the agent performing its task
  const prompt = fewShotContext
    ? `Using prior knowledge:\n${fewShotContext}\n\nCheck this code:\n${codeSnippet}`
    : `Check this code:\n${codeSnippet}`;

  // In a real integration, you would send `prompt` to an LLM here.
  // For this demo, we return a simulated result.
  return `Analysis complete for snippet (${codeSnippet.length} chars). ` +
    `Used ${fewShotContext ? "augmented" : "base"} prompt (${prompt.length} chars).`;
}

// ── 4. Wrap with auto-capture ───────────────────────────────

// Wrapping the agent function enables transparent knowledge capture.
// When the agent runs, its reasoning trace is automatically scored
// and contributed to the registry if it exceeds the quality threshold.
const wrappedAgent = capture.wrap(codeReviewAgent);

// ── 5. Main ─────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("KnowledgePulse + OpenClaw Integration Example");
  console.log("=".repeat(50));

  const sampleCode = `
function processData(items: unknown[]): string[] {
  return items.filter(Boolean).map(String);
}
  `.trim();

  try {
    // Run the wrapped agent — capture happens automatically
    console.log("\nRunning code analysis agent...");
    const result = await wrappedAgent(sampleCode);
    console.log(`\nResult: ${result}`);

    // Also demonstrate a standalone skill search
    console.log("\nSearching for skills...");
    const skills = await retrieval.searchSkills("code analysis", {
      tags: ["typescript", "linting"],
      limit: 3,
    });
    console.log(`Found ${skills.length} skill(s)`);
  } catch (error) {
    // Graceful handling when the registry is not running
    if (error instanceof TypeError && String(error).includes("fetch")) {
      console.log("\nRegistry not available — run 'bun run registry/src/index.ts' first");
    } else {
      console.error("\nUnexpected error:", error);
    }
  }
}

main();
