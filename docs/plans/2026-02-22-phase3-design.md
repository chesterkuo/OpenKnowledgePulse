# Phase 3 Design: Expert SOP Studio + Marketplace

**Date**: 2026-02-22
**Status**: Approved
**Scope**: Phase 3 (PRD Month 6-12 deliverables)
**Approach**: 6 parallel workstreams with subagent-driven development

---

## Decisions

- **SOP Studio UI**: React 19 + Vite + @xyflow/react (React Flow) + Tailwind CSS 4
- **Document Import**: Client-side LLM extraction (user provides own API key). Server only receives parsed ExpertSOP JSON.
- **Marketplace Payments**: Credit-based system with revenue sharing (70% contributor / 30% platform)
- **Badge System**: Auto-granted bronze/silver thresholds, admin-nominated gold, community-voted authority
- **Federated Learning**: Deferred to Phase 4
- **Collaboration**: Real-time collaborative SOP editing via yjs + WebSocket

---

## Workstream 1: ExpertSOP Backend

**Goal**: Full CRUD + approval workflow + versioning + SKILL.md sync for ExpertSOP.

**New files**:
- `registry/src/store/interfaces.ts` — Add `ISopStore` interface
- `registry/src/store/memory/sop-store.ts` — In-memory SOP store
- `registry/src/store/sqlite/sop-store.ts` — SQLite SOP store
- `registry/src/routes/sop.ts` — SOP routes

**Store type**:
```typescript
interface StoredSOP {
  id: string;
  sop: ExpertSOP;
  version: number;
  previous_version_id?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  visibility: Visibility;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}
```

**Routes**:
- `POST /v1/sop` — Create SOP (requires write scope + KP-REP >= 0.3)
- `GET /v1/sop/:id` — Get SOP by ID
- `GET /v1/sop` — Search SOPs (query, domain, status, pagination)
- `PUT /v1/sop/:id` — Update SOP → creates new version (owner/admin)
- `GET /v1/sop/:id/versions` — List version history
- `POST /v1/sop/:id/approve` — Approve SOP (admin or gold+ badge holder)
- `POST /v1/sop/:id/test` — Run test cases in sandbox
- `POST /v1/sop/:id/export-skill` — Generate SKILL.md from ExpertSOP

**Version history**: Updates create a new version. Old versions are immutable. `GET /v1/sop/:id/versions` returns `[{ version, diff_summary, created_at }]`.

**SKILL.md sync**: On approval, auto-generate SKILL.md with `kp:` extensions and register in skill store with `source_skill` linking back to the SOP.

**Tests**: Interface compliance, CRUD, version history, approval workflow, SKILL.md generation.

---

## Workstream 2: Document Import Pipeline

**Goal**: Parse Word/PDF documents and extract ExpertSOP decision trees client-side with LLM assistance.

**New files**:
- `packages/sdk/src/sop-import/parse-docx.ts` — Word doc → text+structure via `mammoth`
- `packages/sdk/src/sop-import/parse-pdf.ts` — PDF → text via `pdf-parse`
- `packages/sdk/src/sop-import/extract.ts` — LLM-assisted decision tree extraction
- `packages/sdk/src/sop-import/types.ts` — LLMConfig, ParseResult types
- `packages/sdk/src/sop-import/index.ts` — Barrel export

**LLM Config**:
```typescript
interface LLMConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model?: string; // defaults: claude-sonnet-4-20250514 / gpt-4o
}
```

**Flow**: Upload doc → `parseDocx()`/`parsePdf()` extracts raw text → `extractDecisionTree(text, llmConfig)` calls LLM to produce `ExpertSOP.decision_tree` → validated via `ExpertSOPSchema.safeParse()` → submitted to registry.

**All LLM calls happen client-side** (in SOP Studio UI). Server never needs LLM API keys.

**Modified files**:
- `packages/sdk/src/index.ts` — Export sop-import module
- `packages/sdk/package.json` — Add `mammoth`, `pdf-parse` as optional dependencies

**Tests**: Document parsing, LLM prompt template validation, schema compliance of extracted output.

---

## Workstream 3: SOP Studio UI

**Goal**: React SPA with visual decision tree editor, document import, test sandbox, and real-time collaboration.

**Tech stack**: React 19, Vite, @xyflow/react, Tailwind CSS 4, yjs (collaboration)

**Package**: `packages/sop-studio/` — standalone SPA

