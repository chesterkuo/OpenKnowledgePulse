# Phase 2 Design: Knowledge Capture + Quality System

**Date**: 2026-02-22
**Status**: Approved
**Scope**: Phase 2 only (PRD Month 3-6 deliverables)
**Approach**: Parallel workstreams with subagent-driven development

---

## Decisions

- **Storage**: Keep in-memory as default + adapter interfaces. Full SQLite implementation (Bun built-in), Qdrant as skeleton.
- **Integrations**: Examples + integration tests for CrewAI, AutoGen, OpenClaw, Flowise. No framework-specific SDK packages.
- **Reputation**: Full EigenTrust + W3C Verifiable Credentials + leaderboard endpoint.
- **Scoring**: Domain-specific weight profiles added to the 4-factor model.

---

## Workstream 1: Enhanced Scoring Engine

**Goal**: Full PRD Section 4.2.1 implementation with domain-specific weights.

**Modified files**:
- `packages/sdk/src/scoring.ts` — Rewrite `evaluateValue()`:
  - 4-factor composite: `C×0.25 + N×0.35 + D×0.15 + O×0.25` (default weights)
  - Domain-specific weight profiles: `finance` (outcome confidence higher), `code` (tool diversity higher), `medical` (outcome confidence highest)
  - Rule-based overrides: single-step penalty (→0.1), error-recovery bonus (+0.1), zero-diversity penalty (-0.1)
  - Temporal decay: reduce novelty weight for traces older than 7 days in cache
  - 100ms performance budget with timeout guard
- `packages/sdk/src/hnsw-cache.ts` — Add `maxCosineSimilarity()` batch method, TTL-based eviction
- `packages/sdk/src/scoring.test.ts` — Test all overrides, domain weights, performance budget, edge cases

**New files**: None

---

## Workstream 2: KP-REP Reputation System

**Goal**: Full EigenTrust + W3C VC per PRD Section 3.6.1.1, plus leaderboard.

**New files**:
- `packages/sdk/src/reputation/eigentrust.ts` — EigenTrust algorithm:
  - Iterative: `T(i+1) = (1-α)·C·T(i) + α·p` with convergence threshold Δ < 0.001
  - Pre-trust for new nodes: `p = 0.1`
  - Sybil resistance via trust convergence
- `packages/sdk/src/reputation/verifiable-credential.ts` — W3C VC:
  - Ed25519 key generation/signing (Bun crypto or `@noble/ed25519`)
  - VC format: `{ "@context": "https://www.w3.org/2018/credentials/v1", type: "VerifiableCredential", credentialSubject: { agentId, score, issuedAt } }`
  - Verification function for cross-registry trust
- `packages/sdk/src/reputation/types.ts` — Types:
  - `ReputationRecord { agentId, score, history[], trustVector[], lastComputed }`
  - `ValidationVote { validatorId, unitId, valid, timestamp }`
  - `ReputationCredential` (W3C VC format)

**Modified files**:
- `registry/src/store/memory/reputation.ts` — Enhanced:
  - Track validation graph (who validated whom, accuracy)
  - Store reputation history
  - 30-day cooldown for voting rights
  - Batch EigenTrust recomputation
- `registry/src/routes/reputation.ts` — New endpoints:
  - `GET /v1/reputation/:agent_id` — Enhanced with history + VC
  - `GET /v1/reputation/:agent_id/credential` — Signed W3C VC
  - `GET /v1/reputation/leaderboard` — Paginated, domain-filterable
  - `POST /v1/reputation/recompute` — Admin trigger

**Tests**: ~250 lines covering EigenTrust convergence, Sybil detection, VC signing/verification, cooldown, leaderboard.

---

## Workstream 3: Storage Adapter Layer

**Goal**: Abstract storage behind interfaces. Full SQLite, Qdrant skeleton.

**New files**:
- `registry/src/store/interfaces.ts` — Abstract interfaces:
  - `ISkillStore { search, getById, create, update, delete }`
  - `IKnowledgeStore { search, getById, create, validate, delete, getByAgent }`
  - `IReputationStore { get, upsert, awardReputation, getLeaderboard, getValidationGraph }`
  - `IApiKeyStore { create, get, revoke, validate }`
  - `IRateLimitStore { checkLimit, increment, reset }`
- `registry/src/store/factory.ts` — Store factory:
  - `KP_STORE_BACKEND` env var: `memory` | `sqlite` | `qdrant`
  - Returns appropriate implementations
