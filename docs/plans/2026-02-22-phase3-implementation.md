# Phase 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Phase 3 of KnowledgePulse — Expert SOP Studio with visual decision tree editor, Knowledge Marketplace with credit-based payments, KP-REP badge system, document import pipeline, and real-time collaboration.

**Architecture:** Six workstreams building on Phase 2. The registry gets new SOP, marketplace, and credit stores following the existing interface pattern. A new React SPA (SOP Studio) provides the visual editor using React Flow. Document import uses mammoth/pdf-parse for parsing and client-side LLM for extraction. Badge levels auto-grant based on contribution thresholds.

**Tech Stack:** TypeScript + Bun, Hono, Zod, React 19, Vite, @xyflow/react, Tailwind CSS 4, yjs, mammoth, pdf-parse, `bun:test`

**Existing tests:** `bun test --recursive` (413 tests, 24 files). All must continue passing after every task.

**Commit convention:** `feat:`, `fix:`, `test:`, `docs:` prefixes. Co-authored-by trailer.

---

## Task 1: SOP Store Interface + Types

**Files:**
- Modify: `registry/src/store/interfaces.ts`

**Context:** We need a `SopStore` interface and `StoredSOP` type following the existing pattern (see `SkillStore`, `KnowledgeStore` in the same file). The SOP store supports versioning, approval workflow, and SKILL.md sync.

**Step 1: Add types and interface to interfaces.ts**

After the `StoredKnowledgeUnit` interface (line 39), add:

```typescript
export interface StoredSOP {
  id: string;
  sop: ExpertSOP;
  version: number;
  previous_version_id?: string;
  status: "draft" | "pending_review" | "approved" | "rejected";
  visibility: Visibility;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SOPVersion {
  sop_id: string;
  version: number;
  diff_summary: string;
  created_at: string;
}
```

After the `ReputationStore` interface, add:

```typescript
export interface SopStore {
  create(sop: StoredSOP): Promise<StoredSOP>;
  getById(id: string): Promise<StoredSOP | undefined>;
  search(opts: {
    query?: string;
    domain?: string;
    status?: StoredSOP["status"];
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredSOP>>;
  update(id: string, updates: Partial<StoredSOP>): Promise<StoredSOP | undefined>;
  delete(id: string): Promise<boolean>;
  getVersions(id: string): Promise<SOPVersion[]>;
  addVersion(version: SOPVersion): Promise<void>;
  getByDomain(domain: string): Promise<StoredSOP[]>;
}
```

Update `AllStores` to include:

```typescript
export interface AllStores {
  skills: SkillStore;
  knowledge: KnowledgeStore;
  reputation: ReputationStore;
  apiKeys: ApiKeyStore;
  rateLimit: RateLimitStore;
  auditLog: AuditLogStore;
  sop: SopStore;
}
```

Import `ExpertSOP` from `@knowledgepulse/sdk` at the top (line 1).

**Step 2: Run tests to verify nothing breaks**

Run: `cd /home/ubuntu/knowledgepulse && bun test --recursive`
Expected: Tests fail because `createMemoryStore()` and `createSqliteStore()` don't return `sop`.

**Step 3: Commit**

```bash
git add registry/src/store/interfaces.ts
git commit -m "feat(registry): add SopStore interface with versioning and approval workflow"
```

---

## Task 2: Memory SOP Store

**Files:**
- Create: `registry/src/store/memory/sop-store.ts`
- Create: `registry/src/store/memory/sop-store.test.ts`
- Modify: `registry/src/store/memory/index.ts`

**Context:** Implement `SopStore` with in-memory Maps, following the pattern of `MemorySkillStore` and `MemoryKnowledgeStore`.

**Step 1: Write failing tests**

Create `registry/src/store/memory/sop-store.test.ts`:

