# P0 + P1 Gap Closure — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add production storage backends (PostgreSQL, Redis, Zvec), CI/CD, WebSocket fix, JWT auth, injection classifier, provider discovery, idempotency, MCP session auth, `kp list`, and OpenAPI spec.

**Architecture:** Extend the existing `AllStores` interface factory pattern with PostgreSQL adapters for durable stores, Redis for ephemeral stores (rate limiting, cache, idempotency, sessions), and Zvec for embedded vector search. All other P1 items layer on top.

**Tech Stack:** `pg` (PostgreSQL), `ioredis` (Redis), `@zvec/zvec` (vector DB), `jose` (JWT/JWKS), Hono middleware, Commander.js CLI, GitHub Actions.

---

## Phase A: PostgreSQL Storage Adapter (P0-2)

### Task 1: Install pg + Create Connection Pool and DDL

**Files:**
- Modify: `registry/package.json`
- Create: `registry/src/store/postgres/db.ts`

**Step 1: Install the `pg` dependency**

Run: `cd /home/ubuntu/knowledgepulse && bun add --cwd registry pg @types/pg`

**Step 2: Create `registry/src/store/postgres/db.ts`**

```typescript
import pg from "pg";

const { Pool } = pg;

export type PgPool = pg.Pool;

export async function createPool(connectionString: string): Promise<PgPool> {
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Verify connection
  const client = await pool.connect();
  client.release();

  return pool;
}

export async function runMigrations(pool: PgPool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      version TEXT,
      author TEXT,
      tags JSONB NOT NULL DEFAULT '[]',
      content TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'network',
      quality_score REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_units (
      id TEXT PRIMARY KEY,
      unit_json JSONB NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'network',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ku_type ON knowledge_units ((unit_json->>'@type'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ku_domain ON knowledge_units ((unit_json->'metadata'->>'task_domain'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ku_agent ON knowledge_units ((unit_json->'metadata'->>'agent_id'))`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reputation (
      agent_id TEXT PRIMARY KEY,
      score REAL NOT NULL DEFAULT 0,
      contributions INTEGER NOT NULL DEFAULT 0,
      validations INTEGER NOT NULL DEFAULT 0,
      history JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS validation_votes (
      id SERIAL PRIMARY KEY,
      validator_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      valid BOOLEAN NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      key_hash TEXT PRIMARY KEY,
      key_prefix TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      scopes JSONB NOT NULL DEFAULT '[]',
      tier TEXT NOT NULL DEFAULT 'free',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked BOOLEAN NOT NULL DEFAULT false,
      revoked_at TIMESTAMPTZ
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_agent ON api_keys (agent_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      bucket_key TEXT PRIMARY KEY,
      tokens REAL NOT NULL,
      last_refill BIGINT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_limit_violations (
      id SERIAL PRIMARY KEY,
      identifier TEXT NOT NULL,
      timestamp BIGINT NOT NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_violations_id_ts ON rate_limit_violations (identifier, timestamp)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sops (
      id TEXT PRIMARY KEY,
      sop_json JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      previous_version_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      visibility TEXT NOT NULL DEFAULT 'network',
      approved_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sop_versions (
      sop_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      diff_summary TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (sop_id, version)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_balances (
      agent_id TEXT PRIMARY KEY,
      balance REAL NOT NULL DEFAULT 0,
      last_refill TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      related_listing_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ct_agent ON credit_transactions (agent_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id TEXT PRIMARY KEY,
      knowledge_unit_id TEXT NOT NULL,
      contributor_id TEXT NOT NULL,
      price_credits REAL NOT NULL DEFAULT 0,
      access_model TEXT NOT NULL DEFAULT 'free',
      domain TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      purchases INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ml_domain ON marketplace_listings (domain)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ml_contributor ON marketplace_listings (contributor_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS badges (
      badge_id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      level TEXT NOT NULL,
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      granted_by TEXT NOT NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_badges_agent ON badges (agent_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS certification_proposals (
      proposal_id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      target_level TEXT NOT NULL,
      proposed_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closes_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS proposal_votes (
      proposal_id TEXT NOT NULL,
      voter_id TEXT NOT NULL,
      approve BOOLEAN NOT NULL,
      weight REAL NOT NULL,
      PRIMARY KEY (proposal_id, voter_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip TEXT NOT NULL DEFAULT '',
      details JSONB
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_log (agent_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log (action)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log (timestamp)`);
}
```

**Step 3: Verify DDL runs against the real database**

Run: `cd /home/ubuntu/knowledgepulse && bun -e "import { createPool, runMigrations } from './registry/src/store/postgres/db.ts'; const pool = await createPool('postgresql://knowledgepulse_user:KPulse2026Secure@172.31.9.157:5432/knowledgepulse'); await runMigrations(pool); console.log('OK'); await pool.end()"`
Expected: `OK`

**Step 4: Commit**

```bash
git add registry/package.json registry/src/store/postgres/db.ts bun.lockb
git commit -m "feat(registry): add PostgreSQL connection pool and DDL migrations"
```

---

### Task 2: PostgreSQL Skill Store

**Files:**
- Create: `registry/src/store/postgres/skill-store.ts`
- Create: `registry/src/store/postgres/skill-store.test.ts`

**Step 1: Write the test** — mirror `registry/src/store/memory/skill-store.test.ts` patterns but use a real PG test database.

```typescript
// registry/src/store/postgres/skill-store.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { PgSkillStore } from "./skill-store.js";
import { createPool, runMigrations, type PgPool } from "./db.js";

const TEST_DB_URL = process.env.KP_TEST_DATABASE_URL
  ?? "postgresql://knowledgepulse_user:KPulse2026Secure@172.31.9.157:5432/knowledgepulse";

describe("PgSkillStore", () => {
  let pool: PgPool;
  let store: PgSkillStore;

  beforeAll(async () => {
    pool = await createPool(TEST_DB_URL);
    await runMigrations(pool);
    await pool.query("DELETE FROM skills"); // clean slate
    store = new PgSkillStore(pool);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM skills");
    await pool.end();
  });

  it("creates and retrieves a skill", async () => {
    const skill = { id: "s1", name: "test", description: "desc", tags: ["a"], content: "# Test", visibility: "network" as const, quality_score: 0.8, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const created = await store.create(skill);
    expect(created.id).toBe("s1");
    const found = await store.getById("s1");
    expect(found?.name).toBe("test");
  });

  it("searches by query", async () => {
    const result = await store.search({ query: "test" });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it("searches by tags", async () => {
    const result = await store.search({ tags: ["a"] });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it("searches with min_quality filter", async () => {
    const result = await store.search({ min_quality: 0.9 });
    expect(result.total).toBe(0);
  });

  it("paginates results", async () => {
    const result = await store.search({ pagination: { offset: 0, limit: 1 } });
    expect(result.limit).toBe(1);
  });

  it("deletes a skill", async () => {
    const deleted = await store.delete("s1");
    expect(deleted).toBe(true);
    const found = await store.getById("s1");
    expect(found).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/ubuntu/knowledgepulse && bun test registry/src/store/postgres/skill-store.test.ts`
Expected: FAIL — `PgSkillStore` not found

**Step 3: Implement `PgSkillStore`**

```typescript
// registry/src/store/postgres/skill-store.ts
import type { PgPool } from "./db.js";
import type { SkillStore, StoredSkill, PaginatedResult } from "../interfaces.js";

export class PgSkillStore implements SkillStore {
  constructor(private pool: PgPool) {}

  async create(skill: StoredSkill): Promise<StoredSkill> {
    await this.pool.query(
      `INSERT INTO skills (id, name, description, version, author, tags, content, visibility, quality_score, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, version=$4, author=$5, tags=$6, content=$7, visibility=$8, quality_score=$9, updated_at=$11`,
      [skill.id, skill.name, skill.description, skill.version ?? null, skill.author ?? null, JSON.stringify(skill.tags), skill.content, skill.visibility, skill.quality_score, skill.created_at, skill.updated_at],
    );
    return skill;
  }

  async getById(id: string): Promise<StoredSkill | undefined> {
    const { rows } = await this.pool.query("SELECT * FROM skills WHERE id = $1", [id]);
    return rows[0] ? this.toStoredSkill(rows[0]) : undefined;
  }

  async search(opts: { query?: string; domain?: string; tags?: string[]; min_quality?: number; pagination?: { offset?: number; limit?: number } }): Promise<PaginatedResult<StoredSkill>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (opts.query) { conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); params.push(`%${opts.query}%`); idx++; }
    if (opts.min_quality != null) { conditions.push(`quality_score >= $${idx}`); params.push(opts.min_quality); idx++; }
    if (opts.tags?.length) { conditions.push(`tags ?| $${idx}::text[]`); params.push(opts.tags); idx++; }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;

    const countRes = await this.pool.query(`SELECT COUNT(*) FROM skills ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await this.pool.query(`SELECT * FROM skills ${where} ORDER BY quality_score DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]);

    return { data: dataRes.rows.map(r => this.toStoredSkill(r)), total, offset, limit };
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query("DELETE FROM skills WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  private toStoredSkill(row: any): StoredSkill {
    return { ...row, tags: typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /home/ubuntu/knowledgepulse && bun test registry/src/store/postgres/skill-store.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add registry/src/store/postgres/skill-store.ts registry/src/store/postgres/skill-store.test.ts
git commit -m "feat(registry): add PostgreSQL SkillStore implementation"
```

---

### Task 3: PostgreSQL Knowledge, Reputation, ApiKey, SOP, Credit, Marketplace, AuditLog, RateLimit Stores

**Files:**
- Create: `registry/src/store/postgres/knowledge-store.ts`
- Create: `registry/src/store/postgres/reputation-store.ts`
- Create: `registry/src/store/postgres/apikey-store.ts`
- Create: `registry/src/store/postgres/sop-store.ts`
- Create: `registry/src/store/postgres/credit-store.ts`
- Create: `registry/src/store/postgres/marketplace-store.ts`
- Create: `registry/src/store/postgres/audit-log-store.ts`
- Create: `registry/src/store/postgres/rate-limit-store.ts`
- Create: `registry/src/store/postgres/postgres.test.ts` (combined integration test)

Follow the **exact same pattern** as Task 2 for each store. Reference the corresponding memory/SQLite implementations for logic:
- `registry/src/store/memory/knowledge-store.ts` → `PgKnowledgeStore`
- `registry/src/store/memory/reputation-store.ts` → `PgReputationStore` (includes badges + proposals)
- `registry/src/store/memory/api-key-store.ts` → `PgApiKeyStore` (SHA-256 hashing, `kp_` prefix)
- `registry/src/store/memory/sop-store.ts` → `PgSopStore` (includes versions)
- `registry/src/store/memory/credit-store.ts` → `PgCreditStore`
- `registry/src/store/memory/marketplace-store.ts` → `PgMarketplaceStore`
- `registry/src/store/memory/audit-log-store.ts` → `PgAuditLogStore` (NEW — first real implementation)
- `registry/src/store/memory/rate-limit-store.ts` → `PgRateLimitStore` (fallback if Redis unavailable)

Key differences from SQLite:
- Use `$1, $2` parameterized queries (not `?`)
- Use native `BOOLEAN` (not `INTEGER 0/1`)
- Use `JSONB` operators: `?|` for array contains, `->>'key'` for JSON field access
- All queries are `async` via `pool.query()` (not synchronous like bun:sqlite)
- `ILIKE` for case-insensitive search (not `LIKE`)

**Step 1:** Write combined test file `postgres.test.ts` covering all 8 stores (mirror the memory store tests).

**Step 2:** Run tests — all should fail.

**Step 3:** Implement each store class, one at a time.

**Step 4:** Run tests after each store — incremental green.

**Step 5: Commit**

```bash
git add registry/src/store/postgres/
git commit -m "feat(registry): add all PostgreSQL store implementations (8 stores)"
```

---

### Task 4: Create PostgreSQL Store Factory + Wire Up index.ts

**Files:**
- Create: `registry/src/store/postgres/index.ts`
- Modify: `registry/src/store/factory.ts`
- Modify: `registry/src/index.ts`
- Modify: `registry/src/config.ts`

**Step 1: Create `registry/src/store/postgres/index.ts`**

```typescript
import type { AllStores } from "../interfaces.js";
import { createPool, runMigrations } from "./db.js";
import { PgSkillStore } from "./skill-store.js";
import { PgKnowledgeStore } from "./knowledge-store.js";
import { PgReputationStore } from "./reputation-store.js";
import { PgApiKeyStore } from "./apikey-store.js";
import { PgSopStore } from "./sop-store.js";
import { PgCreditStore } from "./credit-store.js";
import { PgMarketplaceStore } from "./marketplace-store.js";
import { PgRateLimitStore } from "./rate-limit-store.js";
import { PgAuditLogStore } from "./audit-log-store.js";

export async function createPostgresStore(databaseUrl: string): Promise<AllStores> {
  const pool = await createPool(databaseUrl);
  await runMigrations(pool);

  return {
    skills: new PgSkillStore(pool),
    knowledge: new PgKnowledgeStore(pool),
    reputation: new PgReputationStore(pool),
    apiKeys: new PgApiKeyStore(pool),
    sop: new PgSopStore(pool),
    credits: new PgCreditStore(pool),
    marketplace: new PgMarketplaceStore(pool),
    rateLimit: new PgRateLimitStore(pool),
    auditLog: new PgAuditLogStore(pool),
  };
}
```

**Step 2: Update `registry/src/store/factory.ts`** — add `"postgres"` case:

```typescript
case "postgres": {
  const { createPostgresStore } = await import("./postgres/index.js");
  const dbUrl = process.env.KP_DATABASE_URL;
  if (!dbUrl) throw new Error("KP_DATABASE_URL is required when KP_STORE_BACKEND=postgres");
  return createPostgresStore(dbUrl);
}
```

**Step 3: Update `registry/src/config.ts`** — add new env vars to ConfigSchema:

```typescript
storeBackend: z.string().default("memory"),
databaseUrl: z.string().optional(),
redisUrl: z.string().optional(),
redisPrefix: z.string().default("kp:"),
```

**Step 4: Update `registry/src/index.ts`** — replace `createMemoryStore()` with factory:

```typescript
// Replace:
//   import { createMemoryStore } from "./store/memory/index.js";
//   const stores = createMemoryStore();
// With:
import { createStore } from "./store/factory.js";
const stores = await createStore();
```

**Step 5: Run full existing test suite to verify no regressions**

Run: `cd /home/ubuntu/knowledgepulse && bun test --recursive`
Expected: All 639+ tests pass (memory stores still used by default)

**Step 6: Test with `KP_STORE_BACKEND=postgres`**

Run: `cd /home/ubuntu/knowledgepulse && KP_STORE_BACKEND=postgres KP_DATABASE_URL='postgresql://knowledgepulse_user:KPulse2026Secure@172.31.9.157:5432/knowledgepulse' bun test registry/src/store/postgres/`
Expected: All PG-specific tests pass

**Step 7: Commit**

```bash
git add registry/src/store/postgres/index.ts registry/src/store/factory.ts registry/src/config.ts registry/src/index.ts
git commit -m "feat(registry): wire PostgreSQL backend into store factory and index.ts"
```

---

## Phase B: Redis Adapter (P0-3 + P1-7)

### Task 5: Install ioredis + Create Redis Client

**Files:**
- Modify: `registry/package.json`
- Create: `registry/src/store/redis/client.ts`

**Step 1: Install ioredis**

Run: `cd /home/ubuntu/knowledgepulse && bun add --cwd registry ioredis`

**Step 2: Create `registry/src/store/redis/client.ts`**

```typescript
import Redis from "ioredis";

export function createRedisClient(url: string, prefix: string = "kp:"): Redis {
  const redis = new Redis(url, { keyPrefix: prefix, lazyConnect: true });
  return redis;
}
```

**Step 3: Verify connection**

Run: `cd /home/ubuntu/knowledgepulse && bun -e "import Redis from 'ioredis'; const r = new Redis('redis://:bibi5566778800@localhost:6379/0', {keyPrefix:'kp:'}); await r.set('test','ok'); console.log(await r.get('test')); await r.del('test'); await r.quit()"`
Expected: `ok`

**Step 4: Commit**

```bash
git add registry/package.json registry/src/store/redis/client.ts bun.lockb
git commit -m "feat(registry): add Redis client with kp: prefix isolation"
```

---

### Task 6: Redis Rate Limit Store

**Files:**
- Create: `registry/src/store/redis/rate-limit-store.ts`
- Create: `registry/src/store/redis/rate-limit-store.test.ts`

**Step 1: Write test** — mirror `registry/src/store/memory/rate-limit-store.test.ts`

**Step 2: Implement `RedisRateLimitStore`** — same token bucket algorithm as memory version, but storing bucket state in Redis keys:
- `ratelimit:bucket:<identifier>:<rw>` → `{tokens, lastRefill}` as JSON with 5min TTL
- `ratelimit:429:<identifier>` → sorted set of timestamps, auto-expire after 1 hour
- Use Lua scripting for atomic consume (refill + decrement in one round trip)

**Step 3: Run tests, verify pass**

**Step 4: Commit**

```bash
git add registry/src/store/redis/rate-limit-store.ts registry/src/store/redis/rate-limit-store.test.ts
git commit -m "feat(registry): add Redis-backed RateLimitStore with atomic Lua scripting"
```

---

### Task 7: Redis Cache + Idempotency Middleware (P1-7)

**Files:**
- Create: `registry/src/store/redis/cache.ts`
- Create: `registry/src/middleware/idempotency.ts`
- Create: `registry/src/middleware/idempotency.test.ts`

**Step 1: Create cache helper**

```typescript
// registry/src/store/redis/cache.ts
import type Redis from "ioredis";

export class RedisCache {
  constructor(private redis: Redis, private defaultTtl: number = 300) {}

  async get<T>(key: string): Promise<T | undefined> {
    const val = await this.redis.get(`cache:${key}`);
    return val ? JSON.parse(val) : undefined;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.redis.set(`cache:${key}`, JSON.stringify(value), "EX", ttl ?? this.defaultTtl);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(`cache:${key}`);
  }
}
```

**Step 2: Write idempotency middleware test**

Test cases: (1) first request executes normally, (2) second request with same key returns cached response + `Idempotency-Replayed: true` header, (3) request without key proceeds normally.

**Step 3: Implement idempotency middleware**

```typescript
// registry/src/middleware/idempotency.ts
import type { Context, Next } from "hono";
import type Redis from "ioredis";

export function idempotencyMiddleware(redis: Redis) {
  return async (c: Context, next: Next) => {
    if (c.req.method !== "POST" && c.req.method !== "PUT") { await next(); return; }

    const key = c.req.header("Idempotency-Key");
    if (!key) { await next(); return; }

    const redisKey = `idempotency:${key}`;
    const cached = await redis.get(redisKey);
    if (cached) {
      const { status, body } = JSON.parse(cached);
      c.header("Idempotency-Replayed", "true");
      return c.json(body, status);
    }

    await next();

    // Cache the response (24h TTL)
    const body = await c.res.clone().json().catch(() => null);
    if (body) {
      await redis.set(redisKey, JSON.stringify({ status: c.res.status, body }), "EX", 86400);
    }
  };
}
```

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add registry/src/store/redis/cache.ts registry/src/middleware/idempotency.ts registry/src/middleware/idempotency.test.ts
git commit -m "feat(registry): add Redis cache and idempotency key middleware (P1-7)"
```

---

### Task 8: Redis Store Factory + Wire Into Hybrid AllStores

**Files:**
- Create: `registry/src/store/redis/index.ts`
- Modify: `registry/src/store/factory.ts`
- Modify: `registry/src/index.ts`

**Step 1: Create `registry/src/store/redis/index.ts`**

```typescript
import { createRedisClient } from "./client.js";
import { RedisRateLimitStore } from "./rate-limit-store.js";
import { RedisCache } from "./cache.js";
import type Redis from "ioredis";

export interface RedisStores {
  redis: Redis;
  rateLimit: RedisRateLimitStore;
  cache: RedisCache;
}

export async function createRedisStores(url: string, prefix: string = "kp:"): Promise<RedisStores> {
  const redis = createRedisClient(url, prefix);
  await redis.connect();
  return {
    redis,
    rateLimit: new RedisRateLimitStore(redis),
    cache: new RedisCache(redis),
  };
}
```

**Step 2: Update factory.ts** — when backend is `"postgres"`, also create Redis stores and swap rateLimit:

```typescript
case "postgres": {
  const { createPostgresStore } = await import("./postgres/index.js");
  const dbUrl = process.env.KP_DATABASE_URL;
  if (!dbUrl) throw new Error("KP_DATABASE_URL is required when KP_STORE_BACKEND=postgres");
  const stores = await createPostgresStore(dbUrl);

  // Layer Redis on top if configured
  const redisUrl = process.env.KP_REDIS_URL;
  if (redisUrl) {
    const { createRedisStores } = await import("./redis/index.js");
    const redisStores = await createRedisStores(redisUrl, process.env.KP_REDIS_PREFIX ?? "kp:");
    stores.rateLimit = redisStores.rateLimit;
    (stores as any)._redis = redisStores.redis;
    (stores as any)._cache = redisStores.cache;
  }

  return stores;
}
```

**Step 3: Update `index.ts`** — wire idempotency middleware with Redis when available:

```typescript
const redis = (stores as any)._redis;
if (redis) {
  app.use("*", idempotencyMiddleware(redis));
}
```

**Step 4: Run full test suite**

Run: `cd /home/ubuntu/knowledgepulse && bun test --recursive`
Expected: All pass

**Step 5: Commit**

```bash
git add registry/src/store/redis/index.ts registry/src/store/factory.ts registry/src/index.ts
git commit -m "feat(registry): wire Redis stores into hybrid AllStores factory"
```

---

## Phase C: Zvec Vector Search (P0-4 + P1-1)

### Task 9: Zvec Spike — Install and Verify

**Files:**
- Modify: `registry/package.json`

**Step 1: Install @zvec/zvec**

Run: `cd /home/ubuntu/knowledgepulse && bun add --cwd registry @zvec/zvec`

**Step 2: Spike test — create collection, insert, query**

Run a throwaway script:
```bash
cd /home/ubuntu/knowledgepulse && bun -e "
import { Collection } from '@zvec/zvec';
const col = new Collection({ name: 'test_spike', dimension: 384 });
col.insert({ id: 'doc1', vector: Array.from({length: 384}, () => Math.random()), metadata: { domain: 'test' } });
const results = col.query({ vector: Array.from({length: 384}, () => Math.random()), topk: 1 });
console.log('Spike OK:', results);
col.destroy();
"
```
Expected: Results array with id + score. If API differs, adjust based on actual Zvec docs.

**Step 3: Commit**

```bash
git add registry/package.json bun.lockb
git commit -m "feat(registry): add @zvec/zvec dependency for vector search"
```

---

### Task 10: Vector Search Provider + Zvec Implementation

**Files:**
- Create: `registry/src/store/zvec/vector-search.ts`
- Create: `registry/src/store/zvec/vector-search.test.ts`
- Create: `registry/src/store/zvec/index.ts`

**Step 1: Define VectorSearchProvider interface + write test**

```typescript
// registry/src/store/zvec/vector-search.ts
export interface VectorSearchResult {
  id: string;
  score: number;
}

export interface VectorSearchProvider {
  index(id: string, embedding: number[], metadata?: Record<string, unknown>): Promise<void>;
  search(embedding: number[], topk: number, filter?: Record<string, unknown>): Promise<VectorSearchResult[]>;
  delete(id: string): Promise<void>;
}
```

Test: insert 3 vectors, search, verify nearest neighbor ordering. Test delete.

**Step 2: Implement `ZvecSearchProvider`** wrapping `@zvec/zvec` Collection API.

**Step 3: Create `index.ts`** — factory that creates collections for skills + knowledge.

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add registry/src/store/zvec/
git commit -m "feat(registry): add Zvec vector search provider with hybrid search"
```

---

### Task 11: Wire Zvec Into Registry Search Endpoints

**Files:**
- Modify: `registry/src/routes/skills.ts` (search handler)
- Modify: `registry/src/routes/knowledge.ts` (search handler)
- Modify: `registry/src/store/factory.ts`
- Modify: `registry/src/index.ts`

**Step 1:** Add `VectorSearchProvider` to `AllStores` interface (or as a separate injectable). Modify `factory.ts` to init Zvec when backend is `"postgres"`.

**Step 2:** In skill/knowledge search routes: if vector search is available and query is present, compute embedding → call `vectorSearch.search()` → use returned IDs to filter PostgreSQL results. If Zvec unavailable, fall back to existing ILIKE text search.

**Step 3:** Run existing search tests — should still pass (graceful fallback).

**Step 4: Commit**

```bash
git add registry/src/routes/skills.ts registry/src/routes/knowledge.ts registry/src/store/factory.ts registry/src/index.ts
git commit -m "feat(registry): integrate Zvec hybrid search into skill and knowledge endpoints"
```

---

## Phase D: WebSocket Broadcast Fix (P0-6)

### Task 12: Fix Multi-Peer Broadcast

**Files:**
- Modify: `registry/src/routes/ws-collaborate.ts`
- Modify: `registry/src/routes/ws-collaborate.test.ts`

**Step 1: Write test** — two peers join same room, peer1 sends update, peer2 receives broadcast.

**Step 2: Fix implementation**

Add a `Map<string, Set<ServerWebSocket>>` to `CollaborationManager` tracking live sockets per room. In `createWebSocketHandler`:
- `open`: add WS to room set
- `message`: iterate room set, `ws.send()` to all except sender
- `close`: remove WS from set, broadcast leave to remaining

**Step 3: Run tests, verify pass**

**Step 4: Commit**

```bash
git add registry/src/routes/ws-collaborate.ts registry/src/routes/ws-collaborate.test.ts
git commit -m "fix(registry): WebSocket collaboration now broadcasts to all room peers"
```

---

## Phase E: JWT/OIDC Authentication (P1-2)

### Task 13: JWT Auth Middleware

**Files:**
- Modify: `registry/package.json` (add `jose`)
- Create: `registry/src/middleware/jwt-auth.ts`
- Create: `registry/src/middleware/jwt-auth.test.ts`
- Modify: `registry/src/middleware/auth.ts`

**Step 1: Install jose**

Run: `cd /home/ubuntu/knowledgepulse && bun add --cwd registry jose`

**Step 2: Write test** — mock JWKS endpoint, create signed JWT, verify middleware extracts claims into AuthContext.

**Step 3: Implement**

```typescript
// registry/src/middleware/jwt-auth.ts
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Context } from "hono";
import type { AuthContext } from "./auth.js";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function verifyJwt(token: string): Promise<AuthContext | null> {
  const issuer = process.env.KP_OIDC_ISSUER;
  const audience = process.env.KP_OIDC_AUDIENCE;
  const jwksUrl = process.env.KP_OIDC_JWKS_URL;
  if (!issuer || !jwksUrl) return null;

  if (!jwks) jwks = createRemoteJWKSet(new URL(jwksUrl));

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience });
    return {
      authenticated: true,
      tier: (payload.tier as string) ?? "pro",
      agentId: payload.agent_id as string ?? payload.sub,
    };
  } catch {
    return null;
  }
}
```

**Step 4: Modify `auth.ts`** — if Bearer token is not `kp_` prefixed, try JWT verification before falling through to unauthenticated.

**Step 5: Run full test suite — no regressions**

**Step 6: Commit**

```bash
git add registry/package.json registry/src/middleware/jwt-auth.ts registry/src/middleware/jwt-auth.test.ts registry/src/middleware/auth.ts bun.lockb
git commit -m "feat(registry): add JWT/OIDC authentication middleware (P1-2)"
```

---

## Phase F: Injection Classifier (P1-3)

### Task 14: Enhanced Prompt Injection Classifier

**Files:**
- Create: `packages/sdk/src/utils/injection-classifier.ts`
- Create: `packages/sdk/src/utils/injection-classifier.test.ts`
- Modify: `packages/sdk/src/utils/sanitizer.ts`
- Modify: `packages/sdk/src/index.ts`

**Step 1: Write test** — test known injection patterns (role-play, delimiter injection, base64 encoded instructions, multilingual injections, instruction override with markdown), verify clean content passes.

**Step 2: Implement classifier** — extended heuristic patterns beyond existing 6:
- Base64 encoded instruction blocks
- Markdown/HTML entity escapes hiding instructions
- Multi-language injection patterns (Chinese, Japanese)
- Nested delimiter attacks (`<|`, `[INST]`, `<<SYS>>`, `### System`)
- Returns `{ risk_score: number, patterns_matched: string[], safe: boolean }`

**Step 3: Integrate into `sanitizeSkillMd()`** — call classifier, include risk assessment in `SanitizeResult`.

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/sdk/src/utils/injection-classifier.ts packages/sdk/src/utils/injection-classifier.test.ts packages/sdk/src/utils/sanitizer.ts packages/sdk/src/index.ts
git commit -m "feat(sdk): add enhanced prompt injection classifier (P1-3)"
```

---

## Phase G: Provider Discovery (P1-4)

### Task 15: Provider Store + REST Endpoint + MCP Tool

**Files:**
- Modify: `registry/src/store/interfaces.ts` (add `ProviderStore`)
- Create: `registry/src/store/memory/provider-store.ts`
- Create: `registry/src/store/postgres/provider-store.ts`
- Create: `registry/src/routes/providers.ts`
- Create: `registry/src/routes/providers.test.ts`
- Create: `packages/mcp-server/src/tools/provider-discover.ts`
- Modify: `packages/mcp-server/src/tools/index.ts`
- Modify: `packages/mcp-server/src/registry.ts`
- Modify: `registry/src/index.ts`

**Step 1: Add `ProviderStore` interface** to `interfaces.ts`:

```typescript
export interface ProviderRecord {
  id: string; url: string; name: string;
  status: "active" | "inactive";
  last_heartbeat: string; registered_at: string;
}

export interface ProviderStore {
  register(provider: ProviderRecord): Promise<ProviderRecord>;
  list(): Promise<ProviderRecord[]>;
  heartbeat(id: string): Promise<void>;
  remove(id: string): Promise<boolean>;
}
```

**Step 2: Implement memory + PostgreSQL stores, write route + test.**

**Step 3: Implement `kp_provider_discover` MCP tool** — follow existing tool pattern: `server.tool("kp_provider_discover", ...)`.

**Step 4: Wire into registry `index.ts` and MCP `index.ts`.**

**Step 5: Run tests, verify pass**

**Step 6: Commit**

```bash
git add registry/src/store/interfaces.ts registry/src/store/memory/provider-store.ts registry/src/store/postgres/provider-store.ts registry/src/routes/providers.ts registry/src/routes/providers.test.ts packages/mcp-server/src/tools/provider-discover.ts packages/mcp-server/src/tools/index.ts packages/mcp-server/src/registry.ts registry/src/index.ts
git commit -m "feat: add provider discovery endpoint and MCP tool (P1-4)"
```

---

## Phase H: MCP Session Token Auth (P1-8)

### Task 16: MCP Session-to-API-Key Mapping

**Files:**
- Modify: `packages/mcp-server/src/index.ts`
- Create: `packages/mcp-server/src/session-auth.ts`
- Create: `packages/mcp-server/src/session-auth.test.ts`

**Step 1: Write test** — session init with API key → session token generated → subsequent calls resolve to API key.

**Step 2: Implement** — `SessionManager` class using in-memory Map (or Redis if available). Session created during MCP init handshake. Token stored as `kp:mcp-session:<token>` with 1h TTL.

**Step 3: Run tests, verify pass**

**Step 4: Commit**

```bash
git add packages/mcp-server/src/session-auth.ts packages/mcp-server/src/session-auth.test.ts packages/mcp-server/src/index.ts
git commit -m "feat(mcp): add session token to API key mapping (P1-8)"
```

---

## Phase I: CLI + OpenAPI Spec (P1-6 + P1-5)

### Task 17: `kp list` Command

**Files:**
- Create: `packages/cli/src/commands/list.ts`
- Create: `packages/cli/src/commands/list.test.ts`
- Modify: `packages/cli/src/index.ts`

**Step 1: Write test** — mock `~/.claude/skills/` directory with sample SKILL.md files, verify `listCommand` outputs parsed table.

**Step 2: Implement** — scan directory for `*.md`, parse frontmatter (reuse `parseSkillMd` from SDK), format as table.

**Step 3: Register in `index.ts`**: `program.addCommand(listCommand);`

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/cli/src/commands/list.ts packages/cli/src/commands/list.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add kp list command to show installed skills (P1-6)"
```

---

### Task 18: OpenAPI Specification

**Files:**
- Create: `specs/api-openapi.yaml`

**Step 1:** Write OpenAPI 3.1 spec covering all registry endpoints. Reference Zod schemas for request/response types. Include:
- All `/v1/skills`, `/v1/knowledge`, `/v1/reputation`, `/v1/sop`, `/v1/marketplace`, `/v1/auth`, `/v1/export`, `/v1/providers` endpoints
- Auth schemes: API Key (Bearer `kp_*`), JWT (Bearer)
- Rate limit headers
- Error responses (400, 401, 403, 404, 429)

**Step 2: Validate**

Run: `cd /home/ubuntu/knowledgepulse && bunx @redocly/cli lint specs/api-openapi.yaml`

**Step 3: Commit**

```bash
git add specs/api-openapi.yaml
git commit -m "docs: add OpenAPI 3.1 specification for registry API (P1-5)"
```

---

## Phase J: GitHub Actions CI/CD (P0-5)

### Task 19: CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create workflow**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bunx tsc --noEmit -p packages/sdk/tsconfig.json

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run build
      - run: bun test --recursive

  codegen:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run build
      - run: bun run codegen
      - run: git diff --exit-code specs/knowledge-unit-schema.json

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run build
```

**Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for lint, typecheck, test, codegen, build (P0-5)"
```

---

## Final: Run Full Test Suite + Integration Verification

Run: `cd /home/ubuntu/knowledgepulse && bun test --recursive`
Expected: All existing tests pass + new PG/Redis/Zvec/P1 tests pass.

Run: `cd /home/ubuntu/knowledgepulse && KP_STORE_BACKEND=postgres KP_DATABASE_URL='postgresql://knowledgepulse_user:KPulse2026Secure@172.31.9.157:5432/knowledgepulse' KP_REDIS_URL='redis://:bibi5566778800@localhost:6379/0' bun run registry/src/index.ts`
Expected: Registry starts on port 8080 with PostgreSQL + Redis backends.

---

## Task Summary

| # | Task | Phase | Est. |
|---|------|-------|------|
| 1 | PG connection pool + DDL | A | Medium |
| 2 | PgSkillStore | A | Medium |
| 3 | PG remaining 8 stores | A | Large |
| 4 | PG factory + wire index.ts | A | Small |
| 5 | Redis client + install | B | Small |
| 6 | Redis RateLimitStore | B | Medium |
| 7 | Redis cache + idempotency | B | Medium |
| 8 | Redis factory + wire | B | Small |
| 9 | Zvec spike | C | Small |
| 10 | Zvec VectorSearchProvider | C | Medium |
| 11 | Zvec wire into search | C | Medium |
| 12 | WebSocket broadcast fix | D | Small |
| 13 | JWT/OIDC middleware | E | Medium |
| 14 | Injection classifier | F | Medium |
| 15 | Provider discovery | G | Medium |
| 16 | MCP session token auth | H | Small |
| 17 | `kp list` command | I | Small |
| 18 | OpenAPI spec | I | Medium |
| 19 | GitHub Actions CI | J | Small |
