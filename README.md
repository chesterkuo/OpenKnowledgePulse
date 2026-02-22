<div align="center">

**English** | [简体中文](README.zh-Hans.md)

<!-- Octo animated banner (SMIL animation, works on GitHub) -->
<img src="assets/octo-banner.svg" alt="KnowledgePulse Octo Banner" width="800"/>

<h1>KnowledgePulse</h1>
<p><strong>Open AI Knowledge Sharing Protocol &mdash; SKILL.md Compatible</strong></p>

<!-- Badge row -->
<img src="https://img.shields.io/badge/license-Apache%202.0-18A06A?style=flat" alt="License"/>
<img src="https://img.shields.io/badge/runtime-Bun-E07A20?style=flat&logo=bun" alt="Runtime"/>
<img src="https://img.shields.io/badge/protocol-MCP%20ready-12B5A8?style=flat" alt="MCP"/>
<img src="https://img.shields.io/badge/SKILL.md-compatible-1E7EC8?style=flat" alt="SKILL.md"/>
<img src="https://img.shields.io/badge/tests-639%20passing-18A06A?style=flat" alt="Tests"/>
<img src="https://img.shields.io/github/stars/chesterkuo/OpenKnowledgePulse?style=flat&color=E07A20" alt="Stars"/>

<a href="https://openknowledgepulse.org"><strong>Website</strong></a> · <a href="https://openknowledgepulse.org/docs/getting-started/introduction"><strong>Docs</strong></a> · <a href="https://github.com/chesterkuo/OpenKnowledgePulse"><strong>GitHub</strong></a>

</div>

---

KnowledgePulse lets AI agents and human experts share problem-solving experience -- reasoning chains, tool call patterns, and standard operating procedures -- across frameworks and organizations, while protecting data privacy and intellectual property.

Built on a **dual-layer architecture**:

- **Layer 1** -- Fully compatible with the existing SKILL.md open standard (SkillsMP 200,000+ skills)
- **Layer 2** -- Dynamic knowledge layer where agent execution experience automatically becomes shareable, verifiable, incentivized KnowledgeUnits

> Think of it as **Tesla Fleet Learning for AI agents**: one agent discovers a financial analysis technique, and it automatically becomes a shared asset for the entire ecosystem.

## Features

| Module | Description |
|--------|-------------|
| **Skill Registry** | Semantic + BM25 hybrid search, one-click install to `~/.claude/skills/` |
| **Knowledge Capture** | Auto-extract reasoning traces from agent execution (zero config) |
| **Knowledge Retrieval** | Semantic search + few-shot injection API for downstream agents |
| **Expert SOP Studio** | Visual decision tree editor for human expert SOPs |
| **Knowledge Marketplace** | Free / org-gated / subscription / pay-per-use knowledge exchange |
| **KP-REP Reputation** | Soulbound reputation system with verifiable credentials (Ed25519) |

## Quick Start

### Install

```bash
# CLI tool
bun add -g @knowledgepulse/cli

# TypeScript SDK
bun add @knowledgepulse/sdk

# MCP Server
bun add @knowledgepulse/mcp
```

### Search & Install Skills

```bash
# Search for skills
kp search "financial analysis"

# Install skill (auto-generates SKILL.md to ~/.claude/skills/)
kp install financial-report-analyzer

# Validate SKILL.md format
kp validate ./my-skill.md
```

### Enable Knowledge Capture (TypeScript)

```typescript
import { KPCapture } from "@knowledgepulse/sdk";

const capture = new KPCapture({
  domain: "financial_analysis",
  visibility: "network",
  valueThreshold: 0.75,
});

// Wrap your existing agent -- knowledge is shared automatically
const wrappedAgent = capture.wrap(yourExistingAgentFn);
const result = await wrappedAgent("Analyze TSMC Q4 2025 earnings");
```

### Python Frameworks via MCP (No Python SDK Needed)

```python
# LangGraph / CrewAI / AutoGen access KnowledgePulse via MCP HTTP
mcp_config = {
    "knowledgepulse": {
        "url": "https://registry.knowledgepulse.dev/mcp",
        "transport": "http"
    }
}

# Agent can call KP MCP tools directly
result = agent.run(
    "Analyze earnings report",
    tools=["kp_search_skill", "kp_search_knowledge"]
)
```

### Self-Host the Registry

```bash
git clone https://github.com/chesterkuo/OpenKnowledgePulse
cd knowledgepulse
bun install
bun run registry/src/index.ts
# Registry API: http://localhost:8080
```

## Architecture

```
+-------------------------------------------------------------------+
|                    KnowledgePulse Protocol Stack                   |
+-------------------------------------------------------------------+
|  Layer 5: Governance & Incentive                                  |
|           KP-REP Reputation SBT . Quality Verification            |
+-------------------------------------------------------------------+
|  Layer 4: Privacy & Security                                      |
|           Aggregated Sharing . Differential Privacy . ACL         |
+-------------------------------------------------------------------+
|  Layer 3: Discovery & Exchange                                    |
|           Knowledge Registry . MCP Server . REST API              |
+-------------------------------------------------------------------+
|  Layer 2: KnowledgeUnit Layer  <-- core differentiation           |
|           ReasoningTrace . ToolCallPattern . ExpertSOP            |
+-------------------------------------------------------------------+
|  Layer 1: SKILL.md Compatibility  <-- existing ecosystem          |
|           SkillsMP / SkillHub / Smithery / Claude Code / Codex    |
+-------------------------------------------------------------------+
```

