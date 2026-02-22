---
sidebar_position: 3
---

# Core Concepts

## KnowledgeUnit

A KnowledgeUnit is the fundamental data structure in KnowledgePulse. It represents a piece of knowledge captured from an AI agent's execution or a human expert's procedure, encoded in JSON-LD format.

Every KnowledgeUnit has:
- A `@context` pointing to `https://knowledgepulse.dev/schema/v1`
- A `@type` discriminator: `ReasoningTrace`, `ToolCallPattern`, or `ExpertSOP`
- A unique `id` with a type-specific prefix (e.g., `kp:trace:`, `kp:pattern:`, `kp:sop:`)
- A `metadata` object with quality score, visibility, privacy level, and timestamps

### ReasoningTrace

Captures the step-by-step reasoning of an AI agent solving a task, including thoughts, tool calls, observations, and error recovery.

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ReasoningTrace",
  "id": "kp:trace:550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "task_domain": "financial_analysis",
    "success": true,
    "quality_score": 0.85,
    "visibility": "network",
    "privacy_level": "aggregated"
  },
  "task": {
    "objective": "Analyze Q4 earnings report for ACME Corp"
  },
  "steps": [
    { "step_id": 0, "type": "thought", "content": "Need to fetch the 10-K filing" },
    { "step_id": 1, "type": "tool_call", "tool": { "name": "web_search" } },
    { "step_id": 2, "type": "observation", "content": "Found SEC filing" }
  ],
  "outcome": {
    "result_summary": "Generated investment analysis with buy recommendation",
    "confidence": 0.82
  }
}
```

### ToolCallPattern

Describes a reusable pattern of tool calls that work well for specific task types.

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ToolCallPattern",
  "id": "kp:pattern:660e8400-e29b-41d4-a716-446655440000",
  "name": "SEC Filing Analysis",
  "description": "Optimal tool sequence for analyzing SEC filings",
  "trigger_conditions": {
    "task_types": ["financial_analysis", "sec_filing"]
  },
  "tool_sequence": [
    {
      "step": "fetch",
      "execution": "parallel",
      "tools": [{ "name": "web_search" }, { "name": "web_fetch" }]
    }
  ],
  "performance": {
    "avg_ms": 3200,
    "success_rate": 0.94,
    "uses": 127
  }
}
```

### ExpertSOP

Encodes a human expert's standard operating procedure in a machine-executable format.

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ExpertSOP",
  "id": "kp:sop:770e8400-e29b-41d4-a716-446655440000",
  "name": "Customer Escalation Procedure",
  "domain": "customer_service",
  "source": {
    "type": "human_expert",
    "expert_id": "expert-jane",
    "credentials": ["kp:sbt:customer-service-cert"]
  },
  "decision_tree": [
    {
      "step": "assess",
      "instruction": "Determine severity level from customer message",
      "conditions": {
        "high": { "action": "Escalate to senior agent", "sla_min": 5 },
        "low": { "action": "Apply standard resolution template" }
      }
    }
  ]
}
```

## SKILL.md

SKILL.md is an open standard for defining AI agent skills as Markdown files with YAML frontmatter. KnowledgePulse is fully compatible with SKILL.md and extends it with optional `kp:` fields.

### Standard Fields

```yaml
---
name: my-skill              # Required: skill name
description: What it does   # Required: skill description
version: 1.0.0             # Optional: SemVer version
author: user@example.com   # Optional: author
license: Apache-2.0        # Optional: license identifier
tags: [web, search]         # Optional: tags for discovery
allowed-tools: [web_search] # Optional: tools this skill can use
---
```

### KP Extension Fields

```yaml
---
name: my-skill
description: What it does
kp:
  knowledge_capture: true      # Enable auto-capture (default: false)
  domain: financial_analysis   # Knowledge domain classification
  quality_threshold: 0.75      # Minimum quality score to contribute (default: 0.75)
  privacy_level: aggregated    # aggregated | federated | private
  visibility: network          # private | org | network
  reward_eligible: true        # Eligible for KP-REP rewards (default: true)
---
```

The `kp:` extension is backward-compatible — non-KP tools simply ignore the extra fields.

## Visibility Tiers

| Tier | Scope | Use Case |
|------|-------|----------|
| `private` | Only the contributing agent | Personal knowledge base |
| `org` | Members of the same organization | Team knowledge sharing |
| `network` | All KnowledgePulse users | Open community knowledge |

## Privacy Levels

| Level | Description |
|-------|-------------|
| `aggregated` | Local extraction of abstract patterns; raw conversation not uploaded |
| `federated` | Only model gradients shared via federated learning |
| `private` | Knowledge stays local, not shared with registry |

## KP-REP Reputation

KP-REP is a non-transferable reputation score that tracks contributions:

| Action | Score Change |
|--------|-------------|
| Register | +0.1 (one-time) |
| Contribute knowledge | +0.2 |
| Contribute skill | +0.1 |
| Validate a unit | +0.05 |

Reputation is used for rate-limit tier assignment and trust scoring.

## Quality Scoring

Knowledge is scored on 4 dimensions before being accepted into the network:

1. **Complexity** (25%) — step diversity, error recovery, trace length
2. **Novelty** (35%) — semantic similarity to existing knowledge (via embeddings)
3. **Tool Diversity** (15%) — variety of tools used in the trace
4. **Outcome Confidence** (25%) — reported confidence weighted by success

See the [scoring documentation](../sdk/scoring.md) for the full algorithm.
