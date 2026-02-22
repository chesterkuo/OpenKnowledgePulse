# KnowledgePulse Gap Analysis: PRD v1.1 vs Codebase

**Date**: 2026-02-22
**Compared Against**: `docs/KnowledgePulse_PRD_v1.1.md`
**Codebase State**: Phase 1-4 completed (639 tests, 33 files)

---

## Phase Completion Summary

| Phase | Scope | Completion | Notes |
|-------|-------|------------|-------|
| Phase 1 | SKILL.md Registry + SDK | ~85% | Missing: Docker, OpenAPI, CI/CD, providers endpoint |
| Phase 2 | Knowledge Capture + Quality | ~80% | Missing: Production backends, observability, hybrid search |
| Phase 3 | SOP Studio + Marketplace | ~75% | Missing: Notion/Confluence import, federated learning, WS broadcast |
| Phase 4 | Standardization + UI | ~30% | Done: Theme/UI/i18n. Missing: multi-lang, governance, compliance certs |

---

## P0 — Production Readiness (Required Before Any Deployment)

### P0-1: Docker Compose Deployment
- **PRD Ref**: Section 5.2, Appendix A
- **Gap**: No `docker-compose.yml` exists in `registry/`
- **Required**: `Bun + PostgreSQL + Redis + Vector DB` one-click deployment
- **Status**: NOT STARTED

### P0-2: PostgreSQL Storage Adapter
- **PRD Ref**: Section 6 (PostgreSQL 16+)
- **Gap**: Registry uses in-memory `Map<>` + SQLite only; no PostgreSQL adapter
- **Env Note**: PostgreSQL is available in our environment
- **Required**: Implement `PostgresSkillStore`, `PostgresKnowledgeStore`, `PostgresReputationStore`, etc. behind existing async `Promise<T>` store interfaces
- **Status**: NOT STARTED

### P0-3: Redis Cache + Rate Limiting Backend
- **PRD Ref**: Section 3.4.2, Section 6
- **Gap**: Rate limiting state is in-memory (lost on restart); no query cache layer
- **Env Note**: Redis is available in our environment
- **Required**: Redis-backed `RateLimitStore`, token bucket state persistence, query result caching
- **Status**: NOT STARTED

