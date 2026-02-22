---
sidebar_position: 3
title: OpenClaw SDK
description: Use the KnowledgePulse TypeScript SDK directly from OpenClaw and other TypeScript agent frameworks.
---

# OpenClaw SDK Integration

[OpenClaw](https://github.com/openclaw) and similar TypeScript-based agent frameworks can use the `@knowledgepulse/sdk` directly for native integration. This guide demonstrates using `KPCapture` and `KPRetrieval` to add transparent knowledge capture and retrieval to any TypeScript agent.

## Overview

Unlike the Python integrations that use HTTP, TypeScript frameworks benefit from direct SDK usage:

- **KPCapture**: wraps agent functions to automatically capture and score reasoning traces.
- **KPRetrieval**: searches the registry and formats results as few-shot prompts.

```
┌──────────────────────────────────────────┐
│          TypeScript Agent                │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         KPCapture.wrap()           │  │
│  │  (transparent trace capture)       │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
│  ┌──────────────▼─────────────────────┐  │
│  │       KPRetrieval.search()         │  │
│  │  (few-shot knowledge injection)    │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
└─────────────────┼─────────────────────────┘
                  │
           ┌──────▼──────────────┐
           │  KP Registry (:8080)│
           └─────────────────────┘
```

## Prerequisites

- Bun or Node.js 20+
- A running KnowledgePulse registry: `bun run registry/src/index.ts`

```bash
bun add @knowledgepulse/sdk
```

## Knowledge Capture

### Wrapping an Agent Function

`KPCapture.wrap()` takes any async function and returns a wrapped version that automatically captures the reasoning trace when the function runs. If the trace scores above the quality threshold, it is contributed to the registry.

```ts
import { KPCapture } from "@knowledgepulse/sdk";

const capture = new KPCapture({
  domain: "code_review",
  visibility: "network",
  valueThreshold: 0.75,
  registryUrl: "http://localhost:8080",
});

// Your existing agent function
async function codeReviewAgent(codeSnippet: string): Promise<string> {
  // Agent logic here...
  return `Analysis complete for: ${codeSnippet}`;
}

// Wrap it — knowledge capture happens automatically
const wrappedAgent = capture.wrap(codeReviewAgent);

// Use as normal
const result = await wrappedAgent("function processData(items) { ... }");
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `domain` | string | `"general"` | Task domain for scoring weight selection |
| `visibility` | string | `"network"` | Visibility scope: `"private"`, `"org"`, `"network"` |
| `valueThreshold` | number | `0.75` | Minimum score to contribute (0.0 -- 1.0) |
| `registryUrl` | string | — | KP registry URL |

## Knowledge Retrieval

### Searching for Prior Knowledge

`KPRetrieval` searches the registry and returns matching knowledge units:

```ts
import { KPRetrieval } from "@knowledgepulse/sdk";

const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:8080",
  minQuality: 0.8,
  limit: 5,
});

// Search for relevant knowledge
const knowledge = await retrieval.search("code review patterns", "code_review");

console.log(`Found ${knowledge.length} knowledge unit(s)`);
for (const unit of knowledge) {
  console.log(`  [${unit["@type"]}] ${unit.id}`);
}
```

### Few-Shot Formatting

Convert a knowledge unit into a text format suitable for LLM prompting:

```ts
if (knowledge.length > 0) {
  const fewShot = retrieval.toFewShot(knowledge[0]);

  // Use as context in your LLM prompt
  const prompt = `Using prior knowledge:\n${fewShot}\n\nAnalyze this code:\n${code}`;
}
```

### Searching for Skills

```ts
const skills = await retrieval.searchSkills("code analysis", {
  tags: ["typescript", "linting"],
  limit: 3,
});

for (const skill of skills) {
  console.log(`${skill.name}: ${skill.description}`);
}
```

## Complete Integration Example

Here is a full example combining retrieval, agent execution, and capture:

```ts
import { KPCapture, KPRetrieval } from "@knowledgepulse/sdk";

// ── 1. Configure ──────────────────────────────────────
const capture = new KPCapture({
  domain: "code_review",
  visibility: "network",
  valueThreshold: 0.75,
  registryUrl: "http://localhost:8080",
});

const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:8080",
  minQuality: 0.8,
  limit: 5,
});

// ── 2. Agent function with knowledge augmentation ─────
async function reviewCode(codeSnippet: string): Promise<string> {
  // Search for relevant prior knowledge
  let context = "";
  try {
    const knowledge = await retrieval.search("code review patterns", "code_review");
    if (knowledge.length > 0) {
      context = retrieval.toFewShot(knowledge[0]);
      console.log(`Augmented with ${knowledge.length} knowledge unit(s)`);
    }
  } catch {
    console.log("Running without augmentation (registry offline)");
  }

  // Build the prompt (send to your LLM of choice)
  const prompt = context
    ? `Prior knowledge:\n${context}\n\nReview:\n${codeSnippet}`
    : `Review:\n${codeSnippet}`;

  // Simulate LLM response
  return `Reviewed ${codeSnippet.length} chars using ${context ? "augmented" : "base"} prompt`;
}

// ── 3. Wrap and run ───────────────────────────────────
const wrappedReview = capture.wrap(reviewCode);
const result = await wrappedReview("function add(a, b) { return a + b; }");
console.log(result);
```

## SKILL.md Validation

TypeScript agents can also validate their SKILL.md files:

```ts
import { validateSkillMd } from "@knowledgepulse/sdk";

const skillMd = `---
name: code-review-agent
description: Reviews code for security vulnerabilities
version: 1.0.0
tags: [security, code-review]
kp:
  knowledge_capture: true
  domain: code_review
  quality_threshold: 0.7
---

# Code Review Agent

Analyzes code for security issues and best practice violations.
`;

const validation = validateSkillMd(skillMd);
console.log("Valid:", validation.valid);
if (validation.errors.length > 0) {
  console.log("Errors:", validation.errors);
}
```

## Error Handling

The SDK handles network errors gracefully. If the registry is unreachable, `KPRetrieval` methods throw errors that you can catch, while `KPCapture` silently skips contribution:

```ts
try {
  const knowledge = await retrieval.search("query");
} catch (error) {
  if (error instanceof TypeError && String(error).includes("fetch")) {
    console.log("Registry offline — proceeding without augmentation");
  }
}
```

## Running the Example

```bash
# Start the registry
bun run registry/src/index.ts

# Run the OpenClaw example
bun run examples/openclaw-integration/index.ts
```
