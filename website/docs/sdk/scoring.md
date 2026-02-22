---
sidebar_position: 4
title: Scoring
description: How the KnowledgePulse SDK evaluates the value of reasoning traces using a multi-dimensional scoring algorithm.
---

# Scoring

The SDK includes a value scoring function that evaluates how useful a `ReasoningTrace` is before it is contributed to the network. This determines whether a trace meets the quality threshold for sharing.

## `evaluateValue(trace)`

```ts
function evaluateValue(trace: ReasoningTrace): Promise<number>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `trace` | `ReasoningTrace` | A complete reasoning trace to evaluate |

**Returns:** `Promise<number>` -- a quality score between `0.0` and `1.0`.

**Example:**

```ts
import { evaluateValue } from "@knowledgepulse/sdk";
import type { ReasoningTrace } from "@knowledgepulse/sdk";

const trace: ReasoningTrace = {
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ReasoningTrace",
  id: "kp:trace:550e8400-e29b-41d4-a716-446655440000",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "code-review",
    success: true,
    quality_score: 0,
    visibility: "network",
    privacy_level: "aggregated",
  },
  task: { objective: "Review PR #42 for security issues" },
  steps: [
    { step_id: 0, type: "thought", content: "Analyzing diff for injection vectors" },
    { step_id: 1, type: "tool_call", tool: { name: "github_pr_read" }, input: { pr: 42 } },
    { step_id: 2, type: "observation", content: "Found unsanitized SQL in handler.ts" },
    { step_id: 3, type: "tool_call", tool: { name: "static_analysis" }, input: { file: "handler.ts" } },
    { step_id: 4, type: "observation", content: "Confirmed SQL injection vulnerability" },
  ],
  outcome: {
    result_summary: "Identified 1 critical SQL injection vulnerability",
    confidence: 0.95,
  },
};

const score = await evaluateValue(trace);
console.log(score); // e.g. 0.72
```

## Scoring Dimensions

The composite score is a weighted average of four independent dimensions:

| Dimension | Weight | Range | Description |
|-----------|--------|-------|-------------|
| Complexity (C) | 25% | 0.0 - 1.0 | How structurally rich the trace is |
| Novelty (N) | 35% | 0.0 - 1.0 | How different the trace is from previously seen traces |
| Tool Diversity (D) | 15% | 0.0 - 1.0 | Variety of tools used relative to step count |
| Outcome Confidence (O) | 25% | 0.0 - 1.0 | Confidence in the result, adjusted for success |

```
score = C * 0.25 + N * 0.35 + D * 0.15 + O * 0.25
```

### Complexity (C)

Measures the structural richness of the reasoning trace based on step type variety, error recovery, and trace length.

```
C = min(1.0, (uniqueTypes / 4) * 0.5 + (errorRecovery > 0 ? 0.3 : 0) + (steps.length / 20) * 0.2)
```

| Factor | Contribution | Description |
|--------|-------------|-------------|
| Unique step types | up to 0.50 | Number of distinct step types (`thought`, `tool_call`, `observation`, `error_recovery`) divided by 4 |
| Error recovery | 0.00 or 0.30 | Bonus if the trace contains at least one `error_recovery` step |
| Step count | up to 0.20 | Number of steps divided by 20 (longer traces score higher, capped at 20) |

### Novelty (N)

Measures how different a trace is from previously scored traces using embedding-based similarity.

- **Embedding model:** `Xenova/all-MiniLM-L6-v2` (384 dimensions)
- **Input text:** task objective concatenated with all step contents
- **Comparison:** cosine similarity against all vectors in the local cache
- **Formula:** `N = 1.0 - maxCosineSimilarity(embedding, cache)`

If the `@huggingface/transformers` package is not installed, the novelty dimension **falls back to `0.5`** (the midpoint). This ensures scoring still works without the optional dependency, albeit with reduced discrimination on novelty.

When the local cache is empty (first trace scored in a session), novelty also defaults to `0.5`.

### Tool Diversity (D)

Measures the variety of distinct tools used in the trace.

```
D = min(1.0, (uniqueTools / max(1, steps.length)) * 3)
```

The multiplier of 3 means that a trace where one-third of steps use different tools will achieve the maximum score. This rewards traces that leverage multiple tools without penalizing long sequences of tool calls.

### Outcome Confidence (O)

Reflects the agent's self-reported confidence, adjusted by whether the task actually succeeded.

```
O = outcome.confidence * (metadata.success ? 1.0 : 0.3)
```

Failed tasks have their confidence multiplied by 0.3, significantly reducing the outcome dimension score.

## Rule-Based Overrides

After computing the weighted composite score, three rule-based adjustments are applied in order:

| Condition | Effect | Rationale |
|-----------|--------|-----------|
| Single thought-only step | Score set to `0.1` | A trace with one thought step has minimal value |
| More than 2 error recoveries and `success: true` | Score increased by `+0.1` (capped at 1.0) | Successful recovery from multiple errors is highly valuable |
| 1 or fewer unique tools (when tools are used) | Score decreased by `-0.1` (floored at 0.0) | Low tool diversity in tool-using traces is penalized |

```ts
// Single thought-only step
if (steps.length === 1 && steps[0].type === "thought") score = 0.1;

// Successful multi-error recovery
if (errorRecovery > 2 && metadata.success) score = min(1.0, score + 0.1);

// Low tool diversity
if (uniqueTools <= 1 && steps.some(s => s.tool)) score = max(0.0, score - 0.1);
```

:::note
The single-thought override takes precedence: if a trace has exactly one thought step, the score is set to `0.1` regardless of other factors. The subsequent overrides then apply on top of that value if their conditions are also met.
:::

## Internal Vector Cache

The scoring module maintains an internal `VectorCache` instance for computing novelty across invocations within the same process.

| Property | Value |
|----------|-------|
| Max elements | 1,000 |
| Dimensions | 384 |
| Algorithm | Brute-force linear scan |
| Eviction | Oldest-first when over capacity |

The cache is designed for the common case of scoring traces in a single agent session. At 1,000 vectors of 384 dimensions each, the memory footprint is approximately 1.5 MB and a full scan completes in under 1 ms.

The `VectorCache` class is also exported from the SDK for advanced use cases:

```ts
import { VectorCache } from "@knowledgepulse/sdk";

const cache = new VectorCache({ maxElements: 500, dimensions: 384 });

cache.add(new Float32Array(384));           // Add a vector
const sim = cache.maxCosineSimilarity(q);   // Query max similarity
console.log(cache.size);                     // Number of stored vectors
cache.clear();                               // Reset the cache
```

## Scoring Without the Embedder

If you do not install `@huggingface/transformers`, the scoring function still works. The novelty dimension defaults to `0.5`, and the final score is computed from the remaining three dimensions plus the fixed novelty midpoint:

```
score = C * 0.25 + 0.5 * 0.35 + D * 0.15 + O * 0.25
       = C * 0.25 + 0.175 + D * 0.15 + O * 0.25
```

This is suitable for development and testing but provides less discriminating scores in production. For best results, install the optional dependency:

```bash
bun add @huggingface/transformers
```
