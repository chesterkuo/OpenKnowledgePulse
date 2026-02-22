# Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Phase 2 of KnowledgePulse — the Knowledge Capture + Quality System layer, adding enhanced scoring, EigenTrust reputation, storage adapters, GDPR compliance, and framework integration examples.

**Architecture:** Six parallel workstreams building on the existing Phase 1 monorepo. Store interfaces already exist at `registry/src/store/interfaces.ts`. All new code follows the existing patterns: Zod for validation, Hono for HTTP routes, `bun:test` for testing. The SDK publishes reusable logic (EigenTrust, VC signing, scoring); the registry consumes it via workspace dependency.

**Tech Stack:** TypeScript + Bun, Hono, Zod, `bun:sqlite`, Ed25519 (`@noble/ed25519`), `bun:test`

**Existing tests:** `bun test --recursive` (319 tests, 15 files). All must continue passing after every task.

**Commit convention:** `feat:`, `fix:`, `test:`, `docs:` prefixes. Co-authored-by trailer.

---

## Task 1: Enhanced Scoring — Domain Weight Profiles

**Files:**
- Modify: `packages/sdk/src/scoring.ts`
- Test: `packages/sdk/src/scoring.test.ts`

**Context:** Current `evaluateValue()` uses hardcoded weights `C*0.25 + N*0.35 + D*0.15 + O*0.25`. We need domain-specific profiles passed via the trace's `metadata.task_domain`.

**Step 1: Write the failing tests for domain weight profiles**

Add to `packages/sdk/src/scoring.test.ts`:

```typescript
describe("domain-specific weight profiles", () => {
  test("finance domain weights outcome confidence higher", async () => {
    const highConfFinance = makeTrace({
      confidence: 0.95,
      success: true,
      objective: "Analyze Q4 financial report",
    });
    highConfFinance.metadata.task_domain = "finance";
    const scoreFinance = await evaluateValue(highConfFinance);

    _getLocalCache().clear();

    const highConfDefault = makeTrace({
      confidence: 0.95,
      success: true,
      objective: "Analyze Q4 financial report",
    });
    highConfDefault.metadata.task_domain = "general";
    const scoreDefault = await evaluateValue(highConfDefault);

    // Finance weights O higher (0.45 vs 0.25), so high confidence should score higher
    expect(scoreFinance).toBeGreaterThan(scoreDefault);
  });

  test("code domain weights tool diversity higher", async () => {
    const steps: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Planning" },
      { step_id: 1, type: "tool_call", tool: { name: "read_file" }, content: "Reading" },
      { step_id: 2, type: "tool_call", tool: { name: "grep" }, content: "Searching" },
      { step_id: 3, type: "tool_call", tool: { name: "edit" }, content: "Editing" },
      { step_id: 4, type: "observation", content: "Done" },
    ];

    const codeTrace = makeTrace({ steps, confidence: 0.7 });
    codeTrace.metadata.task_domain = "code";
    const scoreCode = await evaluateValue(codeTrace);

    _getLocalCache().clear();

    const defaultTrace = makeTrace({ steps, confidence: 0.7 });
    defaultTrace.metadata.task_domain = "general";
    const scoreDefault = await evaluateValue(defaultTrace);

    // Code weights D higher (0.30 vs 0.15), so diverse tools should score higher
    expect(scoreCode).toBeGreaterThan(scoreDefault);
  });

  test("unknown domain falls back to default weights", async () => {
    const trace = makeTrace();
    trace.metadata.task_domain = "unknown_domain_xyz";
    const score = await evaluateValue(trace);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /home/ubuntu/knowledgepulse && bun test packages/sdk/src/scoring.test.ts`
Expected: FAIL — finance and code traces score the same as default because no domain weighting exists.

**Step 3: Implement domain weight profiles in scoring.ts**

Add a `DOMAIN_WEIGHTS` map and modify `evaluateValue()` to use it. Insert before the `evaluateValue` function:

```typescript
export interface ScoringWeights {
  complexity: number;
  novelty: number;
  toolDiversity: number;
  outcomeConfidence: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  complexity: 0.25,
  novelty: 0.35,
  toolDiversity: 0.15,
  outcomeConfidence: 0.25,
};

const DOMAIN_WEIGHTS: Record<string, ScoringWeights> = {
  finance: { complexity: 0.20, novelty: 0.25, toolDiversity: 0.10, outcomeConfidence: 0.45 },
  code: { complexity: 0.20, novelty: 0.30, toolDiversity: 0.30, outcomeConfidence: 0.20 },
  medical: { complexity: 0.15, novelty: 0.20, toolDiversity: 0.10, outcomeConfidence: 0.55 },
  customer_service: { complexity: 0.20, novelty: 0.30, toolDiversity: 0.20, outcomeConfidence: 0.30 },
};

function getWeights(domain: string): ScoringWeights {
  return DOMAIN_WEIGHTS[domain] ?? DEFAULT_WEIGHTS;
}
```

Then change the composite score line in `evaluateValue()` from:

```typescript
let score = C * 0.25 + N * 0.35 + D * 0.15 + O * 0.25;
```

to:

```typescript
const w = getWeights(trace.metadata.task_domain);
let score = C * w.complexity + N * w.novelty + D * w.toolDiversity + O * w.outcomeConfidence;
```

**Step 4: Run tests to verify they pass**

Run: `cd /home/ubuntu/knowledgepulse && bun test packages/sdk/src/scoring.test.ts`
Expected: ALL PASS. Note: the existing test "without embedder, novelty defaults to 0.5" uses `task_domain: "testing"` which falls back to default weights — its expected value remains unchanged.

**Step 5: Run full test suite for regression**

Run: `cd /home/ubuntu/knowledgepulse && bun test --recursive`
Expected: All 319+ tests pass.

**Step 6: Commit**

```bash
git add packages/sdk/src/scoring.ts packages/sdk/src/scoring.test.ts
git commit -m "feat(sdk): add domain-specific weight profiles to scoring engine"
```

---

## Task 2: Enhanced Scoring — TTL-Based Eviction for VectorCache

**Files:**
- Modify: `packages/sdk/src/hnsw-cache.ts`
- Test: `packages/sdk/src/hnsw-cache.test.ts`

**Step 1: Write the failing test for TTL eviction**

Add to `packages/sdk/src/hnsw-cache.test.ts`:

```typescript
describe("TTL-based eviction", () => {
  test("vectors expire after TTL", () => {
    const cache = new VectorCache({ maxElements: 100, dimensions: 3, ttlMs: 100 });
    cache.add([1, 0, 0]);
    expect(cache.size).toBe(1);

    // Wait for TTL to expire
    Bun.sleepSync(150);
    cache.evictExpired();
    expect(cache.size).toBe(0);
  });

  test("non-expired vectors are kept", () => {
    const cache = new VectorCache({ maxElements: 100, dimensions: 3, ttlMs: 5000 });
    cache.add([1, 0, 0]);
    cache.evictExpired();
    expect(cache.size).toBe(1);
  });

  test("maxCosineSimilarity ignores expired vectors", () => {
    const cache = new VectorCache({ maxElements: 100, dimensions: 3, ttlMs: 100 });
    cache.add([1, 0, 0]);
    Bun.sleepSync(150);
    const sim = cache.maxCosineSimilarity([1, 0, 0]);
    expect(sim).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/ubuntu/knowledgepulse && bun test packages/sdk/src/hnsw-cache.test.ts`
Expected: FAIL — `ttlMs` option not recognized, `evictExpired` not a function.

**Step 3: Implement TTL-based eviction**

Refactor `packages/sdk/src/hnsw-cache.ts` to track timestamps per vector:
- Add `CacheEntry` type with `vector` and `addedAt` fields
- Change `private vectors: Float32Array[]` to `private entries: CacheEntry[]`
- Add `ttlMs` constructor option (default `null` = no TTL)
- Add `evictExpired()` method
- Call `evictExpired()` in `size` getter and `maxCosineSimilarity()`