```typescript
import { describe, expect, test, beforeEach } from "bun:test";
import { MemorySopStore } from "./sop-store.js";
import type { StoredSOP } from "../interfaces.js";
import type { ExpertSOP } from "@knowledgepulse/sdk";

const makeSOP = (overrides: Partial<ExpertSOP> = {}): ExpertSOP => ({
  "@context": "https://openknowledgepulse.org/schema/v1",
  "@type": "ExpertSOP",
  id: `kp:sop:${crypto.randomUUID()}`,
  name: overrides.name ?? "Test SOP",
  domain: overrides.domain ?? "finance",
  metadata: {
    created_at: new Date().toISOString(),
    agent_id: "kp:agent:test",
    task_domain: "finance",
    success: true,
    quality_score: 0.85,
    visibility: "network",
    privacy_level: "aggregated",
  },
  source: {
    type: "human_expert",
    expert_id: "kp:expert:test",
    credentials: [],
  },
  decision_tree: [
    { step: "Step 1", instruction: "Do something" },
  ],
  ...overrides,
});

const makeStored = (sopOverrides: Partial<ExpertSOP> = {}, storeOverrides: Partial<StoredSOP> = {}): StoredSOP => {
  const sop = makeSOP(sopOverrides);
  return {
    id: sop.id,
    sop,
    version: 1,
    status: "draft",
    visibility: "network",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...storeOverrides,
  };
};

describe("MemorySopStore", () => {
  let store: MemorySopStore;

  beforeEach(() => {
    store = new MemorySopStore();
  });

  test("create and getById", async () => {
    const entry = makeStored();
    const created = await store.create(entry);
    expect(created.id).toBe(entry.id);
    const found = await store.getById(entry.id);
    expect(found).toBeDefined();
    expect(found!.sop.name).toBe("Test SOP");
  });

  test("search by domain", async () => {
    await store.create(makeStored({ domain: "finance" }));
    await store.create(makeStored({ domain: "medical" }));
    const result = await store.search({ domain: "finance" });
    expect(result.data.length).toBe(1);
    expect(result.data[0].sop.domain).toBe("finance");
  });

  test("search by status", async () => {
    await store.create(makeStored({}, { status: "draft" }));
    await store.create(makeStored({}, { status: "approved" }));
    const result = await store.search({ status: "approved" });
    expect(result.data.length).toBe(1);
  });

  test("update changes fields", async () => {
    const entry = makeStored();
    await store.create(entry);
    const updated = await store.update(entry.id, { status: "approved", approved_by: "admin" });
    expect(updated!.status).toBe("approved");
    expect(updated!.approved_by).toBe("admin");
  });

  test("delete removes entry", async () => {
    const entry = makeStored();
    await store.create(entry);
    expect(await store.delete(entry.id)).toBe(true);
    expect(await store.getById(entry.id)).toBeUndefined();
  });

  test("version history", async () => {
    const entry = makeStored();
    await store.create(entry);
    await store.addVersion({ sop_id: entry.id, version: 1, diff_summary: "Initial", created_at: new Date().toISOString() });
    await store.addVersion({ sop_id: entry.id, version: 2, diff_summary: "Updated step", created_at: new Date().toISOString() });
    const versions = await store.getVersions(entry.id);
    expect(versions.length).toBe(2);
    expect(versions[1].version).toBe(2);
  });

  test("getByDomain", async () => {
    await store.create(makeStored({ domain: "finance" }));
    await store.create(makeStored({ domain: "finance" }));
    await store.create(makeStored({ domain: "medical" }));
    const results = await store.getByDomain("finance");
    expect(results.length).toBe(2);
  });

  test("search with pagination", async () => {
    for (let i = 0; i < 5; i++) {
      await store.create(makeStored({ name: `SOP ${i}` }));
    }
    const page1 = await store.search({ pagination: { offset: 0, limit: 2 } });
    expect(page1.data.length).toBe(2);
    expect(page1.total).toBe(5);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /home/ubuntu/knowledgepulse && bun test registry/src/store/memory/sop-store.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement MemorySopStore**

Create `registry/src/store/memory/sop-store.ts`:

```typescript
import type {
  PaginatedResult,
  PaginationOpts,
  SOPVersion,
  SopStore,
  StoredSOP,
} from "../interfaces.js";

export class MemorySopStore implements SopStore {
  private sops = new Map<string, StoredSOP>();
  private versions = new Map<string, SOPVersion[]>();

  async create(sop: StoredSOP): Promise<StoredSOP> {
    this.sops.set(sop.id, { ...sop });
    return sop;
  }

  async getById(id: string): Promise<StoredSOP | undefined> {
    return this.sops.get(id);
  }

