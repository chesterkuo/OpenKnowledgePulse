/**
 * KnowledgePulse Knowledge Unit Type Definitions
 * Single Source of Truth — JSON Schema generated via `bun run codegen`
 */

export const KP_CONTEXT = "https://openknowledgepulse.org/schema/v1" as const;

export type KnowledgeUnitType = "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP";

export type PrivacyLevel = "aggregated" | "federated" | "private";
export type Visibility = "private" | "org" | "network";

export interface KnowledgeUnitMeta {
  created_at: string; // ISO 8601
  agent_id?: string; // kp:agent:<id>
  framework?: string; // langgraph | crewai | autogen | openclaw
  task_domain: string;
  success: boolean;
  quality_score: number; // 0.0 ~ 1.0
  visibility: Visibility;
  privacy_level: PrivacyLevel;
  validated_by?: string[]; // kp:validator:<id>[]
}

export interface ReasoningTraceStep {
  step_id: number;
  type: "thought" | "tool_call" | "observation" | "error_recovery";
  content?: string;
  tool?: { name: string; mcp_server?: string };
  input?: Record<string, unknown>;
  output_summary?: string;
  latency_ms?: number;
}

export interface ReasoningTrace {
  "@context": typeof KP_CONTEXT;
  "@type": "ReasoningTrace";
  id: string; // kp:trace:<uuid>
  source_skill?: string; // kp:skill:<name>:<version>
  metadata: KnowledgeUnitMeta;
  task: {
    objective: string;
    input_schema?: Record<string, unknown>;
  };
  steps: ReasoningTraceStep[];
  outcome: {
    result_summary: string;
    confidence: number;
  };
  knowledge_graph_delta?: {
    entities: Array<{ name: string; type: string }>;
    relationships: Array<{ fact: string; valid_from: string }>;
  };
}

export interface ToolCallPattern {
  "@context": typeof KP_CONTEXT;
  "@type": "ToolCallPattern";
  id: string; // kp:pattern:<uuid>
  name: string;
  description: string;
  metadata: KnowledgeUnitMeta;
  trigger_conditions: {
    task_types: string[];
    required_tools?: string[];
  };
  tool_sequence: Array<{
    step: string;
    execution: "parallel" | "sequential";
    tools: Array<{
      name: string;
      query_template?: string;
      input_template?: Record<string, unknown>;
    }>;
    condition?: string;
  }>;
  performance: {
    avg_ms: number;
    success_rate: number;
    uses: number;
  };
}

export interface ExpertSOP {
  "@context": typeof KP_CONTEXT;
  "@type": "ExpertSOP";
  id: string; // kp:sop:<uuid>
  name: string;
  domain: string;
  metadata: KnowledgeUnitMeta;
  source: {
    type: "human_expert";
    expert_id: string;
    credentials: string[]; // kp:sbt:<cert>[]
  };
  decision_tree: Array<{
    step: string;
    instruction: string;
    criteria?: Record<string, string>;
    conditions?: Record<string, { action: string; sla_min?: number }>;
    tool_suggestions?: Array<{ name: string; when: string }>;
  }>;
  validation?: {
    test_cases: Array<{
      input: Record<string, unknown>;
      expected_output: Record<string, unknown>;
    }>;
  };
}

export type KnowledgeUnit = ReasoningTrace | ToolCallPattern | ExpertSOP;

/** SKILL.md standard frontmatter fields */
export interface SkillMdFrontmatter {
  name: string;
  description: string;
  version?: string;
  author?: string;
  license?: string;
  tags?: string[];
  "allowed-tools"?: string[];
}

/** KnowledgePulse extension fields for SKILL.md */
export interface SkillMdKpExtension {
  knowledge_capture?: boolean;
  domain?: string;
  quality_threshold?: number;
  privacy_level?: PrivacyLevel;
  visibility?: Visibility;
  reward_eligible?: boolean;
}
