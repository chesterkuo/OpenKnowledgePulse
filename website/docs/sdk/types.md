---
sidebar_position: 2
title: Types
description: Complete reference for KnowledgePulse knowledge unit types, enums, interfaces, Zod schemas, and error classes.
---

# Types

The SDK exports TypeScript interfaces for every knowledge unit shape, Zod schemas for runtime validation, and a set of typed error classes. All types are importable from the top-level `@knowledgepulse/sdk` entry point.

## Enums

### KnowledgeUnitType

```ts
type KnowledgeUnitType = "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP";
```

The three categories of knowledge that can be captured, stored, and shared through the protocol.

### PrivacyLevel

```ts
type PrivacyLevel = "aggregated" | "federated" | "private";
```

| Value | Description |
|-------|-------------|
| `"aggregated"` | Knowledge is fully anonymized and merged into the public pool |
| `"federated"` | Knowledge stays within a federation boundary; only aggregated insights leave |
| `"private"` | Knowledge never leaves the originating agent or organization |

### Visibility

```ts
type Visibility = "private" | "org" | "network";
```

| Value | Description |
|-------|-------------|
| `"private"` | Visible only to the owning agent |
| `"org"` | Visible to all agents within the same organization |
| `"network"` | Visible to every participant on the KnowledgePulse network |

## Common Interface: KnowledgeUnitMeta

Every knowledge unit carries a `metadata` field with this shape:

```ts
interface KnowledgeUnitMeta {
  created_at: string;          // ISO 8601 datetime
  agent_id?: string;           // kp:agent:<id>
  framework?: string;          // "langgraph" | "crewai" | "autogen" | "openclaw"
  task_domain: string;         // e.g. "customer-support", "code-review"
  success: boolean;
  quality_score: number;       // 0.0 to 1.0
  visibility: Visibility;
  privacy_level: PrivacyLevel;
  validated_by?: string[];     // kp:validator:<id>[]
}
```

## Knowledge Unit Types

### ReasoningTrace

A step-by-step record of an agent's reasoning process, including tool calls, observations, and error recoveries.

```ts
interface ReasoningTrace {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ReasoningTrace";
  id: string;                  // kp:trace:<uuid>
  source_skill?: string;       // kp:skill:<name>:<version>
  metadata: KnowledgeUnitMeta;
  task: {
    objective: string;
    input_schema?: Record<string, unknown>;
  };
  steps: ReasoningTraceStep[];
  outcome: {
    result_summary: string;
    confidence: number;        // 0.0 to 1.0
  };
  knowledge_graph_delta?: {
    entities: Array<{ name: string; type: string }>;
    relationships: Array<{ fact: string; valid_from: string }>;
  };
}
```

#### ReasoningTraceStep

Each step in a trace has one of four types:

```ts
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
```

| Step Type | Description |
|-----------|-------------|
| `"thought"` | Internal reasoning or planning step |
| `"tool_call"` | Invocation of an external tool or API |
| `"observation"` | Result or output received from a tool call |
| `"error_recovery"` | Recovery action taken after an error |

### ToolCallPattern

A reusable pattern describing a sequence of tool invocations that accomplishes a specific task type.

```ts
interface ToolCallPattern {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ToolCallPattern";
  id: string;                  // kp:pattern:<uuid>
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
    success_rate: number;      // 0.0 to 1.0
    uses: number;
  };
}
```

### ExpertSOP

A structured standard operating procedure authored by a human expert, including a decision tree with conditional logic.

```ts
interface ExpertSOP {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ExpertSOP";
  id: string;                  // kp:sop:<uuid>
  name: string;
  domain: string;
  metadata: KnowledgeUnitMeta;
  source: {
    type: "human_expert";
    expert_id: string;
    credentials: string[];     // kp:sbt:<cert>[]
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
```

## Union Type

The `KnowledgeUnit` type is a discriminated union of all three knowledge unit types:

```ts
type KnowledgeUnit = ReasoningTrace | ToolCallPattern | ExpertSOP;
```

## SKILL.md Types

### SkillMdFrontmatter

Standard SKILL.md YAML frontmatter fields:

```ts
interface SkillMdFrontmatter {
  name: string;
  description: string;
  version?: string;
  author?: string;
  license?: string;
  tags?: string[];
  "allowed-tools"?: string[];
}
```

### SkillMdKpExtension

KnowledgePulse extension fields nested under the `kp:` key in SKILL.md frontmatter:

```ts
interface SkillMdKpExtension {
  knowledge_capture?: boolean;
  domain?: string;
  quality_threshold?: number;    // 0.0 to 1.0
  privacy_level?: PrivacyLevel;
  visibility?: Visibility;
  reward_eligible?: boolean;
}
```

## Zod Schemas

Every type above has a corresponding Zod schema for runtime validation. The schemas are exported from `@knowledgepulse/sdk` and can be used directly with `safeParse` or `parse`.

| Schema | Validates |
|--------|-----------|
| `KnowledgeUnitSchema` | Discriminated union on `@type` (all three unit types) |
| `KnowledgeUnitTypeSchema` | `"ReasoningTrace" \| "ToolCallPattern" \| "ExpertSOP"` |
| `KnowledgeUnitMetaSchema` | The `metadata` object |
| `PrivacyLevelSchema` | `"aggregated" \| "federated" \| "private"` |
| `VisibilitySchema` | `"private" \| "org" \| "network"` |
| `ReasoningTraceSchema` | Full `ReasoningTrace` object |
| `ReasoningTraceStepSchema` | Individual step in a trace |
| `ToolCallPatternSchema` | Full `ToolCallPattern` object |
| `ExpertSOPSchema` | Full `ExpertSOP` object |
| `SkillMdFrontmatterSchema` | SKILL.md frontmatter fields |
| `SkillMdKpExtensionSchema` | KnowledgePulse extension fields |

### Validation Example

```ts
import { KnowledgeUnitSchema } from "@knowledgepulse/sdk";

const result = KnowledgeUnitSchema.safeParse(unknownData);

if (result.success) {
  // result.data is typed as KnowledgeUnit
  const unit = result.data;
  console.log(unit["@type"]); // "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP"
} else {
  // result.error.issues contains detailed validation errors
  for (const issue of result.error.issues) {
    console.error(`${issue.path.join(".")}: ${issue.message}`);
  }
}
```

The `KnowledgeUnitSchema` is a Zod discriminated union keyed on the `@type` field. This means the schema automatically selects the correct validator (`ReasoningTraceSchema`, `ToolCallPatternSchema`, or `ExpertSOPSchema`) based on the value of `@type` in the input data.

### Strict Validation with `parse`

If you prefer exceptions over result objects, use `parse` instead:

```ts
import { ReasoningTraceSchema } from "@knowledgepulse/sdk";

try {
  const trace = ReasoningTraceSchema.parse(data);
  // trace is typed as ReasoningTrace
} catch (err) {
  // ZodError with .issues array
}
```

## Error Classes

The SDK exports a hierarchy of error classes for structured error handling.

### KPError (base)

```ts
class KPError extends Error {
  readonly code: string;
  constructor(message: string, code: string);
}
```

All SDK errors extend `KPError`. The `code` field provides a machine-readable error identifier.

### ValidationError

```ts
class ValidationError extends KPError {
  readonly issues: Array<{ path: string; message: string }>;
  // code: "VALIDATION_ERROR"
}
```

Thrown when data fails Zod schema validation or SKILL.md parsing. The `issues` array contains one entry per field-level problem, each with a dot-delimited `path` and a human-readable `message`.

### SanitizationError

```ts
class SanitizationError extends KPError {
  readonly field?: string;
  // code: "SANITIZATION_ERROR"
}
```

Thrown when content sanitization detects dangerous patterns such as invisible Unicode characters or prompt injection attempts.

### AuthenticationError

```ts
class AuthenticationError extends KPError {
  // code: "AUTHENTICATION_ERROR"
  // default message: "Authentication required"
}
```

Thrown when an API call requires authentication but no valid credentials were provided.

### RateLimitError

```ts
class RateLimitError extends KPError {
  readonly retryAfter: number;  // seconds
  // code: "RATE_LIMIT_ERROR"
}
```

Thrown when the registry returns a 429 status. The `retryAfter` field indicates how many seconds to wait before retrying.

### NotFoundError

```ts
class NotFoundError extends KPError {
  // code: "NOT_FOUND"
}
```

Thrown when a requested resource (knowledge unit, skill, etc.) does not exist in the registry.

### Error Handling Example

```ts
import {
  KPError,
  ValidationError,
  RateLimitError,
} from "@knowledgepulse/sdk";

try {
  await contributeKnowledge(unit, { apiKey: "kp_..." });
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry in ${err.retryAfter}s`);
  } else if (err instanceof ValidationError) {
    for (const issue of err.issues) {
      console.error(`  ${issue.path}: ${issue.message}`);
    }
  } else if (err instanceof KPError) {
    console.error(`KP error [${err.code}]: ${err.message}`);
  }
}
```