  async search(opts: {
    query?: string;
    domain?: string;
    status?: StoredSOP["status"];
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredSOP>> {
    let results = Array.from(this.sops.values());

    if (opts.query) {
      const q = opts.query.toLowerCase();
      results = results.filter(
        (s) =>
          s.sop.name.toLowerCase().includes(q) ||
          s.sop.domain.toLowerCase().includes(q),
      );
    }
    if (opts.domain) {
      results = results.filter((s) => s.sop.domain === opts.domain);
    }
    if (opts.status) {
      results = results.filter((s) => s.status === opts.status);
    }

    const total = results.length;
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;
    const data = results.slice(offset, offset + limit);

    return { data, total, offset, limit };
  }

  async update(id: string, updates: Partial<StoredSOP>): Promise<StoredSOP | undefined> {
    const existing = this.sops.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.sops.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.sops.delete(id);
  }

  async getVersions(id: string): Promise<SOPVersion[]> {
    return this.versions.get(id) ?? [];
  }

  async addVersion(version: SOPVersion): Promise<void> {
    const existing = this.versions.get(version.sop_id) ?? [];
    existing.push(version);
    this.versions.set(version.sop_id, existing);
  }

  async getByDomain(domain: string): Promise<StoredSOP[]> {
    return Array.from(this.sops.values()).filter((s) => s.sop.domain === domain);
  }
}
```

**Step 4: Update memory store index**

In `registry/src/store/memory/index.ts`, add:

```typescript
import { MemorySopStore } from "./sop-store.js";
```

And in `createMemoryStore()` return, add: `sop: new MemorySopStore(),`

And at bottom: `export { MemorySopStore } from "./sop-store.js";`

**Step 5: Run tests**

Run: `cd /home/ubuntu/knowledgepulse && bun test registry/src/store/memory/sop-store.test.ts`
Expected: All tests pass.

Run: `cd /home/ubuntu/knowledgepulse && bun test --recursive`
Expected: Some tests may fail if other stores expect exact `AllStores` shape. Fix by updating `createSqliteStore()` in Task 3.

**Step 6: Commit**

```bash
git add registry/src/store/memory/sop-store.ts registry/src/store/memory/sop-store.test.ts registry/src/store/memory/index.ts
git commit -m "feat(registry): implement MemorySopStore with versioning"
```

---

## Task 3: SQLite SOP Store + Fix Store Factories

**Files:**
- Create: `registry/src/store/sqlite/sop-store.ts`
- Modify: `registry/src/store/sqlite/index.ts`
- Modify: `registry/src/store/sqlite/db.ts`
- Modify: `registry/src/store/factory.ts`

**Context:** Add SQLite SOP store and fix both store factories to include `sop` in `AllStores`. The SQLite `db.ts` needs a new `sops` table + `sop_versions` table.

**Step 1: Add SOP tables to db.ts**

In `registry/src/store/sqlite/db.ts`, add table creation statements:

```sql
CREATE TABLE IF NOT EXISTS sops (
  id TEXT PRIMARY KEY,
  sop_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  previous_version_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'network',
  approved_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sop_versions (
  sop_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  diff_summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (sop_id, version)
);
```

**Step 2: Implement SqliteSopStore**

Create `registry/src/store/sqlite/sop-store.ts` implementing the `SopStore` interface. Follow the pattern of `SqliteSkillStore` — serialize `sop` as JSON, parse on read.

**Step 3: Update SQLite index**

In `registry/src/store/sqlite/index.ts`:
- Import `SqliteSopStore`
- Add `sop: new SqliteSopStore(db)` to the returned object
- Add an `auditLog` stub if missing (the SQLite factory currently lacks it — add a memory audit log as fallback)
- Export `SqliteSopStore`

**Step 4: Update store factory**

In `registry/src/store/factory.ts`, ensure `createStore()` returns complete `AllStores` for both backends.

**Step 5: Run all tests**

Run: `cd /home/ubuntu/knowledgepulse && bun test --recursive`
Expected: All tests pass (413 existing + new SOP store tests).

**Step 6: Commit**

```bash
git add registry/src/store/sqlite/sop-store.ts registry/src/store/sqlite/index.ts registry/src/store/sqlite/db.ts registry/src/store/factory.ts
git commit -m "feat(registry): add SQLite SOP store and fix store factories"
```

---

## Task 4: SOP Routes (CRUD + Approval + SKILL.md Sync)

**Files:**
- Create: `registry/src/routes/sop.ts`
- Create: `registry/src/routes/sop.test.ts`
- Modify: `registry/src/index.ts`

**Context:** SOP routes follow the same pattern as `knowledgeRoutes()` and `skillRoutes()`. Uses Hono, receives `AllStores`, validates with Zod (`ExpertSOPSchema`).

**Step 1: Write failing route tests**

Create `registry/src/routes/sop.test.ts` with tests for:
- `POST /v1/sop` — creates SOP with validation, requires auth + write scope + KP-REP >= 0.3
- `GET /v1/sop/:id` — returns SOP
- `GET /v1/sop` — search with domain/status filters
- `PUT /v1/sop/:id` — updates SOP, creates new version
- `GET /v1/sop/:id/versions` — returns version history
- `POST /v1/sop/:id/approve` — changes status to approved (admin only)
- `POST /v1/sop/:id/export-skill` — generates SKILL.md from SOP and registers in skill store
- `DELETE /v1/sop/:id` — deletes (owner or admin)

Test setup: Create Hono app with auth mock (set `c.set("auth", {...})`) and pass `createMemoryStore()`.

**Step 2: Implement SOP routes**

Create `registry/src/routes/sop.ts`:

```typescript
import { ExpertSOPSchema } from "@knowledgepulse/sdk";
import { Hono } from "hono";
import type { AuthContext } from "../middleware/auth.js";
import type { AllStores, StoredSOP } from "../store/interfaces.js";

export function sopRoutes(stores: AllStores) {
  const app = new Hono();

  // POST /v1/sop — Create SOP
  app.post("/", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) return c.json({ error: "Authentication required" }, 401);
    if (!auth.apiKey?.scopes.includes("write") && !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Write scope required" }, 403);
    }
    // Check KP-REP >= 0.3
    if (auth.agentId) {
      const rep = await stores.reputation.get(auth.agentId);
      if (!rep || rep.score < 0.3) {
        return c.json({ error: "Minimum KP-REP score of 0.3 required" }, 403);
      }
    }

    const body = await c.req.json();
    const parsed = ExpertSOPSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid ExpertSOP", issues: parsed.error.issues.map(i => ({ path: i.path.join("."), message: i.message })) }, 400);
    }

    const now = new Date().toISOString();
    const entry: StoredSOP = {
      id: parsed.data.id,
      sop: parsed.data,
      version: 1,
      status: "draft",
      visibility: parsed.data.metadata.visibility,
      created_at: now,
      updated_at: now,
    };

    const created = await stores.sop.create(entry);
    await stores.sop.addVersion({ sop_id: entry.id, version: 1, diff_summary: "Initial version", created_at: now });

    if (auth.agentId) {
      await stores.reputation.upsert(auth.agentId, 0.15, "Created ExpertSOP");
    }

    return c.json({ data: created }, 201);
  });

  // GET /v1/sop — Search
  app.get("/", async (c) => {
    const query = c.req.query("q");
    const domain = c.req.query("domain");
    const status = c.req.query("status") as StoredSOP["status"] | undefined;
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 20;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : 0;

    const result = await stores.sop.search({ query, domain, status, pagination: { offset, limit } });
    return c.json(result);
  });

  // GET /v1/sop/:id — Get by ID
  app.get("/:id", async (c) => {
    const entry = await stores.sop.getById(c.req.param("id"));
    if (!entry) return c.json({ error: "SOP not found" }, 404);
    return c.json({ data: entry });
  });

  // PUT /v1/sop/:id — Update (creates new version)
  app.put("/:id", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) return c.json({ error: "Authentication required" }, 401);

    const existing = await stores.sop.getById(c.req.param("id"));
    if (!existing) return c.json({ error: "SOP not found" }, 404);

    if (existing.sop.metadata.agent_id !== auth.agentId && !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const body = await c.req.json();
    const parsed = ExpertSOPSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid ExpertSOP", issues: parsed.error.issues }, 400);
    }

