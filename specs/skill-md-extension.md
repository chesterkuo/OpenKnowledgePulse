# SKILL.md KnowledgePulse Extension Specification

## Overview

KnowledgePulse extends the standard SKILL.md format with optional `kp:` fields in the YAML frontmatter. These fields are ignored by tools that do not support them, maintaining full backward compatibility with SkillsMP, SkillHub, Smithery, and Claude Code.

## Extension Fields

All KnowledgePulse extension fields are nested under the `kp:` key in the SKILL.md frontmatter.

### `kp.knowledge_capture` (boolean, optional)

When `true`, executing this skill triggers automatic KnowledgeUnit extraction via the KPCapture engine. Default: `false`.

### `kp.domain` (string, optional)

Knowledge domain classification for this skill. Used for search filtering and quality scoring context. Example: `"financial_analysis"`, `"customer_service"`, `"devops"`.

### `kp.quality_threshold` (number, optional)

Minimum quality score (0.0–1.0) for a captured trace to be contributed to the registry. Default: `0.75`.

### `kp.privacy_level` (enum, optional)

Data sharing mode for captured knowledge:
- `"aggregated"` — Local extraction of abstract patterns; raw conversation not uploaded (default)
- `"federated"` — Only model gradients shared via Flower framework
- `"private"` — Knowledge stays local, not shared

### `kp.visibility` (enum, optional)

Who can discover and use the contributed knowledge:
- `"private"` — Only the contributing agent
- `"org"` — Members of the same organization
- `"network"` — All KnowledgePulse users (default)

### `kp.reward_eligible` (boolean, optional)

Whether contributions from this skill are eligible for KP-REP reputation rewards. Default: `true`.

## Example

```yaml
---
name: financial-report-analyzer
description: Analyze quarterly financial reports and generate investment recommendations
version: 1.2.0
author: chester@plusblocks.ai
license: Apache-2.0
tags: [finance, analysis, reporting]
allowed-tools: [web_search, web_fetch, code_execution]
kp:
  knowledge_capture: true
  domain: financial_analysis
  quality_threshold: 0.75
  privacy_level: aggregated
  visibility: network
  reward_eligible: true
---

# Financial Report Analysis Skill

## When to Use
Activate when users request financial report analysis, investment recommendations, or peer financial comparisons.
```

## Compatibility

- Tools that do not recognize the `kp:` key will ignore it per YAML parsing behavior
- The presence of `kp:` fields does not affect standard SKILL.md functionality
- All `kp:` fields are optional; a SKILL.md without them is fully valid
