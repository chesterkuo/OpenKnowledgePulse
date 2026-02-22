---
sidebar_position: 5
title: Scoring Algorithm
description: Full 4-factor composite scoring model with domain-specific weight profiles, rule-based overrides, temporal decay, and performance constraints.
---

# Scoring Algorithm

The KnowledgePulse scoring engine evaluates reasoning traces using a composite formula that combines four independent quality dimensions. In Phase 2, the engine introduces **domain-specific weight profiles** that tailor the scoring emphasis to different task domains, and enforces a **100ms performance budget** per evaluation.

## Composite Formula

The overall quality score is computed as a weighted sum of four normalized dimensions:

```
score = C × wC + N × wN + D × wD + O × wO
```

Where:

| Symbol | Dimension | Range |
|--------|-----------|-------|
| C | Complexity | 0.0 -- 1.0 |
| N | Novelty | 0.0 -- 1.0 |
| D | Tool Diversity | 0.0 -- 1.0 |
| O | Outcome Confidence | 0.0 -- 1.0 |

The weights (wC, wN, wD, wO) vary by domain. They always sum to 1.0.

## Domain-Specific Weight Profiles

Different task domains prioritize different quality signals. A finance trace benefits most from high outcome confidence, while a coding trace benefits from diverse tool usage. The scoring engine selects the weight profile automatically based on `metadata.task_domain`.

### Available Profiles

| Domain | wC (Complexity) | wN (Novelty) | wD (Tool Diversity) | wO (Outcome) |
|--------|:-:|:-:|:-:|:-:|
| **default** | 0.25 | 0.35 | 0.15 | 0.25 |
| **finance** | 0.20 | 0.25 | 0.10 | 0.45 |
| **code** | 0.20 | 0.30 | 0.30 | 0.20 |
| **medical** | 0.15 | 0.20 | 0.10 | 0.55 |
| **customer_service** | 0.20 | 0.30 | 0.20 | 0.30 |

### Design Rationale

- **Finance** heavily weights outcome confidence because financial analysis demands accurate, verifiable conclusions.
- **Code** heavily weights tool diversity because effective coding agents leverage multiple tools (linters, type checkers, test runners).
- **Medical** has the highest outcome confidence weight (0.55) because correctness is critical in medical reasoning.
- **Customer service** balances novelty and outcome confidence, rewarding creative yet effective problem resolution.

### Using Domain Profiles

Domain selection happens automatically through the trace metadata:

```ts
import { evaluateValue } from "@knowledgepulse/sdk";
import type { ReasoningTrace } from "@knowledgepulse/sdk";

const trace: ReasoningTrace = {
  "@context": "https://openknowledgepulse.org/schema/v1",
  "@type": "ReasoningTrace",
  id: "kp:trace:finance-demo-001",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "finance", // ← selects finance weight profile
    success: true,
    quality_score: 0,
    visibility: "network",
    privacy_level: "aggregated",
  },
  task: { objective: "Analyze TSMC Q4 earnings report" },
  steps: [
    { step_id: 0, type: "thought", content: "Extracting revenue and margin data" },
    { step_id: 1, type: "tool_call", tool: { name: "financial_data_api" }, input: { ticker: "TSM" } },
    { step_id: 2, type: "observation", content: "Revenue: $26.3B, up 14.3% YoY" },
    { step_id: 3, type: "tool_call", tool: { name: "comparison_tool" }, input: { metric: "gross_margin" } },
    { step_id: 4, type: "observation", content: "Gross margin 57.9%, above industry average" },
  ],
  outcome: {
    result_summary: "Strong quarterly performance driven by AI chip demand",
    confidence: 0.92,
  },
};

const score = await evaluateValue(trace);
// With finance weights, high outcome confidence (0.92) contributes more
console.log(score); // e.g. 0.78
```

If the domain does not match any registered profile, the **default** weights are used. Unknown domains are silently handled -- no error is thrown.

## Rule-Based Overrides

After computing the weighted composite score, three deterministic overrides are applied in order:

### 1. Single-Step Penalty

```ts
if (steps.length === 1 && steps[0].type === "thought") score = 0.1;
```

A trace with a single thought-only step has minimal knowledge value. The score is forced to `0.1` regardless of other factors.

### 2. Error-Recovery Bonus

```ts
if (errorRecovery > 2 && metadata.success) score = Math.min(1.0, score + 0.1);
```

Traces that recover from more than 2 errors and still succeed demonstrate valuable resilience. A `+0.1` bonus is added, capped at `1.0`.

### 3. Zero-Diversity Penalty

```ts
if (uniqueTools <= 1 && steps.some(s => s.tool)) score = Math.max(0.0, score - 0.1);
```

If a trace uses tools but only one unique tool, a `-0.1` penalty is applied, floored at `0.0`. This encourages diverse tool usage.

:::note
The single-step penalty takes precedence. If a trace has exactly one thought step, the score is set to `0.1` first. The error-recovery bonus and zero-diversity penalty then apply on top of that value if their conditions are also met.
:::

## Temporal Decay for Novelty

The novelty dimension uses embedding-based similarity against a local vector cache. As the cache accumulates traces over time, the novelty score for semantically similar traces naturally decreases. This creates an implicit temporal decay effect:

1. Fresh trace in an empty cache: novelty defaults to `0.5`.
2. New unique trace: novelty approaches `1.0` (low similarity to existing vectors).
3. Repeated trace pattern: novelty approaches `0.0` (high similarity to cached vectors).

The vector cache supports TTL-based eviction (introduced in Phase 2), so cached entries expire after a configurable time window. This ensures that a topic revisited after the TTL period regains a higher novelty score.

```ts
import { VectorCache } from "@knowledgepulse/sdk";

const cache = new VectorCache({
  maxElements: 1000,
  dimensions: 384,
  ttlMs: 3600000, // 1 hour — entries expire after this
});
```

## Performance Budget

The scoring function is designed to complete within **100ms** for typical traces. Key implementation choices that support this constraint:

| Component | Strategy | Latency |
|-----------|----------|---------|
| Vector cache | Brute-force linear scan over 1,000 vectors | < 1ms |
| Embedder | Lazy-loaded, cached after first invocation | ~50ms first call, ~5ms subsequent |
| Composite calculation | Pure arithmetic, no I/O | < 0.1ms |
| Rule overrides | Three conditional checks | < 0.01ms |

If the optional embedder (`@huggingface/transformers`) is not installed, novelty defaults to `0.5` and the entire evaluation runs in under 1ms.

## Scoring Interface

```ts
interface ScoringWeights {
  complexity: number;
  novelty: number;
  toolDiversity: number;
  outcomeConfidence: number;
}

function evaluateValue(trace: ReasoningTrace): Promise<number>;
```

The function returns a `Promise<number>` between `0.0` and `1.0`. It is stateful across invocations within the same process because the local vector cache persists for novelty calculations.

## Example: Comparing Domain Profiles

The same trace evaluated under different domains produces different scores due to weight differences:

```ts
// Same trace structure, different task_domain values
const domains = ["default", "finance", "code", "medical", "customer_service"];

for (const domain of domains) {
  const trace = createTrace({ task_domain: domain });
  const score = await evaluateValue(trace);
  console.log(`${domain}: ${score.toFixed(3)}`);
}

// Example output (varies by trace content):
// default:          0.623
// finance:          0.714  (high confidence rewarded)
// code:             0.598  (tool diversity emphasized)
// medical:          0.751  (confidence dominates)
// customer_service: 0.645  (balanced)
```