    const newVersion = existing.version + 1;
    const now = new Date().toISOString();
    const updated = await stores.sop.update(c.req.param("id"), {
      sop: parsed.data,
      version: newVersion,
      previous_version_id: existing.id,
      status: "draft",
    });

    await stores.sop.addVersion({ sop_id: existing.id, version: newVersion, diff_summary: `Updated to v${newVersion}`, created_at: now });

    return c.json({ data: updated });
  });

  // GET /v1/sop/:id/versions — Version history
  app.get("/:id/versions", async (c) => {
    const versions = await stores.sop.getVersions(c.req.param("id"));
    return c.json({ data: versions });
  });

  // POST /v1/sop/:id/approve — Approve SOP (admin only)
  app.post("/:id/approve", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated || !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Admin access required" }, 403);
    }

    const entry = await stores.sop.getById(c.req.param("id"));
    if (!entry) return c.json({ error: "SOP not found" }, 404);

    const updated = await stores.sop.update(c.req.param("id"), {
      status: "approved",
      approved_by: auth.agentId,
    });

    return c.json({ data: updated });
  });

  // POST /v1/sop/:id/export-skill — Generate SKILL.md from SOP
  app.post("/:id/export-skill", async (c) => {
    const entry = await stores.sop.getById(c.req.param("id"));
    if (!entry) return c.json({ error: "SOP not found" }, 404);

    const { generateSkillMd } = await import("@knowledgepulse/sdk");
    const sop = entry.sop;
    const body = sop.decision_tree.map((step, i) => `## Step ${i + 1}: ${step.step}\n\n${step.instruction}`).join("\n\n");
    const skillMd = generateSkillMd(
      { name: sop.name, description: `ExpertSOP: ${sop.name}`, tags: [sop.domain] },
      body,
      { domain: sop.domain, knowledge_capture: true, visibility: entry.visibility },
    );

    const skillId = `kp:skill:${sop.name.toLowerCase().replace(/\s+/g, "-")}:1.0.0`;
    const now = new Date().toISOString();
    const skill = await stores.skills.create({
      id: skillId,
      name: sop.name,
      description: `ExpertSOP: ${sop.name}`,
      tags: [sop.domain],
      content: skillMd,
      visibility: entry.visibility,
      quality_score: sop.metadata.quality_score,
      created_at: now,
      updated_at: now,
    });

    return c.json({ data: { skill_id: skill.id, skill_md: skillMd } }, 201);
  });

  // DELETE /v1/sop/:id
  app.delete("/:id", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) return c.json({ error: "Authentication required" }, 401);

    const entry = await stores.sop.getById(c.req.param("id"));
    if (!entry) return c.json({ error: "SOP not found" }, 404);

    if (entry.sop.metadata.agent_id !== auth.agentId && !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await stores.sop.delete(c.req.param("id"));
    return c.json({ deleted: true, unit_id: entry.id, deleted_at: new Date().toISOString() });
  });

  return app;
}
```

**Step 3: Mount in registry index.ts**

Add import and mount:
```typescript
import { sopRoutes } from "./routes/sop.js";
// ...
app.route("/v1/sop", sopRoutes(stores));
```

**Step 4: Run tests**

Run: `cd /home/ubuntu/knowledgepulse && bun test --recursive`
Expected: All pass.

**Step 5: Commit**

```bash
git add registry/src/routes/sop.ts registry/src/routes/sop.test.ts registry/src/index.ts
git commit -m "feat(registry): add SOP routes with CRUD, approval, versioning, and SKILL.md export"
```

---

## Task 5: Credit + Marketplace Store Interfaces

**Files:**
- Modify: `registry/src/store/interfaces.ts`

**Context:** Add credit ledger and marketplace listing stores.

**Step 1: Add types and interfaces**

After the `SopStore` interface, add:

```typescript
// ── Marketplace Types ─────────────────────────────────

export interface CreditTransaction {
  id: string;
  agent_id: string;
  amount: number;
  type: "purchase" | "earned" | "spent" | "payout" | "refill";
  description: string;
  related_listing_id?: string;
  created_at: string;
}

export interface MarketplaceListing {
  id: string;
  knowledge_unit_id: string;
  contributor_id: string;
  price_credits: number;
  access_model: "free" | "org" | "subscription";
  domain: string;
  title: string;
  description: string;
  purchases: number;
  created_at: string;
  updated_at: string;
}

export interface CreditStore {
  getBalance(agentId: string): Promise<number>;
  addCredits(agentId: string, amount: number, reason: string): Promise<void>;
  deductCredits(agentId: string, amount: number, reason: string): Promise<boolean>;
  getTransactions(agentId: string, pagination: PaginationOpts): Promise<PaginatedResult<CreditTransaction>>;
  getLastRefill(agentId: string): Promise<string | undefined>;
  setLastRefill(agentId: string, date: string): Promise<void>;
}

