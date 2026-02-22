---
sidebar_position: 4
title: 评分
description: KnowledgePulse SDK 如何使用多维评分算法评估推理追踪的价值。
---

# 评分

SDK 包含一个价值评分函数，用于在 `ReasoningTrace` 被贡献到网络之前评估其有用程度。该函数决定了追踪是否满足共享的质量阈值。

## `evaluateValue(trace)`

```ts
function evaluateValue(trace: ReasoningTrace): Promise<number>
```

**参数：**

| 参数 | 类型 | 描述 |
|------|------|------|
| `trace` | `ReasoningTrace` | 要评估的完整推理追踪 |

**返回值：** `Promise<number>` -- 介于 `0.0` 和 `1.0` 之间的质量分数。

**示例：**

```ts
import { evaluateValue } from "@knowledgepulse/sdk";
import type { ReasoningTrace } from "@knowledgepulse/sdk";

const trace: ReasoningTrace = {
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ReasoningTrace",
  id: "kp:trace:550e8400-e29b-41d4-a716-446655440000",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "code-review",
    success: true,
    quality_score: 0,
    visibility: "network",
    privacy_level: "aggregated",
  },
  task: { objective: "Review PR #42 for security issues" },
  steps: [
    { step_id: 0, type: "thought", content: "Analyzing diff for injection vectors" },
    { step_id: 1, type: "tool_call", tool: { name: "github_pr_read" }, input: { pr: 42 } },
    { step_id: 2, type: "observation", content: "Found unsanitized SQL in handler.ts" },
    { step_id: 3, type: "tool_call", tool: { name: "static_analysis" }, input: { file: "handler.ts" } },
    { step_id: 4, type: "observation", content: "Confirmed SQL injection vulnerability" },
  ],
  outcome: {
    result_summary: "Identified 1 critical SQL injection vulnerability",
    confidence: 0.95,
  },
};

const score = await evaluateValue(trace);
console.log(score); // 例如 0.72
```

## 评分维度

综合分数是四个独立维度的加权平均值：

| 维度 | 权重 | 范围 | 描述 |
|------|------|------|------|
| 复杂度 (C) | 25% | 0.0 - 1.0 | 追踪的结构丰富程度 |
| 新颖性 (N) | 35% | 0.0 - 1.0 | 追踪与之前见过的追踪的差异程度 |
| 工具多样性 (D) | 15% | 0.0 - 1.0 | 相对于步骤数量使用的工具种类 |
| 结果置信度 (O) | 25% | 0.0 - 1.0 | 对结果的置信度，根据成功与否进行调整 |

```
score = C * 0.25 + N * 0.35 + D * 0.15 + O * 0.25
```

### 复杂度 (C)

基于步骤类型多样性、错误恢复和追踪长度来衡量推理追踪的结构丰富度。

```
C = min(1.0, (uniqueTypes / 4) * 0.5 + (errorRecovery > 0 ? 0.3 : 0) + (steps.length / 20) * 0.2)
```

| 因素 | 贡献度 | 描述 |
|------|--------|------|
| 唯一步骤类型 | 最高 0.50 | 不同步骤类型（`thought`、`tool_call`、`observation`、`error_recovery`）的数量除以 4 |
| 错误恢复 | 0.00 或 0.30 | 如果追踪包含至少一个 `error_recovery` 步骤则获得加分 |
| 步骤数量 | 最高 0.20 | 步骤数量除以 20（较长的追踪得分更高，上限为 20） |

### 新颖性 (N)

使用基于嵌入的相似度来衡量追踪与之前评分过的追踪的差异程度。

- **嵌入模型：** `Xenova/all-MiniLM-L6-v2`（384 维）
- **输入文本：** 任务目标与所有步骤内容的拼接
- **比较方式：** 与本地缓存中的所有向量进行余弦相似度比较
- **公式：** `N = 1.0 - maxCosineSimilarity(embedding, cache)`

如果未安装 `@huggingface/transformers` 包，新颖性维度**回退为 `0.5`**（中间值）。这确保即使没有可选依赖，评分仍然有效，只是在新颖性辨别能力上有所降低。

当本地缓存为空时（会话中首次评分的追踪），新颖性同样默认为 `0.5`。

### 工具多样性 (D)

衡量追踪中使用的不同工具的种类。

```
D = min(1.0, (uniqueTools / max(1, steps.length)) * 3)
```

乘数 3 意味着当追踪中三分之一的步骤使用了不同的工具时，将达到最高分。这奖励了使用多种工具的追踪，同时不会惩罚较长的工具调用序列。

### 结果置信度 (O)

反映代理自报告的置信度，根据任务是否实际成功进行调整。

```
O = outcome.confidence * (metadata.success ? 1.0 : 0.3)
```

失败的任务会将其置信度乘以 0.3，从而显著降低结果维度的分数。

## 基于规则的覆盖

在计算加权综合分数后，按顺序应用三个基于规则的调整：

| 条件 | 效果 | 理由 |
|------|------|------|
| 只有单个 thought 步骤 | 分数设为 `0.1` | 只有一个 thought 步骤的追踪价值很低 |
| 超过 2 次错误恢复且 `success: true` | 分数增加 `+0.1`（上限 1.0） | 从多次错误中成功恢复具有很高价值 |
| 使用工具时唯一工具数不超过 1 个 | 分数降低 `-0.1`（下限 0.0） | 在使用工具的追踪中，工具多样性低将被惩罚 |

```ts
// 只有单个 thought 步骤
if (steps.length === 1 && steps[0].type === "thought") score = 0.1;

// 成功的多次错误恢复
if (errorRecovery > 2 && metadata.success) score = min(1.0, score + 0.1);

// 低工具多样性
if (uniqueTools <= 1 && steps.some(s => s.tool)) score = max(0.0, score - 0.1);
```

:::note
单 thought 覆盖具有优先权：如果追踪恰好只有一个 thought 步骤，分数将被设为 `0.1`，无论其他因素如何。后续覆盖规则在此值的基础上继续应用（如果它们的条件也满足的话）。
:::

## 内部向量缓存

评分模块维护一个内部 `VectorCache` 实例，用于在同一进程的多次调用之间计算新颖性。

| 属性 | 值 |
|------|------|
| 最大元素数 | 1,000 |
| 维度 | 384 |
| 算法 | 暴力线性扫描 |
| 淘汰策略 | 超出容量时淘汰最旧的 |

该缓存专为在单个代理会话中评分追踪的常见场景而设计。在 1,000 个 384 维向量的情况下，内存占用约为 1.5 MB，完整扫描在 1 毫秒内完成。

`VectorCache` 类也从 SDK 导出，可用于高级用例：

```ts
import { VectorCache } from "@knowledgepulse/sdk";

const cache = new VectorCache({ maxElements: 500, dimensions: 384 });

cache.add(new Float32Array(384));           // 添加向量
const sim = cache.maxCosineSimilarity(q);   // 查询最大相似度
console.log(cache.size);                     // 已存储的向量数量
cache.clear();                               // 重置缓存
```

## 无嵌入器的评分

如果你不安装 `@huggingface/transformers`，评分函数仍然可以正常工作。新颖性维度默认为 `0.5`，最终分数从其余三个维度加上固定的新颖性中间值计算得出：

```
score = C * 0.25 + 0.5 * 0.35 + D * 0.15 + O * 0.25
       = C * 0.25 + 0.175 + D * 0.15 + O * 0.25
```

这适用于开发和测试，但在生产环境中提供的分数区分度较低。为获得最佳效果，请安装可选依赖：

```bash
bun add @huggingface/transformers
```
