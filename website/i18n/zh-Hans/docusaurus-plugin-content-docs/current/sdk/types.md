---
sidebar_position: 2
title: 类型
description: KnowledgePulse 知识单元类型、枚举、接口、Zod 模式和错误类的完整参考。
---

# 类型

SDK 导出了每种知识单元结构的 TypeScript 接口、用于运行时验证的 Zod 模式，以及一组类型化的错误类。所有类型均可从顶层 `@knowledgepulse/sdk` 入口点导入。

## 枚举

### KnowledgeUnitType

```ts
type KnowledgeUnitType = "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP";
```

可通过协议捕获、存储和共享的三类知识。

### PrivacyLevel

```ts
type PrivacyLevel = "aggregated" | "federated" | "private";
```

| 值 | 描述 |
|------|------|
| `"aggregated"` | 知识被完全匿名化并合并到公共池中 |
| `"federated"` | 知识保留在联邦边界内；只有聚合后的洞察可以流出 |
| `"private"` | 知识永远不会离开发起的代理或组织 |

### Visibility

```ts
type Visibility = "private" | "org" | "network";
```

| 值 | 描述 |
|------|------|
| `"private"` | 仅对所属代理可见 |
| `"org"` | 对同一组织内的所有代理可见 |
| `"network"` | 对 KnowledgePulse 网络上的每个参与者可见 |

## 通用接口：KnowledgeUnitMeta

每个知识单元都包含一个具有以下结构的 `metadata` 字段：

```ts
interface KnowledgeUnitMeta {
  created_at: string;          // ISO 8601 日期时间
  agent_id?: string;           // kp:agent:<id>
  framework?: string;          // "langgraph" | "crewai" | "autogen" | "openclaw"
  task_domain: string;         // 例如 "customer-support"、"code-review"
  success: boolean;
  quality_score: number;       // 0.0 到 1.0
  visibility: Visibility;
  privacy_level: PrivacyLevel;
  validated_by?: string[];     // kp:validator:<id>[]
}
```

## 知识单元类型

### ReasoningTrace

代理推理过程的逐步记录，包括工具调用、观察和错误恢复。

```ts
interface ReasoningTrace {
  "@context": "https://openknowledgepulse.org/schema/v1";
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
    confidence: number;        // 0.0 到 1.0
  };
  knowledge_graph_delta?: {
    entities: Array<{ name: string; type: string }>;
    relationships: Array<{ fact: string; valid_from: string }>;
  };
}
```

#### ReasoningTraceStep

追踪中的每个步骤具有以下四种类型之一：

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

| 步骤类型 | 描述 |
|----------|------|
| `"thought"` | 内部推理或规划步骤 |
| `"tool_call"` | 调用外部工具或 API |
| `"observation"` | 从工具调用接收到的结果或输出 |
| `"error_recovery"` | 发生错误后采取的恢复操作 |

### ToolCallPattern

一种可复用的模式，描述完成特定任务类型的一系列工具调用。

```ts
interface ToolCallPattern {
  "@context": "https://openknowledgepulse.org/schema/v1";
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
    success_rate: number;      // 0.0 到 1.0
    uses: number;
  };
}
```

### ExpertSOP

由人类专家编写的结构化标准操作程序，包含带有条件逻辑的决策树。

