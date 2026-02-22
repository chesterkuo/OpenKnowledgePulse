---
sidebar_position: 1
title: Architecture Overview
description: Dual-layer architecture, protocol stack, and monorepo structure of KnowledgePulse.
---

# Architecture Overview

KnowledgePulse is an AI knowledge-sharing protocol built on a dual-layer architecture. The **protocol layer** defines how knowledge is structured, discovered, and governed, while the **infrastructure layer** provides the concrete runtime components that implement the protocol.

## Protocol Stack

The protocol is organized into five layers, each building on the one below it:

```
┌─────────────────────────────────────────┐
│            5. Governance                │
│   Licensing, attribution, audit trail   │
├─────────────────────────────────────────┤
│            4. Privacy                   │
│   Scoping, redaction, GDPR compliance   │
├─────────────────────────────────────────┤
│            3. Discovery                 │
│   Search, scoring, vector retrieval     │
├─────────────────────────────────────────┤
│            2. KnowledgeUnit             │
│   JSON-LD schema, types, versioning     │
├─────────────────────────────────────────┤
│            1. SKILL.md                  │
│   Agent capability declaration format   │
└─────────────────────────────────────────┘
```

**Layer 1 -- SKILL.md** defines a standard file format for agents to declare their capabilities, inputs, outputs, and constraints. It is the foundational contract that other layers reference.

**Layer 2 -- KnowledgeUnit** specifies the JSON-LD schema for three knowledge types (traces, patterns, and SOPs) and the versioning rules that govern schema evolution.

**Layer 3 -- Discovery** covers how knowledge units are indexed, searched, scored for relevance, and retrieved -- including vector-based similarity search.

**Layer 4 -- Privacy** handles scoping rules, field-level redaction, and GDPR-mandated operations such as data export and the right to be forgotten.

**Layer 5 -- Governance** addresses licensing, attribution chains, and audit trails that track how knowledge flows between agents.

## Component Overview

Four runtime components implement the protocol stack:

| Component | Package | Role |
|-----------|---------|------|
| **SDK** | `@knowledgepulse/sdk` | Core library -- types, capture, retrieve, scoring, SKILL.md parsing, migrations |
| **Registry** | `registry/` | Hono REST API server -- stores knowledge units, handles auth, rate limiting |
| **MCP Server** | `@knowledgepulse/mcp` | Model Context Protocol server -- exposes 6 MCP tools, dual-mode registry bridge |
| **CLI** | `@knowledgepulse/cli` | Command-line interface -- search, install, validate, contribute, auth, security |

### SDK

The SDK (`packages/sdk`) is the core library that all other components depend on. It provides TypeScript types generated from Zod schemas, functions for capturing and retrieving knowledge units, relevance scoring, SKILL.md parsing and sanitization, and chainable migration functions for schema version upgrades.

### Registry

The Registry (`registry/`) is a Hono-based REST API server that acts as the central store for knowledge units. It handles authentication via Bearer tokens, tier-based rate limiting, and exposes CRUD endpoints for knowledge units.

### MCP Server

The MCP Server (`packages/mcp-server`) exposes KnowledgePulse functionality through the Model Context Protocol, making it accessible to any MCP-compatible AI client. It operates in **dual mode**:

- **Standalone mode** -- runs with its own in-memory store.
- **Proxy mode** -- bridges to a remote registry via the `KP_REGISTRY_URL` environment variable.

### CLI

The CLI (`packages/cli`) provides a command-line interface for developers and agents to interact with the protocol -- searching for knowledge, installing SKILL.md files, validating schemas, contributing knowledge units, and managing authentication.

## Monorepo Structure

```
knowledgepulse/
├── packages/
│   ├── sdk/            # @knowledgepulse/sdk — types, capture, retrieve, scoring, migrations
│   ├── mcp-server/     # @knowledgepulse/mcp — 6 MCP tools, dual-mode registry bridge
│   ├── cli/            # @knowledgepulse/cli — search, install, validate, contribute, auth
│   └── sop-studio/     # Placeholder (Phase 3)
├── registry/           # Hono REST API server (in-memory stores, auth, rate limiting)
├── specs/              # codegen.ts, validate-consistency.ts, skill-md-extension.md
├── examples/           # basic-sdk-usage, mcp-client-example, langraph-integration
└── website/            # Docusaurus documentation site
```

## Storage Model

Phase 1 uses **in-memory `Map<>` stores** behind async `Promise<T>` interfaces. This design is intentional: the async interface boundary means the storage backend can be swapped to a persistent database (PostgreSQL, SQLite, etc.) without changing any consumer code. The vector cache uses a brute-force linear scan rather than HNSW, and is likewise swappable via its interface.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Bun** | JavaScript/TypeScript runtime and package manager |
| **Hono** | Lightweight HTTP framework for the Registry and MCP Server |
| **Zod v3** | Schema definition and validation (with `zod-to-json-schema` for codegen) |
| **tsup** | Build tool for the SDK (ESM + CJS + TypeScript declarations) |
| **Biome** | Linter and formatter |
| **@modelcontextprotocol/sdk** | MCP protocol implementation |
| **bun test** | Test runner (319 tests across 15 files) |
