import { z } from 'zod';

/**
 * KnowledgePulse Knowledge Unit Type Definitions
 * Single Source of Truth — JSON Schema generated via `bun run codegen`
 */
declare const KP_CONTEXT: "https://knowledgepulse.dev/schema/v1";
type KnowledgeUnitType = "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP";
type PrivacyLevel = "aggregated" | "federated" | "private";
type Visibility = "private" | "org" | "network";
interface KnowledgeUnitMeta {
    created_at: string;
    agent_id?: string;
    framework?: string;
    task_domain: string;
    success: boolean;
    quality_score: number;
    visibility: Visibility;
    privacy_level: PrivacyLevel;
    validated_by?: string[];
}
interface ReasoningTraceStep {
    step_id: number;
    type: "thought" | "tool_call" | "observation" | "error_recovery";
    content?: string;
    tool?: {
        name: string;
        mcp_server?: string;
    };
    input?: Record<string, unknown>;
    output_summary?: string;
    latency_ms?: number;
}
interface ReasoningTrace {
    "@context": typeof KP_CONTEXT;
    "@type": "ReasoningTrace";
    id: string;
    source_skill?: string;
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
        entities: Array<{
            name: string;
            type: string;
        }>;
        relationships: Array<{
            fact: string;
            valid_from: string;
        }>;
    };
}
interface ToolCallPattern {
    "@context": typeof KP_CONTEXT;
    "@type": "ToolCallPattern";
    id: string;
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
interface ExpertSOP {
    "@context": typeof KP_CONTEXT;
    "@type": "ExpertSOP";
    id: string;
    name: string;
    domain: string;
    metadata: KnowledgeUnitMeta;
    source: {
        type: "human_expert";
        expert_id: string;
        credentials: string[];
    };
    decision_tree: Array<{
        step: string;
        instruction: string;
        criteria?: Record<string, string>;
        conditions?: Record<string, {
            action: string;
            sla_min?: number;
        }>;
        tool_suggestions?: Array<{
            name: string;
            when: string;
        }>;
    }>;
    validation?: {
        test_cases: Array<{
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }>;
    };
}
type KnowledgeUnit = ReasoningTrace | ToolCallPattern | ExpertSOP;
/** SKILL.md standard frontmatter fields */
interface SkillMdFrontmatter {
    name: string;
    description: string;
    version?: string;
    author?: string;
    license?: string;
    tags?: string[];
    "allowed-tools"?: string[];
}
/** KnowledgePulse extension fields for SKILL.md */
interface SkillMdKpExtension {
    knowledge_capture?: boolean;
    domain?: string;
    quality_threshold?: number;
    privacy_level?: PrivacyLevel;
    visibility?: Visibility;
    reward_eligible?: boolean;
}

declare const KnowledgeUnitTypeSchema: z.ZodEnum<["ReasoningTrace", "ToolCallPattern", "ExpertSOP"]>;
declare const PrivacyLevelSchema: z.ZodEnum<["aggregated", "federated", "private"]>;
declare const VisibilitySchema: z.ZodEnum<["private", "org", "network"]>;
declare const KnowledgeUnitMetaSchema: z.ZodObject<{
    created_at: z.ZodString;
    agent_id: z.ZodOptional<z.ZodString>;
    framework: z.ZodOptional<z.ZodString>;
    task_domain: z.ZodString;
    success: z.ZodBoolean;
    quality_score: z.ZodNumber;
    visibility: z.ZodEnum<["private", "org", "network"]>;
    privacy_level: z.ZodEnum<["aggregated", "federated", "private"]>;
    validated_by: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    task_domain: string;
    success: boolean;
    quality_score: number;
    visibility: "private" | "org" | "network";
    privacy_level: "aggregated" | "federated" | "private";
    agent_id?: string | undefined;
    framework?: string | undefined;
    validated_by?: string[] | undefined;
}, {
    created_at: string;
    task_domain: string;
    success: boolean;
    quality_score: number;
    visibility: "private" | "org" | "network";
    privacy_level: "aggregated" | "federated" | "private";
    agent_id?: string | undefined;
    framework?: string | undefined;
    validated_by?: string[] | undefined;
}>;
declare const ReasoningTraceStepSchema: z.ZodObject<{
    step_id: z.ZodNumber;
    type: z.ZodEnum<["thought", "tool_call", "observation", "error_recovery"]>;
    content: z.ZodOptional<z.ZodString>;
    tool: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        mcp_server: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        mcp_server?: string | undefined;
    }, {
        name: string;
        mcp_server?: string | undefined;
    }>>;
    input: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    output_summary: z.ZodOptional<z.ZodString>;
    latency_ms: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "thought" | "tool_call" | "observation" | "error_recovery";
    step_id: number;
    content?: string | undefined;
    tool?: {
        name: string;
        mcp_server?: string | undefined;
    } | undefined;
    input?: Record<string, unknown> | undefined;
    output_summary?: string | undefined;
    latency_ms?: number | undefined;
}, {
    type: "thought" | "tool_call" | "observation" | "error_recovery";
    step_id: number;
    content?: string | undefined;
    tool?: {
        name: string;
        mcp_server?: string | undefined;
    } | undefined;
    input?: Record<string, unknown> | undefined;
    output_summary?: string | undefined;
    latency_ms?: number | undefined;
}>;
declare const ReasoningTraceSchema: z.ZodObject<{
    "@context": z.ZodLiteral<"https://knowledgepulse.dev/schema/v1">;
    "@type": z.ZodLiteral<"ReasoningTrace">;
    id: z.ZodString;
    source_skill: z.ZodOptional<z.ZodString>;
    metadata: z.ZodObject<{
        created_at: z.ZodString;
        agent_id: z.ZodOptional<z.ZodString>;
        framework: z.ZodOptional<z.ZodString>;
        task_domain: z.ZodString;
        success: z.ZodBoolean;
        quality_score: z.ZodNumber;
        visibility: z.ZodEnum<["private", "org", "network"]>;
        privacy_level: z.ZodEnum<["aggregated", "federated", "private"]>;
        validated_by: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }>;
    task: z.ZodObject<{
        objective: z.ZodString;
        input_schema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        objective: string;
        input_schema?: Record<string, unknown> | undefined;
    }, {
        objective: string;
        input_schema?: Record<string, unknown> | undefined;
    }>;
    steps: z.ZodArray<z.ZodObject<{
        step_id: z.ZodNumber;
        type: z.ZodEnum<["thought", "tool_call", "observation", "error_recovery"]>;
        content: z.ZodOptional<z.ZodString>;
        tool: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            mcp_server: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            mcp_server?: string | undefined;
        }, {
            name: string;
            mcp_server?: string | undefined;
        }>>;
        input: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        output_summary: z.ZodOptional<z.ZodString>;
        latency_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "thought" | "tool_call" | "observation" | "error_recovery";
        step_id: number;
        content?: string | undefined;
        tool?: {
            name: string;
            mcp_server?: string | undefined;
        } | undefined;
        input?: Record<string, unknown> | undefined;
        output_summary?: string | undefined;
        latency_ms?: number | undefined;
    }, {
        type: "thought" | "tool_call" | "observation" | "error_recovery";
        step_id: number;
        content?: string | undefined;
        tool?: {
            name: string;
            mcp_server?: string | undefined;
        } | undefined;
        input?: Record<string, unknown> | undefined;
        output_summary?: string | undefined;
        latency_ms?: number | undefined;
    }>, "many">;
    outcome: z.ZodObject<{
        result_summary: z.ZodString;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        result_summary: string;
        confidence: number;
    }, {
        result_summary: string;
        confidence: number;
    }>;
    knowledge_graph_delta: z.ZodOptional<z.ZodObject<{
        entities: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: string;
            name: string;
        }, {
            type: string;
            name: string;
        }>, "many">;
        relationships: z.ZodArray<z.ZodObject<{
            fact: z.ZodString;
            valid_from: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            fact: string;
            valid_from: string;
        }, {
            fact: string;
            valid_from: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        entities: {
            type: string;
            name: string;
        }[];
        relationships: {
            fact: string;
            valid_from: string;
        }[];
    }, {
        entities: {
            type: string;
            name: string;
        }[];
        relationships: {
            fact: string;
            valid_from: string;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ReasoningTrace";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    task: {
        objective: string;
        input_schema?: Record<string, unknown> | undefined;
    };
    steps: {
        type: "thought" | "tool_call" | "observation" | "error_recovery";
        step_id: number;
        content?: string | undefined;
        tool?: {
            name: string;
            mcp_server?: string | undefined;
        } | undefined;
        input?: Record<string, unknown> | undefined;
        output_summary?: string | undefined;
        latency_ms?: number | undefined;
    }[];
    outcome: {
        result_summary: string;
        confidence: number;
    };
    source_skill?: string | undefined;
    knowledge_graph_delta?: {
        entities: {
            type: string;
            name: string;
        }[];
        relationships: {
            fact: string;
            valid_from: string;
        }[];
    } | undefined;
}, {
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ReasoningTrace";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    task: {
        objective: string;
        input_schema?: Record<string, unknown> | undefined;
    };
    steps: {
        type: "thought" | "tool_call" | "observation" | "error_recovery";
        step_id: number;
        content?: string | undefined;
        tool?: {
            name: string;
            mcp_server?: string | undefined;
        } | undefined;
        input?: Record<string, unknown> | undefined;
        output_summary?: string | undefined;
        latency_ms?: number | undefined;
    }[];
    outcome: {
        result_summary: string;
        confidence: number;
    };
    source_skill?: string | undefined;
    knowledge_graph_delta?: {
        entities: {
            type: string;
            name: string;
        }[];
        relationships: {
            fact: string;
            valid_from: string;
        }[];
    } | undefined;
}>;
declare const ToolCallPatternSchema: z.ZodObject<{
    "@context": z.ZodLiteral<"https://knowledgepulse.dev/schema/v1">;
    "@type": z.ZodLiteral<"ToolCallPattern">;
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    metadata: z.ZodObject<{
        created_at: z.ZodString;
        agent_id: z.ZodOptional<z.ZodString>;
        framework: z.ZodOptional<z.ZodString>;
        task_domain: z.ZodString;
        success: z.ZodBoolean;
        quality_score: z.ZodNumber;
        visibility: z.ZodEnum<["private", "org", "network"]>;
        privacy_level: z.ZodEnum<["aggregated", "federated", "private"]>;
        validated_by: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }>;
    trigger_conditions: z.ZodObject<{
        task_types: z.ZodArray<z.ZodString, "many">;
        required_tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        task_types: string[];
        required_tools?: string[] | undefined;
    }, {
        task_types: string[];
        required_tools?: string[] | undefined;
    }>;
    tool_sequence: z.ZodArray<z.ZodObject<{
        step: z.ZodString;
        execution: z.ZodEnum<["parallel", "sequential"]>;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            query_template: z.ZodOptional<z.ZodString>;
            input_template: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }, {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }>, "many">;
        condition: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        step: string;
        execution: "parallel" | "sequential";
        tools: {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }[];
        condition?: string | undefined;
    }, {
        step: string;
        execution: "parallel" | "sequential";
        tools: {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }[];
        condition?: string | undefined;
    }>, "many">;
    performance: z.ZodObject<{
        avg_ms: z.ZodNumber;
        success_rate: z.ZodNumber;
        uses: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        avg_ms: number;
        success_rate: number;
        uses: number;
    }, {
        avg_ms: number;
        success_rate: number;
        uses: number;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ToolCallPattern";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    description: string;
    trigger_conditions: {
        task_types: string[];
        required_tools?: string[] | undefined;
    };
    tool_sequence: {
        step: string;
        execution: "parallel" | "sequential";
        tools: {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }[];
        condition?: string | undefined;
    }[];
    performance: {
        avg_ms: number;
        success_rate: number;
        uses: number;
    };
}, {
    name: string;
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ToolCallPattern";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    description: string;
    trigger_conditions: {
        task_types: string[];
        required_tools?: string[] | undefined;
    };
    tool_sequence: {
        step: string;
        execution: "parallel" | "sequential";
        tools: {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }[];
        condition?: string | undefined;
    }[];
    performance: {
        avg_ms: number;
        success_rate: number;
        uses: number;
    };
}>;
declare const ExpertSOPSchema: z.ZodObject<{
    "@context": z.ZodLiteral<"https://knowledgepulse.dev/schema/v1">;
    "@type": z.ZodLiteral<"ExpertSOP">;
    id: z.ZodString;
    name: z.ZodString;
    domain: z.ZodString;
    metadata: z.ZodObject<{
        created_at: z.ZodString;
        agent_id: z.ZodOptional<z.ZodString>;
        framework: z.ZodOptional<z.ZodString>;
        task_domain: z.ZodString;
        success: z.ZodBoolean;
        quality_score: z.ZodNumber;
        visibility: z.ZodEnum<["private", "org", "network"]>;
        privacy_level: z.ZodEnum<["aggregated", "federated", "private"]>;
        validated_by: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }>;
    source: z.ZodObject<{
        type: z.ZodLiteral<"human_expert">;
        expert_id: z.ZodString;
        credentials: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "human_expert";
        expert_id: string;
        credentials: string[];
    }, {
        type: "human_expert";
        expert_id: string;
        credentials: string[];
    }>;
    decision_tree: z.ZodArray<z.ZodObject<{
        step: z.ZodString;
        instruction: z.ZodString;
        criteria: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        conditions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            action: z.ZodString;
            sla_min: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            action: string;
            sla_min?: number | undefined;
        }, {
            action: string;
            sla_min?: number | undefined;
        }>>>;
        tool_suggestions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            when: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            when: string;
        }, {
            name: string;
            when: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        step: string;
        instruction: string;
        criteria?: Record<string, string> | undefined;
        conditions?: Record<string, {
            action: string;
            sla_min?: number | undefined;
        }> | undefined;
        tool_suggestions?: {
            name: string;
            when: string;
        }[] | undefined;
    }, {
        step: string;
        instruction: string;
        criteria?: Record<string, string> | undefined;
        conditions?: Record<string, {
            action: string;
            sla_min?: number | undefined;
        }> | undefined;
        tool_suggestions?: {
            name: string;
            when: string;
        }[] | undefined;
    }>, "many">;
    validation: z.ZodOptional<z.ZodObject<{
        test_cases: z.ZodArray<z.ZodObject<{
            input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            expected_output: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }, {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        test_cases: {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }[];
    }, {
        test_cases: {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ExpertSOP";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    domain: string;
    source: {
        type: "human_expert";
        expert_id: string;
        credentials: string[];
    };
    decision_tree: {
        step: string;
        instruction: string;
        criteria?: Record<string, string> | undefined;
        conditions?: Record<string, {
            action: string;
            sla_min?: number | undefined;
        }> | undefined;
        tool_suggestions?: {
            name: string;
            when: string;
        }[] | undefined;
    }[];
    validation?: {
        test_cases: {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }[];
    } | undefined;
}, {
    name: string;
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ExpertSOP";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    domain: string;
    source: {
        type: "human_expert";
        expert_id: string;
        credentials: string[];
    };
    decision_tree: {
        step: string;
        instruction: string;
        criteria?: Record<string, string> | undefined;
        conditions?: Record<string, {
            action: string;
            sla_min?: number | undefined;
        }> | undefined;
        tool_suggestions?: {
            name: string;
            when: string;
        }[] | undefined;
    }[];
    validation?: {
        test_cases: {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }[];
    } | undefined;
}>;
declare const KnowledgeUnitSchema: z.ZodDiscriminatedUnion<"@type", [z.ZodObject<{
    "@context": z.ZodLiteral<"https://knowledgepulse.dev/schema/v1">;
    "@type": z.ZodLiteral<"ReasoningTrace">;
    id: z.ZodString;
    source_skill: z.ZodOptional<z.ZodString>;
    metadata: z.ZodObject<{
        created_at: z.ZodString;
        agent_id: z.ZodOptional<z.ZodString>;
        framework: z.ZodOptional<z.ZodString>;
        task_domain: z.ZodString;
        success: z.ZodBoolean;
        quality_score: z.ZodNumber;
        visibility: z.ZodEnum<["private", "org", "network"]>;
        privacy_level: z.ZodEnum<["aggregated", "federated", "private"]>;
        validated_by: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }>;
    task: z.ZodObject<{
        objective: z.ZodString;
        input_schema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        objective: string;
        input_schema?: Record<string, unknown> | undefined;
    }, {
        objective: string;
        input_schema?: Record<string, unknown> | undefined;
    }>;
    steps: z.ZodArray<z.ZodObject<{
        step_id: z.ZodNumber;
        type: z.ZodEnum<["thought", "tool_call", "observation", "error_recovery"]>;
        content: z.ZodOptional<z.ZodString>;
        tool: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            mcp_server: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            mcp_server?: string | undefined;
        }, {
            name: string;
            mcp_server?: string | undefined;
        }>>;
        input: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        output_summary: z.ZodOptional<z.ZodString>;
        latency_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "thought" | "tool_call" | "observation" | "error_recovery";
        step_id: number;
        content?: string | undefined;
        tool?: {
            name: string;
            mcp_server?: string | undefined;
        } | undefined;
        input?: Record<string, unknown> | undefined;
        output_summary?: string | undefined;
        latency_ms?: number | undefined;
    }, {
        type: "thought" | "tool_call" | "observation" | "error_recovery";
        step_id: number;
        content?: string | undefined;
        tool?: {
            name: string;
            mcp_server?: string | undefined;
        } | undefined;
        input?: Record<string, unknown> | undefined;
        output_summary?: string | undefined;
        latency_ms?: number | undefined;
    }>, "many">;
    outcome: z.ZodObject<{
        result_summary: z.ZodString;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        result_summary: string;
        confidence: number;
    }, {
        result_summary: string;
        confidence: number;
    }>;
    knowledge_graph_delta: z.ZodOptional<z.ZodObject<{
        entities: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: string;
            name: string;
        }, {
            type: string;
            name: string;
        }>, "many">;
        relationships: z.ZodArray<z.ZodObject<{
            fact: z.ZodString;
            valid_from: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            fact: string;
            valid_from: string;
        }, {
            fact: string;
            valid_from: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        entities: {
            type: string;
            name: string;
        }[];
        relationships: {
            fact: string;
            valid_from: string;
        }[];
    }, {
        entities: {
            type: string;
            name: string;
        }[];
        relationships: {
            fact: string;
            valid_from: string;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ReasoningTrace";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    task: {
        objective: string;
        input_schema?: Record<string, unknown> | undefined;
    };
    steps: {
        type: "thought" | "tool_call" | "observation" | "error_recovery";
        step_id: number;
        content?: string | undefined;
        tool?: {
            name: string;
            mcp_server?: string | undefined;
        } | undefined;
        input?: Record<string, unknown> | undefined;
        output_summary?: string | undefined;
        latency_ms?: number | undefined;
    }[];
    outcome: {
        result_summary: string;
        confidence: number;
    };
    source_skill?: string | undefined;
    knowledge_graph_delta?: {
        entities: {
            type: string;
            name: string;
        }[];
        relationships: {
            fact: string;
            valid_from: string;
        }[];
    } | undefined;
}, {
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ReasoningTrace";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    task: {
        objective: string;
        input_schema?: Record<string, unknown> | undefined;
    };
    steps: {
        type: "thought" | "tool_call" | "observation" | "error_recovery";
        step_id: number;
        content?: string | undefined;
        tool?: {
            name: string;
            mcp_server?: string | undefined;
        } | undefined;
        input?: Record<string, unknown> | undefined;
        output_summary?: string | undefined;
        latency_ms?: number | undefined;
    }[];
    outcome: {
        result_summary: string;
        confidence: number;
    };
    source_skill?: string | undefined;
    knowledge_graph_delta?: {
        entities: {
            type: string;
            name: string;
        }[];
        relationships: {
            fact: string;
            valid_from: string;
        }[];
    } | undefined;
}>, z.ZodObject<{
    "@context": z.ZodLiteral<"https://knowledgepulse.dev/schema/v1">;
    "@type": z.ZodLiteral<"ToolCallPattern">;
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    metadata: z.ZodObject<{
        created_at: z.ZodString;
        agent_id: z.ZodOptional<z.ZodString>;
        framework: z.ZodOptional<z.ZodString>;
        task_domain: z.ZodString;
        success: z.ZodBoolean;
        quality_score: z.ZodNumber;
        visibility: z.ZodEnum<["private", "org", "network"]>;
        privacy_level: z.ZodEnum<["aggregated", "federated", "private"]>;
        validated_by: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }>;
    trigger_conditions: z.ZodObject<{
        task_types: z.ZodArray<z.ZodString, "many">;
        required_tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        task_types: string[];
        required_tools?: string[] | undefined;
    }, {
        task_types: string[];
        required_tools?: string[] | undefined;
    }>;
    tool_sequence: z.ZodArray<z.ZodObject<{
        step: z.ZodString;
        execution: z.ZodEnum<["parallel", "sequential"]>;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            query_template: z.ZodOptional<z.ZodString>;
            input_template: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }, {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }>, "many">;
        condition: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        step: string;
        execution: "parallel" | "sequential";
        tools: {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }[];
        condition?: string | undefined;
    }, {
        step: string;
        execution: "parallel" | "sequential";
        tools: {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }[];
        condition?: string | undefined;
    }>, "many">;
    performance: z.ZodObject<{
        avg_ms: z.ZodNumber;
        success_rate: z.ZodNumber;
        uses: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        avg_ms: number;
        success_rate: number;
        uses: number;
    }, {
        avg_ms: number;
        success_rate: number;
        uses: number;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ToolCallPattern";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    description: string;
    trigger_conditions: {
        task_types: string[];
        required_tools?: string[] | undefined;
    };
    tool_sequence: {
        step: string;
        execution: "parallel" | "sequential";
        tools: {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }[];
        condition?: string | undefined;
    }[];
    performance: {
        avg_ms: number;
        success_rate: number;
        uses: number;
    };
}, {
    name: string;
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ToolCallPattern";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    description: string;
    trigger_conditions: {
        task_types: string[];
        required_tools?: string[] | undefined;
    };
    tool_sequence: {
        step: string;
        execution: "parallel" | "sequential";
        tools: {
            name: string;
            query_template?: string | undefined;
            input_template?: Record<string, unknown> | undefined;
        }[];
        condition?: string | undefined;
    }[];
    performance: {
        avg_ms: number;
        success_rate: number;
        uses: number;
    };
}>, z.ZodObject<{
    "@context": z.ZodLiteral<"https://knowledgepulse.dev/schema/v1">;
    "@type": z.ZodLiteral<"ExpertSOP">;
    id: z.ZodString;
    name: z.ZodString;
    domain: z.ZodString;
    metadata: z.ZodObject<{
        created_at: z.ZodString;
        agent_id: z.ZodOptional<z.ZodString>;
        framework: z.ZodOptional<z.ZodString>;
        task_domain: z.ZodString;
        success: z.ZodBoolean;
        quality_score: z.ZodNumber;
        visibility: z.ZodEnum<["private", "org", "network"]>;
        privacy_level: z.ZodEnum<["aggregated", "federated", "private"]>;
        validated_by: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }, {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    }>;
    source: z.ZodObject<{
        type: z.ZodLiteral<"human_expert">;
        expert_id: z.ZodString;
        credentials: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "human_expert";
        expert_id: string;
        credentials: string[];
    }, {
        type: "human_expert";
        expert_id: string;
        credentials: string[];
    }>;
    decision_tree: z.ZodArray<z.ZodObject<{
        step: z.ZodString;
        instruction: z.ZodString;
        criteria: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        conditions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            action: z.ZodString;
            sla_min: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            action: string;
            sla_min?: number | undefined;
        }, {
            action: string;
            sla_min?: number | undefined;
        }>>>;
        tool_suggestions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            when: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            when: string;
        }, {
            name: string;
            when: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        step: string;
        instruction: string;
        criteria?: Record<string, string> | undefined;
        conditions?: Record<string, {
            action: string;
            sla_min?: number | undefined;
        }> | undefined;
        tool_suggestions?: {
            name: string;
            when: string;
        }[] | undefined;
    }, {
        step: string;
        instruction: string;
        criteria?: Record<string, string> | undefined;
        conditions?: Record<string, {
            action: string;
            sla_min?: number | undefined;
        }> | undefined;
        tool_suggestions?: {
            name: string;
            when: string;
        }[] | undefined;
    }>, "many">;
    validation: z.ZodOptional<z.ZodObject<{
        test_cases: z.ZodArray<z.ZodObject<{
            input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            expected_output: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }, {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        test_cases: {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }[];
    }, {
        test_cases: {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ExpertSOP";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    domain: string;
    source: {
        type: "human_expert";
        expert_id: string;
        credentials: string[];
    };
    decision_tree: {
        step: string;
        instruction: string;
        criteria?: Record<string, string> | undefined;
        conditions?: Record<string, {
            action: string;
            sla_min?: number | undefined;
        }> | undefined;
        tool_suggestions?: {
            name: string;
            when: string;
        }[] | undefined;
    }[];
    validation?: {
        test_cases: {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }[];
    } | undefined;
}, {
    name: string;
    "@context": "https://knowledgepulse.dev/schema/v1";
    "@type": "ExpertSOP";
    id: string;
    metadata: {
        created_at: string;
        task_domain: string;
        success: boolean;
        quality_score: number;
        visibility: "private" | "org" | "network";
        privacy_level: "aggregated" | "federated" | "private";
        agent_id?: string | undefined;
        framework?: string | undefined;
        validated_by?: string[] | undefined;
    };
    domain: string;
    source: {
        type: "human_expert";
        expert_id: string;
        credentials: string[];
    };
    decision_tree: {
        step: string;
        instruction: string;
        criteria?: Record<string, string> | undefined;
        conditions?: Record<string, {
            action: string;
            sla_min?: number | undefined;
        }> | undefined;
        tool_suggestions?: {
            name: string;
            when: string;
        }[] | undefined;
    }[];
    validation?: {
        test_cases: {
            input: Record<string, unknown>;
            expected_output: Record<string, unknown>;
        }[];
    } | undefined;
}>]>;
declare const SkillMdFrontmatterSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    license: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    "allowed-tools": z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    version?: string | undefined;
    author?: string | undefined;
    license?: string | undefined;
    tags?: string[] | undefined;
    "allowed-tools"?: string[] | undefined;
}, {
    name: string;
    description: string;
    version?: string | undefined;
    author?: string | undefined;
    license?: string | undefined;
    tags?: string[] | undefined;
    "allowed-tools"?: string[] | undefined;
}>;
declare const SkillMdKpExtensionSchema: z.ZodObject<{
    knowledge_capture: z.ZodOptional<z.ZodBoolean>;
    domain: z.ZodOptional<z.ZodString>;
    quality_threshold: z.ZodOptional<z.ZodNumber>;
    privacy_level: z.ZodOptional<z.ZodEnum<["aggregated", "federated", "private"]>>;
    visibility: z.ZodOptional<z.ZodEnum<["private", "org", "network"]>>;
    reward_eligible: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    visibility?: "private" | "org" | "network" | undefined;
    privacy_level?: "aggregated" | "federated" | "private" | undefined;
    domain?: string | undefined;
    knowledge_capture?: boolean | undefined;
    quality_threshold?: number | undefined;
    reward_eligible?: boolean | undefined;
}, {
    visibility?: "private" | "org" | "network" | undefined;
    privacy_level?: "aggregated" | "federated" | "private" | undefined;
    domain?: string | undefined;
    knowledge_capture?: boolean | undefined;
    quality_threshold?: number | undefined;
    reward_eligible?: boolean | undefined;
}>;

interface CaptureConfig {
    autoCapture?: boolean;
    valueThreshold?: number;
    privacyLevel?: PrivacyLevel;
    visibility?: Visibility;
    domain: string;
    registryUrl?: string;
    apiKey?: string;
}
declare class KPCapture {
    private config;
    constructor(config: CaptureConfig);
    /**
     * Wrap an agent function to transparently capture knowledge.
     * The wrapper records execution trace, scores it, and async-contributes if above threshold.
     */
    wrap<T extends (...args: unknown[]) => Promise<unknown>>(agentFn: T): T;
    private scoreAndContribute;
}

interface RetrievalConfig {
    minQuality?: number;
    knowledgeTypes?: KnowledgeUnitType[];
    limit?: number;
    registryUrl?: string;
    apiKey?: string;
}
declare class KPRetrieval {
    private config;
    constructor(config?: RetrievalConfig);
    search(query: string, domain?: string): Promise<KnowledgeUnit[]>;
    searchSkills(query: string, opts?: {
        domain?: string;
        tags?: string[];
        limit?: number;
    }): Promise<unknown[]>;
    /** Format a KnowledgeUnit as few-shot text for LLM prompt injection */
    toFewShot(unit: KnowledgeUnit): string;
}

interface ContributeConfig {
    registryUrl?: string;
    apiKey?: string;
}
declare function contributeKnowledge(unit: KnowledgeUnit, config?: ContributeConfig): Promise<{
    id: string;
    quality_score: number;
}>;
declare function contributeSkill(skillMdContent: string, visibility?: Visibility, config?: ContributeConfig): Promise<{
    id: string;
}>;

/**
 * VectorCache — Brute-force linear scan for cosine similarity.
 * 1,000 x 384-dim vectors = sub-1ms scan. Interface supports future HNSW swap.
 */
declare class VectorCache {
    private vectors;
    private readonly maxElements;
    private readonly dimensions;
    constructor(opts?: {
        maxElements?: number;
        dimensions?: number;
    });
    get size(): number;
    add(vector: ArrayLike<number>): void;
    maxCosineSimilarity(query: ArrayLike<number>): number;
    clear(): void;
}

declare function evaluateValue(trace: ReasoningTrace): Promise<number>;

interface ParsedSkillMd {
    frontmatter: SkillMdFrontmatter;
    kp?: SkillMdKpExtension;
    body: string;
    raw: string;
}
declare function parseSkillMd(content: string): ParsedSkillMd;
declare function generateSkillMd(frontmatter: SkillMdFrontmatter, body: string, kp?: SkillMdKpExtension): string;
declare function validateSkillMd(content: string): {
    valid: boolean;
    errors: string[];
};

declare function generateTraceId(): string;
declare function generatePatternId(): string;
declare function generateSopId(): string;
declare function generateSkillId(): string;

declare function sha256(data: string): Promise<string>;

interface SanitizeResult {
    content: string;
    warnings: string[];
}
declare function sanitizeSkillMd(content: string): SanitizeResult;

declare class KPError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
declare class ValidationError extends KPError {
    readonly issues: Array<{
        path: string;
        message: string;
    }>;
    constructor(message: string, issues?: Array<{
        path: string;
        message: string;
    }>);
}
declare class SanitizationError extends KPError {
    readonly field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
declare class AuthenticationError extends KPError {
    constructor(message?: string);
}
declare class RateLimitError extends KPError {
    readonly retryAfter: number;
    constructor(retryAfter: number);
}
declare class NotFoundError extends KPError {
    constructor(resource: string, id: string);
}

/**
 * Migrate a KnowledgeUnit from one schema version to another.
 * Automatically chains intermediate migrations.
 */
declare function migrate(unit: unknown, fromVersion: string, toVersion: string): unknown;

export { AuthenticationError, type CaptureConfig, type ContributeConfig, type ExpertSOP, ExpertSOPSchema, KPCapture, KPError, KPRetrieval, KP_CONTEXT, type KnowledgeUnit, type KnowledgeUnitMeta, KnowledgeUnitMetaSchema, KnowledgeUnitSchema, type KnowledgeUnitType, KnowledgeUnitTypeSchema, NotFoundError, type ParsedSkillMd, type PrivacyLevel, PrivacyLevelSchema, RateLimitError, type ReasoningTrace, ReasoningTraceSchema, type ReasoningTraceStep, ReasoningTraceStepSchema, type RetrievalConfig, SanitizationError, type SanitizeResult, type SkillMdFrontmatter, SkillMdFrontmatterSchema, type SkillMdKpExtension, SkillMdKpExtensionSchema, type ToolCallPattern, ToolCallPatternSchema, ValidationError, VectorCache, type Visibility, VisibilitySchema, contributeKnowledge, contributeSkill, evaluateValue, generatePatternId, generateSkillId, generateSkillMd, generateSopId, generateTraceId, migrate, parseSkillMd, sanitizeSkillMd, sha256, validateSkillMd };