**Pages**:
1. **Dashboard** — List SOPs (draft/pending/approved), search, filter by domain, status badges
2. **Editor** — React Flow canvas with custom node types:
   - `StepNode` — instruction step `{ step, instruction }`
   - `ConditionNode` — branching `{ criteria, conditions }` with multiple output handles
   - `ToolNode` — tool suggestion `{ name, when }`
   - Sidebar property panel for editing node details
   - Real-time collaboration via yjs (presence indicators, shared state)
3. **Import** — Upload docx/pdf, preview extracted text, configure LLM (API key in localStorage), trigger extraction, review/edit before saving
4. **Test Sandbox** — Define test case inputs, step through SOP decision logic, show pass/fail results
5. **Settings** — Registry URL, LLM API key config, user API key for auth

**Collaboration (yjs)**:
- WebSocket endpoint: `ws://registry/v1/sop/:id/collaborate`
- Shared document state via `Y.Doc` synced over WebSocket
- Presence awareness: show active editors with colored cursors
- Conflict-free merging of concurrent edits

**Modified files**:
- `packages/sop-studio/package.json` — Full dependency list
- `packages/sop-studio/tsconfig.json` — React/JSX config

**New files**:
- `packages/sop-studio/vite.config.ts`
- `packages/sop-studio/tailwind.config.ts`
- `packages/sop-studio/index.html`
- `packages/sop-studio/src/` — Full React application (~20-30 files)

---

## Workstream 4: Knowledge Marketplace

**Goal**: Credit-based marketplace with listings, purchases, revenue sharing, and domain curation.

**New store interfaces** (in `registry/src/store/interfaces.ts`):
```typescript
interface CreditStore {
  getBalance(agentId: string): Promise<number>;
  addCredits(agentId: string, amount: number, reason: string): Promise<void>;
  deductCredits(agentId: string, amount: number, reason: string): Promise<boolean>;
  getTransactions(agentId: string, pagination: PaginationOpts): Promise<PaginatedResult<CreditTransaction>>;
}

interface MarketplaceStore {
  createListing(listing: MarketplaceListing): Promise<MarketplaceListing>;
  getListing(id: string): Promise<MarketplaceListing | undefined>;
  search(opts: { domain?: string; access_model?: string; pagination?: PaginationOpts }): Promise<PaginatedResult<MarketplaceListing>>;
  recordPurchase(purchase: Purchase): Promise<void>;
}
```

**Types**:
```typescript
interface MarketplaceListing {
  id: string;
  knowledge_unit_id: string;
  contributor_id: string;
  price_credits: number;
  access_model: 'free' | 'org' | 'subscription';
  domain: string;
  title: string;
  description: string;
  created_at: string;
}

interface CreditTransaction {
  id: string;
  agent_id: string;
  amount: number;
  type: 'purchase' | 'earned' | 'spent' | 'payout' | 'refill';
  description: string;
  related_listing_id?: string;
  created_at: string;
}
```

**Routes** (`registry/src/routes/marketplace.ts`):
- `GET /v1/marketplace/listings` — Browse (domain, access_model, pagination)
- `GET /v1/marketplace/listings/:id` — Detail
- `POST /v1/marketplace/listings` — Create listing (contributor)
- `POST /v1/marketplace/purchase/:id` — Buy with credits (70/30 split)
- `GET /v1/marketplace/balance` — Credit balance
- `GET /v1/marketplace/earnings` — Contributor earnings history
- `POST /v1/marketplace/credits` — Admin add credits

**Revenue sharing**: On purchase, 70% of credits go to contributor balance, 30% retained as platform fee. Configurable via `KP_MARKETPLACE_REVENUE_SHARE` env var (default 0.70).

**Free tier auto-refill**: 100 credits/month for free tier, 1000 for pro. Checked on balance query, refilled if last refill > 30 days ago.

**Stores**: Memory + SQLite implementations.

**Tests**: Credit operations, purchase flow, revenue sharing math, access control by tier.

---

## Workstream 5: KP-REP SBT Enhancement

**Goal**: Expert certification with badge levels and community voting.

**Badge levels** (auto-granted thresholds):
| Level | Criteria | Auto? |
|-------|----------|-------|
| `bronze` | 10+ contributions in domain, avg quality >= 0.7 | Yes |
| `silver` | 50+ contributions, 20+ validations, avg quality >= 0.8 | Yes |
| `gold` | 100+ contributions + silver badge + admin nomination | No (admin) |
| `authority` | Gold badge + community vote (>60% approval, 5+ votes) | No (vote) |

