import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type {
  CertificationProposal,
  CreditTransaction,
  DomainBadge,
  MarketplaceListing,
  StoredKnowledgeUnit,
  StoredSOP,
} from "../interfaces.js";
import { PgApiKeyStore } from "./apikey-store.js";
import { PgAuditLogStore } from "./audit-log-store.js";
import { PgCreditStore } from "./credit-store.js";
import { createPool, runMigrations, type PgPool } from "./db.js";
import { PgKnowledgeStore } from "./knowledge-store.js";
import { PgMarketplaceStore } from "./marketplace-store.js";
import { PgRateLimitStore } from "./rate-limit-store.js";
import { PgReputationStore } from "./reputation-store.js";
import { PgSopStore } from "./sop-store.js";

const DATABASE_URL =
  process.env.KP_TEST_DATABASE_URL ??
  "postgresql://knowledgepulse_user:KPulse2026Secure@172.31.9.157:5432/knowledgepulse";

// ── Shared pool ─────────────────────────────────────────
let pool: PgPool;

beforeAll(async () => {
  pool = createPool(DATABASE_URL);
  await runMigrations(pool);
});

afterAll(async () => {
  await pool.end();
});

// ═══════════════════════════════════════════════════════════
// 1. PgKnowledgeStore
// ═══════════════════════════════════════════════════════════

