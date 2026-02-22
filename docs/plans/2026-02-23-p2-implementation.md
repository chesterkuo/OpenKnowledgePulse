# P2 Ecosystem Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement five P2 features: PII cleaning, quarantine workflow, subscription marketplace, Notion/Confluence importers, and Bun CLI binary.

**Architecture:** Each feature is self-contained. PII cleaner is a pure utility in the SDK. Quarantine and subscriptions add new store interfaces + endpoints to the registry. SOP importers add new parsers to the existing SDK pipeline. CLI binary is a build command.

**Tech Stack:** TypeScript, Bun, Hono, PostgreSQL, `@notionhq/client`, Confluence REST API v2, `bun build --compile`

---

### Task 1: PII Data Cleaner — Utility

**Files:**
- Create: `packages/sdk/src/utils/pii-cleaner.ts`
- Test: `packages/sdk/src/utils/pii-cleaner.test.ts`

**Step 1: Write the test file**

```typescript
// packages/sdk/src/utils/pii-cleaner.test.ts
import { describe, expect, test } from "bun:test";
import { cleanPii } from "./pii-cleaner.js";

describe("cleanPii", () => {
  // --- Secrets & Tokens (always redacted) ---
  test("redacts OpenAI API keys", () => {
    const r = cleanPii("key is sk-abc123def456ghi789");
    expect(r.cleaned).toContain("[REDACTED:api_key]");
    expect(r.cleaned).not.toContain("sk-abc123");
    expect(r.redactions).toContainEqual({ type: "api_key", count: 1 });
  });

  test("redacts GitHub tokens", () => {
    const r = cleanPii("token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    expect(r.cleaned).toContain("[REDACTED:api_key]");
  });

  test("redacts AWS access keys", () => {
    const r = cleanPii("AKIAIOSFODNN7EXAMPLE");
    expect(r.cleaned).toContain("[REDACTED:api_key]");
  });

  test("redacts kp_ API keys", () => {
    const r = cleanPii("Bearer kp_abcdef1234567890abcdef1234567890");
    expect(r.cleaned).toContain("[REDACTED:api_key]");
  });

  test("redacts Slack tokens", () => {
    const r = cleanPii("xoxb-123456789-abcdefgh");
    expect(r.cleaned).toContain("[REDACTED:api_key]");
  });

  test("redacts generic password= patterns", () => {
    const r = cleanPii('password=MyS3cretPass!');
    expect(r.cleaned).toContain("[REDACTED:password]");
    expect(r.cleaned).not.toContain("MyS3cret");
  });

  test("redacts connection strings", () => {
    const r = cleanPii("postgresql://user:pass123@host:5432/db");
    expect(r.cleaned).toContain("[REDACTED:connection_string]");
    expect(r.cleaned).not.toContain("pass123");
  });

  test("redacts redis connection strings", () => {
    const r = cleanPii("redis://:mypassword@localhost:6379/0");
    expect(r.cleaned).toContain("[REDACTED:connection_string]");
  });

  test("redacts Bearer tokens", () => {
    const r = cleanPii("Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def");
    expect(r.cleaned).toContain("[REDACTED:bearer_token]");
  });

  // --- Identifiers (redacted at aggregated/federated) ---
  test("redacts email addresses", () => {
    const r = cleanPii("contact user@example.com for help");
    expect(r.cleaned).toContain("[REDACTED:email]");
    expect(r.cleaned).not.toContain("user@example.com");
  });

  test("redacts phone numbers", () => {
    const r = cleanPii("call +1-555-123-4567");
    expect(r.cleaned).toContain("[REDACTED:phone]");
  });

  test("redacts IPv4 addresses", () => {
    const r = cleanPii("server at 192.168.1.100");
    expect(r.cleaned).toContain("[REDACTED:ip]");
    expect(r.cleaned).not.toContain("192.168.1.100");
  });

  test("redacts file paths with usernames", () => {
    const r = cleanPii("file at /home/john/documents/secret.txt");
    expect(r.cleaned).toContain("[REDACTED:filepath]");
  });

  test("redacts Windows paths with usernames", () => {
    const r = cleanPii("C:\\Users\\john\\Desktop\\file.txt");
    expect(r.cleaned).toContain("[REDACTED:filepath]");
  });

  // --- Privacy level behavior ---
  test("private level only redacts secrets, keeps emails/IPs", () => {
    const r = cleanPii("email user@test.com ip 10.0.0.1 key sk-abc123", "private");
    expect(r.cleaned).toContain("[REDACTED:api_key]"); // secrets still redacted
    expect(r.cleaned).toContain("user@test.com"); // emails kept
    expect(r.cleaned).toContain("10.0.0.1"); // IPs kept
  });

  test("aggregated level redacts everything", () => {
    const r = cleanPii("email user@test.com ip 10.0.0.1 key sk-abc123", "aggregated");
    expect(r.cleaned).toContain("[REDACTED:api_key]");
    expect(r.cleaned).toContain("[REDACTED:email]");
    expect(r.cleaned).toContain("[REDACTED:ip]");
  });

  // --- Edge cases ---
  test("clean text passes through unchanged", () => {
    const text = "This is a normal log message about deploying to production";
    const r = cleanPii(text);
    expect(r.cleaned).toBe(text);
    expect(r.redactions).toHaveLength(0);
  });

  test("multiple redactions accumulate counts", () => {
    const r = cleanPii("keys sk-aaa sk-bbb sk-ccc");
    const apiKeyRedaction = r.redactions.find(rd => rd.type === "api_key");
    expect(apiKeyRedaction!.count).toBe(3);
  });

  test("handles empty string", () => {
    const r = cleanPii("");
    expect(r.cleaned).toBe("");
    expect(r.redactions).toHaveLength(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test packages/sdk/src/utils/pii-cleaner.test.ts`
