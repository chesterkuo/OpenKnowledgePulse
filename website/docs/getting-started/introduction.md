---
sidebar_position: 1
---

# Introduction

KnowledgePulse is an open-source, cross-platform AI knowledge-sharing protocol. It enables AI agents and human experts to securely share problem-solving experience — including reasoning chains, tool call patterns, and standard operating procedures — across frameworks and organizations, while protecting data privacy and intellectual property.

## The Problem

In 2026, the AI agent ecosystem has a fundamental inefficiency: every agent solves the same problems in isolation. When a LangGraph agent discovers an optimal financial report analysis technique, that knowledge vanishes when the session ends. Another organization's CrewAI agent will learn the same lesson from scratch.

Existing SKILL.md / Skills Marketplace systems solve "discovery and installation of static capabilities" but cannot solve "extraction and sharing of dynamic execution experience." KnowledgePulse fills this gap.

## Dual-Layer Architecture

KnowledgePulse uses a **SKILL.md compatible + KnowledgeUnit extension** dual-layer design:

- **Layer 1 — SKILL.md Compatibility**: Fully compatible with the existing SKILL.md open standard. Any skill from SkillsMP (200,000+ skills), SkillHub, or Smithery can be directly imported into the KP Registry without modification.

- **Layer 2 — KnowledgeUnit Layer**: Built on top of SKILL.md, this dynamic knowledge layer automatically transforms agent execution experience into shareable, verifiable, incentivized KnowledgeUnits.

## Core Value Proposition

> When an agent discovers an efficient technique, that technique should automatically become a shared asset for the entire ecosystem — with quality verification, contributor reputation records, and traceable contribution rewards for subsequent users. This is what Tesla Fleet Learning does for autonomous driving; KnowledgePulse brings this paradigm to the AI agent ecosystem.

## Key Features

- **Three Knowledge Types**: ReasoningTrace, ToolCallPattern, and ExpertSOP — covering the full spectrum from automated agent traces to human expert procedures
- **Quality Scoring**: 4-dimensional scoring algorithm (complexity, novelty, tool diversity, outcome confidence) ensures only high-value knowledge enters the network
- **Privacy Controls**: Three-tier privacy model (aggregated, federated, private) with content sanitization and prompt injection detection
- **Reputation System**: KP-REP scores track contributions and validations, incentivizing quality participation
- **MCP Compatible**: Full Model Context Protocol server for framework-agnostic integration with LangGraph, CrewAI, AutoGen, and more

## Project Status

KnowledgePulse Phase 1 is complete with the following components:

| Component | Package | Description |
|-----------|---------|-------------|
| SDK | `@knowledgepulse/sdk` | TypeScript SDK with types, capture, retrieval, scoring, SKILL.md utilities |
| Registry | `registry/` | Hono REST API server with PostgreSQL + Redis + memory stores, auth, and rate limiting |
| MCP Server | `@knowledgepulse/mcp` | 7 MCP tools, dual-mode (standalone + proxy) |
| CLI | `@knowledgepulse/cli` | Commands for search, install, validate, contribute, auth, security |

## License

KnowledgePulse is licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0).
