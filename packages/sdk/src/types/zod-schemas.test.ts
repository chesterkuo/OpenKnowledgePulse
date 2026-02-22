import { describe, expect, test } from "bun:test";
import { KP_CONTEXT } from "./knowledge-unit.js";
import {
  ExpertSOPSchema,
  KnowledgeUnitMetaSchema,
  KnowledgeUnitSchema,
  PrivacyLevelSchema,
  ReasoningTraceSchema,
  ReasoningTraceStepSchema,
  ToolCallPatternSchema,
  VisibilitySchema,
} from "./zod-schemas.js";

// ── Shared Fixtures ────────────────────────────────────────

const validMeta = {
  created_at: "2025-06-15T10:00:00.000Z",
  task_domain: "code-review",
  success: true,
  quality_score: 0.92,
  visibility: "network" as const,
  privacy_level: "aggregated" as const,
};

const validReasoningTrace = {
  "@context": KP_CONTEXT,
  "@type": "ReasoningTrace" as const,
  id: "kp:trace:550e8400-e29b-41d4-a716-446655440000",
  metadata: validMeta,
  task: { objective: "Review the pull request for security issues" },
  steps: [
    { step_id: 0, type: "thought" as const, content: "Analyzing changes" },
    {
      step_id: 1,
      type: "tool_call" as const,
      tool: { name: "grep", mcp_server: "filesystem" },
      input: { pattern: "eval(" },
      output_summary: "No eval found",
      latency_ms: 120,
    },
    { step_id: 2, type: "observation" as const, content: "Code looks safe" },
  ],
  outcome: { result_summary: "No issues found", confidence: 0.95 },
};

const validToolCallPattern = {
  "@context": KP_CONTEXT,
  "@type": "ToolCallPattern" as const,
  id: "kp:pattern:660e8400-e29b-41d4-a716-446655440000",
  name: "semantic-search-then-summarize",
  description: "Search and summarize pattern",
  metadata: validMeta,
  trigger_conditions: {
    task_types: ["research"],
    required_tools: ["search", "summarize"],
  },
  tool_sequence: [
    {
      step: "search",
      execution: "sequential" as const,
      tools: [{ name: "web_search", query_template: "{{query}}" }],
    },
    {
      step: "summarize",
      execution: "sequential" as const,
      tools: [{ name: "summarizer" }],
    },
  ],
  performance: { avg_ms: 3200, success_rate: 0.89, uses: 142 },
};

const validExpertSOP = {
  "@context": KP_CONTEXT,
  "@type": "ExpertSOP" as const,
  id: "kp:sop:770e8400-e29b-41d4-a716-446655440000",
  name: "Incident Triage SOP",
  domain: "devops",
  metadata: validMeta,
  source: {
    type: "human_expert" as const,
    expert_id: "expert-001",
    credentials: ["kp:sbt:sre-cert"],
  },
  decision_tree: [
    {
      step: "1",
      instruction: "Check monitoring dashboards",
      criteria: { severity: "high" },
      conditions: {
        p1: { action: "page on-call", sla_min: 15 },
        p2: { action: "create ticket" },
      },
      tool_suggestions: [{ name: "datadog", when: "always" }],
    },
  ],
};

// ── KP_CONTEXT ─────────────────────────────────────────────

describe("KP_CONTEXT", () => {
  test("equals the canonical schema URL", () => {
    expect(KP_CONTEXT).toBe("https://knowledgepulse.dev/schema/v1");
  });
});

// ── PrivacyLevelSchema / VisibilitySchema ──────────────────

describe("PrivacyLevelSchema", () => {
  test("accepts valid values", () => {
    for (const v of ["aggregated", "federated", "private"]) {
      expect(PrivacyLevelSchema.parse(v)).toBe(v);
    }
  });

  test("rejects invalid value", () => {
    expect(() => PrivacyLevelSchema.parse("public")).toThrow();
  });
});

describe("VisibilitySchema", () => {
  test("accepts valid values", () => {
    for (const v of ["private", "org", "network"]) {
      expect(VisibilitySchema.parse(v)).toBe(v);
    }
  });

  test("rejects invalid value", () => {
    expect(() => VisibilitySchema.parse("global")).toThrow();
  });
});