Expected: FAIL — module not found

**Step 3: Implement `pii-cleaner.ts`**

```typescript
// packages/sdk/src/utils/pii-cleaner.ts
import type { PrivacyLevel } from "../types/knowledge-unit.js";

export interface PiiCleanResult {
  cleaned: string;
  redactions: Array<{ type: string; count: number }>;
}

interface PatternRule {
  type: string;
  pattern: RegExp;
  replacement: string;
  secretOnly: boolean; // if true, applied even at "private" level
}

const PATTERNS: PatternRule[] = [
  // --- Secrets (always redacted) ---
  { type: "connection_string", pattern: /\b(postgresql|postgres|mysql|mongodb(\+srv)?|redis|amqp|mssql):\/\/[^\s"'`]+/gi, replacement: "[REDACTED:connection_string]", secretOnly: true },
  { type: "bearer_token", pattern: /Bearer\s+(?!kp_)[A-Za-z0-9\-._~+\/]+=*/g, replacement: "Bearer [REDACTED:bearer_token]", secretOnly: true },
  { type: "api_key", pattern: /\bsk-[A-Za-z0-9]{20,}/g, replacement: "[REDACTED:api_key]", secretOnly: true },
  { type: "api_key", pattern: /\bghp_[A-Za-z0-9]{36,}/g, replacement: "[REDACTED:api_key]", secretOnly: true },
  { type: "api_key", pattern: /\bgho_[A-Za-z0-9]{36,}/g, replacement: "[REDACTED:api_key]", secretOnly: true },
  { type: "api_key", pattern: /\bAKIA[A-Z0-9]{16}/g, replacement: "[REDACTED:api_key]", secretOnly: true },
  { type: "api_key", pattern: /\bkp_[a-f0-9]{16,}/g, replacement: "[REDACTED:api_key]", secretOnly: true },
  { type: "api_key", pattern: /\bxox[bpras]-[A-Za-z0-9\-]+/g, replacement: "[REDACTED:api_key]", secretOnly: true },
  { type: "password", pattern: /\b(password|passwd|pwd|secret|token|api_key|apikey|access_key|private_key)\s*[=:]\s*\S+/gi, replacement: "$1=[REDACTED:password]", secretOnly: true },

  // --- Identifiers (redacted at aggregated/federated) ---
  { type: "email", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: "[REDACTED:email]", secretOnly: false },
  { type: "phone", pattern: /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, replacement: "[REDACTED:phone]", secretOnly: false },
  { type: "ip", pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: "[REDACTED:ip]", secretOnly: false },
  { type: "filepath", pattern: /\/(?:home|Users)\/[A-Za-z0-9_.-]+\/[^\s"'`]*/g, replacement: "[REDACTED:filepath]", secretOnly: false },
  { type: "filepath", pattern: /[A-Z]:\\Users\\[A-Za-z0-9_.-]+\\[^\s"'`]*/g, replacement: "[REDACTED:filepath]", secretOnly: false },
];

export function cleanPii(text: string, level: PrivacyLevel = "aggregated"): PiiCleanResult {
  if (!text) return { cleaned: "", redactions: [] };

  const counts = new Map<string, number>();
  let cleaned = text;

  for (const rule of PATTERNS) {
    if (level === "private" && !rule.secretOnly) continue;

    const matches = cleaned.match(rule.pattern);
    if (matches) {
      counts.set(rule.type, (counts.get(rule.type) ?? 0) + matches.length);
      cleaned = cleaned.replace(rule.pattern, rule.replacement);
    }
  }

  const redactions = Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
  return { cleaned, redactions };
}
```

**Step 4: Run tests**

Run: `bun test packages/sdk/src/utils/pii-cleaner.test.ts`
Expected: All pass

**Step 5: Export from SDK**

Modify `packages/sdk/src/utils/index.ts` — add:
```typescript
export { cleanPii, type PiiCleanResult } from "./pii-cleaner.js";
```

Modify `packages/sdk/src/index.ts` — add:
```typescript
export { cleanPii, type PiiCleanResult } from "./utils/pii-cleaner.js";
```

**Step 6: Integrate into KPCapture**

Modify `packages/sdk/src/capture.ts`:
- Import `cleanPii` from utils
- In `scoreAndContribute()`, before `fetch()`, clean each step:

```typescript
// Clean PII from trace steps before contributing
for (const step of trace.steps) {
  if (step.content) {
    step.content = cleanPii(step.content, trace.metadata.privacy_level).cleaned;
  }
  if (step.output_summary) {
    step.output_summary = cleanPii(step.output_summary, trace.metadata.privacy_level).cleaned;
  }
  if (step.input) {
    const inputStr = JSON.stringify(step.input);
    const cleanedInput = cleanPii(inputStr, trace.metadata.privacy_level).cleaned;
    try { step.input = JSON.parse(cleanedInput); } catch { /* keep original if parse fails */ }
  }
}
```

**Step 7: Run full test suite**

Run: `bun test --recursive`
Expected: All pass

**Step 8: Commit**

```bash
git add packages/sdk/src/utils/pii-cleaner.ts packages/sdk/src/utils/pii-cleaner.test.ts packages/sdk/src/utils/index.ts packages/sdk/src/index.ts packages/sdk/src/capture.ts
git commit -m "feat(sdk): add PII data cleaning pipeline with privacy-level control"
```

---

### Task 2: Quarantine — Store Interface + Types

**Files:**
- Modify: `registry/src/store/interfaces.ts`

**Step 1: Add types and interface**

Add to `registry/src/store/interfaces.ts`:

```typescript
// ── Security Reports ─────────────────────────────────

export interface SecurityReport {
  id: string;
  unit_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
}

export type QuarantineStatus = "flagged" | "quarantined" | "cleared" | null;

export interface SecurityReportStore {
  report(unitId: string, reporterId: string, reason: string): Promise<SecurityReport>;
  getReportsForUnit(unitId: string): Promise<SecurityReport[]>;
  getReportCount(unitId: string): Promise<number>;
  resolve(unitId: string, verdict: "cleared" | "removed"): Promise<void>;
}
```

Add `securityReports: SecurityReportStore` to the `AllStores` interface.

**Step 2: Commit**

```bash
git add registry/src/store/interfaces.ts
git commit -m "feat(registry): add SecurityReportStore interface and quarantine types"
```

---

### Task 3: Quarantine — Memory + PostgreSQL Stores

**Files:**
- Create: `registry/src/store/memory/security-report-store.ts`
- Create: `registry/src/store/postgres/security-report-store.ts`
- Modify: `registry/src/store/memory/index.ts`
- Modify: `registry/src/store/postgres/index.ts`
- Modify: `registry/src/store/postgres/db.ts`
- Modify: `registry/src/store/sqlite/db.ts`
- Create: `registry/src/store/sqlite/security-report-store.ts`
- Modify: `registry/src/store/sqlite/index.ts`
- Test: `registry/src/store/memory/security-report-store.test.ts`

**Step 1: Add DDL**

In `registry/src/store/postgres/db.ts`, append to DDL:

```sql
-- 18. security_reports
CREATE TABLE IF NOT EXISTS security_reports (
  id          TEXT PRIMARY KEY,
  unit_id     TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, reporter_id)
);
CREATE INDEX IF NOT EXISTS idx_sr_unit ON security_reports (unit_id);

-- quarantine_status on knowledge_units
ALTER TABLE knowledge_units ADD COLUMN IF NOT EXISTS quarantine_status TEXT;
```

Also add equivalent SQLite DDL in `registry/src/store/sqlite/db.ts`.

**Step 2: Write memory store tests**

```typescript
// registry/src/store/memory/security-report-store.test.ts
import { describe, expect, test, beforeEach } from "bun:test";
import { MemorySecurityReportStore } from "./security-report-store.js";

describe("MemorySecurityReportStore", () => {
  let store: MemorySecurityReportStore;
  beforeEach(() => { store = new MemorySecurityReportStore(); });

  test("report creates a security report", async () => {
    const r = await store.report("unit-1", "agent-1", "suspicious");
    expect(r.unit_id).toBe("unit-1");
    expect(r.reporter_id).toBe("agent-1");
    expect(r.reason).toBe("suspicious");
    expect(r.id).toBeTruthy();
  });

  test("deduplicate: one report per agent per unit", async () => {
    await store.report("unit-1", "agent-1", "reason 1");
    await store.report("unit-1", "agent-1", "reason 2");
    const reports = await store.getReportsForUnit("unit-1");
    expect(reports).toHaveLength(1);
  });

  test("multiple agents can report same unit", async () => {
    await store.report("unit-1", "agent-1", "reason");
    await store.report("unit-1", "agent-2", "reason");
    await store.report("unit-1", "agent-3", "reason");
    expect(await store.getReportCount("unit-1")).toBe(3);
  });

  test("getReportsForUnit returns empty for unknown unit", async () => {
    expect(await store.getReportsForUnit("unknown")).toEqual([]);
  });

  test("resolve clears reports for unit", async () => {
    await store.report("unit-1", "agent-1", "reason");
    await store.resolve("unit-1", "cleared");
    expect(await store.getReportCount("unit-1")).toBe(0);
  });
});
```

**Step 3: Implement Memory, PG, and SQLite stores**

Implement `MemorySecurityReportStore` (Map-based), `PgSecurityReportStore` (pool queries), and `SqliteSecurityReportStore`. Follow existing store patterns.

Wire into all three factory index files (`memory/index.ts`, `postgres/index.ts`, `sqlite/index.ts`).

**Step 4: Run tests and commit**

```bash
bun test --recursive
git add registry/src/store/
git commit -m "feat(registry): add security report stores with quarantine support"
```

---

### Task 4: Quarantine — Routes + CLI

**Files:**
- Create: `registry/src/routes/quarantine.ts`
- Modify: `registry/src/index.ts`
- Modify: `registry/src/routes/knowledge.ts` (filter quarantined from search)
- Modify: `packages/cli/src/commands/security.ts`
- Test: `registry/src/routes/quarantine.test.ts`

**Step 1: Write route tests**

```typescript
// registry/src/routes/quarantine.test.ts
import { describe, expect, test, beforeEach } from "bun:test";
import { Hono } from "hono";
import { createMemoryStore } from "../store/memory/index.js";

// Test: POST /v1/knowledge/:id/report creates a report
// Test: POST /v1/knowledge/:id/report deduplicates per agent
// Test: POST /v1/knowledge/:id/report returns 401 without auth
// Test: GET /v1/admin/quarantine lists flagged units (admin only)
// Test: POST /v1/admin/quarantine/:id/resolve with "keep" clears reports
// Test: POST /v1/admin/quarantine/:id/resolve with "remove" deletes unit
// Test: quarantine_status set to "flagged" after first report
// Test: quarantine_status set to "quarantined" after threshold reports
// Test: quarantined units excluded from knowledge search
```

**Step 2: Create quarantine routes**

```typescript
// registry/src/routes/quarantine.ts
import { Hono } from "hono";
import type { AuthContext } from "../middleware/auth.js";
import type { AllStores } from "../store/interfaces.js";

const QUARANTINE_THRESHOLD = Number(process.env.KP_QUARANTINE_THRESHOLD ?? 3);

export function quarantineRoutes(stores: AllStores) {
  const app = new Hono();

  // POST /v1/knowledge/:id/report — Submit security report
  app.post("/:id/report", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) return c.json({ error: "Authentication required" }, 401);

    const unitId = c.req.param("id");
    const unit = await stores.knowledge.getById(unitId);
    if (!unit) return c.json({ error: "Knowledge unit not found" }, 404);

    const { reason } = await c.req.json();
    const report = await stores.securityReports.report(unitId, auth.agentId!, reason ?? "");

    const count = await stores.securityReports.getReportCount(unitId);

    // Update quarantine_status based on report count
    // This requires a setQuarantineStatus method on KnowledgeStore
    // (added in this task)

    return c.json({ data: report, report_count: count, threshold: QUARANTINE_THRESHOLD });
  });

  return app;
}

