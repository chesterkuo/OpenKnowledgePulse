# Contributing to KnowledgePulse

Thank you for your interest in contributing to KnowledgePulse! This document covers the code style, testing expectations, and pull request process for the project.

## Prerequisites

- [Bun](https://bun.sh/) (runtime and package manager)
- Node.js 22+ (for Docusaurus website only)

## Getting Started

```bash
git clone https://github.com/chesterkuo/OpenKnowledgePulse.git
cd OpenKnowledgePulse
bun install
```

## Code Style

- **Formatter and linter:** [Biome](https://biomejs.dev/) handles both formatting and linting. Run `biome check` before submitting a PR.
- **TypeScript:** Strict mode is enabled across all packages. Use [Zod](https://zod.dev/) v3 for runtime validation of external inputs.
- **Imports:** Prefer explicit named imports. Avoid wildcard (`*`) imports.

## Testing

- **Framework:** `bun:test` (built into Bun).
- **File placement:** Co-locate tests with the source file they exercise. Test files use the `*.test.ts` suffix.
- **Run the suite:**

  ```bash
  bun test --recursive
  ```

  The full suite currently contains 639 tests across 33 files. All tests must pass before a PR can be merged.

- **Schema changes:** Any change to Zod schemas or the KnowledgeUnit structure must include:
  1. A **migration function** that converts data from the previous schema version.
  2. **Round-trip tests** proving that data survives serialization, migration, and deserialization without loss.

## Build Notes

The SDK is built with **tsup** and emits ESM, CJS, and TypeScript declaration (`.d.ts`) files. The SDK `tsconfig.json` sets `"types": []` intentionally -- this avoids a conflict between `bun-types` and tsup's DTS generation plugin. Do not remove this setting.

```bash
# Build SDK
cd packages/sdk && bun run build
```

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`.
2. **Implement** your changes, following the code style guidelines above.
3. **Write or update tests** covering your changes.
4. **Run the full test suite** and confirm all tests pass:

   ```bash
   bun test --recursive
   ```

5. **Lint** your code:

   ```bash
   biome check
   ```

6. **Build the SDK** to verify no type errors:

   ```bash
   cd packages/sdk && bun run build
   ```

7. **Submit a pull request** against `main` with a clear description of the change and its motivation.

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) style:

```
<type>(<scope>): <short summary>
```

Common types:

| Type | When to use |
|------|-------------|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation-only changes |
| `refactor` | Code restructuring with no behavior change |
| `test` | Adding or updating tests |
| `chore` | Build config, CI, or tooling changes |

Examples:

```
feat(sdk): add vector similarity caching
fix(mcp-server): handle missing API key in proxy mode
test(cli): add integration tests for kp search
```

## Project Structure

```
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

## Licensing

All contributions are licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0), consistent with the rest of the project.