**New types**:
```typescript
interface DomainBadge {
  badge_id: string;
  agent_id: string;
  domain: string;
  level: 'bronze' | 'silver' | 'gold' | 'authority';
  granted_at: string;
  granted_by: string; // 'system' for auto, agent_id for admin/vote
}

interface CertificationProposal {
  proposal_id: string;
  agent_id: string;
  domain: string;
  target_level: 'gold' | 'authority';
  proposed_by: string;
  votes: Array<{ voter_id: string; approve: boolean; weight: number }>;
  status: 'open' | 'approved' | 'rejected';
  created_at: string;
  closes_at: string;
}
```

**Routes** (added to `registry/src/routes/reputation.ts`):
- `GET /v1/reputation/:agent_id/badges` — List badges
- `POST /v1/reputation/:agent_id/certify` — Propose certification (admin)
- `POST /v1/reputation/vote/:proposal_id` — Community vote (quadratic: weight = sqrt(KP-REP))
- `GET /v1/reputation/proposals` — List open proposals

**Badge evaluation hook**: After each contribution, check if agent qualifies for bronze/silver auto-grant.

**W3C VC integration**: Badges issued as signed Verifiable Credentials (reuses Phase 2 `signCredential()`).

**Modified files**:
- `registry/src/store/interfaces.ts` — Add badge and proposal interfaces
- `registry/src/store/memory/reputation-store.ts` — Badge storage
- `registry/src/store/sqlite/reputation-store.ts` — Badge storage
- `registry/src/routes/reputation.ts` — New endpoints

**Tests**: Auto-grant logic, voting math (quadratic), proposal lifecycle, VC signing for badges.

---

## Workstream 6: Documentation + SOC 2

**Goal**: Bilingual docs for all Phase 3 features + SOC 2 Type I compliance checklist.

**New docs** (English + Chinese mirrors = x2):
- `website/docs/sop-studio/getting-started.md` — SOP Studio tutorial
- `website/docs/sop-studio/decision-tree-editor.md` — React Flow editor guide
- `website/docs/sop-studio/document-import.md` — Import from Word/PDF
- `website/docs/sop-studio/collaboration.md` — Real-time collaboration
- `website/docs/marketplace/overview.md` — Marketplace user guide
- `website/docs/marketplace/credits.md` — Credit system and pricing
- `website/docs/registry/marketplace-api.md` — Marketplace API endpoints
- `website/docs/registry/sop-api.md` — SOP CRUD endpoints
- `website/docs/contributing/soc2-compliance.md` — SOC 2 Type I checklist

**New sections**:
- `website/docs/sop-studio/_category_.json` — position 8
- `website/docs/marketplace/_category_.json` — position 9

**Updated docs**:
- `website/docs/sdk/types.md` — Add SOP import types
- `website/docs/registry/api-reference.md` — New endpoints
- `website/docs/getting-started/concepts.md` — Phase 3 concepts

**SOC 2 Type I deliverable** (documentation only):
- Security controls inventory (auth, rate limiting, audit logging, encryption)
- Access control matrix
- Incident response procedures
- Data handling policies (retention, deletion, export)
- Change management process

---

## Dependency Graph

```
Workstream 1 (SOP Backend)  ← Foundation for SOP routes + store
     │
     ├── Workstream 2 (Import Pipeline)  ← Needs SOP store interface
     │        │
     │        └── Workstream 3 (SOP Studio UI) ← Needs both API + import SDK
     │
     ├── Workstream 4 (Marketplace)     ← Independent after store interfaces
     │
     └── Workstream 5 (SBT Enhancement) ← Independent (builds on Phase 2 reputation)
              │
              └── Workstream 6 (Docs)    ← Last, documents all features
```

Workstreams 4 and 5 can run in parallel with Workstream 1.
Workstream 2 depends on Workstream 1.
Workstream 3 depends on Workstreams 1 and 2.
Workstream 6 runs last.

---

## Totals

| Metric | Count |
|---|---|
| New files | ~60-70 |
| Modified files | ~15-20 |
| New test lines | ~1,500 |
| New doc pages | 18 (9 en + 9 zh) |
| Updated doc pages | 6 (3 en + 3 zh) |
| New packages/deps | React, Vite, @xyflow/react, Tailwind, yjs, mammoth, pdf-parse |
