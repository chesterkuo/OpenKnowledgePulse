---
sidebar_position: 1
title: Installation
description: Install and configure the KnowledgePulse SDK for TypeScript and JavaScript projects.
---

# Installation

The `@knowledgepulse/sdk` package provides TypeScript/JavaScript types, validation schemas, knowledge capture, retrieval, scoring, and SKILL.md utilities for the KnowledgePulse protocol.

- **Version:** 0.1.0
- **License:** Apache-2.0

## Install

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="bun" label="Bun" default>

```bash
bun add @knowledgepulse/sdk
```

</TabItem>
<TabItem value="npm" label="npm">

```bash
npm install @knowledgepulse/sdk
```

</TabItem>
<TabItem value="yarn" label="Yarn">

```bash
yarn add @knowledgepulse/sdk
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm add @knowledgepulse/sdk
```

</TabItem>
</Tabs>

## Module Formats

The SDK ships as a dual-format package with full TypeScript declarations. Both ESM and CommonJS are supported out of the box.

### ESM (recommended)

```ts
import {
  KPCapture,
  KPRetrieval,
  evaluateValue,
  parseSkillMd,
  KnowledgeUnitSchema,
} from "@knowledgepulse/sdk";
```

### CommonJS

```js
const {
  KPCapture,
  KPRetrieval,
  evaluateValue,
  parseSkillMd,
  KnowledgeUnitSchema,
} = require("@knowledgepulse/sdk");
```

## Export Map

The package exposes a single entry point (`.`) with conditional exports:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

| Path | Format | File |
|------|--------|------|
| `types` | TypeScript declarations | `dist/index.d.ts` |
| `import` | ESM | `dist/index.js` |
| `require` | CommonJS | `dist/index.cjs` |

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | ^3.23.0 | Runtime validation schemas for all knowledge unit types |
| `yaml` | ^2.4.0 | SKILL.md YAML frontmatter parsing and generation |

### Optional Dependency

| Package | Version | Size | Purpose |
|---------|---------|------|---------|
| `@huggingface/transformers` | ^3.0.0 | ~80 MB | Embedding model for novelty scoring (`Xenova/all-MiniLM-L6-v2`) |

The `@huggingface/transformers` package is listed as an optional dependency. It is only used by the novelty dimension of the `evaluateValue()` scoring function. If it is not installed, the novelty score falls back to a default value of `0.5`.

To install it explicitly:

```bash
bun add @huggingface/transformers
```

## TypeScript

Full type declarations are included in the package at `dist/index.d.ts`. No additional `@types/*` package is required.

The SDK requires TypeScript 5.0 or later and targets ES2020. If you use `moduleResolution: "bundler"` or `"node16"` in your `tsconfig.json`, the export map will be resolved automatically.

```jsonc
// tsconfig.json (recommended settings)
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020",
    "strict": true
  }
}
```

## Verify Installation

Run a quick check to confirm the package is installed correctly:

```ts
import { KnowledgeUnitSchema, generateTraceId } from "@knowledgepulse/sdk";

console.log(generateTraceId());
// kp:trace:550e8400-e29b-41d4-a716-446655440000

console.log(typeof KnowledgeUnitSchema.parse);
// "function"
```

## Next Steps

- [Types](./types.md) -- Explore all knowledge unit types and Zod schemas
- [SKILL.md](./skill-md.md) -- Parse, generate, and validate SKILL.md files
- [Scoring](./scoring.md) -- Understand the value scoring algorithm
- [Utilities](./utilities.md) -- ID generators, hashing, sanitization, capture, and retrieval
