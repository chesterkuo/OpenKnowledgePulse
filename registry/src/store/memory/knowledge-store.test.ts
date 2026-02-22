import { beforeEach, describe, expect, test } from "bun:test";
import type { ExpertSOP, ReasoningTrace, ToolCallPattern } from "@knowledgepulse/sdk";
import type { StoredKnowledgeUnit } from "../interfaces.js";
import { MemoryKnowledgeStore } from "./knowledge-store.js";

const KP_CONTEXT = "https://knowledgepulse.dev/schema/v1" as const;

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

function makeExpertSOP(overrides: Partial<ExpertSOP> = {}): ExpertSOP {
  return {
    "@context": KP_CONTEXT,
    "@type": "ExpertSOP",
    id: `kp:sop:${crypto.randomUUID()}`,
    name: "Incident Response SOP",
    domain: "devops",
    metadata: {
      created_at: new Date().toISOString(),
      agent_id: "kp:agent:test-agent-3",
      task_domain: "devops",
      success: true,
      quality_score: 0.95,
      visibility: "org",
      privacy_level: "federated",
    },
    source: {
      type: "human_expert",
      expert_id: "expert-42",
      credentials: ["kp:sbt:sre-certified"],
    },
    decision_tree: [
      {
        step: "Assess severity",
        instruction: "Determine incident severity level",
      },
    ],
    ...overrides,
  };
}