## Monorepo Structure

```
knowledgepulse/
  packages/
    sdk/           @knowledgepulse/sdk    -- types, capture, retrieve, scoring
    mcp-server/    @knowledgepulse/mcp    -- 6 MCP tools, dual-mode bridge
    cli/           @knowledgepulse/cli    -- search, install, validate, contribute
    sop-studio/    SOP Studio React SPA   -- visual decision tree editor
  registry/        Hono REST API server   -- auth, rate limiting, SQLite/memory stores
  specs/           JSON Schema, codegen, SKILL.md extension spec
  examples/        SDK usage, MCP client, LangGraph integration
  website/         Docusaurus 3 docs      -- bilingual (en + zh-Hans)
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Bun |
| HTTP Server | Hono |
| Type Validation | Zod + zod-to-json-schema |
| SDK Build | tsup (ESM + CJS + .d.ts) |
| SOP Studio | React 19 + Vite + Tailwind CSS v4 + React Flow |
| Linter | Biome |
| Tests | bun test (639 tests) |
| Protocol | MCP (Model Context Protocol) |
| Docs | Docusaurus 3 (en + zh-Hans) |

## MCP Tools

| Tool | Description |
|------|-------------|
| `kp_search_skill` | Semantic search across SKILL.md registry |
| `kp_get_skill` | Retrieve full skill content by ID |
| `kp_contribute_skill` | Submit new skills with auto-validation |
| `kp_search_knowledge` | Search KnowledgeUnits (traces, patterns, SOPs) |
| `kp_contribute_knowledge` | Contribute KnowledgeUnits with quality pre-scoring |
| `kp_validate_unit` | Validate KnowledgeUnit schema compliance |

## KnowledgeUnit Types

### ReasoningTrace

Captures an agent's complete problem-solving chain: thoughts, tool calls, observations, and error recovery steps.

### ToolCallPattern

Reusable tool orchestration sequences with trigger conditions, performance metrics, and success rates.

### ExpertSOP

Human expert standard operating procedures converted to machine-executable decision trees with conditions, SLAs, and tool suggestions.

## Knowledge Value Scoring

All contributed knowledge is scored locally (< 100ms, no external LLM) using a 4-dimension model:

| Dimension | Weight | What it measures |
|-----------|--------|------------------|
| Complexity | 0.25 | Step type diversity, error recovery, branching |
| Novelty | 0.35 | Cosine distance from local embedding cache |
| Tool Diversity | 0.15 | Unique MCP tools relative to step count |
| Outcome Confidence | 0.25 | Success + confidence score |

## Framework Integrations

| Framework | Integration | Priority |
|-----------|------------|----------|
| Claude Code | Native SKILL.md | P0 |
| OpenAI Codex CLI | Native SKILL.md | P0 |
| OpenClaw | TypeScript SDK | P0 |
| LangGraph | MCP HTTP | P1 |
| CrewAI | MCP HTTP | P1 |
| AutoGen | MCP HTTP | P1 |
| Flowise | TypeScript Plugin | P2 |

## Development

```bash
# Install dependencies
bun install

# Run all tests
bun test --recursive

# Build SDK
cd packages/sdk && bun run build

# Start registry
bun run registry/src/index.ts

# Start SOP Studio
cd packages/sop-studio && npx vite dev

# Build docs
cd website && npm run build
```

## Documentation

Full documentation available in English and Simplified Chinese:

- [Getting Started](https://openknowledgepulse.org/docs/getting-started/installation)
- [Architecture](https://openknowledgepulse.org/docs/architecture/overview)
- [SDK Reference](https://openknowledgepulse.org/docs/sdk/types)
- [Registry API](https://openknowledgepulse.org/docs/registry/rest-api)
- [MCP Server](https://openknowledgepulse.org/docs/mcp-server/overview)
- [CLI](https://openknowledgepulse.org/docs/cli/commands)
- [SOP Studio](https://openknowledgepulse.org/docs/sop-studio/getting-started)
- [Marketplace](https://openknowledgepulse.org/docs/marketplace/overview)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. All contributions require:

1. Tests (`bun test`)
2. Lint pass (`biome check`)
3. SDK build pass (`cd packages/sdk && bun run build`)

## Roadmap

| Phase | Status | Focus |
|-------|--------|-------|
| Phase 1 | Done | SKILL.md Registry + SDK + MCP + CLI |
| Phase 2 | Done | Knowledge Capture + Scoring + Reputation |
| Phase 3 | Done | Expert SOP Studio + Marketplace |
| Phase 4 | Done | UI Polish + Industry Standardization |

## License

[Apache 2.0](LICENSE)

---

<div align="center">

*Share what you learn.*

</div>
