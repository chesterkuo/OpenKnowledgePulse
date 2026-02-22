---
sidebar_position: 1
title: Development Setup
description: How to set up a local development environment for the KnowledgePulse monorepo.
---

# Development Setup

This guide walks you through setting up a local development environment for the KnowledgePulse monorepo.

## Prerequisites

- **Bun** v1.0 or later -- [install instructions](https://bun.sh/docs/installation)
- **Git**

## Clone and Install

```bash
git clone https://github.com/nicobailon/knowledgepulse.git
cd knowledgepulse
bun install
```

`bun install` resolves all workspace dependencies across every package in the monorepo.

## Monorepo Structure

```
knowledgepulse/
  packages/
    sdk/           # @knowledgepulse/sdk -- types, capture, retrieve, scoring, skill-md, migrations
    mcp-server/    # @knowledgepulse/mcp -- 6 MCP tools, dual-mode registry bridge
    cli/           # @knowledgepulse/cli -- search, install, validate, contribute, auth, security
    sop-studio/    # Placeholder (Phase 3)
  registry/        # Hono REST API server (in-memory stores, auth, rate limiting)
  specs/           # codegen.ts, validate-consistency.ts, skill-md-extension.md
  examples/        # basic-sdk-usage, mcp-client-example, langraph-integration
```

## Common Tasks

### Build the SDK

The SDK is built with **tsup** and emits ESM, CJS, and TypeScript declaration files.

```bash
bun run build
```

### Generate the JSON Schema

Regenerate `specs/knowledge-unit-schema.json` from the Zod types in the SDK.

```bash
bun run codegen
```

### Lint

The project uses **Biome** for formatting and linting.

```bash
bun run lint
```

### Run Tests

All tests are written with `bun:test` and co-located with their source files as `*.test.ts`. The full suite comprises 319 tests across 15 files.

```bash
bun test --recursive
```

### Start the Registry

The registry is a Hono HTTP server with in-memory stores. It listens on port 3000 by default.

```bash
bun run registry/src/index.ts
```

### Start the MCP Server

The MCP server listens on port 3001 by default. See the [MCP Server Setup](../mcp-server/setup.md) guide for details on standalone vs. proxy mode.

```bash
bun run packages/mcp-server/src/index.ts
```

## Quick Reference

| Task | Command |
|---|---|
| Install dependencies | `bun install` |
| Build SDK | `bun run build` |
| Generate JSON schema | `bun run codegen` |
| Lint | `bun run lint` |
| Run all tests | `bun test --recursive` |
| Start registry (port 3000) | `bun run registry/src/index.ts` |
| Start MCP server (port 3001) | `bun run packages/mcp-server/src/index.ts` |
