---
sidebar_position: 4
title: Storage Adapters
description: Pluggable storage backends for the KnowledgePulse registry using the factory pattern — Memory, SQLite, and Qdrant.
---

# Storage Adapters

KnowledgePulse uses a **factory pattern** to select storage backends at startup. All stores implement the same async interfaces, so switching between backends requires no code changes -- only an environment variable.

## Architecture

```
┌──────────────────────────────────────────┐
│            createStore()                 │
│         (factory function)               │
├──────────────────────────────────────────┤
│                                          │
│   KP_STORE_BACKEND = "memory" (default)  │
│   ┌────────────────────────────┐         │
│   │   MemorySkillStore         │         │
│   │   MemoryKnowledgeStore     │         │
│   │   MemoryReputationStore    │         │
│   │   MemoryApiKeyStore        │         │
│   │   MemoryRateLimitStore     │         │
│   │   MemoryAuditLogStore      │         │
│   └────────────────────────────┘         │
│                                          │
│   KP_STORE_BACKEND = "sqlite"            │
│   ┌────────────────────────────┐         │
│   │   SqliteSkillStore         │         │
│   │   SqliteKnowledgeStore     │         │
│   │   SqliteReputationStore    │         │
│   │   SqliteApiKeyStore        │         │
│   │   SqliteRateLimitStore     │         │
│   │   SqliteAuditLogStore      │         │
│   └────────────────────────────┘         │
│                                          │
│   KP_STORE_BACKEND = "qdrant" (future)   │
│   ┌────────────────────────────┐         │
│   │   (skeleton — not yet      │         │
│   │    implemented)            │         │
│   └────────────────────────────┘         │
│                                          │
└──────────────────────────────────────────┘
```

## Store Factory

The `createStore()` function reads `KP_STORE_BACKEND` from the environment and returns the appropriate set of stores:

```ts
import { createStore } from "./store/factory.js";

const stores = await createStore();
// stores.skills      — SkillStore
// stores.knowledge   — KnowledgeStore
// stores.reputation  — ReputationStore
// stores.apiKeys     — ApiKeyStore
// stores.rateLimit   — RateLimitStore
// stores.auditLog    — AuditLogStore
```

### AllStores Interface

```ts
interface AllStores {
  skills: SkillStore;
  knowledge: KnowledgeStore;
  reputation: ReputationStore;
  apiKeys: ApiKeyStore;
  rateLimit: RateLimitStore;
  auditLog: AuditLogStore;
}
```

Every store method returns a `Promise`, making the interface backend-agnostic. In-memory stores resolve immediately; database-backed stores perform actual I/O.

## Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `KP_STORE_BACKEND` | `memory`, `sqlite` | `memory` | Selects the storage backend |
| `KP_SQLITE_PATH` | file path | `knowledgepulse.db` | Path to the SQLite database file (only used when backend is `sqlite`) |

## Memory Backend

The default backend stores all data in JavaScript `Map` objects. Data is lost when the process restarts.

**Best for:** development, testing, CI pipelines, demos.

```bash
# Explicit (same as default)
KP_STORE_BACKEND=memory bun run registry/src/index.ts
```

### Characteristics

| Property | Value |
|----------|-------|
| Persistence | None (in-process only) |
| Performance | Sub-millisecond for all operations |
| Concurrency | Single-process only |
| Dependencies | None |
| Audit log retention | 90 days (auto-purged) |

## SQLite Backend

The SQLite backend uses Bun's built-in `bun:sqlite` module for a zero-dependency persistent store. It creates all required tables automatically on first connection.

**Best for:** single-node production deployments, self-hosted instances.

```bash
KP_STORE_BACKEND=sqlite bun run registry/src/index.ts
```

### Configuration

```bash
# Custom database path
KP_STORE_BACKEND=sqlite \
KP_SQLITE_PATH=/var/data/kp/registry.db \
bun run registry/src/index.ts
```

### Characteristics

| Property | Value |
|----------|-------|
| Persistence | Durable (file-based) |
| Performance | < 5ms for typical queries |
| Concurrency | Single-process (SQLite WAL mode) |
| Dependencies | `bun:sqlite` (built into Bun) |
| Schema migration | Automatic on startup |

### Schema

The SQLite backend creates the following tables:

| Table | Purpose |
|-------|---------|
| `skills` | Registered SKILL.md entries |
| `knowledge_units` | Stored knowledge units (traces, patterns, SOPs) |
| `reputation` | Agent reputation records and history |
| `api_keys` | API key hashes and metadata |
| `rate_limits` | Per-token rate limit counters |
| `audit_log` | GDPR audit log entries |

All tables are created with `IF NOT EXISTS`, making the schema initialization idempotent.

## Qdrant Backend (Future)

A Qdrant vector database backend is planned for Phase 3 to support scalable vector similarity search across large knowledge bases. The interface skeleton exists but is not yet implemented.

**Target use cases:** multi-node deployments, large-scale knowledge networks with millions of units.

```bash
# Not yet available
KP_STORE_BACKEND=qdrant \
KP_QDRANT_URL=http://localhost:6333 \
bun run registry/src/index.ts
```

## Migration Guide

### Memory to SQLite

Migrating from the memory backend to SQLite is straightforward because the interfaces are identical:

1. **Stop the registry** to prevent data loss during migration.

2. **Set environment variables:**
   ```bash
   export KP_STORE_BACKEND=sqlite
   export KP_SQLITE_PATH=/var/data/kp/registry.db
   ```

3. **Start the registry.** The SQLite backend creates all tables automatically.

4. **Re-register data.** Because the memory backend does not persist data, you will need to re-register API keys and re-contribute knowledge units. Agents can re-submit their SKILL.md files on the next connection.

:::tip
If you need to preserve data during a migration, consider running both backends temporarily: export data from the memory-backed registry via `GET /v1/export/:agent_id` and re-import it into the SQLite-backed instance.
:::

### SQLite to Qdrant (Future)

When the Qdrant backend becomes available, a migration script will be provided to bulk-export from SQLite and import into Qdrant. The script will handle schema mapping and vector index creation.

## Implementing a Custom Backend

To add a new storage backend:

1. **Implement all store interfaces** (`SkillStore`, `KnowledgeStore`, `ReputationStore`, `ApiKeyStore`, `RateLimitStore`, `AuditLogStore`).

2. **Create a factory function** that returns an `AllStores` object:
   ```ts
   export async function createMyStore(): Promise<AllStores> {
     return {
       skills: new MySkillStore(),
       knowledge: new MyKnowledgeStore(),
       reputation: new MyReputationStore(),
       apiKeys: new MyApiKeyStore(),
       rateLimit: new MyRateLimitStore(),
       auditLog: new MyAuditLogStore(),
     };
   }
   ```

3. **Register the backend** in `registry/src/store/factory.ts`:
   ```ts
   case "mybackend": {
     const { createMyStore } = await import("./mybackend/index.js");
     return createMyStore();
   }
   ```

4. **Test against the same test suite.** All backend implementations should pass the same interface contract tests.
