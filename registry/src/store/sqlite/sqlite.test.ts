import { beforeEach, describe, expect, test } from "bun:test";
import type { ReasoningTrace, ToolCallPattern, ValidationVote } from "@knowledgepulse/sdk";
import type { AllStores, StoredKnowledgeUnit, StoredSkill } from "../interfaces.js";
import { createSqliteStore } from "./index.js";

const KP_CONTEXT = "https://openknowledgepulse.org/schema/v1" as const;

// ── Helpers ───────────────────────────────────────────

function makeSkill(overrides: Partial<StoredSkill> = {}): StoredSkill {
  const now = new Date().toISOString();
  return {
    id: `kp:skill:${crypto.randomUUID()}`,
    name: "Test Skill",
    description: "A test skill for unit testing",
    version: "1.0.0",
    author: "test-agent",
    tags: ["testing", "unit-test"],
    content: "---\nname: Test Skill\n---\n\n# Test",
    visibility: "network",
    quality_score: 0.8,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeReasoningTrace(overrides: Partial<ReasoningTrace> = {}): ReasoningTrace {
  return {
    "@context": KP_CONTEXT,
    "@type": "ReasoningTrace",
    id: `kp:trace:${crypto.randomUUID()}`,
    metadata: {
      created_at: new Date().toISOString(),
      agent_id: "kp:agent:test-agent-1",
      task_domain: "software-engineering",
      success: true,
      quality_score: 0.85,
      visibility: "network",
      privacy_level: "aggregated",
    },
    task: {
      objective: "Implement a REST API endpoint",
    },
    steps: [
      {
        step_id: 0,
        type: "thought",
        content: "Analyzing the requirements for the endpoint",
      },
    ],
    outcome: {
      result_summary: "Successfully implemented the endpoint",
      confidence: 0.9,
    },
    ...overrides,
  };
}

function makeToolCallPattern(overrides: Partial<ToolCallPattern> = {}): ToolCallPattern {
  return {
    "@context": KP_CONTEXT,
    "@type": "ToolCallPattern",
    id: `kp:pattern:${crypto.randomUUID()}`,
    name: "Multi-file Refactor Pattern",
    description: "Pattern for refactoring across multiple files",
    metadata: {
      created_at: new Date().toISOString(),
      agent_id: "kp:agent:test-agent-2",
      task_domain: "code-refactoring",
      success: true,
      quality_score: 0.75,
      visibility: "network",
      privacy_level: "aggregated",
    },
    trigger_conditions: {
      task_types: ["refactoring"],
    },
    tool_sequence: [
      {
        step: "Find files",
        execution: "sequential",
        tools: [{ name: "glob", query_template: "**/*.ts" }],
      },
    ],
    performance: {
      avg_ms: 1200,
      success_rate: 0.92,
      uses: 45,
    },
    ...overrides,
  };
}

function makeStoredUnit(
  unit: ReasoningTrace | ToolCallPattern,
  overrides: Partial<StoredKnowledgeUnit> = {},
): StoredKnowledgeUnit {
  const now = new Date().toISOString();
  return {
    id: unit.id,
    unit,
    visibility: unit.metadata.visibility,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────

describe("SQLite Store", () => {
  let stores: AllStores;

  beforeEach(() => {
    // Fresh in-memory database for each test
    stores = createSqliteStore(":memory:");
  });

  // ── SkillStore ────────────────────────────────────

  describe("SkillStore", () => {
    test("create + getById should store and retrieve a skill", async () => {
      const skill = makeSkill();
      const created = await stores.skills.create(skill);

      expect(created).toEqual(skill);

      const retrieved = await stores.skills.getById(skill.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(skill.id);
      expect(retrieved!.name).toBe(skill.name);
      expect(retrieved!.tags).toEqual(skill.tags);
    });

    test("getById should return undefined for nonexistent skill", async () => {
      const result = await stores.skills.getById("kp:skill:nonexistent");
      expect(result).toBeUndefined();
    });

    test("search with query should match name, description, and tags", async () => {
      const skillA = makeSkill({
        name: "React Component Generator",
        description: "Generates React components from specs",
        tags: ["react", "frontend"],
        quality_score: 0.9,
      });
      const skillB = makeSkill({
        name: "Python Data Pipeline",
        description: "Creates data pipelines using Python",
        tags: ["python", "backend"],
        quality_score: 0.7,
      });
      await stores.skills.create(skillA);
      await stores.skills.create(skillB);

      // Match by name
      const byName = await stores.skills.search({ query: "React" });
      expect(byName.total).toBe(1);
      expect(byName.data[0]!.name).toBe("React Component Generator");

      // Match by description
      const byDesc = await stores.skills.search({ query: "pipelines" });
      expect(byDesc.total).toBe(1);
      expect(byDesc.data[0]!.name).toBe("Python Data Pipeline");

      // Match by tags
      const byTag = await stores.skills.search({ query: "frontend" });
      expect(byTag.total).toBe(1);
      expect(byTag.data[0]!.name).toBe("React Component Generator");
    });

    test("search with min_quality should filter correctly", async () => {
      await stores.skills.create(makeSkill({ quality_score: 0.9 }));
      await stores.skills.create(makeSkill({ quality_score: 0.5 }));

      const result = await stores.skills.search({ min_quality: 0.8 });
      expect(result.total).toBe(1);
      expect(result.data[0]!.quality_score).toBe(0.9);
    });

    test("search with tags should filter by exact tag match", async () => {
      await stores.skills.create(makeSkill({ tags: ["react", "frontend"], name: "React Skill" }));
      await stores.skills.create(makeSkill({ tags: ["python", "backend"], name: "Python Skill" }));

      const result = await stores.skills.search({ tags: ["frontend"] });
      expect(result.total).toBe(1);
      expect(result.data[0]!.name).toBe("React Skill");
    });

    test("search results should be sorted by quality_score descending", async () => {
      await stores.skills.create(makeSkill({ quality_score: 0.5 }));
      await stores.skills.create(makeSkill({ quality_score: 0.9 }));
      await stores.skills.create(makeSkill({ quality_score: 0.7 }));

      const result = await stores.skills.search({});
      expect(result.data[0]!.quality_score).toBe(0.9);
      expect(result.data[1]!.quality_score).toBe(0.7);
      expect(result.data[2]!.quality_score).toBe(0.5);
    });

    test("search should apply pagination", async () => {
      await stores.skills.create(makeSkill({ quality_score: 0.9 }));
      await stores.skills.create(makeSkill({ quality_score: 0.7 }));
      await stores.skills.create(makeSkill({ quality_score: 0.5 }));

      const result = await stores.skills.search({ pagination: { offset: 1, limit: 1 } });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.data[0]!.quality_score).toBe(0.7);
    });

    test("delete should remove a skill and return true", async () => {
      const skill = makeSkill();
      await stores.skills.create(skill);

      const deleted = await stores.skills.delete(skill.id);
      expect(deleted).toBe(true);

      const retrieved = await stores.skills.getById(skill.id);
      expect(retrieved).toBeUndefined();
    });

    test("delete should return false for nonexistent skill", async () => {
      const deleted = await stores.skills.delete("kp:skill:nonexistent");
      expect(deleted).toBe(false);
    });

    test("create should overwrite skill with same id (INSERT OR REPLACE)", async () => {
      const id = "kp:skill:fixed-id";
      const skill1 = makeSkill({ id, name: "Original" });
      const skill2 = makeSkill({ id, name: "Updated" });

      await stores.skills.create(skill1);
      await stores.skills.create(skill2);

      const retrieved = await stores.skills.getById(id);
      expect(retrieved!.name).toBe("Updated");
    });
  });

  // ── KnowledgeStore ────────────────────────────────

  describe("KnowledgeStore", () => {
    test("create + search should store and find knowledge units", async () => {
      const trace = makeReasoningTrace();
      const entry = makeStoredUnit(trace);
      await stores.knowledge.create(entry);

      const result = await stores.knowledge.search({});
      expect(result.total).toBe(1);
      expect(result.data[0]!.unit["@type"]).toBe("ReasoningTrace");
    });

    test("getById should return the stored unit", async () => {
      const trace = makeReasoningTrace();
      const entry = makeStoredUnit(trace);
      await stores.knowledge.create(entry);

      const retrieved = await stores.knowledge.getById(trace.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.unit["@type"]).toBe("ReasoningTrace");
      expect(retrieved!.id).toBe(trace.id);
    });

    test("getById should return undefined for nonexistent unit", async () => {
      const result = await stores.knowledge.getById("kp:trace:nonexistent");
      expect(result).toBeUndefined();
    });

    test("search should filter by types", async () => {
      const traceEntry = makeStoredUnit(makeReasoningTrace());
      const patternEntry = makeStoredUnit(makeToolCallPattern());
      await stores.knowledge.create(traceEntry);
      await stores.knowledge.create(patternEntry);

      const result = await stores.knowledge.search({ types: ["ReasoningTrace"] });
      expect(result.total).toBe(1);
      expect(result.data[0]!.unit["@type"]).toBe("ReasoningTrace");
    });

    test("search should filter by query matching ReasoningTrace objective", async () => {
      const traceEntry = makeStoredUnit(makeReasoningTrace());
      const patternEntry = makeStoredUnit(makeToolCallPattern());
      await stores.knowledge.create(traceEntry);
      await stores.knowledge.create(patternEntry);

      const result = await stores.knowledge.search({ query: "REST API" });
      expect(result.total).toBe(1);
      expect(result.data[0]!.unit["@type"]).toBe("ReasoningTrace");
    });

    test("search should filter by domain", async () => {
      const traceEntry = makeStoredUnit(makeReasoningTrace());
      const patternEntry = makeStoredUnit(makeToolCallPattern());
      await stores.knowledge.create(traceEntry);
      await stores.knowledge.create(patternEntry);

      const result = await stores.knowledge.search({ domain: "software-engineering" });
      expect(result.total).toBe(1);
      expect(result.data[0]!.unit["@type"]).toBe("ReasoningTrace");
    });

    test("search should sort by quality_score descending", async () => {
      const traceEntry = makeStoredUnit(makeReasoningTrace()); // 0.85
      const patternEntry = makeStoredUnit(makeToolCallPattern()); // 0.75
      await stores.knowledge.create(traceEntry);
      await stores.knowledge.create(patternEntry);

      const result = await stores.knowledge.search({});
      expect(result.data[0]!.unit.metadata.quality_score).toBe(0.85);
      expect(result.data[1]!.unit.metadata.quality_score).toBe(0.75);
    });

    test("delete should remove unit and return true", async () => {
      const trace = makeReasoningTrace();
      const entry = makeStoredUnit(trace);
      await stores.knowledge.create(entry);

      const deleted = await stores.knowledge.delete(trace.id);
      expect(deleted).toBe(true);

      const retrieved = await stores.knowledge.getById(trace.id);
      expect(retrieved).toBeUndefined();
    });

    test("delete should return false for nonexistent unit", async () => {
      const deleted = await stores.knowledge.delete("kp:trace:nonexistent");
      expect(deleted).toBe(false);
    });

    test("getByAgentId should return units for a specific agent", async () => {
      const agentId = "kp:agent:agent-alpha";
      const trace1 = makeReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: agentId,
          task_domain: "testing",
          success: true,
          quality_score: 0.8,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });
      const trace2 = makeReasoningTrace({
        metadata: {
          created_at: new Date().toISOString(),
          agent_id: "kp:agent:other-agent",
          task_domain: "testing",
          success: true,
          quality_score: 0.6,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });

      await stores.knowledge.create(makeStoredUnit(trace1));
      await stores.knowledge.create(makeStoredUnit(trace2));

      const results = await stores.knowledge.getByAgentId(agentId);
      expect(results).toHaveLength(1);
      expect(results[0]!.unit.metadata.agent_id).toBe(agentId);
    });
  });

  // ── ReputationStore ───────────────────────────────

  describe("ReputationStore", () => {
    test("upsert should create a new reputation record", async () => {
      const record = await stores.reputation.upsert("agent-1", 10, "contribution");
      expect(record.agent_id).toBe("agent-1");
      expect(record.score).toBe(10);
      expect(record.contributions).toBe(1);
      expect(record.history).toHaveLength(1);
    });

    test("upsert should update an existing reputation record", async () => {
      await stores.reputation.upsert("agent-1", 10, "first contribution");
      const record = await stores.reputation.upsert("agent-1", 5, "second contribution");

      expect(record.score).toBe(15);
      expect(record.contributions).toBe(2);
      expect(record.history).toHaveLength(2);
    });

    test("upsert should clamp score to 0 minimum", async () => {
      await stores.reputation.upsert("agent-1", 5, "initial");
      const record = await stores.reputation.upsert("agent-1", -100, "penalty");
      expect(record.score).toBe(0);
    });

    test("get should return undefined for unknown agent", async () => {
      const record = await stores.reputation.get("nonexistent");
      expect(record).toBeUndefined();
    });

    test("getLeaderboard should return paginated results sorted by score", async () => {
      await stores.reputation.upsert("agent-a", 50, "top");
      await stores.reputation.upsert("agent-b", 30, "mid");
      await stores.reputation.upsert("agent-c", 10, "low");

      const result = await stores.reputation.getLeaderboard({ offset: 0, limit: 2 });
      expect(result.total).toBe(3);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]!.agent_id).toBe("agent-a");
      expect(result.data[0]!.score).toBe(50);
      expect(result.data[1]!.agent_id).toBe("agent-b");
      expect(result.data[1]!.score).toBe(30);
    });

    test("getLeaderboard should support offset for pagination", async () => {
      await stores.reputation.upsert("agent-a", 50, "top");
      await stores.reputation.upsert("agent-b", 30, "mid");
      await stores.reputation.upsert("agent-c", 10, "low");

      const result = await stores.reputation.getLeaderboard({ offset: 2, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.agent_id).toBe("agent-c");
    });

    test("recordVote + getVotes should store and retrieve votes", async () => {
      const vote: ValidationVote = {
        validatorId: "agent-1",
        targetId: "agent-2",
        unitId: "kp:trace:123",
        valid: true,
        timestamp: new Date().toISOString(),
      };
      await stores.reputation.recordVote(vote);

      const votes = await stores.reputation.getVotes();
      expect(votes).toHaveLength(1);
      expect(votes[0]!.validatorId).toBe("agent-1");
      expect(votes[0]!.targetId).toBe("agent-2");
      expect(votes[0]!.valid).toBe(true);
    });

    test("canVote should return false for unknown agent", async () => {
      const result = await stores.reputation.canVote("nonexistent");
      expect(result).toBe(false);
    });

    test("canVote should return false for newly created agent (less than 30 days)", async () => {
      await stores.reputation.upsert("agent-new", 10, "new");
      const result = await stores.reputation.canVote("agent-new");
      expect(result).toBe(false);
    });
  });

  // ── ApiKeyStore ───────────────────────────────────

  describe("ApiKeyStore", () => {
    test("create + verify should create and validate a key", async () => {
      const { raw_key, record } = await stores.apiKeys.create("agent-1", ["read"], "free");

      expect(raw_key).toMatch(/^kp_/);
      expect(record.agent_id).toBe("agent-1");
      expect(record.scopes).toEqual(["read"]);
      expect(record.tier).toBe("free");
      expect(record.revoked).toBe(false);

      const verified = await stores.apiKeys.verify(raw_key);
      expect(verified).toBeDefined();
      expect(verified!.agent_id).toBe("agent-1");
    });

    test("verify should return undefined for unknown key", async () => {
      const result = await stores.apiKeys.verify(
        "kp_nonexistentkey1234567890abcdef1234567890abcdef1234567890abcdef12",
      );
      expect(result).toBeUndefined();
    });

    test("revoke should invalidate a key", async () => {
      const { raw_key, record } = await stores.apiKeys.create("agent-1", ["read", "write"], "pro");

      const revoked = await stores.apiKeys.revoke(record.key_prefix);
      expect(revoked).toBe(true);

      // Key should no longer verify
      const verified = await stores.apiKeys.verify(raw_key);
      expect(verified).toBeUndefined();
    });

    test("revoke should return false for unknown prefix", async () => {
      const result = await stores.apiKeys.revoke("kp_nonexist");
      expect(result).toBe(false);
    });

    test("getByAgentId should return all keys for an agent", async () => {
      await stores.apiKeys.create("agent-1", ["read"], "free");
      await stores.apiKeys.create("agent-1", ["read", "write"], "pro");
      await stores.apiKeys.create("agent-2", ["admin"], "enterprise");

      const keys = await stores.apiKeys.getByAgentId("agent-1");
      expect(keys).toHaveLength(2);
      expect(keys.every((k) => k.agent_id === "agent-1")).toBe(true);
    });
  });

  // ── RateLimitStore ────────────────────────────────

  describe("RateLimitStore", () => {
    test("consume should allow requests within limit", async () => {
      const result = await stores.rateLimit.consume("user-1", "free", "GET");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(300);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    test("consume should deny anonymous POST (write) requests", async () => {
      const result = await stores.rateLimit.consume("user-1", "anonymous", "POST");
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
      expect(result.retryAfter).toBe(60);
    });

    test("consume should deny after bucket is exhausted", async () => {
      const identifier = "exhaust-user";
      let lastResult: Awaited<ReturnType<typeof stores.rateLimit.consume>> | undefined;
      // anonymous GET limit is 60 per minute
      for (let i = 0; i < 61; i++) {
        lastResult = await stores.rateLimit.consume(identifier, "anonymous", "GET");
      }

      expect(lastResult!.allowed).toBe(false);
      expect(lastResult!.remaining).toBe(0);
      expect(lastResult!.retryAfter).toBeGreaterThan(0);
    });

    test("consume should use separate buckets for read and write", async () => {
      const readResult = await stores.rateLimit.consume("rw-user", "free", "GET");
      const writeResult = await stores.rateLimit.consume("rw-user", "free", "POST");

      expect(readResult.allowed).toBe(true);
      expect(readResult.limit).toBe(300);
      expect(writeResult.allowed).toBe(true);
      expect(writeResult.limit).toBe(30);
    });

    test("record429 + get429Count should track violations", async () => {
      await stores.rateLimit.record429("violator-1");
      await stores.rateLimit.record429("violator-1");
      await stores.rateLimit.record429("violator-1");

      const count = await stores.rateLimit.get429Count("violator-1", 60000);
      expect(count).toBe(3);
    });

    test("get429Count should return 0 for clean users", async () => {
      const count = await stores.rateLimit.get429Count("clean-user", 60000);
      expect(count).toBe(0);
    });

    test("get429Count should not count violations outside window", async () => {
      await stores.rateLimit.record429("violator-2");

      const count = await stores.rateLimit.get429Count("violator-2", 0);
      expect(count).toBe(0);
    });

    test("violations should be isolated between identifiers", async () => {
      await stores.rateLimit.record429("user-a");
      await stores.rateLimit.record429("user-a");
      await stores.rateLimit.record429("user-b");

      const countA = await stores.rateLimit.get429Count("user-a", 60000);
      const countB = await stores.rateLimit.get429Count("user-b", 60000);
      expect(countA).toBe(2);
      expect(countB).toBe(1);
    });
  });
});