describe("PgKnowledgeStore", () => {
  let store: PgKnowledgeStore;

  function makeKU(overrides: Partial<StoredKnowledgeUnit> = {}): StoredKnowledgeUnit {
    const now = new Date().toISOString();
    return {
      id: `kp:ku:${crypto.randomUUID()}`,
      unit: {
        "@type": "ReasoningTrace",
        task: {
          objective: "Solve a math problem",
          constraints: [],
          context: {},
        },
        steps: [
          {
            step_number: 1,
            action: "think",
            content: "Step 1 reasoning",
            timestamp: now,
          },
        ],
        outcome: { success: true, result: "42" },
        metadata: {
          agent_id: "agent-test-1",
          timestamp: now,
          quality_score: 0.85,
          task_domain: "math",
        },
      },
      visibility: "network",
      created_at: now,
      updated_at: now,
      ...overrides,
    } as StoredKnowledgeUnit;
  }

  beforeAll(async () => {
    await pool.query("DELETE FROM knowledge_units");
    store = new PgKnowledgeStore(pool);
  });

  test("create + getById", async () => {
    const ku = makeKU();
    const created = await store.create(ku);
    expect(created.id).toBe(ku.id);

    const retrieved = await store.getById(ku.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(ku.id);
    expect(retrieved!.unit["@type"]).toBe("ReasoningTrace");
    expect(retrieved!.unit.metadata.quality_score).toBe(0.85);
  });

  test("getById returns undefined for missing id", async () => {
    const result = await store.getById("kp:ku:nonexistent");
    expect(result).toBeUndefined();
  });

  test("search by types", async () => {
    await pool.query("DELETE FROM knowledge_units");
    await store.create(makeKU());
    await store.create(
      makeKU({
        id: `kp:ku:${crypto.randomUUID()}`,
        unit: {
          "@type": "ToolCallPattern",
          name: "test-tool",
          description: "A tool pattern",
          parameters: [],
          examples: [],
          metadata: {
            agent_id: "agent-test-2",
            timestamp: new Date().toISOString(),
            quality_score: 0.9,
            task_domain: "devops",
          },
        } as StoredKnowledgeUnit["unit"],
      }),
    );

    const result = await store.search({ types: ["ReasoningTrace"] });
    expect(result.total).toBe(1);
    expect(result.data[0]!.unit["@type"]).toBe("ReasoningTrace");
  });

  test("search by domain", async () => {
    await pool.query("DELETE FROM knowledge_units");
    await store.create(makeKU());
    await store.create(
      makeKU({
        id: `kp:ku:${crypto.randomUUID()}`,
        unit: {
          "@type": "ReasoningTrace",
          task: { objective: "Deploy app", constraints: [], context: {} },
          steps: [],
          outcome: { success: true, result: "deployed" },
          metadata: {
            agent_id: "agent-test-3",
            timestamp: new Date().toISOString(),
            quality_score: 0.7,
            task_domain: "devops",
          },
        } as StoredKnowledgeUnit["unit"],
      }),
    );

    const result = await store.search({ domain: "math" });
    expect(result.total).toBe(1);
    expect(result.data[0]!.unit.metadata.task_domain).toBe("math");
  });

  test("search by min_quality", async () => {
    await pool.query("DELETE FROM knowledge_units");
    await store.create(makeKU()); // quality_score 0.85
    await store.create(
      makeKU({
        id: `kp:ku:${crypto.randomUUID()}`,
        unit: {
          "@type": "ReasoningTrace",
          task: { objective: "Easy task", constraints: [], context: {} },
          steps: [],
          outcome: { success: true, result: "ok" },
          metadata: {
            agent_id: "agent-test-4",
            timestamp: new Date().toISOString(),
            quality_score: 0.3,
            task_domain: "general",
          },
        } as StoredKnowledgeUnit["unit"],
      }),
    );

    const result = await store.search({ min_quality: 0.8 });
    expect(result.total).toBe(1);
    expect(result.data[0]!.unit.metadata.quality_score).toBe(0.85);
  });

  test("delete", async () => {
    const ku = makeKU();
    await store.create(ku);
    const deleted = await store.delete(ku.id);
    expect(deleted).toBe(true);

    const retrieved = await store.getById(ku.id);
    expect(retrieved).toBeUndefined();

    const deletedAgain = await store.delete(ku.id);
    expect(deletedAgain).toBe(false);
  });

  test("getByAgentId", async () => {
    await pool.query("DELETE FROM knowledge_units");
    const agentId = "agent-special-1";
    await store.create(
      makeKU({
        id: `kp:ku:${crypto.randomUUID()}`,
        unit: {
          "@type": "ReasoningTrace",
          task: { objective: "Task A", constraints: [], context: {} },
          steps: [],
          outcome: { success: true, result: "a" },
          metadata: {
            agent_id: agentId,
            timestamp: new Date().toISOString(),
            quality_score: 0.8,
            task_domain: "math",
          },
        } as StoredKnowledgeUnit["unit"],
      }),
    );
    await store.create(
      makeKU({
        id: `kp:ku:${crypto.randomUUID()}`,
        unit: {
          "@type": "ReasoningTrace",
          task: { objective: "Task B", constraints: [], context: {} },
          steps: [],
          outcome: { success: true, result: "b" },
          metadata: {
            agent_id: "other-agent",
            timestamp: new Date().toISOString(),
            quality_score: 0.6,
            task_domain: "devops",
          },
        } as StoredKnowledgeUnit["unit"],
      }),
    );

    const results = await store.getByAgentId(agentId);
    expect(results).toHaveLength(1);
    expect(results[0]!.unit.metadata.agent_id).toBe(agentId);
  });
});

// ═══════════════════════════════════════════════════════════
// 2. PgReputationStore
// ═══════════════════════════════════════════════════════════

describe("PgReputationStore", () => {
  let store: PgReputationStore;

  beforeAll(async () => {
    await pool.query("DELETE FROM proposal_votes");
    await pool.query("DELETE FROM certification_proposals");
    await pool.query("DELETE FROM badges");
    await pool.query("DELETE FROM validation_votes");
    await pool.query("DELETE FROM reputation");
    store = new PgReputationStore(pool);
  });

  test("get returns undefined for missing agent", async () => {
    const result = await store.get("nonexistent-agent");
    expect(result).toBeUndefined();
  });

  test("upsert creates new record", async () => {
    const record = await store.upsert("agent-rep-1", 10, "Contributed knowledge");
    expect(record.agent_id).toBe("agent-rep-1");
    expect(record.score).toBe(10);
    expect(record.contributions).toBe(1);
    expect(record.history).toHaveLength(1);
    expect(record.history[0]!.delta).toBe(10);
  });

  test("upsert updates existing record", async () => {
    const record = await store.upsert("agent-rep-1", 5, "Validated something");
    expect(record.score).toBe(15);
    expect(record.contributions).toBe(2); // delta > 0 so contributions incremented again
    expect(record.validations).toBe(1); // "Validated" keyword detected
    expect(record.history).toHaveLength(2);
  });

  test("upsert clamps score to 0", async () => {
    const agent = "agent-rep-clamp";
    await store.upsert(agent, 5, "initial");
    const record = await store.upsert(agent, -100, "penalty");
    expect(record.score).toBe(0);
  });

  test("getAll returns all records", async () => {
    const all = await store.getAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  test("getLeaderboard returns sorted paginated results", async () => {
    await pool.query("DELETE FROM reputation");
    await store.upsert("leader-a", 100, "high");
    await store.upsert("leader-b", 50, "mid");
    await store.upsert("leader-c", 200, "top");

    const lb = await store.getLeaderboard({ offset: 0, limit: 2 });
    expect(lb.total).toBe(3);
    expect(lb.data).toHaveLength(2);
    expect(lb.data[0]!.agent_id).toBe("leader-c");
    expect(lb.data[1]!.agent_id).toBe("leader-a");
  });

  test("recordVote + getVotes", async () => {
    await pool.query("DELETE FROM validation_votes");
    const vote = {
      validatorId: "validator-1",
      targetId: "target-1",
      unitId: "unit-1",
      valid: true,
      timestamp: new Date().toISOString(),
    };
    await store.recordVote(vote);

    const votes = await store.getVotes();
    expect(votes).toHaveLength(1);
    expect(votes[0]!.validatorId).toBe("validator-1");
    expect(votes[0]!.valid).toBe(true);
  });

  test("canVote returns false for missing agent", async () => {
    const result = await store.canVote("nonexistent");
    expect(result).toBe(false);
  });

  test("canVote returns false for recently created agent", async () => {
    await pool.query("DELETE FROM reputation");
    await store.upsert("new-agent", 10, "new");
    const result = await store.canVote("new-agent");
    expect(result).toBe(false);
  });

  test("canVote returns true for old agent (backdoor via direct SQL)", async () => {
    await pool.query("DELETE FROM reputation");
    // Insert agent with old created_at
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await pool.query(
      `INSERT INTO reputation (agent_id, score, contributions, validations, history, created_at, updated_at)
       VALUES ($1, 50, 10, 5, '[]', $2, $2)`,
      ["old-agent", oldDate],
    );
    const result = await store.canVote("old-agent");
    expect(result).toBe(true);
  });

  test("grantBadge + getBadges + hasBadge", async () => {
    await pool.query("DELETE FROM badges");
    const badge: DomainBadge = {
      badge_id: "badge-test-1",
      agent_id: "agent-badge-1",
      domain: "math",
      level: "bronze",
      granted_at: new Date().toISOString(),
      granted_by: "system",
    };
    await store.grantBadge(badge);

    const badges = await store.getBadges("agent-badge-1");
    expect(badges).toHaveLength(1);
    expect(badges[0]!.level).toBe("bronze");

    const has = await store.hasBadge("agent-badge-1", "math", "bronze");
    expect(has).toBe(true);

    const hasNot = await store.hasBadge("agent-badge-1", "math", "gold");
    expect(hasNot).toBe(false);
  });

  test("createProposal + getProposal", async () => {
    await pool.query("DELETE FROM proposal_votes");
    await pool.query("DELETE FROM certification_proposals");
    const proposal: CertificationProposal = {
      proposal_id: "prop-test-1",
      agent_id: "agent-prop-1",
      domain: "math",
      target_level: "gold",
      proposed_by: "proposer-1",
      votes: [],
      status: "open",
      created_at: new Date().toISOString(),
      closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const created = await store.createProposal(proposal);
    expect(created.proposal_id).toBe("prop-test-1");

    const fetched = await store.getProposal("prop-test-1");
    expect(fetched).toBeDefined();
    expect(fetched!.domain).toBe("math");
    expect(fetched!.status).toBe("open");
  });

  test("getOpenProposals", async () => {
    const open = await store.getOpenProposals();
    expect(open.length).toBeGreaterThanOrEqual(1);
    expect(open.every((p) => p.status === "open")).toBe(true);
  });

  test("addVoteToProposal", async () => {
    await store.addVoteToProposal("prop-test-1", {
      voter_id: "voter-1",
      approve: true,
      weight: 1.5,
    });

    const proposal = await store.getProposal("prop-test-1");
    expect(proposal!.votes).toHaveLength(1);
    expect(proposal!.votes[0]!.voter_id).toBe("voter-1");
    expect(proposal!.votes[0]!.approve).toBe(true);
    expect(proposal!.votes[0]!.weight).toBe(1.5);
  });

  test("updateProposalStatus", async () => {
    await store.updateProposalStatus("prop-test-1", "approved");
    const proposal = await store.getProposal("prop-test-1");
    expect(proposal!.status).toBe("approved");
  });
});

// ═══════════════════════════════════════════════════════════
// 3. PgApiKeyStore
// ═══════════════════════════════════════════════════════════

describe("PgApiKeyStore", () => {
  let store: PgApiKeyStore;

  beforeAll(async () => {
    await pool.query("DELETE FROM api_keys");
    store = new PgApiKeyStore(pool);
  });

  test("create returns raw_key with kp_ prefix and record", async () => {
    const { raw_key, record } = await store.create("agent-key-1", ["read", "write"], "pro");
    expect(raw_key).toMatch(/^kp_[0-9a-f]{64}$/);
    expect(record.agent_id).toBe("agent-key-1");
    expect(record.scopes).toEqual(["read", "write"]);
    expect(record.tier).toBe("pro");
    expect(record.revoked).toBe(false);
    expect(record.key_prefix).toBe(raw_key.slice(0, 11));
  });

  test("verify returns record for valid key", async () => {
    const { raw_key } = await store.create("agent-key-2", ["read"], "free");
    const record = await store.verify(raw_key);
    expect(record).toBeDefined();
    expect(record!.agent_id).toBe("agent-key-2");
  });

  test("verify returns undefined for unknown key", async () => {
    const result = await store.verify("kp_0000000000000000000000000000000000000000000000000000000000000000");
    expect(result).toBeUndefined();
  });

  test("revoke marks key as revoked", async () => {
    const { raw_key, record } = await store.create("agent-key-3", ["read"], "free");
    const revoked = await store.revoke(record.key_prefix);
    expect(revoked).toBe(true);

    // Verify should now return undefined
    const verifyResult = await store.verify(raw_key);
    expect(verifyResult).toBeUndefined();
  });

  test("revoke returns false for unknown prefix", async () => {
    const result = await store.revoke("kp_unknown");
    expect(result).toBe(false);
  });

  test("getByAgentId returns all keys for agent", async () => {
    await pool.query("DELETE FROM api_keys");
    await store.create("agent-multi", ["read"], "free");
    await store.create("agent-multi", ["read", "write"], "pro");
    await store.create("other-agent", ["admin"], "enterprise");

    const keys = await store.getByAgentId("agent-multi");
    expect(keys).toHaveLength(2);
    expect(keys.every((k) => k.agent_id === "agent-multi")).toBe(true);
  });

  test("verify revoked key returns undefined", async () => {
    await pool.query("DELETE FROM api_keys");
    const { raw_key, record } = await store.create("agent-revoke-test", ["read"], "free");
    await store.revoke(record.key_prefix);

    const result = await store.verify(raw_key);
    expect(result).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// 4. PgSopStore
// ═══════════════════════════════════════════════════════════

describe("PgSopStore", () => {
  let store: PgSopStore;

  function makeSOP(overrides: Partial<StoredSOP> = {}): StoredSOP {
    const now = new Date().toISOString();
    return {
      id: `kp:sop:${crypto.randomUUID()}`,
      sop: {
        "@type": "ExpertSOP",
        name: "Test SOP",
        domain: "testing",
        version: "1.0.0",
        description: "A test standard operating procedure",
        decision_tree: [
          { step: "Step 1", instruction: "Do the first thing", conditions: [] },
        ],
        quality_criteria: [],
        metadata: {
          agent_id: "agent-sop-1",
          timestamp: now,
          quality_score: 0.8,
          task_domain: "testing",
        },
      },
      version: 1,
      status: "draft",
      visibility: "network",
      created_at: now,
      updated_at: now,
      ...overrides,
    } as StoredSOP;
  }

  beforeAll(async () => {
    await pool.query("DELETE FROM sop_versions");
    await pool.query("DELETE FROM sops");
    store = new PgSopStore(pool);
  });

  test("create + getById", async () => {
    const sop = makeSOP();
    const created = await store.create(sop);
    expect(created.id).toBe(sop.id);

    const retrieved = await store.getById(sop.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.sop.name).toBe("Test SOP");
    expect(retrieved!.status).toBe("draft");
  });

  test("getById returns undefined for missing", async () => {
    const result = await store.getById("kp:sop:nonexistent");
    expect(result).toBeUndefined();
  });

  test("search by domain", async () => {
    await pool.query("DELETE FROM sops");
    await store.create(makeSOP());
    await store.create(
      makeSOP({
        id: `kp:sop:${crypto.randomUUID()}`,
        sop: {
          "@type": "ExpertSOP",
          name: "DevOps SOP",
          domain: "devops",
          version: "1.0.0",
          description: "A devops SOP",
          decision_tree: [],
          quality_criteria: [],
          metadata: {
            agent_id: "agent-sop-2",
            timestamp: new Date().toISOString(),
            quality_score: 0.6,
            task_domain: "devops",
          },
        },
      } as Partial<StoredSOP>),
    );

    const result = await store.search({ domain: "testing" });
    expect(result.total).toBe(1);
    expect(result.data[0]!.sop.domain).toBe("testing");
  });

  test("search by status", async () => {
    await pool.query("DELETE FROM sops");
    await store.create(makeSOP({ status: "draft" }));
    await store.create(makeSOP({ id: `kp:sop:${crypto.randomUUID()}`, status: "approved" }));

    const drafts = await store.search({ status: "draft" });
    expect(drafts.total).toBe(1);
  });

  test("search by query", async () => {
    await pool.query("DELETE FROM sops");
    await store.create(makeSOP());

    const result = await store.search({ query: "Test SOP" });
    expect(result.total).toBe(1);
  });

  test("update", async () => {
    const sop = makeSOP();
    await store.create(sop);

    const updated = await store.update(sop.id, { status: "approved", approved_by: "admin" });
    expect(updated).toBeDefined();
    expect(updated!.status).toBe("approved");
    expect(updated!.approved_by).toBe("admin");
  });

  test("update returns undefined for missing", async () => {
    const result = await store.update("kp:sop:missing", { status: "approved" });
    expect(result).toBeUndefined();
  });

  test("delete", async () => {
    const sop = makeSOP();
    await store.create(sop);
    const deleted = await store.delete(sop.id);
    expect(deleted).toBe(true);

    const retrieved = await store.getById(sop.id);
    expect(retrieved).toBeUndefined();
  });

  test("addVersion + getVersions", async () => {
    await pool.query("DELETE FROM sop_versions");
    const sopId = "kp:sop:version-test";
    const now = new Date().toISOString();

    await store.addVersion({
      sop_id: sopId,
      version: 1,
      diff_summary: "Initial version",
      created_at: now,
    });
    await store.addVersion({
      sop_id: sopId,
      version: 2,
      diff_summary: "Updated step 1",
      created_at: now,
    });

    const versions = await store.getVersions(sopId);
    expect(versions).toHaveLength(2);
    expect(versions[0]!.version).toBe(1);
    expect(versions[1]!.version).toBe(2);
  });

  test("getByDomain", async () => {
    await pool.query("DELETE FROM sops");
    await store.create(makeSOP());
    await store.create(
      makeSOP({
        id: `kp:sop:${crypto.randomUUID()}`,
        sop: {
          "@type": "ExpertSOP",
          name: "Another testing SOP",
          domain: "testing",
          version: "2.0.0",
          description: "Another one",
          decision_tree: [],
          quality_criteria: [],
          metadata: {
            agent_id: "agent-sop-3",
            timestamp: new Date().toISOString(),
            quality_score: 0.7,
            task_domain: "testing",
          },
        },
      } as Partial<StoredSOP>),
    );

    const results = await store.getByDomain("testing");
    expect(results).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. PgCreditStore
// ═══════════════════════════════════════════════════════════

describe("PgCreditStore", () => {
  let store: PgCreditStore;

  beforeAll(async () => {
    await pool.query("DELETE FROM credit_transactions");
    await pool.query("DELETE FROM credit_balances");
    store = new PgCreditStore(pool);
  });

  test("getBalance returns 0 for new agent", async () => {
    const balance = await store.getBalance("credit-agent-new");
    expect(balance).toBe(0);
  });

  test("addCredits increases balance", async () => {
    await store.addCredits("credit-agent-1", 100, "Welcome bonus");
    const balance = await store.getBalance("credit-agent-1");
    expect(balance).toBe(100);

    await store.addCredits("credit-agent-1", 50, "Contribution reward");
    const balance2 = await store.getBalance("credit-agent-1");
    expect(balance2).toBe(150);
  });

  test("deductCredits succeeds with sufficient balance", async () => {
    await pool.query("DELETE FROM credit_transactions");
    await pool.query("DELETE FROM credit_balances");
    await store.addCredits("credit-agent-2", 100, "initial");

    const result = await store.deductCredits("credit-agent-2", 30, "purchase");
    expect(result).toBe(true);

    const balance = await store.getBalance("credit-agent-2");
    expect(balance).toBe(70);
  });

  test("deductCredits fails with insufficient balance", async () => {
    await pool.query("DELETE FROM credit_transactions");
    await pool.query("DELETE FROM credit_balances");
    await store.addCredits("credit-agent-3", 10, "small balance");

    const result = await store.deductCredits("credit-agent-3", 50, "expensive purchase");
    expect(result).toBe(false);

    // Balance should be unchanged
    const balance = await store.getBalance("credit-agent-3");
    expect(balance).toBe(10);
  });

  test("getTransactions returns paginated results", async () => {
    await pool.query("DELETE FROM credit_transactions");
    await pool.query("DELETE FROM credit_balances");
    await store.addCredits("credit-agent-4", 100, "bonus 1");
    await store.addCredits("credit-agent-4", 50, "bonus 2");
    await store.deductCredits("credit-agent-4", 25, "spend");

    const result = await store.getTransactions("credit-agent-4", { offset: 0, limit: 10 });
    expect(result.total).toBe(3);
    expect(result.data).toHaveLength(3);
  });

  test("getLastRefill returns undefined for new agent", async () => {
    const refill = await store.getLastRefill("credit-refill-new");
    expect(refill).toBeUndefined();
  });

  test("setLastRefill + getLastRefill", async () => {
    const date = "2026-02-22T00:00:00Z";
    await store.setLastRefill("credit-refill-1", date);

    const refill = await store.getLastRefill("credit-refill-1");
    expect(refill).toBe(date);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. PgMarketplaceStore
// ═══════════════════════════════════════════════════════════

describe("PgMarketplaceStore", () => {
  let store: PgMarketplaceStore;

  function makeListing(overrides: Partial<MarketplaceListing> = {}): MarketplaceListing {
    const now = new Date().toISOString();
    return {
      id: `listing-${crypto.randomUUID()}`,
      knowledge_unit_id: `kp:ku:${crypto.randomUUID()}`,
      contributor_id: "contributor-1",
      price_credits: 10,
      access_model: "free",
      domain: "math",
      title: "Math Knowledge Pack",
      description: "A comprehensive math knowledge package",
      purchases: 0,
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  beforeAll(async () => {
    await pool.query("DELETE FROM marketplace_listings");
    store = new PgMarketplaceStore(pool);
  });

  test("createListing + getListing", async () => {
    const listing = makeListing();
    const created = await store.createListing(listing);
    expect(created.id).toBe(listing.id);

    const retrieved = await store.getListing(listing.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe("Math Knowledge Pack");
  });

  test("getListing returns undefined for missing", async () => {
    const result = await store.getListing("listing-nonexistent");
    expect(result).toBeUndefined();
  });

  test("search by domain", async () => {
    await pool.query("DELETE FROM marketplace_listings");
    await store.createListing(makeListing({ domain: "math" }));
    await store.createListing(makeListing({ id: `listing-${crypto.randomUUID()}`, domain: "devops" }));

    const result = await store.search({ domain: "math" });
    expect(result.total).toBe(1);
    expect(result.data[0]!.domain).toBe("math");
  });

  test("search by access_model", async () => {
    await pool.query("DELETE FROM marketplace_listings");
    await store.createListing(makeListing({ access_model: "free" }));
    await store.createListing(
      makeListing({ id: `listing-${crypto.randomUUID()}`, access_model: "subscription" }),
    );

    const result = await store.search({ access_model: "free" });
    expect(result.total).toBe(1);
  });

  test("search by query", async () => {
    await pool.query("DELETE FROM marketplace_listings");
    await store.createListing(makeListing({ title: "React Component Library" }));
    await store.createListing(
      makeListing({ id: `listing-${crypto.randomUUID()}`, title: "Python Data Tools" }),
    );

    const result = await store.search({ query: "React" });
    expect(result.total).toBe(1);
    expect(result.data[0]!.title).toBe("React Component Library");
  });

  test("recordPurchase increments count", async () => {
    await pool.query("DELETE FROM marketplace_listings");
    const listing = makeListing({ purchases: 0 });
    await store.createListing(listing);

    await store.recordPurchase(listing.id, "buyer-1");
    await store.recordPurchase(listing.id, "buyer-2");

    const retrieved = await store.getListing(listing.id);
    expect(retrieved!.purchases).toBe(2);
  });

  test("getByContributor", async () => {
    await pool.query("DELETE FROM marketplace_listings");
    await store.createListing(makeListing({ contributor_id: "contrib-1" }));
    await store.createListing(
      makeListing({ id: `listing-${crypto.randomUUID()}`, contributor_id: "contrib-1" }),
    );
    await store.createListing(
      makeListing({ id: `listing-${crypto.randomUUID()}`, contributor_id: "contrib-2" }),
    );

    const results = await store.getByContributor("contrib-1");
    expect(results).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════
// 7. PgAuditLogStore
// ═══════════════════════════════════════════════════════════

describe("PgAuditLogStore", () => {
  let store: PgAuditLogStore;

  beforeAll(async () => {
    await pool.query("DELETE FROM audit_log");
    store = new PgAuditLogStore(pool);
  });

  test("log creates entry and query retrieves it", async () => {
    await store.log({
      action: "create",
      agentId: "audit-agent-1",
      resourceType: "knowledge_unit",
      resourceId: "kp:ku:test-1",
      ip: "127.0.0.1",
      details: { source: "api" },
    });

    const entries = await store.query({ agentId: "audit-agent-1" });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.action).toBe("create");
    expect(entries[0]!.resourceType).toBe("knowledge_unit");
    expect(entries[0]!.details).toEqual({ source: "api" });
    expect(entries[0]!.id).toBeDefined();
    expect(entries[0]!.timestamp).toBeDefined();
  });

  test("query by action", async () => {
    await pool.query("DELETE FROM audit_log");
    await store.log({
      action: "create",
      agentId: "audit-agent-2",
      resourceType: "skill",
      resourceId: "kp:skill:1",
      ip: "10.0.0.1",
    });
    await store.log({
      action: "delete",
      agentId: "audit-agent-2",
      resourceType: "skill",
      resourceId: "kp:skill:2",
      ip: "10.0.0.1",
    });
    await store.log({
      action: "read",
      agentId: "audit-agent-3",
      resourceType: "knowledge_unit",
      resourceId: "kp:ku:1",
      ip: "10.0.0.2",
    });

    const creates = await store.query({ action: "create" });
    expect(creates).toHaveLength(1);

    const deletes = await store.query({ action: "delete" });
    expect(deletes).toHaveLength(1);
  });

  test("query by date range", async () => {
    await pool.query("DELETE FROM audit_log");

    // Insert entries with known timestamps via direct SQL
    const pastDate = new Date("2026-01-01T00:00:00Z");
    const futureDate = new Date("2026-12-31T23:59:59Z");

    await pool.query(
      `INSERT INTO audit_log (id, action, agent_id, resource_type, resource_id, timestamp, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [crypto.randomUUID(), "create", "agent-date", "skill", "s1", pastDate.toISOString(), "1.1.1.1"],
    );
    await store.log({
      action: "update",
      agentId: "agent-date",
      resourceType: "skill",
      resourceId: "s2",
      ip: "2.2.2.2",
    });

    // Query from Feb 2026 onwards should only get the recent log entry
    const result = await store.query({
      from: "2026-02-01T00:00:00Z",
      to: "2026-12-31T23:59:59Z",
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.action).toBe("update");
  });
});

// ═══════════════════════════════════════════════════════════
// 8. PgRateLimitStore
// ═══════════════════════════════════════════════════════════

describe("PgRateLimitStore", () => {
  let store: PgRateLimitStore;

  beforeAll(async () => {
    await pool.query("DELETE FROM rate_limit_buckets");
    await pool.query("DELETE FROM rate_limit_violations");
    store = new PgRateLimitStore(pool);
  });

  test("consume allows requests within limit", async () => {
    const result = await store.consume("rate-test-1", "free", "GET");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(300);
    expect(result.remaining).toBeGreaterThan(0);
  });

  test("consume denies anonymous write", async () => {
    const result = await store.consume("rate-test-2", "anonymous", "POST");
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(0);
    expect(result.retryAfter).toBe(60);
  });

  test("consume exhausts bucket", async () => {
    await pool.query("DELETE FROM rate_limit_buckets");

    // Use a tiny bucket: anonymous read = 60/min
    // Consume all 60 tokens
    let lastResult;
    for (let i = 0; i < 61; i++) {
      lastResult = await store.consume("rate-exhaust", "anonymous", "GET");
      if (!lastResult.allowed) break;
    }

    expect(lastResult!.allowed).toBe(false);
    expect(lastResult!.remaining).toBe(0);
    expect(lastResult!.retryAfter).toBeGreaterThan(0);
  });

  test("record429 + get429Count", async () => {
    await pool.query("DELETE FROM rate_limit_violations");
    await store.record429("violator-1");
    await store.record429("violator-1");
    await store.record429("violator-1");

    const count = await store.get429Count("violator-1", 60_000);
    expect(count).toBe(3);

    // Count with very small window should be 0 (if enough time passes, but in practice it's still 3)
    // Use a window of 0 to ensure old violations are excluded
    const oldCount = await store.get429Count("violator-1", 0);
    expect(oldCount).toBe(0);
  });

  test("consume uses correct tier config", async () => {
    await pool.query("DELETE FROM rate_limit_buckets");

    // Pro tier: 1000 read/min
    const proResult = await store.consume("tier-pro", "pro", "GET");
    expect(proResult.limit).toBe(1000);

    // Enterprise tier: 10000 read/min
    const entResult = await store.consume("tier-enterprise", "enterprise", "GET");
    expect(entResult.limit).toBe(10000);

    // Unknown tier falls back to anonymous
    const unknownResult = await store.consume("tier-unknown", "bogus", "GET");
    expect(unknownResult.limit).toBe(60);
  });
});