**Step 4: Run tests**

Run: `cd /home/ubuntu/knowledgepulse && bun test packages/sdk/src/hnsw-cache.test.ts`
Expected: ALL PASS.

**Step 5: Run full suite**

Run: `cd /home/ubuntu/knowledgepulse && bun test --recursive`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add packages/sdk/src/hnsw-cache.ts packages/sdk/src/hnsw-cache.test.ts
git commit -m "feat(sdk): add TTL-based eviction to VectorCache"
```

---

## Task 3: Reputation Types and EigenTrust Algorithm

**Files:**
- Create: `packages/sdk/src/reputation/types.ts`
- Create: `packages/sdk/src/reputation/eigentrust.ts`
- Create: `packages/sdk/src/reputation/eigentrust.test.ts`
- Create: `packages/sdk/src/reputation/index.ts`

**Step 1: Create reputation types**

Create `packages/sdk/src/reputation/types.ts` with:
- `ValidationVote { validatorId, targetId, unitId, valid, timestamp }`
- `TrustEdge { from, to, weight }`
- `EigenTrustConfig { alpha: 0.1, epsilon: 0.001, maxIterations: 50, preTrustScore: 0.1 }`
- `EigenTrustResult { scores: Map<string, number>, iterations, converged }`
- `ReputationCredential` (W3C VC format with `@context`, `type`, `issuer`, `credentialSubject`, optional `proof`)

**Step 2: Write the failing EigenTrust tests**

Create `packages/sdk/src/reputation/eigentrust.test.ts` with tests:
- Returns empty scores for no votes
- Simple two-agent mutual trust converges with similar scores
- Sybil nodes converge to lower trust than well-connected nodes
- Negative votes reduce trust scores
- Respects maxIterations limit
- All scores sum to approximately 1.0

**Step 3: Run test to verify it fails**

Run: `cd /home/ubuntu/knowledgepulse && bun test packages/sdk/src/reputation/eigentrust.test.ts`
Expected: FAIL — module not found.

**Step 4: Implement EigenTrust**

Create `packages/sdk/src/reputation/eigentrust.ts`:
- `computeEigenTrust(votes, configOverrides?)` function
- Build trust matrix from validation votes (positive = 1, negative = -0.5, self-votes ignored)
- Clamp negatives to 0, row-normalize
- Iterate: `T(i+1) = (1-alpha) * C^T * T(i) + alpha * p` where `p` is uniform pre-trust
- Converge when max delta < epsilon
- Return `EigenTrustResult`

**Step 5: Create barrel export**

Create `packages/sdk/src/reputation/index.ts` exporting all types and `computeEigenTrust`.

**Step 6: Run tests**

Run: `cd /home/ubuntu/knowledgepulse && bun test packages/sdk/src/reputation/eigentrust.test.ts`
Expected: ALL PASS.

**Step 7: Run full suite and commit**

```bash
git add packages/sdk/src/reputation/
git commit -m "feat(sdk): add EigenTrust reputation algorithm"
```

---

## Task 4: W3C Verifiable Credential Signing

**Files:**
- Create: `packages/sdk/src/reputation/verifiable-credential.ts`
- Create: `packages/sdk/src/reputation/verifiable-credential.test.ts`
- Modify: `packages/sdk/src/reputation/index.ts`

**Step 1: Install Ed25519 dependency**

Run: `cd /home/ubuntu/knowledgepulse && bun add @noble/ed25519 @noble/hashes -w --cwd packages/sdk`

**Step 2: Write the failing test**

Create `packages/sdk/src/reputation/verifiable-credential.test.ts` with tests:
- `generateKeyPair` returns valid 32-byte Ed25519 keys
- `createCredential` returns valid W3C VC structure (correct `@context`, `type`, `credentialSubject`)
- `signCredential` adds `Ed25519Signature2020` proof
- `verifyCredential` succeeds for valid signatures
- `verifyCredential` fails for tampered credentials (modified score)

**Step 3: Run test to verify it fails**

Run: `cd /home/ubuntu/knowledgepulse && bun test packages/sdk/src/reputation/verifiable-credential.test.ts`
Expected: FAIL — module not found.

**Step 4: Implement VC module**

Create `packages/sdk/src/reputation/verifiable-credential.ts`:
- `generateKeyPair()` — Ed25519 key generation via `@noble/ed25519`
- `createCredential(opts)` — builds unsigned W3C VC with `KPReputationCredential` type
- `signCredential(vc, privateKey, verificationMethod)` — signs canonical JSON (excluding proof), base64-encodes signature
- `verifyCredential(vc, publicKey)` — extracts proof, re-canonicalizes, verifies signature

**Step 5: Update barrel export and run tests**

Run: `cd /home/ubuntu/knowledgepulse && bun test packages/sdk/src/reputation/verifiable-credential.test.ts`
Expected: ALL PASS.

**Step 6: Commit**

```bash
git add packages/sdk/src/reputation/ packages/sdk/package.json bun.lock
git commit -m "feat(sdk): add W3C Verifiable Credential signing with Ed25519"
```

---

## Task 5: Export Reputation Module from SDK

**Files:**
- Modify: `packages/sdk/src/index.ts`

**Step 1: Add reputation exports**

Add to `packages/sdk/src/index.ts` after the Migrations section:

```typescript
// Reputation
export {
  computeEigenTrust,
  createCredential,
  generateKeyPair,
  signCredential,
  verifyCredential,
  type KeyPair,
  type ValidationVote,
  type TrustEdge,
  type EigenTrustConfig,
  type EigenTrustResult,
  type ReputationCredential,
} from "./reputation/index.js";
```

**Step 2: Build SDK and run full suite**

Run: `cd /home/ubuntu/knowledgepulse && bun run build && bun test --recursive`
Expected: Build succeeds, all tests pass.

**Step 3: Commit**

```bash
git add packages/sdk/src/index.ts
git commit -m "feat(sdk): export reputation module (EigenTrust + VC)"
```

---

## Task 6: Enhanced Reputation Store

**Files:**
- Modify: `registry/src/store/interfaces.ts`
- Modify: `registry/src/store/memory/reputation-store.ts`
- Create: `registry/src/store/memory/reputation-store.test.ts`

**Step 1: Write failing tests**

Create `registry/src/store/memory/reputation-store.test.ts` with tests:
- `getLeaderboard` returns agents sorted by score descending
- `getLeaderboard` supports pagination (limit/offset, total count)
- `recordVote` stores validation votes
- `canVote` returns false for agents younger than 30 days
- `canVote` returns true for agents older than 30 days

**Step 2: Run test to verify it fails**

Run: `cd /home/ubuntu/knowledgepulse && bun test registry/src/store/memory/reputation-store.test.ts`
Expected: FAIL — `getLeaderboard`, `recordVote`, `canVote` not defined.

**Step 3: Extend ReputationStore interface**

Add to `registry/src/store/interfaces.ts`:
- Import `ValidationVote` from `@knowledgepulse/sdk`
- Add methods: `getLeaderboard(opts: PaginationOpts)`, `recordVote(vote)`, `getVotes()`, `canVote(agentId)`

**Step 4: Implement in MemoryReputationStore**

Update `registry/src/store/memory/reputation-store.ts`:
- Add `created_at` tracking to records
- Implement `getLeaderboard` (sort by score desc, paginate)
- Implement `recordVote` / `getVotes` (in-memory array)
- Implement `canVote` (check 30-day cooldown from `created_at`)

**Step 5: Run tests and commit**

```bash
git add registry/src/store/interfaces.ts registry/src/store/memory/reputation-store.ts registry/src/store/memory/reputation-store.test.ts
git commit -m "feat(registry): enhance reputation store with leaderboard, votes, cooldown"
```

---

## Task 7: Enhanced Reputation Routes

**Files:**
- Modify: `registry/src/routes/reputation.ts`
- Create: `registry/src/routes/reputation.test.ts`

**Step 1: Write failing tests**

Create `registry/src/routes/reputation.test.ts` with tests:
- `GET /v1/reputation/leaderboard` returns sorted agents
- `GET /v1/reputation/leaderboard` supports pagination
- `GET /v1/reputation/:agent_id` returns existing record
- `GET /v1/reputation/:agent_id` returns zero for unknown agent

**Step 2: Run test to verify it fails**

Run: `cd /home/ubuntu/knowledgepulse && bun test registry/src/routes/reputation.test.ts`
Expected: FAIL — leaderboard endpoint returns 404.

**Step 3: Implement routes**

Update `registry/src/routes/reputation.ts`:
- Add `GET /leaderboard` (before `/:agent_id` to avoid route collision)
- Add `POST /recompute` (admin-only, triggers EigenTrust via SDK import)
- Keep existing `GET /:agent_id` route

**Step 4: Run tests and commit**

```bash
git add registry/src/routes/reputation.ts registry/src/routes/reputation.test.ts
git commit -m "feat(registry): add leaderboard and recompute endpoints"
```

---

## Task 8: Store Factory + SQLite Backend

**Files:**
- Create: `registry/src/store/factory.ts`
- Create: `registry/src/store/sqlite/db.ts`
- Create: `registry/src/store/sqlite/skill-store.ts`
- Create: `registry/src/store/sqlite/knowledge-store.ts`
- Create: `registry/src/store/sqlite/reputation-store.ts`
- Create: `registry/src/store/sqlite/api-key-store.ts`
- Create: `registry/src/store/sqlite/rate-limit-store.ts`
- Create: `registry/src/store/sqlite/index.ts`
- Create: `registry/src/store/sqlite/sqlite.test.ts`
- Modify: `registry/src/index.ts`

**Step 1: Create SQLite database helper**

Create `registry/src/store/sqlite/db.ts`:
- Uses `bun:sqlite` Database
- Creates all tables: skills, knowledge_units, reputation, validation_votes, api_keys, rate_limit_buckets, rate_limit_violations
- Enables WAL mode and foreign keys

**Step 2: Create SQLite store implementations**

Each store implements the same interface as the memory counterparts:
- `SqliteSkillStore` — CRUD with SQL queries, JSON serialization for tags
- `SqliteKnowledgeStore` — CRUD with unit_json TEXT column, search filters in JS
- `SqliteReputationStore` — CRUD with history_json column, leaderboard via ORDER BY
- `SqliteApiKeyStore` — Same API key generation as memory, SQL persistence
- `SqliteRateLimitStore` — Token bucket with SQL state, violation tracking

**Step 3: Create store factory**

Create `registry/src/store/factory.ts`:
- Reads `KP_STORE_BACKEND` env var (`memory` | `sqlite`)
- Default: `memory` (backward compatible)
- `sqlite`: reads `KP_SQLITE_PATH` env var (default: `knowledgepulse.db`)

**Step 4: Write SQLite compliance tests**

Create `registry/src/store/sqlite/sqlite.test.ts`:
- Test each store interface (create/getById/search/delete for skills and knowledge)
- Test reputation leaderboard
- Test API key create/verify/revoke cycle
- Test rate limiting
- All tests use `:memory:` SQLite database

**Step 5: Update registry index**

Change `registry/src/index.ts` to use `createStore()` from factory instead of `createMemoryStore()`.

**Step 6: Run tests and commit**

```bash
git add registry/src/store/sqlite/ registry/src/store/factory.ts registry/src/index.ts
git commit -m "feat(registry): add SQLite storage backend with store factory"
```

---

## Task 9: GDPR Audit Logging

**Files:**
- Create: `registry/src/store/memory/audit-log-store.ts`
- Create: `registry/src/store/memory/audit-log-store.test.ts`
- Create: `registry/src/middleware/audit.ts`
- Modify: `registry/src/store/interfaces.ts`
- Modify: `registry/src/store/memory/index.ts`
- Modify: `registry/src/index.ts`

**Step 1: Write failing tests**

Tests for MemoryAuditLogStore:
- Log and query by agentId
- Query by action type
- Query by date range
- 90-day retention enforcement

**Step 2: Implement AuditLogStore interface**

Add to `registry/src/store/interfaces.ts`:
- `AuditAction` type: `"create" | "read" | "update" | "delete" | "export" | "validate"`
- `AuditLogEntry` interface: `{ id, action, agentId, resourceType, resourceId, timestamp, ip, details? }`
- `AuditLogStore` interface: `{ log(entry), query(opts) }`
- Add `auditLog: AuditLogStore` to `AllStores`

**Step 3: Implement MemoryAuditLogStore**

- In-memory array with automatic 90-day purge on each access
- `_injectForTest()` helper for testing old entries

**Step 4: Create audit middleware**

Create `registry/src/middleware/audit.ts`:
- Fire-and-forget logging after `next()` completes
- Infer action from HTTP method, resource type from path
- Uses `AuthContext` for agent identification

**Step 5: Wire into registry**

Update `registry/src/store/memory/index.ts` and `registry/src/index.ts`.

**Step 6: Run tests and commit**

```bash
git add registry/src/store/memory/audit-log-store.ts registry/src/store/memory/audit-log-store.test.ts registry/src/middleware/audit.ts registry/src/store/interfaces.ts registry/src/store/memory/index.ts registry/src/index.ts
git commit -m "feat(registry): add GDPR audit logging with 90-day retention"
```

---

## Task 10: Data Retention Manager

**Files:**
- Create: `registry/src/store/memory/retention.ts`
- Create: `registry/src/store/memory/retention.test.ts`

**Step 1: Write failing tests**

Tests for RetentionManager:
- Sweep deletes expired private units (1-day retention, 2-day-old unit)
- Sweep keeps non-expired units
- Sweep keeps network units (permanent retention)

**Step 2: Implement RetentionManager**

Create `registry/src/store/memory/retention.ts`:
- `RetentionConfig { networkDays: number | null, orgDays: number, privateDays: number }`
- Defaults from env vars: `KP_RETENTION_ORG_DAYS` (730), `KP_RETENTION_PRIVATE_DAYS` (365)
- `runSweep()`: iterates all knowledge units, deletes those past retention limit
- Returns count of swept units

**Step 3: Run tests and commit**

```bash
git add registry/src/store/memory/retention.ts registry/src/store/memory/retention.test.ts
git commit -m "feat(registry): add data retention manager with configurable policies"
```

---

## Task 11: Enhanced Export and Delete Routes (GDPR)

**Files:**
- Modify: `registry/src/routes/export.ts`
- Modify: `registry/src/routes/knowledge.ts`

**Step 1: Update export route**

Enhance `registry/src/routes/export.ts`:
- Include API key summaries (prefix, scopes, tier, created_at, revoked — NOT the key hash)
- Include `total_contributions` count
- Log export action to audit store if available

**Step 2: Update delete route**

In `registry/src/routes/knowledge.ts`, change DELETE response to structured receipt:
- `{ deleted: true, unit_id, deleted_at, deleted_by }`

**Step 3: Run full suite and commit**

```bash
git add registry/src/routes/export.ts registry/src/routes/knowledge.ts
git commit -m "feat(registry): enhance GDPR export with metadata, add deletion receipts"
```

---

## Task 12: Framework Integration Examples

**Files:**
- Create: `examples/crewai-integration/main.py` + `requirements.txt`
- Create: `examples/autogen-integration/main.py` + `requirements.txt`
- Create: `examples/openclaw-integration/index.ts`
- Create: `examples/flowise-integration/README.md`

**Step 1: Create CrewAI example**

Python script with `KnowledgePulseTool` class wrapping HTTP calls to `/v1/knowledge` and `/v1/skills`.
Uses `httpx` for HTTP client. Demonstrates search and contribute workflows.

**Step 2: Create AutoGen example**

Python script with standalone function tools (`kp_search_knowledge`, `kp_search_skills`) compatible with AutoGen's function calling format. Uses `httpx`.

**Step 3: Create OpenClaw example**

TypeScript script using `@knowledgepulse/sdk` directly:
- `KPCapture.wrap()` around an agent function
- `KPRetrieval.search()` for few-shot injection
- Demonstrates the full capture-retrieve cycle

**Step 4: Create Flowise README**

Markdown guide explaining HTTP Request node setup and custom tool creation for Flowise.

**Step 5: Commit**

```bash
git add examples/crewai-integration/ examples/autogen-integration/ examples/openclaw-integration/ examples/flowise-integration/
git commit -m "feat(examples): add CrewAI, AutoGen, OpenClaw, and Flowise integration examples"
```

---

## Task 13: Documentation Updates

**Files:**
- Create: `website/docs/integrations/_category_.json`
- Create: 8 English docs in `website/docs/`
- Create: 8 Chinese mirrors in `website/i18n/zh-Hans/docusaurus-plugin-content-docs/current/`

**Step 1: Create integrations category**

`website/docs/integrations/_category_.json` with label "Integrations", position 8.

**Step 2: Create English docs**

New docs covering:
- `sdk/scoring-algorithm.md` — Full 4-factor model, domain weights, rule overrides
- `sdk/reputation.md` — EigenTrust algorithm, W3C VC, Sybil resistance
- `architecture/storage-adapters.md` — Factory pattern, SQLite setup, env vars
- `registry-api/gdpr-compliance.md` — Audit logging, retention policies, export/delete
- `integrations/crewai.md` — CrewAI setup guide
- `integrations/autogen.md` — AutoGen setup guide
- `integrations/openclaw.md` — OpenClaw SDK guide
- `integrations/flowise.md` — Flowise integration guide

**Step 3: Create Chinese mirrors**

Mirror all English docs with Chinese translations.

**Step 4: Build docs**

Run: `cd /home/ubuntu/knowledgepulse/website && npm run build`
Expected: Build succeeds for both locales.

**Step 5: Commit**

```bash
git add website/docs/ website/i18n/
git commit -m "docs: add Phase 2 documentation (bilingual)"
```

---

## Task 14: Final Integration Test + Cleanup

**Step 1: Run full test suite**

Run: `cd /home/ubuntu/knowledgepulse && bun test --recursive`
Expected: All tests pass (319 original + ~100-150 new).

**Step 2: Run linter**

Run: `cd /home/ubuntu/knowledgepulse && bun run lint`
Expected: No errors.

**Step 3: Build SDK**

Run: `cd /home/ubuntu/knowledgepulse && bun run build`
Expected: Build succeeds.

**Step 4: Build docs**

Run: `cd /home/ubuntu/knowledgepulse/website && npm run build`
Expected: Build succeeds.

**Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: Phase 2 cleanup and integration verification"
```

---

## Parallelization Guide

Tasks can be grouped for parallel execution:

**Sequential prerequisites:**
- Tasks 1-2 (Scoring) — independent, can run first

**Parallel batch 1** (after Tasks 1-2):
- Tasks 3-5 (Reputation SDK) — independent from registry
- Tasks 8 (SQLite backend) — independent from SDK changes

**Parallel batch 2** (after batch 1):
- Tasks 6-7 (Reputation routes) — depends on Tasks 3-5
- Tasks 9-10 (GDPR) — depends on Task 8 for interface updates
- Task 12 (Examples) — fully independent

**Sequential finishers:**
- Task 11 (Export/Delete enhancement) — after Tasks 9-10
- Task 13 (Docs) — after all features complete
- Task 14 (Final verification) — last
