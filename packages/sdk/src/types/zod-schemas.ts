import { z } from "zod";
import { KP_CONTEXT } from "./knowledge-unit.js";

// ── Enums ──────────────────────────────────────────────

export const KnowledgeUnitTypeSchema = z.enum(["ReasoningTrace", "ToolCallPattern", "ExpertSOP"]);

export const PrivacyLevelSchema = z.enum(["aggregated", "federated", "private"]);
export const VisibilitySchema = z.enum(["private", "org", "network"]);

// ── KnowledgeUnitMeta ──────────────────────────────────

export const KnowledgeUnitMetaSchema = z.object({
  created_at: z.string().datetime(),
  agent_id: z.string().optional(),
  framework: z.string().optional(),
  task_domain: z.string().min(1),
  success: z.boolean(),
  quality_score: z.number().min(0).max(1),
  visibility: VisibilitySchema,
  privacy_level: PrivacyLevelSchema,
  validated_by: z.array(z.string()).optional(),
});

// ── ReasoningTrace ─────────────────────────────────────

export const ReasoningTraceStepSchema = z.object({
  step_id: z.number().int().nonnegative(),
  type: z.enum(["thought", "tool_call", "observation", "error_recovery"]),
  content: z.string().optional(),
  tool: z
    .object({
      name: z.string(),
      mcp_server: z.string().optional(),
    })
    .optional(),
  input: z.record(z.unknown()).optional(),
  output_summary: z.string().optional(),
  latency_ms: z.number().nonnegative().optional(),
});

export const ReasoningTraceSchema = z.object({
  "@context": z.literal(KP_CONTEXT),
  "@type": z.literal("ReasoningTrace"),
  id: z.string().startsWith("kp:trace:"),
  source_skill: z.string().optional(),
  metadata: KnowledgeUnitMetaSchema,
  task: z.object({
    objective: z.string().min(1),
    input_schema: z.record(z.unknown()).optional(),
  }),
  steps: z.array(ReasoningTraceStepSchema).min(1),
  outcome: z.object({
    result_summary: z.string(),
    confidence: z.number().min(0).max(1),
  }),
  knowledge_graph_delta: z
    .object({
      entities: z.array(z.object({ name: z.string(), type: z.string() })),
      relationships: z.array(z.object({ fact: z.string(), valid_from: z.string() })),
    })
    .optional(),
});

// ── ToolCallPattern ────────────────────────────────────

export const ToolCallPatternSchema = z.object({
  "@context": z.literal(KP_CONTEXT),
  "@type": z.literal("ToolCallPattern"),
  id: z.string().startsWith("kp:pattern:"),
  name: z.string().min(1),
  description: z.string(),
  metadata: KnowledgeUnitMetaSchema,
  trigger_conditions: z.object({
    task_types: z.array(z.string()).min(1),
    required_tools: z.array(z.string()).optional(),
  }),
  tool_sequence: z
    .array(
      z.object({
        step: z.string(),
        execution: z.enum(["parallel", "sequential"]),
        tools: z.array(
          z.object({
            name: z.string(),
            query_template: z.string().optional(),
            input_template: z.record(z.unknown()).optional(),
          }),
        ),
        condition: z.string().optional(),
      }),
    )
    .min(1),
  performance: z.object({
    avg_ms: z.number().nonnegative(),
    success_rate: z.number().min(0).max(1),
    uses: z.number().int().nonnegative(),
  }),
});

// ── ExpertSOP ──────────────────────────────────────────

export const ExpertSOPSchema = z.object({
  "@context": z.literal(KP_CONTEXT),
  "@type": z.literal("ExpertSOP"),
  id: z.string().startsWith("kp:sop:"),
  name: z.string().min(1),
  domain: z.string().min(1),
  metadata: KnowledgeUnitMetaSchema,
  source: z.object({
    type: z.literal("human_expert"),
    expert_id: z.string(),
    credentials: z.array(z.string()),
  }),
  decision_tree: z
    .array(
      z.object({
        step: z.string(),
        instruction: z.string(),
        criteria: z.record(z.string()).optional(),
        conditions: z
          .record(
            z.object({
              action: z.string(),
              sla_min: z.number().optional(),
            }),
          )
          .optional(),
        tool_suggestions: z.array(z.object({ name: z.string(), when: z.string() })).optional(),
      }),
    )
    .min(1),
  validation: z
    .object({
      test_cases: z.array(
        z.object({
          input: z.record(z.unknown()),
          expected_output: z.record(z.unknown()),
        }),
      ),
    })
    .optional(),
});

// ── Discriminated Union ────────────────────────────────

export const KnowledgeUnitSchema = z.discriminatedUnion("@type", [
  ReasoningTraceSchema,
  ToolCallPatternSchema,
  ExpertSOPSchema,
]);

// ── SKILL.md Schemas ───────────────────────────────────

export const SkillMdFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  tags: z.array(z.string()).optional(),
  "allowed-tools": z.array(z.string()).optional(),
});

export const SkillMdKpExtensionSchema = z.object({
  knowledge_capture: z.boolean().optional(),
  domain: z.string().optional(),
  quality_threshold: z.number().min(0).max(1).optional(),
  privacy_level: PrivacyLevelSchema.optional(),
  visibility: VisibilitySchema.optional(),
  reward_eligible: z.boolean().optional(),
});