```ts
interface ExpertSOP {
  "@context": "https://openknowledgepulse.org/schema/v1";
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

## 联合类型

`KnowledgeUnit` 类型是所有三种知识单元类型的可辨识联合：

```ts
type KnowledgeUnit = ReasoningTrace | ToolCallPattern | ExpertSOP;
```

## SKILL.md 类型

### SkillMdFrontmatter

标准 SKILL.md YAML 前置数据字段：

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

嵌套在 SKILL.md 前置数据 `kp:` 键下的 KnowledgePulse 扩展字段：

```ts
interface SkillMdKpExtension {
  knowledge_capture?: boolean;
  domain?: string;
  quality_threshold?: number;    // 0.0 到 1.0
  privacy_level?: PrivacyLevel;
  visibility?: Visibility;
  reward_eligible?: boolean;
}
```

## SOP 导入类型

SDK 提供了用于从文档导入 SOP 的类型和函数。这些类型由 SOP 工作室的文档导入功能使用，也可以独立使用。

### LLMConfig

文档提取过程中使用的 LLM 提供商配置：

```ts
interface LLMConfig {
  provider: "openai" | "anthropic" | "ollama";
  apiKey: string;              // 你的提供商 API 密钥
  model: string;               // 模型标识符（例如 "gpt-4o"）
  baseUrl?: string;            // 自定义端点（Ollama 必填）
  temperature?: number;        // 0.0 到 1.0（默认：0.2）
}
```

### ParseResult

`parseDocx` 和 `parsePdf` 解析文档后返回的结果：

```ts
interface ParseResult {
  text: string;                // 完整的纯文本内容
  sections: Array<{
    heading: string;
    content: string;
    level: number;             // 标题级别（1-6）
  }>;
  tables: Array<{
    headers: string[];
    rows: string[][];
  }>;
  metadata: {
    title?: string;
    author?: string;
    pageCount?: number;
  };
}
```

### ExtractionResult

`extractDecisionTree` 经过 LLM 提取后返回的结果：

```ts
interface ExtractionResult {
  name: string;                // 检测到的 SOP 名称
  domain: string;              // 检测到的领域
  description: string;         // 生成的描述
  decision_tree: Array<{       // 兼容 ExpertSOP 的决策树
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
  confidence: number;          // 0.0 到 1.0
  warnings: string[];          // 提取问题或歧义
}
```

### 文档解析函数

```ts
import { parseDocx, parsePdf, extractDecisionTree } from "@knowledgepulse/sdk";

// 解析 DOCX 文件
const docxResult: ParseResult = await parseDocx(buffer);

// 解析 PDF 文件
const pdfResult: ParseResult = await parsePdf(buffer);

// 使用 LLM 提取决策树
const extraction: ExtractionResult = await extractDecisionTree(pdfResult, {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o",
  temperature: 0.2,
});
```

## Zod 模式

上述每种类型都有对应的 Zod 模式用于运行时验证。这些模式从 `@knowledgepulse/sdk` 导出，可以直接与 `safeParse` 或 `parse` 一起使用。

| 模式 | 验证对象 |
|------|----------|
| `KnowledgeUnitSchema` | 基于 `@type` 的可辨识联合（全部三种单元类型） |
| `KnowledgeUnitTypeSchema` | `"ReasoningTrace" \| "ToolCallPattern" \| "ExpertSOP"` |
| `KnowledgeUnitMetaSchema` | `metadata` 对象 |
| `PrivacyLevelSchema` | `"aggregated" \| "federated" \| "private"` |
| `VisibilitySchema` | `"private" \| "org" \| "network"` |
| `ReasoningTraceSchema` | 完整的 `ReasoningTrace` 对象 |
| `ReasoningTraceStepSchema` | 追踪中的单个步骤 |
| `ToolCallPatternSchema` | 完整的 `ToolCallPattern` 对象 |
| `ExpertSOPSchema` | 完整的 `ExpertSOP` 对象 |
| `SkillMdFrontmatterSchema` | SKILL.md 前置数据字段 |
| `SkillMdKpExtensionSchema` | KnowledgePulse 扩展字段 |

### 验证示例

```ts
import { KnowledgeUnitSchema } from "@knowledgepulse/sdk";

const result = KnowledgeUnitSchema.safeParse(unknownData);

if (result.success) {
  // result.data 的类型为 KnowledgeUnit
  const unit = result.data;
  console.log(unit["@type"]); // "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP"
} else {
  // result.error.issues 包含详细的验证错误
  for (const issue of result.error.issues) {
    console.error(`${issue.path.join(".")}: ${issue.message}`);
  }
}
```

`KnowledgeUnitSchema` 是一个以 `@type` 字段为键的 Zod 可辨识联合。这意味着该模式会根据输入数据中 `@type` 的值自动选择正确的验证器（`ReasoningTraceSchema`、`ToolCallPatternSchema` 或 `ExpertSOPSchema`）。

### 使用 `parse` 进行严格验证

如果你更倾向于使用异常而非结果对象，可以使用 `parse`：

```ts
import { ReasoningTraceSchema } from "@knowledgepulse/sdk";

try {
  const trace = ReasoningTraceSchema.parse(data);
  // trace 的类型为 ReasoningTrace
} catch (err) {
  // ZodError，包含 .issues 数组
}
```

## 错误类

SDK 导出了一组分层的错误类，用于结构化的错误处理。

### KPError（基类）

```ts
class KPError extends Error {
  readonly code: string;
  constructor(message: string, code: string);
}
```

所有 SDK 错误都继承自 `KPError`。`code` 字段提供了机器可读的错误标识符。

### ValidationError

```ts
class ValidationError extends KPError {
  readonly issues: Array<{ path: string; message: string }>;
  // code: "VALIDATION_ERROR"
}
```

当数据未能通过 Zod 模式验证或 SKILL.md 解析时抛出。`issues` 数组为每个字段级别的问题包含一个条目，其中包含以点分隔的 `path` 和人类可读的 `message`。

### SanitizationError

```ts
class SanitizationError extends KPError {
  readonly field?: string;
  // code: "SANITIZATION_ERROR"
}
```

当内容清洗检测到危险模式（如不可见 Unicode 字符或提示注入尝试）时抛出。

### AuthenticationError

```ts
class AuthenticationError extends KPError {
  // code: "AUTHENTICATION_ERROR"
  // 默认消息: "Authentication required"
}
```

当 API 调用需要身份验证但未提供有效凭据时抛出。

### RateLimitError

```ts
class RateLimitError extends KPError {
  readonly retryAfter: number;  // 秒
  // code: "RATE_LIMIT_ERROR"
}
```

当注册中心返回 429 状态时抛出。`retryAfter` 字段指示在重试之前应等待的秒数。

### NotFoundError

```ts
class NotFoundError extends KPError {
  // code: "NOT_FOUND"
}
```

当请求的资源（知识单元、技能等）在注册中心中不存在时抛出。

### 错误处理示例

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
    console.log(`速率受限。${err.retryAfter} 秒后重试`);
  } else if (err instanceof ValidationError) {
    for (const issue of err.issues) {
      console.error(`  ${issue.path}: ${issue.message}`);
    }
  } else if (err instanceof KPError) {
    console.error(`KP 错误 [${err.code}]: ${err.message}`);
  }
}
```