### P0-4: Vector Database Integration (Zvec — Qdrant Replacement)
- **PRD Ref**: Section 6 (originally Qdrant)
- **Gap**: Current `VectorCache` is brute-force linear scan, in-memory only
- **Decision**: Evaluate **Zvec** (`@zvec/zvec` on npm) as Qdrant replacement
- **Zvec Assessment**: See [Appendix A: Zvec Evaluation](#appendix-a-zvec-evaluation)
- **Status**: EVALUATING

### P0-5: GitHub Actions CI/CD
- **PRD Ref**: Section 6
- **Gap**: No `.github/` directory, no CI workflows at all
- **Required**: test, lint, build, codegen consistency check, schema validation
- **Status**: NOT STARTED

### P0-6: WebSocket Collaboration Broadcast Fix
- **PRD Ref**: Section 4.4
- **Gap**: `registry/src/routes/ws-collaborate.ts` only echoes back to sender; no true multi-peer broadcast
- **Required**: Bun server-level WS connection tracking for broadcasting to all room peers
- **Status**: NOT STARTED

---

## P1 — PRD Feature Parity

### P1-1: Hybrid Search (BM25 + Vector)
- **PRD Ref**: Section 4.1 ("vector semantic + BM25 keyword hybrid search")
- **Gap**: Registry search is basic text matching only
- **Required**: Integrate vector similarity search (via Zvec) + BM25 keyword scoring with fusion
- **Note**: Zvec has built-in hybrid search (semantic + structured filters) and Reciprocal Rank Fusion
- **Status**: NOT STARTED

### P1-2: JWT / OIDC Authentication
- **PRD Ref**: Section 3.4.2
- **Gap**: Only API Key auth implemented; no JWT/OIDC support
- **Required**: Optional JWT auth with configurable IdP, OIDC claims (`agent_id`, `org_id`, `scopes[]`, `kp_rep_score`)
- **Status**: NOT STARTED

### P1-3: LLM Injection Classifier for SKILL.md Imports
- **PRD Ref**: Section 3.5.1 (T-2 mitigation)
- **Gap**: Only regex-based sanitizer (HTML strip, Unicode normalization); no semantic injection detection
- **Required**: Run LLM-based prompt injection classifier at import time (one-time, not per-query)
- **Status**: NOT STARTED

### P1-4: Provider Discovery Endpoint + MCP Tool
- **PRD Ref**: Section 3.4.1, Section 3.4 (line 419)
- **Gap**: `GET /v1/providers` endpoint and `kp_provider_discover` MCP tool are missing
- **Required**: Node discovery for federated KnowledgePulse registries
- **Status**: NOT STARTED

### P1-5: OpenAPI Specification
- **PRD Ref**: Section 5.2
- **Gap**: `specs/api-openapi.yaml` does not exist
- **Required**: OpenAPI 3.1 spec for all registry REST endpoints
- **Status**: NOT STARTED

### P1-6: `kp list` CLI Command
- **PRD Ref**: Appendix A quick start
- **Gap**: Mentioned in PRD quick start but not implemented in CLI
- **Required**: `kp list` — list installed skills
- **Status**: NOT STARTED

### P1-7: Idempotency Key Enforcement
- **PRD Ref**: Section 3.4.2 ("write endpoints enforce idempotency key")
- **Gap**: SDK `contribute.ts` generates idempotency keys but registry doesn't enforce/deduplicate them
- **Required**: Registry middleware to reject duplicate writes with same idempotency key
- **Status**: NOT STARTED

### P1-8: MCP Session Token Authentication
- **PRD Ref**: Section 3.4.2
- **Gap**: MCP server doesn't map MCP session tokens to KP API keys
- **Required**: MCP session token verification → internal API key mapping
- **Status**: NOT STARTED

---

## P2 — Ecosystem & Security Hardening

### P2-1: OpenTelemetry + Langfuse Integration
- **PRD Ref**: Section 4.2, Section 6
- **Gap**: No observability tooling at all
- **Required**: OpenTelemetry SDK for agent trace recording; Langfuse for trace visualization
- **Status**: NOT STARTED

### P2-2: Notion + Confluence SOP Importers
- **PRD Ref**: Section 4.4
- **Gap**: Only Word (.docx) and PDF importers exist
- **Required**: Notion API parser + Confluence API parser → SOP decision tree extraction
- **Status**: NOT STARTED

### P2-3: Subscription Marketplace Model
- **PRD Ref**: Section 4.5
- **Gap**: Marketplace supports Free and Pay-per-use (credits), but no subscription model
- **Required**: Subscription tier with unlimited queries for a domain/knowledge set
- **Status**: NOT STARTED

### P2-4: Security — Quarantine Workflow
- **PRD Ref**: Section 3.5.1 ("kp security report" → quarantine → community review → keep/remove)
- **Gap**: `kp security report` is a stub (prints message only)
- **Required**: Full quarantine lifecycle: flag → isolate → community review → verdict
- **Status**: NOT STARTED (noted as "Phase 2 stub" in code)

### P2-5: Security — IP Fallback Rate Limiting
- **PRD Ref**: Section 3.4.2 ("even with valid key, IP-based backup rate limiting")
- **Gap**: Rate limiting is API-key-only
- **Required**: IP-based secondary rate limit layer
- **Status**: NOT STARTED

### P2-6: Security — Proof-of-Work at Registration
- **PRD Ref**: Section 3.5.1 (T-3 Sybil mitigation)
- **Gap**: Agent registration has no Proof-of-Work challenge
- **Required**: Challenge-response signed by verified MCP client at registration time
- **Status**: NOT STARTED

### P2-7: PII Data Cleaning in Capture Pipeline
- **PRD Ref**: Section 4.2 (step 4: "remove PII, business-sensitive info per privacyLevel")
- **Gap**: KPCapture.wrap() captures traces but does no privacy-level data cleaning
- **Required**: Configurable PII stripping pipeline before contribution
- **Status**: NOT STARTED

### P2-8: Bun Single Binary Compilation
- **PRD Ref**: Section 1.2, Section 5.1
- **Gap**: CLI runs via `bun run`, no compiled binary
- **Required**: `bun build --compile` for `kp` CLI distribution
- **Status**: NOT STARTED

### P2-9: Install Script
- **PRD Ref**: Appendix A
- **Gap**: `curl -fsSL https://openknowledgepulse.org/install.sh | sh` mentioned but script doesn't exist
- **Required**: Platform-detection install script for CLI binary
- **Status**: NOT STARTED

---

## P3 — Long-term / Phase 4+ Goals

### P3-1: Neo4j + Graphiti Knowledge Graph
- **PRD Ref**: Section 6
- **Gap**: No graph database integration
- **Required**: Temporal bi-temporal knowledge graph for entity/relationship tracking
- **Status**: NOT STARTED

### P3-2: Federated Learning (Flower Framework)
- **PRD Ref**: Section 3.5 (Level 2 Privacy), Phase 3 deliverable
- **Gap**: Not implemented
- **Required**: Flower framework integration for cross-org model gradient sharing
- **Status**: NOT STARTED

### P3-3: Differential Privacy (ε-DP + SMPC)
- **PRD Ref**: Section 3.5 (Level 3 Privacy)
- **Gap**: Not implemented
- **Required**: ε-differential privacy noise injection + Secure Multi-Party Computation
- **Status**: NOT STARTED

### P3-4: k-Anonymity Enforcement
- **PRD Ref**: Section 3.5.1 (T-4 mitigation)
- **Gap**: Not implemented
- **Required**: Don't serve knowledge units unless ≥k similar units exist in the same domain
- **Status**: NOT STARTED

### P3-5: Multi-Language Support (ja, ko, es)
- **PRD Ref**: Phase 4 deliverable
- **Gap**: Only `en` + `zh-Hans` implemented
- **Required**: Japanese, Korean, Spanish translations for website + SOP Studio
- **Status**: NOT STARTED

### P3-6: Governance Structure
- **PRD Ref**: Phase 4 deliverable
- **Gap**: No technical committee or community governance documentation
- **Required**: Technical committee structure + Quadratic Voting community house
- **Status**: NOT STARTED

### P3-7: Compliance Certifications
- **PRD Ref**: Section 3.7 compliance roadmap
- **Gap**: SOC 2 Type I/II, HIPAA BAA, ISO 27001 — all not started
- **Required**: Administrative + technical controls for certification
- **Status**: NOT STARTED

### P3-8: GDPR Completion
- **PRD Ref**: Section 3.7
- **Gap**: DELETE + Export APIs exist, but missing: webhook/email deletion confirmation, 72h SLA tracking
- **Required**: Notification system for deletion completion + SLA monitoring
- **Status**: PARTIAL

### P3-9: Bulk Extraction Anomaly Detection
- **PRD Ref**: Section 3.5.1 (T-4 mitigation)
- **Gap**: Audit log exists but no anomaly detection on query patterns
- **Required**: Pattern analysis to detect data exfiltration via bulk queries
- **Status**: NOT STARTED

---

## Minor Gaps

| Item | PRD Ref | Status |
|------|---------|--------|
| `CODE_OF_CONDUCT.md` at repo root | Section 5.2 | Missing |
| Skill quality: GitHub Stars integration | Section 4.1 | Missing |
| Skill quality: Maintenance status tracking | Section 4.1 | Missing |
| Cross-platform compatibility tags on skills | Section 4.1 | Missing |
| Schema migration `v1-to-v2.ts` is placeholder | Section 3.3.2 | Stub only |
| Content Security Policy in `kp:` extension blocks | Section 3.5.1 | Missing |
| Multi-validator consensus (≥3) before `network` visibility | Section 3.5.1 | Missing |
| Canary sandbox test execution for traces | Section 3.5.1 | Missing |
| Auto-isolate on low `success_rate` (<0.5) | Section 3.5.1 | Missing |
| `@xenova/transformers` not in SDK dependencies | Section 4.2.1 | Missing dep |
| `KP-Deprecated: true` header for schema deprecation | Section 3.3.2 | Missing |
| Vertical domain knowledge bases (finance, customer service, agriculture) | Phase 3 | Missing |

---

## Appendix A: Zvec Evaluation (Qdrant Replacement)

### Overview

[Zvec](https://github.com/alibaba/zvec) is an open-source, **in-process embedded vector database** built on Alibaba's Proxima search engine. It is described as "the SQLite of vector databases."

### Why Zvec Over Qdrant

| Dimension | Qdrant | Zvec | Winner for KP |
|-----------|--------|------|---------------|
| Deployment | Separate server (Docker) | **In-process embedded** (library) | **Zvec** — no extra infra |
| Node.js SDK | REST client only | **`@zvec/zvec`** on npm (native binding) | **Zvec** — tighter integration |
| Architecture fit | Client-server | **Embedded** (like Bun's SQLite) | **Zvec** — matches KP's SQLite pattern |
| Performance | Good (cloud-optimized) | **8,000+ QPS on 10M vectors** (2x ZillizCloud) | **Zvec** — superior benchmarks |
| Hybrid search | Separate filter + vector | **Native hybrid** (semantic + structured filters in index path) | **Zvec** — built-in |
| Multi-vector | Manual | **Native multi-vector queries** in single call | **Zvec** — cleaner API |
| Reranker | External | **Built-in** (weighted fusion + Reciprocal Rank Fusion) | **Zvec** — fulfills BM25+vector PRD requirement |
| Dense + Sparse | Dense only (sparse via workarounds) | **Native dense + sparse** | **Zvec** |
| CRUD | Full | **Full CRUD** on documents | Tie |
| Docker dependency | Required | **None** (in-process) | **Zvec** — simpler deployment |
| Index types | HNSW | **HNSW, IVF, Flat** | **Zvec** — more options |
| SIMD optimization | Yes | **Yes** (multi-threaded + CPU prefetch) | Tie |
| Platform | All | Linux x86_64/ARM64, macOS ARM64 | Qdrant (broader), Zvec (sufficient) |

### Recommendation

**Strongly recommended** to adopt Zvec instead of Qdrant:

1. **Architectural alignment**: Zvec is an embedded library, matching KP's existing pattern of using Bun's built-in SQLite. No separate server process = simpler Docker compose, simpler dev experience.
2. **PRD hybrid search**: Zvec's native hybrid search with RRF directly satisfies PRD Section 4.1's "vector semantic + BM25 keyword hybrid search" requirement.
3. **npm package**: `@zvec/zvec` provides native Node.js bindings — no REST overhead.
4. **Performance**: 8,000+ QPS on 10M vectors is more than sufficient for KP's needs.
5. **Reduced infrastructure**: Eliminates one Docker container (Qdrant) from the deployment stack.

### Integration Plan

```
registry/src/store/zvec/
  zvec-knowledge-store.ts    # VectorStore interface using @zvec/zvec
  zvec-skill-store.ts        # Skill semantic search via Zvec
  index.ts                   # Collection schema definitions + init
```

Replace `VectorCache` (brute-force linear scan) in SDK scoring with Zvec for local embedding cache when scale demands it.

### Sources

- [Zvec GitHub Repository](https://github.com/alibaba/zvec)
- [Zvec Documentation](https://zvec.org/en/docs/)
- ["The SQLite of Vector Databases" — Medium](https://medium.com/@AdithyaGiridharan/zvec-alibaba-just-open-sourced-the-sqlite-of-vector-databases-and-its-blazing-fast-15c31cbfebbf)
- [Alibaba Open-Sources Zvec — MarkTechPost](https://www.marktechpost.com/2026/02/10/alibaba-open-sources-zvec-an-embedded-vector-database-bringing-sqlite-like-simplicity-and-high-performance-on-device-rag-to-edge-applications/)

---

*Last updated: 2026-02-22*