export interface MarketplaceStore {
  createListing(listing: MarketplaceListing): Promise<MarketplaceListing>;
  getListing(id: string): Promise<MarketplaceListing | undefined>;
  search(opts: {
    domain?: string;
    access_model?: string;
    query?: string;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<MarketplaceListing>>;
  recordPurchase(listingId: string, buyerId: string): Promise<void>;
  getByContributor(contributorId: string): Promise<MarketplaceListing[]>;
}
```

Update `AllStores`:

```typescript
export interface AllStores {
  skills: SkillStore;
  knowledge: KnowledgeStore;
  reputation: ReputationStore;
  apiKeys: ApiKeyStore;
  rateLimit: RateLimitStore;
  auditLog: AuditLogStore;
  sop: SopStore;
  credits: CreditStore;
  marketplace: MarketplaceStore;
}
```

**Step 2: Commit**

```bash
git add registry/src/store/interfaces.ts
git commit -m "feat(registry): add CreditStore and MarketplaceStore interfaces"
```

---

## Task 6: Memory Credit + Marketplace Stores

**Files:**
- Create: `registry/src/store/memory/credit-store.ts`
- Create: `registry/src/store/memory/marketplace-store.ts`
- Create: `registry/src/store/memory/credit-store.test.ts`
- Create: `registry/src/store/memory/marketplace-store.test.ts`
- Modify: `registry/src/store/memory/index.ts`

**Context:** Implement both stores with in-memory Maps. Credit store tracks balances and transactions. Marketplace store tracks listings and purchases.

**Step 1: Write tests for credit store**

Test: create agent with 0 balance, add credits, deduct credits, verify balance, deduct more than balance returns false, transaction history.

**Step 2: Implement MemoryCreditStore**

Track `balances: Map<string, number>`, `transactions: Map<string, CreditTransaction[]>`, `lastRefill: Map<string, string>`.

**Step 3: Write tests for marketplace store**

Test: create listing, search by domain, search by access_model, record purchase increments count, getByContributor.

**Step 4: Implement MemoryMarketplaceStore**

Track `listings: Map<string, MarketplaceListing>`.

**Step 5: Update memory index**

Add both stores to `createMemoryStore()`.

**Step 6: Run all tests and commit**

```bash
git add registry/src/store/memory/credit-store.ts registry/src/store/memory/marketplace-store.ts registry/src/store/memory/credit-store.test.ts registry/src/store/memory/marketplace-store.test.ts registry/src/store/memory/index.ts
git commit -m "feat(registry): implement memory credit and marketplace stores"
```

---

## Task 7: Marketplace Routes

**Files:**
- Create: `registry/src/routes/marketplace.ts`
- Create: `registry/src/routes/marketplace.test.ts`
- Modify: `registry/src/index.ts`

**Context:** REST API for browsing, purchasing, and managing credits. Revenue sharing: 70% to contributor, 30% platform fee.

**Routes:**
- `GET /v1/marketplace/listings` — Browse (domain, access_model, query, pagination)
- `GET /v1/marketplace/listings/:id` — Detail
- `POST /v1/marketplace/listings` — Create listing (authenticated contributor)
- `POST /v1/marketplace/purchase/:id` — Buy with credits (deduct from buyer, payout to contributor at 70%)
- `GET /v1/marketplace/balance` — Credit balance (auto-refill if 30+ days since last refill: free=100, pro=1000)
- `GET /v1/marketplace/earnings` — Contributor's payout transaction history
- `POST /v1/marketplace/credits` — Admin: add credits to an agent

**Revenue sharing env var:** `KP_MARKETPLACE_REVENUE_SHARE` (default `0.70`).

**Step 1: Write route tests** covering all endpoints, auth checks, credit math, revenue splitting.

**Step 2: Implement marketplace routes.**

**Step 3: Mount in registry: `app.route("/v1/marketplace", marketplaceRoutes(stores));`**

**Step 4: Run all tests and commit.**

```bash
git add registry/src/routes/marketplace.ts registry/src/routes/marketplace.test.ts registry/src/index.ts
git commit -m "feat(registry): add marketplace routes with credit-based purchases and revenue sharing"
```

---

## Task 8: Badge + Certification Store Types

**Files:**
- Modify: `registry/src/store/interfaces.ts`

**Context:** Add badge and certification proposal types. Extend `ReputationStore` with badge methods.

**Step 1: Add types**

```typescript
// ── Badge Types ───────────────────────────────────────

export type BadgeLevel = "bronze" | "silver" | "gold" | "authority";

export interface DomainBadge {
  badge_id: string;
  agent_id: string;
  domain: string;
  level: BadgeLevel;
  granted_at: string;
  granted_by: string; // "system" for auto, agent_id for admin/vote
}

export interface CertificationProposal {
  proposal_id: string;
  agent_id: string;
  domain: string;
  target_level: "gold" | "authority";
  proposed_by: string;
  votes: Array<{ voter_id: string; approve: boolean; weight: number }>;
  status: "open" | "approved" | "rejected";
  created_at: string;
  closes_at: string;
}
```

**Step 2: Extend ReputationStore**

Add methods:
```typescript
  getBadges(agentId: string): Promise<DomainBadge[]>;
  grantBadge(badge: DomainBadge): Promise<void>;
  hasBadge(agentId: string, domain: string, level: BadgeLevel): Promise<boolean>;
  createProposal(proposal: CertificationProposal): Promise<CertificationProposal>;
  getProposal(proposalId: string): Promise<CertificationProposal | undefined>;
  getOpenProposals(): Promise<CertificationProposal[]>;
  addVoteToProposal(proposalId: string, vote: CertificationProposal["votes"][0]): Promise<void>;
  updateProposalStatus(proposalId: string, status: CertificationProposal["status"]): Promise<void>;
```

**Step 3: Commit**

```bash
git add registry/src/store/interfaces.ts
git commit -m "feat(registry): add badge and certification proposal types to ReputationStore"
```

---

## Task 9: Badge Implementation + Auto-Grant Logic

**Files:**
- Modify: `registry/src/store/memory/reputation-store.ts`
- Create: `registry/src/store/memory/badge.test.ts`

**Context:** Implement badge storage and auto-grant evaluation. When `upsert()` is called (contribution), check if the agent qualifies for bronze or silver auto-grant.

**Auto-grant rules:**
- **Bronze**: 10+ contributions in domain, avg quality >= 0.7
- **Silver**: 50+ contributions, 20+ validations, avg quality >= 0.8

**Step 1: Write tests**

Test: agent contributes 10 times → auto-granted bronze. Agent contributes 50 times + 20 validations → auto-granted silver. Gold requires admin proposal. Authority requires community vote.

**Step 2: Implement badge methods in MemoryReputationStore**

Add `badges: Map<string, DomainBadge[]>`, `proposals: Map<string, CertificationProposal>` as private fields.

Implement all methods from the extended interface.

Add `evaluateBadges(agentId: string, domain: string)` private method called from `upsert()`.

**Step 3: Run tests and commit**

```bash
git add registry/src/store/memory/reputation-store.ts registry/src/store/memory/badge.test.ts
git commit -m "feat(registry): implement badge auto-grant and certification proposals"
```

---

## Task 10: Badge + Certification Routes

**Files:**
- Modify: `registry/src/routes/reputation.ts`
- Create: `registry/src/routes/badge.test.ts`

**Context:** Add badge and certification endpoints to the existing reputation routes.

**New routes (add to `reputationRoutes()`):**
- `GET /v1/reputation/:agent_id/badges` — List agent's badges
- `POST /v1/reputation/:agent_id/certify` — Create certification proposal (admin, for gold/authority)
- `POST /v1/reputation/proposals/:proposal_id/vote` — Cast vote (quadratic: weight = sqrt(KP-REP score))
- `GET /v1/reputation/proposals` — List open proposals

**Voting rules:**
- Voter must have been registered 30+ days (`canVote()`)
- Weight = `Math.sqrt(voterReputation.score)`
- When total votes >= 5 and approval rate > 60% (weighted), auto-approve and grant badge
- When total votes >= 5 and approval rate <= 60%, auto-reject

**Step 1: Write tests, Step 2: Implement, Step 3: Run all tests and commit.**

```bash
git add registry/src/routes/reputation.ts registry/src/routes/badge.test.ts
git commit -m "feat(registry): add badge and certification voting routes"
```

---

## Task 11: SDK SOP Import Module

**Files:**
- Create: `packages/sdk/src/sop-import/types.ts`
- Create: `packages/sdk/src/sop-import/parse-docx.ts`
- Create: `packages/sdk/src/sop-import/parse-pdf.ts`
- Create: `packages/sdk/src/sop-import/extract.ts`
- Create: `packages/sdk/src/sop-import/index.ts`
- Create: `packages/sdk/src/sop-import/extract.test.ts`
- Modify: `packages/sdk/src/index.ts`
- Modify: `packages/sdk/package.json`

**Context:** SDK module for parsing documents and extracting decision trees. `mammoth` converts docx → HTML/text. `pdf-parse` extracts PDF text. `extract.ts` provides a function that calls an LLM API to convert raw text into an `ExpertSOP.decision_tree` array.

**Types:**

```typescript
export interface LLMConfig {
  provider: "anthropic" | "openai";
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface ParseResult {
  text: string;
  sections: Array<{ heading: string; content: string }>;
  metadata: { pages?: number; format: string };
}

export interface ExtractionResult {
  decision_tree: ExpertSOP["decision_tree"];
  name: string;
  domain: string;
  confidence: number;
}
```

**parse-docx.ts:** Uses `mammoth` to convert `.docx` buffer to text and extract sections from headings.

**parse-pdf.ts:** Uses `pdf-parse` to extract text and page count.

**extract.ts:** `extractDecisionTree(parseResult: ParseResult, config: LLMConfig): Promise<ExtractionResult>` — calls the LLM with a structured prompt, parses JSON response, validates against `ExpertSOPSchema` decision_tree shape.

**SDK exports:** Add `parseDocx`, `parsePdf`, `extractDecisionTree`, `LLMConfig`, `ParseResult`, `ExtractionResult`.

**Dependencies:** Add `mammoth` and `pdf-parse` as optional dependencies in `packages/sdk/package.json`.

**Tests:** Test the extraction prompt template generation and JSON parsing (mock LLM response). Test `parseDocx` and `parsePdf` with small test fixtures.

**Step 1-4: Write tests, implement, run, commit.**

```bash
git add packages/sdk/src/sop-import/ packages/sdk/src/index.ts packages/sdk/package.json
git commit -m "feat(sdk): add SOP import module with document parsing and LLM extraction"
```

---

## Task 12: SOP Studio — Scaffold React + Vite + Tailwind

**Files:**
- Rewrite: `packages/sop-studio/package.json`
- Create: `packages/sop-studio/vite.config.ts`
- Create: `packages/sop-studio/tailwind.config.ts`
- Create: `packages/sop-studio/postcss.config.js`
- Create: `packages/sop-studio/index.html`
- Create: `packages/sop-studio/src/main.tsx`
- Create: `packages/sop-studio/src/App.tsx`
- Create: `packages/sop-studio/src/index.css`
- Create: `packages/sop-studio/src/lib/api.ts`
- Create: `packages/sop-studio/tsconfig.json` (rewrite for React)

**Context:** Set up the SOP Studio as a React SPA with Vite + Tailwind. This is the foundation — just the shell with routing and API client. No actual pages yet.

**package.json:**

```json
{
  "name": "@knowledgepulse/sop-studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@xyflow/react": "^12.0.0",
    "yjs": "^13.6.0",
    "y-websocket": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.4.0"
  }
}
```

**API client** (`src/lib/api.ts`): Wraps `fetch()` calls to the registry with auth header from localStorage.

**App.tsx:** React Router with routes: `/` (dashboard), `/editor/:id` (editor), `/import` (import), `/test/:id` (sandbox), `/settings`.

**Step 1: Set up all files.**
**Step 2: Run `cd packages/sop-studio && bun install && bun run build`.**
**Step 3: Commit.**

```bash
git add packages/sop-studio/
git commit -m "feat(sop-studio): scaffold React + Vite + Tailwind SPA"
```

---

## Task 13: SOP Studio — Dashboard Page

**Files:**
- Create: `packages/sop-studio/src/pages/Dashboard.tsx`
- Create: `packages/sop-studio/src/components/SOPCard.tsx`
- Create: `packages/sop-studio/src/components/SearchBar.tsx`

**Context:** Dashboard lists SOPs from the registry with search and filter. Cards show name, domain, status badge, quality score, version.

**Dashboard.tsx:**
- Fetches `GET /v1/sop` on mount and on search
- Filters: domain dropdown, status tabs (all/draft/pending/approved)
- Grid of `SOPCard` components
- "New SOP" button → navigates to `/editor/new`

**SOPCard.tsx:**
- Shows SOP name, domain, status (color-coded badge), quality score, version number
- Click → navigates to `/editor/:id`

**SearchBar.tsx:**
- Text input for query, domain select, status filter tabs

**Step 1: Implement components. Step 2: Build. Step 3: Commit.**

```bash
git add packages/sop-studio/src/pages/Dashboard.tsx packages/sop-studio/src/components/
git commit -m "feat(sop-studio): add dashboard page with SOP listing and search"
```

---

## Task 14: SOP Studio — Decision Tree Editor

**Files:**
- Create: `packages/sop-studio/src/pages/Editor.tsx`
- Create: `packages/sop-studio/src/components/nodes/StepNode.tsx`
- Create: `packages/sop-studio/src/components/nodes/ConditionNode.tsx`
- Create: `packages/sop-studio/src/components/nodes/ToolNode.tsx`
- Create: `packages/sop-studio/src/components/PropertyPanel.tsx`
- Create: `packages/sop-studio/src/lib/sop-to-flow.ts`
- Create: `packages/sop-studio/src/lib/flow-to-sop.ts`

**Context:** The core editor page. Uses `@xyflow/react` for the decision tree canvas.

**Editor.tsx:**
- Loads SOP from API (or creates new blank one)
- Converts `ExpertSOP.decision_tree` → React Flow nodes/edges via `sop-to-flow.ts`
- On save: converts React Flow back to `decision_tree` via `flow-to-sop.ts`, PUTs to API
- Toolbar: Save, Export SKILL.md, Submit for Review, Delete
- Right sidebar: `PropertyPanel` showing selected node's properties

**Custom node types:**
- `StepNode`: Blue card with step name + instruction text. Single input/output handles.
- `ConditionNode`: Orange card with criteria display. Multiple output handles (one per condition).
- `ToolNode`: Green card with tool name + "when" trigger. Single input handle, no output.

**PropertyPanel.tsx:**
- Shows form fields for the selected node
- StepNode: step name, instruction textarea
- ConditionNode: criteria key-value editor, conditions editor
- ToolNode: tool name, when condition

**sop-to-flow.ts:** Converts `decision_tree[]` → `{ nodes: Node[], edges: Edge[] }`. Auto-layout: vertical tree with 200px spacing.

**flow-to-sop.ts:** Converts `{ nodes, edges }` → `decision_tree[]`. Preserves order from top-to-bottom position.

**Step 1: Implement all files. Step 2: Build. Step 3: Commit.**

```bash
git add packages/sop-studio/src/pages/Editor.tsx packages/sop-studio/src/components/nodes/ packages/sop-studio/src/components/PropertyPanel.tsx packages/sop-studio/src/lib/
git commit -m "feat(sop-studio): add decision tree editor with React Flow"
```

---

## Task 15: SOP Studio — Import + Test Sandbox + Settings

**Files:**
- Create: `packages/sop-studio/src/pages/Import.tsx`
- Create: `packages/sop-studio/src/pages/TestSandbox.tsx`
- Create: `packages/sop-studio/src/pages/Settings.tsx`

**Import.tsx:**
- File upload (accepts .docx, .pdf)
- Preview extracted text
- LLM config section (provider dropdown, API key input, stored in localStorage)
- "Extract" button → calls `extractDecisionTree()` from SDK
- Preview extracted decision tree → "Save as Draft" button → POST to API

**TestSandbox.tsx:**
- Loads SOP decision tree
- Input form: key-value pairs matching test case `input` schema
- "Run" button: step through decision tree logic, highlight current step
- Show pass/fail against expected outputs
- Allows adding/editing test cases

**Settings.tsx:**
- Registry URL (default: `http://localhost:8080`)
- API key input (stored in localStorage)
- LLM config (provider, API key, model)
- Connection test button

**Step 1: Implement. Step 2: Build. Step 3: Commit.**

```bash
git add packages/sop-studio/src/pages/
git commit -m "feat(sop-studio): add import, test sandbox, and settings pages"
```

---

## Task 16: WebSocket Collaboration

**Files:**
- Create: `registry/src/routes/ws-collaborate.ts`
- Create: `registry/src/routes/ws-collaborate.test.ts`
- Create: `packages/sop-studio/src/lib/collaboration.ts`
- Modify: `registry/src/index.ts`

**Context:** Real-time collaborative SOP editing using yjs over WebSocket. The registry serves as the WebSocket signaling server.

**Server side (`ws-collaborate.ts`):**
- WebSocket upgrade handler at `/v1/sop/:id/collaborate`
- Uses `y-websocket/bin/utils` for yjs document syncing
- Tracks active sessions: `Map<sopId, Set<{ agentId, connectedAt }>>`
- Broadcasts presence updates

**Client side (`collaboration.ts`):**
- `useCollaboration(sopId: string)` React hook
- Creates `Y.Doc`, connects via `WebsocketProvider`
- Exposes shared types for nodes and edges
- Returns presence list for UI indicators

**Integration:**
- Editor.tsx imports `useCollaboration()` hook
- Syncs React Flow state with yjs shared document
- Shows colored borders on nodes being edited by others

**Step 1: Write server tests (WebSocket upgrade, sync). Step 2: Implement server. Step 3: Implement client hook. Step 4: Build + commit.**

```bash
git add registry/src/routes/ws-collaborate.ts registry/src/routes/ws-collaborate.test.ts packages/sop-studio/src/lib/collaboration.ts registry/src/index.ts
git commit -m "feat: add real-time collaboration via yjs WebSocket"
```

---

## Task 17: SQLite Stores for Marketplace + Badges

**Files:**
- Create: `registry/src/store/sqlite/credit-store.ts`
- Create: `registry/src/store/sqlite/marketplace-store.ts`
- Modify: `registry/src/store/sqlite/reputation-store.ts` (add badge methods)
- Modify: `registry/src/store/sqlite/db.ts` (add tables)
- Modify: `registry/src/store/sqlite/index.ts`

**Context:** Add SQLite implementations for credits, marketplace, and badges. Add tables: `credits`, `credit_transactions`, `marketplace_listings`, `badges`, `certification_proposals`, `proposal_votes`.

**Step 1: Add tables to db.ts.**

**Step 2: Implement SqliteCreditStore, SqliteMarketplaceStore.**

**Step 3: Add badge methods to SqliteReputationStore.**

**Step 4: Update SQLite factory.**

**Step 5: Run all tests + commit.**

```bash
git add registry/src/store/sqlite/
git commit -m "feat(registry): add SQLite stores for marketplace, credits, and badges"
```

---

## Task 18: Documentation Updates (Bilingual)

**Files:**
- Create: `website/docs/sop-studio/_category_.json` (position 8)
- Create: `website/docs/sop-studio/getting-started.md`
- Create: `website/docs/sop-studio/decision-tree-editor.md`
- Create: `website/docs/sop-studio/document-import.md`
- Create: `website/docs/sop-studio/collaboration.md`
- Create: `website/docs/marketplace/_category_.json` (position 9)
- Create: `website/docs/marketplace/overview.md`
- Create: `website/docs/marketplace/credits.md`
- Create: `website/docs/registry/marketplace-api.md`
- Create: `website/docs/registry/sop-api.md`
- Create: Chinese mirrors for all above in `website/i18n/zh-Hans/docusaurus-plugin-content-docs/current/`
- Modify: `website/docs/sdk/types.md` — Add SOP import types

**Step 1: Create English docs with proper frontmatter.**
**Step 2: Create Chinese translations.**
**Step 3: Build docs: `cd /home/ubuntu/knowledgepulse/website && npm run build`**
**Step 4: Commit.**

```bash
git add website/docs/ website/i18n/
git commit -m "docs: add Phase 3 documentation (bilingual)"
```

---

## Task 19: Final Integration Test + Cleanup

**Step 1: Run full test suite**

Run: `cd /home/ubuntu/knowledgepulse && bun test --recursive`
Expected: All tests pass (413 original + ~200 new).

**Step 2: Run linter**

Run: `cd /home/ubuntu/knowledgepulse && bun run lint`
Expected: No errors. Fix any lint issues.

**Step 3: Build SDK**

Run: `cd /home/ubuntu/knowledgepulse && bun run build`
Expected: SDK builds ESM+CJS+DTS.

**Step 4: Build SOP Studio**

Run: `cd /home/ubuntu/knowledgepulse/packages/sop-studio && bun run build`
Expected: Vite builds to `dist/`.

**Step 5: Build docs**

Run: `cd /home/ubuntu/knowledgepulse/website && npm run build`
Expected: Both locales build.

**Step 6: Fix any issues and commit**

```bash
git add -A
git commit -m "chore: Phase 3 cleanup and integration verification"
```

---

## Parallelization Guide

Tasks can be grouped for parallel execution:

**Foundation (sequential):**
- Task 1 (SOP store interface)

**Parallel batch 1** (after Task 1):
- Task 2 (Memory SOP store)
- Task 5 (Credit + Marketplace interfaces)
- Task 8 (Badge types)

**Parallel batch 2** (after batch 1):
- Task 3 (SQLite SOP store)
- Task 4 (SOP routes)
- Task 6 (Memory credit + marketplace stores)
- Task 9 (Badge implementation)

**Parallel batch 3** (after batch 2):
- Task 7 (Marketplace routes)
- Task 10 (Badge routes)
- Task 11 (SDK SOP import)
- Task 12 (SOP Studio scaffold)

**Parallel batch 4** (after batch 3):
- Task 13 (Dashboard page)
- Task 14 (Decision tree editor)
- Task 16 (WebSocket collaboration)
- Task 17 (SQLite marketplace + badges)

**Sequential finishers:**
- Task 15 (Import + Sandbox + Settings) — after Tasks 11, 14
- Task 18 (Docs) — after all features
- Task 19 (Final verification) — last