export function adminQuarantineRoutes(stores: AllStores) {
  const app = new Hono();

  // GET /v1/admin/quarantine — List flagged/quarantined units
  app.get("/", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated || !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Admin scope required" }, 403);
    }
    const reports = await stores.securityReports.getReportsForUnit("*"); // needs getAllReported
    return c.json({ data: reports });
  });

  // POST /v1/admin/quarantine/:id/resolve — Admin verdict
  app.post("/:id/resolve", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated || !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Admin scope required" }, 403);
    }

    const unitId = c.req.param("id");
    const { verdict } = await c.req.json(); // "keep" | "remove"

    if (verdict === "remove") {
      await stores.knowledge.delete(unitId);
    }
    await stores.securityReports.resolve(unitId, verdict === "keep" ? "cleared" : "removed");

    return c.json({ unit_id: unitId, verdict });
  });

  return app;
}
```

**Step 3: Update knowledge search to filter quarantined**

In `registry/src/store/postgres/knowledge-store.ts` search method, add condition:
```sql
quarantine_status IS DISTINCT FROM 'quarantined'
```

Same in memory and SQLite stores.

**Step 4: Update CLI security command**

Replace stub in `packages/cli/src/commands/security.ts` with real API call:
```typescript
const res = await fetch(`${config.registryUrl}/v1/knowledge/${unitId}/report`, {
  method: "POST",
  headers: { Authorization: `Bearer ${auth.apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ reason: opts.reason ?? "" }),
});
```

**Step 5: Wire routes into index.ts**

```typescript
import { quarantineRoutes, adminQuarantineRoutes } from "./routes/quarantine.js";
app.route("/v1/knowledge", quarantineRoutes(stores));
app.route("/v1/admin/quarantine", adminQuarantineRoutes(stores));
```

**Step 6: Run tests and commit**

```bash
bun test --recursive
git add registry/src/ packages/cli/
git commit -m "feat(registry): add quarantine workflow with flag + threshold model"
```

---

### Task 5: Subscription Marketplace — Store

**Files:**
- Modify: `registry/src/store/interfaces.ts`
- Create: `registry/src/store/memory/subscription-store.ts`
- Create: `registry/src/store/postgres/subscription-store.ts`
- Create: `registry/src/store/sqlite/subscription-store.ts`
- Modify: `registry/src/store/postgres/db.ts`
- Modify: `registry/src/store/sqlite/db.ts`
- Modify all three factory index files
- Test: `registry/src/store/memory/subscription-store.test.ts`

**Step 1: Add types and interface to `interfaces.ts`**

```typescript
// ── Subscriptions ────────────────────────────────────

export interface SubscriptionRecord {
  id: string;
  agent_id: string;
  domain: string;
  credits_per_month: number;
  started_at: string;
  expires_at: string;
  status: "active" | "expired" | "cancelled";
}

export interface SubscriptionStore {
  subscribe(agentId: string, domain: string, creditsPerMonth: number): Promise<SubscriptionRecord>;
  unsubscribe(id: string): Promise<boolean>;
  getActive(agentId: string): Promise<SubscriptionRecord[]>;
  hasAccess(agentId: string, domain: string): Promise<boolean>;
  getById(id: string): Promise<SubscriptionRecord | undefined>;
}
```

Add `subscriptions: SubscriptionStore` to `AllStores`.

**Step 2: Add DDL**

PostgreSQL:
```sql
-- 19. subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                TEXT PRIMARY KEY,
  agent_id          TEXT NOT NULL,
  domain            TEXT NOT NULL,
  credits_per_month REAL NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active',
  UNIQUE(agent_id, domain)
);
CREATE INDEX IF NOT EXISTS idx_sub_agent ON subscriptions (agent_id);
```

**Step 3: Write tests, implement all three store backends, wire factories**

Follow existing patterns. Key logic in `hasAccess()`:
- Find subscription for agent+domain where status='active'
- If `expires_at < now`, attempt auto-renewal (deduct credits) — or just return false (caller handles)

**Step 4: Run tests and commit**

```bash
bun test --recursive
git add registry/src/store/
git commit -m "feat(registry): add subscription store for domain-based marketplace subscriptions"
```

---

### Task 6: Subscription Marketplace — Routes

**Files:**
- Modify: `registry/src/routes/marketplace.ts`
- Test: `registry/src/routes/marketplace.test.ts` (extend)

**Step 1: Add subscription endpoints to `marketplace.ts`**

```typescript
// POST /v1/marketplace/subscribe — Create domain subscription
app.post("/subscribe", async (c) => {
  const auth: AuthContext = c.get("auth");
  if (!auth.authenticated) return c.json({ error: "Authentication required" }, 401);

  const { domain, credits_per_month } = await c.req.json();
  if (!domain) return c.json({ error: "domain is required" }, 400);

  const price = credits_per_month ?? Number(process.env.KP_SUBSCRIPTION_DEFAULT_CREDITS ?? 50);

  // Deduct first month
  const deducted = await stores.credits.deductCredits(
    auth.agentId!, price, `Subscription: ${domain} (first month)`
  );
  if (!deducted) {
    const balance = await stores.credits.getBalance(auth.agentId!);
    return c.json({ error: "Insufficient credits", balance, required: price }, 402);
  }

  const sub = await stores.subscriptions.subscribe(auth.agentId!, domain, price);
  return c.json({ data: sub }, 201);
});

// DELETE /v1/marketplace/subscribe/:id — Cancel subscription
app.delete("/subscribe/:id", async (c) => {
  const auth: AuthContext = c.get("auth");
  if (!auth.authenticated) return c.json({ error: "Authentication required" }, 401);

  const cancelled = await stores.subscriptions.unsubscribe(c.req.param("id"));
  if (!cancelled) return c.json({ error: "Subscription not found" }, 404);
  return c.json({ cancelled: true });
});

// GET /v1/marketplace/subscriptions — List active subscriptions
app.get("/subscriptions", async (c) => {
  const auth: AuthContext = c.get("auth");
  if (!auth.authenticated) return c.json({ error: "Authentication required" }, 401);

  const subs = await stores.subscriptions.getActive(auth.agentId!);
  return c.json({ data: subs });
});
```

**Step 2: Modify purchase flow for subscription-tier listings**

In `POST /v1/marketplace/purchase/:id`, before the deduction logic, add:

```typescript
if (listing.access_model === "subscription") {
  const hasAccess = await stores.subscriptions.hasAccess(auth.agentId!, listing.domain);
  if (hasAccess) {
    // Subscription covers this — record access but no charge
    await stores.marketplace.recordPurchase(id, auth.agentId!);
    return c.json({ purchased: true, credits_spent: 0, via_subscription: true });
  }
  return c.json({
    error: "Subscription required",
    domain: listing.domain,
    message: "Subscribe to this domain via POST /v1/marketplace/subscribe",
  }, 402);
}
```

**Step 3: Write tests**

Test subscribe, cancel, list, purchase with subscription access, purchase without subscription → 402.

**Step 4: Run tests and commit**

```bash
bun test --recursive
git add registry/src/routes/
git commit -m "feat(registry): add subscription endpoints and purchase flow integration"
```

---

### Task 7: Notion SOP Importer

**Files:**
- Create: `packages/sdk/src/sop-import/parse-notion.ts`
- Test: `packages/sdk/src/sop-import/parse-notion.test.ts`
- Modify: `packages/sdk/src/sop-import/index.ts`

**Step 1: Install dependency**

```bash
cd /home/ubuntu/knowledgepulse && bun add @notionhq/client --filter @knowledgepulse/sdk
```

Note: If workspace filter doesn't work, install directly:
```bash
cd packages/sdk && bun add @notionhq/client
```

**Step 2: Write tests**

```typescript
// packages/sdk/src/sop-import/parse-notion.test.ts
import { describe, expect, test } from "bun:test";
import { parseNotionBlocks } from "./parse-notion.js";

// Test with mock block data (not live API — unit tests)
describe("parseNotionBlocks", () => {
  test("converts heading blocks to sections", () => {
    const blocks = [
      { type: "heading_1", heading_1: { rich_text: [{ plain_text: "Overview" }] } },
      { type: "paragraph", paragraph: { rich_text: [{ plain_text: "This is the overview." }] } },
      { type: "heading_2", heading_2: { rich_text: [{ plain_text: "Steps" }] } },
      { type: "paragraph", paragraph: { rich_text: [{ plain_text: "Step 1: Do this." }] } },
    ];
    const result = parseNotionBlocks(blocks as any);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].heading).toBe("Overview");
    expect(result.sections[1].heading).toBe("Steps");
  });

  test("includes numbered list items in content", () => {
    const blocks = [
      { type: "heading_1", heading_1: { rich_text: [{ plain_text: "Procedure" }] } },
      { type: "numbered_list_item", numbered_list_item: { rich_text: [{ plain_text: "First step" }] } },
      { type: "numbered_list_item", numbered_list_item: { rich_text: [{ plain_text: "Second step" }] } },
    ];
    const result = parseNotionBlocks(blocks as any);
    expect(result.text).toContain("First step");
    expect(result.text).toContain("Second step");
  });

  test("extracts full text from all blocks", () => {
    const blocks = [
      { type: "paragraph", paragraph: { rich_text: [{ plain_text: "Hello world" }] } },
    ];
    const result = parseNotionBlocks(blocks as any);
    expect(result.text).toContain("Hello world");
    expect(result.metadata.format).toBe("notion");
  });
});
```

**Step 3: Implement parser**

```typescript
// packages/sdk/src/sop-import/parse-notion.ts
import type { ParseResult } from "./types.js";

interface NotionRichText {
  plain_text: string;
}

interface NotionBlock {
  type: string;
  [key: string]: unknown;
}

function extractText(richText: NotionRichText[]): string {
  return richText.map(rt => rt.plain_text).join("");
}

function getBlockText(block: NotionBlock): string {
  const data = block[block.type] as { rich_text?: NotionRichText[] } | undefined;
  return data?.rich_text ? extractText(data.rich_text) : "";
}

function isHeading(block: NotionBlock): boolean {
  return block.type.startsWith("heading_");
}

/** Parse raw Notion blocks into ParseResult (no API call — pure data transform) */
export function parseNotionBlocks(blocks: NotionBlock[]): ParseResult {
  const sections: ParseResult["sections"] = [];
  const allText: string[] = [];
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const block of blocks) {
    const text = getBlockText(block);
    allText.push(text);

    if (isHeading(block)) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
      }
      currentHeading = text;
      currentContent = [];
    } else if (text) {
      currentContent.push(text);
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
  }

  return {
    text: allText.filter(Boolean).join("\n"),
    sections,
    metadata: { format: "notion" },
  };
}

/** Fetch and parse a Notion page (requires API token) */
export async function parseNotion(pageId: string, token: string): Promise<ParseResult> {
  const moduleName = "@notionhq/client";
  const { Client } = await import(moduleName);
  const notion = new Client({ auth: token });

  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...(response.results as NotionBlock[]));
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  const result = parseNotionBlocks(blocks);
  result.metadata = { ...result.metadata, pageId };
  return result;
}
```

**Step 4: Export from index**

Add to `packages/sdk/src/sop-import/index.ts`:
```typescript
export { parseNotion, parseNotionBlocks } from "./parse-notion.js";
```

**Step 5: Run tests and commit**

```bash
bun test packages/sdk/src/sop-import/parse-notion.test.ts
bun test --recursive
git add packages/sdk/
git commit -m "feat(sdk): add Notion SOP importer with block-to-section parsing"
```

---

### Task 8: Confluence SOP Importer

**Files:**
- Create: `packages/sdk/src/sop-import/parse-confluence.ts`
- Test: `packages/sdk/src/sop-import/parse-confluence.test.ts`
- Modify: `packages/sdk/src/sop-import/index.ts`

**Step 1: Write tests**

```typescript
// packages/sdk/src/sop-import/parse-confluence.test.ts
import { describe, expect, test } from "bun:test";
import { parseConfluenceAdf } from "./parse-confluence.js";

describe("parseConfluenceAdf", () => {
  test("converts heading nodes to sections", () => {
    const adf = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Overview" }] },
        { type: "paragraph", content: [{ type: "text", text: "This is the overview." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Steps" }] },
        { type: "paragraph", content: [{ type: "text", text: "Do the thing." }] },
      ],
    };
    const result = parseConfluenceAdf(adf);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].heading).toBe("Overview");
    expect(result.sections[1].heading).toBe("Steps");
  });

  test("handles bullet lists", () => {
    const adf = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Checklist" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item A" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item B" }] }] },
        ]},
      ],
    };
    const result = parseConfluenceAdf(adf);
    expect(result.text).toContain("Item A");
    expect(result.text).toContain("Item B");
  });

  test("sets format to confluence", () => {
    const adf = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] };
    const result = parseConfluenceAdf(adf);
    expect(result.metadata.format).toBe("confluence");
  });
});
```

**Step 2: Implement parser**

```typescript
// packages/sdk/src/sop-import/parse-confluence.ts
import type { ParseResult } from "./types.js";

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
}

/** Recursively extract plain text from an ADF node tree */
function extractAdfText(node: AdfNode): string {
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";
  return node.content.map(extractAdfText).join("");
}

/** Parse Atlassian Document Format JSON into ParseResult (no API call) */
export function parseConfluenceAdf(adf: AdfNode): ParseResult {
  const sections: ParseResult["sections"] = [];
  const allText: string[] = [];
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const node of adf.content ?? []) {
    const text = extractAdfText(node);

    if (node.type === "heading") {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
      }
      currentHeading = text;
      currentContent = [];
      allText.push(text);
    } else {
      allText.push(text);
      if (text) currentContent.push(text);
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
  }

  return {
    text: allText.filter(Boolean).join("\n"),
    sections,
    metadata: { format: "confluence" },
  };
}

/** Fetch and parse a Confluence page (requires base URL + Basic auth token) */
export async function parseConfluence(
  pageId: string,
  baseUrl: string,
  token: string,
): Promise<ParseResult> {
  const url = `${baseUrl}/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(token).toString("base64")}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Confluence API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as { body: { atlas_doc_format: { value: string } }; title: string };
  const adf = JSON.parse(data.body.atlas_doc_format.value) as AdfNode;
  const result = parseConfluenceAdf(adf);
  result.metadata = { ...result.metadata, pageId, title: data.title };
  return result;
}
```

**Step 3: Export from index**

Add to `packages/sdk/src/sop-import/index.ts`:
```typescript
export { parseConfluence, parseConfluenceAdf } from "./parse-confluence.js";
```

**Step 4: Run tests and commit**

```bash
bun test packages/sdk/src/sop-import/parse-confluence.test.ts
bun test --recursive
git add packages/sdk/
git commit -m "feat(sdk): add Confluence SOP importer with ADF parsing"
```

---

### Task 9: `kp import` CLI Command

**Files:**
- Create: `packages/cli/src/commands/import.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/src/commands/import.test.ts`

**Step 1: Create import command**

```typescript
// packages/cli/src/commands/import.ts
import { readFileSync } from "node:fs";
import { Command } from "commander";
import {
  parsePdf, parseDocx, parseNotion, parseConfluence,
  extractDecisionTree,
  type LLMConfig, type ParseResult,
} from "@knowledgepulse/sdk";

export const importCommand = new Command("import")
  .description("Import an SOP from PDF, DOCX, Notion, or Confluence")
  .option("--source <source>", "Source type: pdf, docx, notion, confluence", "pdf")
  .option("--file <file>", "File path (for pdf/docx)")
  .option("--page-id <id>", "Page ID (for notion/confluence)")
  .option("--token <token>", "API token (for notion/confluence)")
  .option("--base-url <url>", "Base URL (for confluence)")
  .option("--llm-provider <provider>", "LLM provider: anthropic or openai", "anthropic")
  .option("--llm-key <key>", "LLM API key (or set ANTHROPIC_API_KEY / OPENAI_API_KEY)")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    let parsed: ParseResult;

    try {
      switch (opts.source) {
        case "pdf": {
          if (!opts.file) { console.error("--file required for PDF source"); process.exit(1); }
          const buf = readFileSync(opts.file);
          parsed = await parsePdf(buf.buffer as ArrayBuffer);
          break;
        }
        case "docx": {
          if (!opts.file) { console.error("--file required for DOCX source"); process.exit(1); }
          const buf = readFileSync(opts.file);
          parsed = await parseDocx(buf.buffer as ArrayBuffer);
          break;
        }
        case "notion": {
          if (!opts.pageId || !opts.token) { console.error("--page-id and --token required for Notion"); process.exit(1); }
          parsed = await parseNotion(opts.pageId, opts.token);
          break;
        }
        case "confluence": {
          if (!opts.pageId || !opts.baseUrl || !opts.token) {
            console.error("--page-id, --base-url, and --token required for Confluence"); process.exit(1);
          }
          parsed = await parseConfluence(opts.pageId, opts.baseUrl, opts.token);
          break;
        }
        default:
          console.error(`Unknown source: ${opts.source}`);
          process.exit(1);
      }
    } catch (e) {
      console.error(`Parse error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }

    console.log(`Parsed ${parsed.sections.length} sections from ${opts.source}`);

    // LLM extraction
    const apiKey = opts.llmKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log("No LLM API key provided. Showing parsed sections only:");
      for (const s of parsed.sections) {
        console.log(`  - ${s.heading}`);
      }
      return;
    }

    const llmConfig: LLMConfig = { provider: opts.llmProvider, apiKey };
    console.log(`Extracting decision tree via ${opts.llmProvider}...`);

    const result = await extractDecisionTree(parsed, llmConfig);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\nExtracted SOP: ${result.name}`);
      console.log(`Domain: ${result.domain}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      console.log(`Steps: ${result.decision_tree.length}`);
      for (const step of result.decision_tree) {
        console.log(`  ${step.step}: ${step.instruction.slice(0, 80)}`);
      }
    }
  });
```

**Step 2: Register in `index.ts`**

```typescript
import { importCommand } from "./commands/import.js";
program.addCommand(importCommand);
```

**Step 3: Write basic tests and commit**

```bash
bun test --recursive
git add packages/cli/
git commit -m "feat(cli): add kp import command for PDF, DOCX, Notion, and Confluence"
```

---

### Task 10: Bun Single Binary Compilation

**Files:**
- Modify: `/home/ubuntu/knowledgepulse/package.json`
- Modify: `.github/workflows/ci.yml`

**Step 1: Add build:cli script to root package.json**

Add to `scripts`:
```json
"build:cli": "bun build --compile packages/cli/src/index.ts --outfile dist/kp"
```

**Step 2: Test compilation**

```bash
bun run build:cli
./dist/kp --version
./dist/kp list --dir /tmp/nonexistent
```

Expected: Version output `0.1.0`, and "No skills directory found" message.

**Step 3: Add to CI workflow**

Add a new step to the `build` job in `.github/workflows/ci.yml`:
```yaml
      - run: bun run build:cli
      - run: ./dist/kp --version
```

**Step 4: Commit**

```bash
git add package.json .github/workflows/ci.yml
git commit -m "feat(cli): add bun compile for single binary distribution"
```

---

### Task 11: Final Integration Test + Cleanup

**Step 1: Run full test suite**

```bash
bun test --recursive
```

Expected: All tests pass (870 + new tests).

**Step 2: Verify binary works**

```bash
./dist/kp --version
./dist/kp --help
./dist/kp list --dir /tmp
./dist/kp search test --json 2>&1 || true
```

**Step 3: Final commit if any loose ends**

```bash
git status
# Stage any remaining changes
git add -A
git commit -m "chore: P2 ecosystem features complete"
```