- `registry/src/store/sqlite/skill.ts` — Full SQLite skill store (Bun's `bun:sqlite`)
- `registry/src/store/sqlite/knowledge.ts` — Full SQLite knowledge store
- `registry/src/store/sqlite/reputation.ts` — Full SQLite reputation store
- `registry/src/store/sqlite/api-key.ts` — Full SQLite API key store
- `registry/src/store/sqlite/rate-limit.ts` — Full SQLite rate limit store
- `registry/src/store/qdrant/knowledge.ts` — Qdrant adapter skeleton (interface only)

**Modified files**:
- `registry/src/store/memory/*.ts` (5 files) — Add `implements IXxxStore`
- `registry/src/index.ts` — Use store factory

**Tests**: ~300 lines — interface compliance tests running against all backends.

---

## Workstream 4: GDPR Compliance

**Goal**: Audit logging, data retention, automated expiry per PRD Section 3.7.

**New files**:
- `registry/src/store/memory/audit-log.ts` — Audit log store:
  - Record: `{ id, action, agentId, resourceType, resourceId, timestamp, ip, details }`
  - Actions: `create | read | update | delete | export | validate`
  - 90-day hard retention limit
  - Query by agentId, action, date range
- `registry/src/middleware/audit.ts` — Audit middleware:
  - Intercept all requests after auth
  - Fire-and-forget logging
- `registry/src/store/memory/retention.ts` — Data retention manager:
  - Env vars: `KP_RETENTION_NETWORK_DAYS`, `KP_RETENTION_ORG_DAYS`, `KP_RETENTION_PRIVATE_DAYS`
  - Defaults: network=permanent, org=730, private=365
  - `runRetentionSweep()` — periodic cleanup
  - Cascade deletes: unit + embeddings + cache

**Modified files**:
- `registry/src/routes/export.ts` — Include reputation history + contribution metadata
- `registry/src/routes/knowledge.ts` — Deletion receipt, audit trail entry

**Tests**: ~200 lines — audit logging, retention sweep, export completeness, cascade.

---

## Workstream 5: Framework Integration Examples

**Goal**: Working examples for CrewAI, AutoGen, OpenClaw, Flowise.

**New files**:
- `examples/crewai-integration/main.py` — CrewAI custom tool wrapping MCP HTTP
- `examples/autogen-integration/main.py` — AutoGen function tool via MCP HTTP
- `examples/openclaw-integration/index.ts` — OpenClaw with SDK direct integration
- `examples/flowise-integration/README.md` — Flowise Node plugin guide
- `examples/*/test.*` — Integration test stubs with mock MCP responses

**Modified files**: None

---

## Workstream 6: Documentation Updates

**Goal**: Bilingual docs for all Phase 2 features.

**New docs** (English + Chinese mirrors = x2):
- `docs/sdk/scoring-algorithm.md` — Full Section 4.2.1 docs
- `docs/sdk/reputation.md` — KP-REP, EigenTrust, W3C VC
- `docs/architecture/storage-adapters.md` — Storage backend config
- `docs/registry-api/gdpr-compliance.md` — Retention, deletion, export
- `docs/integrations/crewai.md` — CrewAI guide
- `docs/integrations/autogen.md` — AutoGen guide
- `docs/integrations/openclaw.md` — OpenClaw guide
- `docs/integrations/flowise.md` — Flowise guide

**Updated docs** (English + Chinese mirrors = x2):
- `docs/sdk/scoring.md` — Reflect enhanced algorithm
- `docs/registry-api/api-reference.md` — New endpoints
- `docs/getting-started/concepts.md` — Phase 2 concepts

---

## Dependency Graph

```
Workstream 3 (Storage Adapters)  ← Foundation for all stores
     │
     ├── Workstream 1 (Scoring)     ← Independent after interfaces
     ├── Workstream 2 (Reputation)  ← Independent after interfaces
     ├── Workstream 4 (GDPR)        ← Independent after interfaces
     │
     └── Workstream 5 (Examples)    ← Can start in parallel
              │
              └── Workstream 6 (Docs) ← Last, documents all features
```

Workstreams 1, 2, 4, 5 can run in parallel once Workstream 3 defines interfaces.
Workstream 6 runs last to document everything.

---

## Totals

| Metric | Count |
|---|---|
| New files | ~36 |
| Modified files | ~18 |
| New test lines | ~1,000 |
| New doc pages | 16 (8 en + 8 zh) |
| Updated doc pages | 6 (3 en + 3 zh) |