// ── KnowledgeUnitMetaSchema ────────────────────────────────

describe("KnowledgeUnitMetaSchema", () => {
  test("accepts valid metadata", () => {
    const result = KnowledgeUnitMetaSchema.safeParse(validMeta);
    expect(result.success).toBe(true);
  });

  test("accepts metadata with optional fields", () => {
    const result = KnowledgeUnitMetaSchema.safeParse({
      ...validMeta,
      agent_id: "kp:agent:abc123",
      framework: "langgraph",
      validated_by: ["kp:validator:v1"],
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing task_domain", () => {
    const { task_domain, ...rest } = validMeta;
    const result = KnowledgeUnitMetaSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects empty task_domain", () => {
    const result = KnowledgeUnitMetaSchema.safeParse({ ...validMeta, task_domain: "" });
    expect(result.success).toBe(false);
  });

  test("rejects quality_score > 1", () => {
    const result = KnowledgeUnitMetaSchema.safeParse({ ...validMeta, quality_score: 1.5 });
    expect(result.success).toBe(false);
  });

  test("rejects quality_score < 0", () => {
    const result = KnowledgeUnitMetaSchema.safeParse({ ...validMeta, quality_score: -0.1 });
    expect(result.success).toBe(false);
  });

  test("rejects non-ISO datetime string", () => {
    const result = KnowledgeUnitMetaSchema.safeParse({ ...validMeta, created_at: "not-a-date" });
    expect(result.success).toBe(false);
  });

  test("rejects invalid visibility", () => {
    const result = KnowledgeUnitMetaSchema.safeParse({ ...validMeta, visibility: "public" });
    expect(result.success).toBe(false);
  });
});

// ── ReasoningTraceStepSchema ───────────────────────────────

describe("ReasoningTraceStepSchema", () => {
  test("accepts minimal step", () => {
    const result = ReasoningTraceStepSchema.safeParse({ step_id: 0, type: "thought" });
    expect(result.success).toBe(true);
  });

  test("accepts step with all optional fields", () => {
    const result = ReasoningTraceStepSchema.safeParse({
      step_id: 1,
      type: "tool_call",
      content: "Calling grep",
      tool: { name: "grep", mcp_server: "fs" },
      input: { pattern: "eval" },
      output_summary: "Found 0 matches",
      latency_ms: 50,
    });
    expect(result.success).toBe(true);
  });

  test("rejects negative step_id", () => {
    const result = ReasoningTraceStepSchema.safeParse({ step_id: -1, type: "thought" });
    expect(result.success).toBe(false);
  });

  test("rejects non-integer step_id", () => {
    const result = ReasoningTraceStepSchema.safeParse({ step_id: 1.5, type: "thought" });
    expect(result.success).toBe(false);
  });

  test("rejects invalid step type", () => {
    const result = ReasoningTraceStepSchema.safeParse({ step_id: 0, type: "unknown" });
    expect(result.success).toBe(false);
  });

  test("accepts all valid step types", () => {
    for (const type of ["thought", "tool_call", "observation", "error_recovery"]) {
      const result = ReasoningTraceStepSchema.safeParse({ step_id: 0, type });
      expect(result.success).toBe(true);
    }
  });

  test("rejects negative latency_ms", () => {
    const result = ReasoningTraceStepSchema.safeParse({
      step_id: 0,
      type: "thought",
      latency_ms: -10,
    });
    expect(result.success).toBe(false);
  });
});

// ── ReasoningTraceSchema ───────────────────────────────────

describe("ReasoningTraceSchema", () => {
  test("accepts a valid ReasoningTrace", () => {
    const result = ReasoningTraceSchema.safeParse(validReasoningTrace);
    expect(result.success).toBe(true);
  });

  test("requires @context to be KP_CONTEXT", () => {
    const result = ReasoningTraceSchema.safeParse({
      ...validReasoningTrace,
      "@context": "https://wrong.url/v1",
    });
    expect(result.success).toBe(false);
  });

  test("requires @type to be ReasoningTrace", () => {
    const result = ReasoningTraceSchema.safeParse({
      ...validReasoningTrace,
      "@type": "ToolCallPattern",
    });
    expect(result.success).toBe(false);
  });

  test("requires id to start with kp:trace:", () => {
    const result = ReasoningTraceSchema.safeParse({
      ...validReasoningTrace,
      id: "invalid-id",
    });
    expect(result.success).toBe(false);
  });

  test("rejects id starting with kp:pattern:", () => {
    const result = ReasoningTraceSchema.safeParse({
      ...validReasoningTrace,
      id: "kp:pattern:abc",
    });
    expect(result.success).toBe(false);
  });

  test("requires at least one step", () => {
    const result = ReasoningTraceSchema.safeParse({
      ...validReasoningTrace,
      steps: [],
    });
    expect(result.success).toBe(false);
  });

  test("requires non-empty objective", () => {
    const result = ReasoningTraceSchema.safeParse({
      ...validReasoningTrace,
      task: { objective: "" },
    });
    expect(result.success).toBe(false);
  });

  test("rejects confidence > 1", () => {
    const result = ReasoningTraceSchema.safeParse({
      ...validReasoningTrace,
      outcome: { result_summary: "ok", confidence: 1.1 },
    });
    expect(result.success).toBe(false);
  });

  test("rejects confidence < 0", () => {
    const result = ReasoningTraceSchema.safeParse({
      ...validReasoningTrace,
      outcome: { result_summary: "ok", confidence: -0.1 },
    });
    expect(result.success).toBe(false);
  });

  test("accepts optional knowledge_graph_delta", () => {
    const result = ReasoningTraceSchema.safeParse({
      ...validReasoningTrace,
      knowledge_graph_delta: {
        entities: [{ name: "user", type: "Person" }],
        relationships: [{ fact: "user owns repo", valid_from: "2025-01-01" }],
      },
    });
    expect(result.success).toBe(true);
  });

  test("accepts optional source_skill", () => {
    const result = ReasoningTraceSchema.safeParse({
      ...validReasoningTrace,
      source_skill: "kp:skill:code-review:1.0",
    });
    expect(result.success).toBe(true);
  });
});

// ── ToolCallPatternSchema ──────────────────────────────────

describe("ToolCallPatternSchema", () => {
  test("accepts a valid ToolCallPattern", () => {
    const result = ToolCallPatternSchema.safeParse(validToolCallPattern);
    expect(result.success).toBe(true);
  });

  test("requires @context to be KP_CONTEXT", () => {
    const result = ToolCallPatternSchema.safeParse({
      ...validToolCallPattern,
      "@context": "https://other.dev/v2",
    });
    expect(result.success).toBe(false);
  });

  test("requires @type to be ToolCallPattern", () => {
    const result = ToolCallPatternSchema.safeParse({
      ...validToolCallPattern,
      "@type": "ReasoningTrace",
    });
    expect(result.success).toBe(false);
  });

  test("requires id to start with kp:pattern:", () => {
    const result = ToolCallPatternSchema.safeParse({
      ...validToolCallPattern,
      id: "kp:trace:abc",
    });
    expect(result.success).toBe(false);
  });

  test("requires non-empty name", () => {
    const result = ToolCallPatternSchema.safeParse({
      ...validToolCallPattern,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  test("requires at least one task_type", () => {
    const result = ToolCallPatternSchema.safeParse({
      ...validToolCallPattern,
      trigger_conditions: { task_types: [] },
    });
    expect(result.success).toBe(false);
  });

  test("requires at least one tool_sequence entry", () => {
    const result = ToolCallPatternSchema.safeParse({
      ...validToolCallPattern,
      tool_sequence: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid execution mode", () => {
    const result = ToolCallPatternSchema.safeParse({
      ...validToolCallPattern,
      tool_sequence: [
        {
          step: "s1",
          execution: "concurrent",
          tools: [{ name: "t1" }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  test("rejects success_rate > 1", () => {
    const result = ToolCallPatternSchema.safeParse({
      ...validToolCallPattern,
      performance: { avg_ms: 100, success_rate: 1.5, uses: 10 },
    });
    expect(result.success).toBe(false);
  });

  test("rejects negative uses", () => {
    const result = ToolCallPatternSchema.safeParse({
      ...validToolCallPattern,
      performance: { avg_ms: 100, success_rate: 0.9, uses: -1 },
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-integer uses", () => {
    const result = ToolCallPatternSchema.safeParse({
      ...validToolCallPattern,
      performance: { avg_ms: 100, success_rate: 0.9, uses: 1.5 },
    });
    expect(result.success).toBe(false);
  });
});

// ── ExpertSOPSchema ────────────────────────────────────────

describe("ExpertSOPSchema", () => {
  test("accepts a valid ExpertSOP", () => {
    const result = ExpertSOPSchema.safeParse(validExpertSOP);
    expect(result.success).toBe(true);
  });

  test("requires @context to be KP_CONTEXT", () => {
    const result = ExpertSOPSchema.safeParse({
      ...validExpertSOP,
      "@context": "wrong",
    });
    expect(result.success).toBe(false);
  });

  test("requires @type to be ExpertSOP", () => {
    const result = ExpertSOPSchema.safeParse({
      ...validExpertSOP,
      "@type": "ReasoningTrace",
    });
    expect(result.success).toBe(false);
  });

  test("requires id to start with kp:sop:", () => {
    const result = ExpertSOPSchema.safeParse({
      ...validExpertSOP,
      id: "kp:trace:abc",
    });
    expect(result.success).toBe(false);
  });

  test("requires non-empty name", () => {
    const result = ExpertSOPSchema.safeParse({
      ...validExpertSOP,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  test("requires non-empty domain", () => {
    const result = ExpertSOPSchema.safeParse({
      ...validExpertSOP,
      domain: "",
    });
    expect(result.success).toBe(false);
  });

  test("requires source.type to be human_expert", () => {
    const result = ExpertSOPSchema.safeParse({
      ...validExpertSOP,
      source: { ...validExpertSOP.source, type: "ai" },
    });
    expect(result.success).toBe(false);
  });

  test("requires at least one decision_tree entry", () => {
    const result = ExpertSOPSchema.safeParse({
      ...validExpertSOP,
      decision_tree: [],
    });
    expect(result.success).toBe(false);
  });

  test("accepts optional validation block", () => {
    const result = ExpertSOPSchema.safeParse({
      ...validExpertSOP,
      validation: {
        test_cases: [{ input: { severity: "p1" }, expected_output: { action: "page" } }],
      },
    });
    expect(result.success).toBe(true);
  });

  test("accepts SOP without validation block", () => {
    const { validation, ...withoutValidation } = validExpertSOP;
    const result = ExpertSOPSchema.safeParse(withoutValidation);
    expect(result.success).toBe(true);
  });
});

// ── KnowledgeUnitSchema (discriminated union) ──────────────

describe("KnowledgeUnitSchema", () => {
  test("accepts ReasoningTrace via discriminated union", () => {
    const result = KnowledgeUnitSchema.safeParse(validReasoningTrace);
    expect(result.success).toBe(true);
  });

  test("accepts ToolCallPattern via discriminated union", () => {
    const result = KnowledgeUnitSchema.safeParse(validToolCallPattern);
    expect(result.success).toBe(true);
  });

  test("accepts ExpertSOP via discriminated union", () => {
    const result = KnowledgeUnitSchema.safeParse(validExpertSOP);
    expect(result.success).toBe(true);
  });

  test("rejects unknown @type", () => {
    const result = KnowledgeUnitSchema.safeParse({
      "@context": KP_CONTEXT,
      "@type": "UnknownType",
      id: "kp:trace:abc",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing @type", () => {
    const result = KnowledgeUnitSchema.safeParse({
      "@context": KP_CONTEXT,
      id: "kp:trace:abc",
    });
    expect(result.success).toBe(false);
  });

  test("rejects completely empty object", () => {
    const result = KnowledgeUnitSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