function makeStoredUnit(
  unit: ReasoningTrace | ToolCallPattern | ExpertSOP,
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

describe("MemoryKnowledgeStore", () => {
  let store: MemoryKnowledgeStore;

  beforeEach(() => {
    store = new MemoryKnowledgeStore();
  });

  describe("create", () => {
    test("should store a knowledge unit and return it", async () => {
      const trace = makeReasoningTrace();
      const entry = makeStoredUnit(trace);

      const created = await store.create(entry);
      expect(created).toEqual(entry);
      expect(created.id).toBe(trace.id);
    });

    test("should store different knowledge unit types", async () => {
      const traceEntry = makeStoredUnit(makeReasoningTrace());
      const patternEntry = makeStoredUnit(makeToolCallPattern());
      const sopEntry = makeStoredUnit(makeExpertSOP());

      await store.create(traceEntry);
      await store.create(patternEntry);
      await store.create(sopEntry);

      const result = await store.search({});
      expect(result.total).toBe(3);
    });
  });

  describe("getById", () => {
    test("should return the knowledge unit when it exists", async () => {
      const trace = makeReasoningTrace();
      const entry = makeStoredUnit(trace);
      await store.create(entry);

      const result = await store.getById(trace.id);
      expect(result).toEqual(entry);
    });

    test("should return undefined when unit does not exist", async () => {
      const result = await store.getById("kp:trace:nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("search", () => {
    let traceEntry: StoredKnowledgeUnit;
    let patternEntry: StoredKnowledgeUnit;
    let sopEntry: StoredKnowledgeUnit;

    beforeEach(async () => {
      traceEntry = makeStoredUnit(makeReasoningTrace());
      patternEntry = makeStoredUnit(makeToolCallPattern());
      sopEntry = makeStoredUnit(makeExpertSOP());

      await store.create(traceEntry);
      await store.create(patternEntry);
      await store.create(sopEntry);
    });

    test("should return all units when no filters are applied", async () => {
      const result = await store.search({});
      expect(result.total).toBe(3);
      expect(result.data).toHaveLength(3);
    });

    test("should sort by quality_score descending", async () => {
      const result = await store.search({});
      const scores = result.data.map((e) => e.unit.metadata.quality_score);
      expect(scores[0]).toBe(0.95); // ExpertSOP
      expect(scores[1]).toBe(0.85); // ReasoningTrace
      expect(scores[2]).toBe(0.75); // ToolCallPattern
    });

    test("should filter by types", async () => {
      const result = await store.search({ types: ["ReasoningTrace"] });
      expect(result.total).toBe(1);
      expect(result.data[0]?.unit["@type"]).toBe("ReasoningTrace");
    });

    test("should filter by multiple types", async () => {
      const result = await store.search({
        types: ["ReasoningTrace", "ExpertSOP"],
      });
      expect(result.total).toBe(2);
      const types = result.data.map((e) => e.unit["@type"]);
      expect(types).toContain("ReasoningTrace");
      expect(types).toContain("ExpertSOP");
    });

    test("should filter by domain", async () => {
      const result = await store.search({ domain: "devops" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.unit["@type"]).toBe("ExpertSOP");
    });

    test("should filter by domain case-insensitively", async () => {
      const result = await store.search({ domain: "DevOps" });
      expect(result.total).toBe(1);
    });

    test("should filter by min_quality", async () => {
      const result = await store.search({ min_quality: 0.9 });
      expect(result.total).toBe(1);
      expect(result.data[0]?.unit.metadata.quality_score).toBe(0.95);
    });

    test("should filter by query matching ReasoningTrace objective", async () => {
      const result = await store.search({ query: "REST API" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.unit["@type"]).toBe("ReasoningTrace");
    });

    test("should filter by query matching ReasoningTrace step content", async () => {
      const result = await store.search({ query: "requirements" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.unit["@type"]).toBe("ReasoningTrace");
    });

    test("should filter by query matching ToolCallPattern name", async () => {
      const result = await store.search({ query: "Multi-file" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.unit["@type"]).toBe("ToolCallPattern");
    });

    test("should filter by query matching ToolCallPattern description", async () => {
      const result = await store.search({ query: "refactoring" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.unit["@type"]).toBe("ToolCallPattern");
    });

    test("should filter by query matching ExpertSOP name", async () => {
      const result = await store.search({ query: "Incident Response" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.unit["@type"]).toBe("ExpertSOP");
    });

    test("should filter by query matching ExpertSOP domain", async () => {
      const result = await store.search({ query: "devops" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.unit["@type"]).toBe("ExpertSOP");
    });

    test("should combine type and domain filters", async () => {
      const result = await store.search({
        types: ["ExpertSOP"],
        domain: "devops",
      });
      expect(result.total).toBe(1);
    });

    test("should combine type and min_quality filters", async () => {
      const result = await store.search({
        types: ["ReasoningTrace", "ToolCallPattern"],
        min_quality: 0.8,
      });
      expect(result.total).toBe(1);
      expect(result.data[0]?.unit["@type"]).toBe("ReasoningTrace");
    });

    test("should apply pagination", async () => {
      const result = await store.search({
        pagination: { offset: 1, limit: 1 },
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
    });

    test("should default pagination to offset=0, limit=20", async () => {
      const result = await store.search({});
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(20);
    });

    test("should return empty results when no matches", async () => {
      const result = await store.search({ query: "nonexistent-query-xyz" });
      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  describe("delete", () => {
    test("should remove an existing unit and return true", async () => {
      const trace = makeReasoningTrace();
      const entry = makeStoredUnit(trace);
      await store.create(entry);

      const deleted = await store.delete(trace.id);
      expect(deleted).toBe(true);

      const result = await store.getById(trace.id);
      expect(result).toBeUndefined();
    });

    test("should return false when unit does not exist", async () => {
      const deleted = await store.delete("kp:trace:nonexistent");
      expect(deleted).toBe(false);
    });
  });

  describe("getByAgentId", () => {
    test("should return all units belonging to a specific agent", async () => {
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
          agent_id: agentId,
          task_domain: "testing",
          success: true,
          quality_score: 0.7,
          visibility: "network",
          privacy_level: "aggregated",
        },
      });
      const trace3 = makeReasoningTrace({
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

      await store.create(makeStoredUnit(trace1));
      await store.create(makeStoredUnit(trace2));
      await store.create(makeStoredUnit(trace3));

      const results = await store.getByAgentId(agentId);
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.unit.metadata.agent_id === agentId)).toBe(true);
    });

    test("should return empty array when no units match the agent", async () => {
      const trace = makeReasoningTrace();
      await store.create(makeStoredUnit(trace));

      const results = await store.getByAgentId("kp:agent:nonexistent");
      expect(results).toHaveLength(0);
    });
  });
});
