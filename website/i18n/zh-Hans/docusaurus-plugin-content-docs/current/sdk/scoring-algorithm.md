---
sidebar_position: 5
title: 评分算法
description: 完整的四因子复合评分模型，包括领域权重配置、规则覆盖、时间衰减和性能约束。
---

# 评分算法

KnowledgePulse 评分引擎使用复合公式评估推理追踪，该公式组合了四个独立的质量维度。在第二阶段中，引擎引入了**领域特定权重配置**，可根据不同任务领域调整评分侧重点，并强制执行每次评估 **100ms 的性能预算**。

## 复合公式

总体质量分数按四个归一化维度的加权和计算：

```
score = C × wC + N × wN + D × wD + O × wO
```

其中：

| 符号 | 维度 | 范围 |
|------|------|------|
| C | 复杂度 | 0.0 -- 1.0 |
| N | 新颖性 | 0.0 -- 1.0 |
| D | 工具多样性 | 0.0 -- 1.0 |
| O | 结果置信度 | 0.0 -- 1.0 |

权重（wC、wN、wD、wO）因领域而异，始终总和为 1.0。

## 领域特定权重配置

不同任务领域侧重不同的质量信号。金融追踪最受益于高结果置信度，而编码追踪更看重工具多样性。评分引擎根据 `metadata.task_domain` 自动选择权重配置。

### 可用配置

| 领域 | wC（复杂度）| wN（新颖性）| wD（工具多样性）| wO（结果置信度）|
|------|:-:|:-:|:-:|:-:|
| **default**（默认）| 0.25 | 0.35 | 0.15 | 0.25 |
| **finance**（金融）| 0.20 | 0.25 | 0.10 | 0.45 |
| **code**（编程）| 0.20 | 0.30 | 0.30 | 0.20 |
| **medical**（医疗）| 0.15 | 0.20 | 0.10 | 0.55 |
| **customer_service**（客服）| 0.20 | 0.30 | 0.20 | 0.30 |

### 设计原理

- **金融领域**高度加权结果置信度，因为金融分析要求准确、可验证的结论。
- **编程领域**高度加权工具多样性，因为高效的编程智能体需要使用多种工具（代码检查器、类型检查器、测试运行器）。
- **医疗领域**拥有最高的结果置信度权重（0.55），因为医疗推理中正确性至关重要。
- **客服领域**平衡新颖性和结果置信度，奖励既有创意又有效的问题解决方案。

### 使用领域配置

领域选择通过追踪元数据自动进行：

```ts
import { evaluateValue } from "@knowledgepulse/sdk";
import type { ReasoningTrace } from "@knowledgepulse/sdk";

const trace: ReasoningTrace = {
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ReasoningTrace",
  id: "kp:trace:finance-demo-001",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "finance", // ← 选择金融权重配置
    success: true,
    quality_score: 0,
    visibility: "network",
    privacy_level: "aggregated",
  },
  task: { objective: "Analyze TSMC Q4 earnings report" },
  steps: [
    { step_id: 0, type: "thought", content: "Extracting revenue and margin data" },
    { step_id: 1, type: "tool_call", tool: { name: "financial_data_api" }, input: { ticker: "TSM" } },
    { step_id: 2, type: "observation", content: "Revenue: $26.3B, up 14.3% YoY" },
    { step_id: 3, type: "tool_call", tool: { name: "comparison_tool" }, input: { metric: "gross_margin" } },
    { step_id: 4, type: "observation", content: "Gross margin 57.9%, above industry average" },
  ],
  outcome: {
    result_summary: "Strong quarterly performance driven by AI chip demand",
    confidence: 0.92,
  },
};

const score = await evaluateValue(trace);
// 使用金融权重时，高结果置信度（0.92）贡献更多
console.log(score); // 例如 0.78
```

如果领域不匹配任何已注册的配置，则使用**默认**权重。未知领域将被静默处理——不会抛出错误。

## 规则覆盖

计算加权复合分数后，按顺序应用三个确定性覆盖规则：

### 1. 单步惩罚

```ts
if (steps.length === 1 && steps[0].type === "thought") score = 0.1;
```

只有一个 thought 步骤的追踪知识价值极低。无论其他因素如何，分数都会被强制设为 `0.1`。

### 2. 错误恢复奖励

```ts
if (errorRecovery > 2 && metadata.success) score = Math.min(1.0, score + 0.1);
```

从超过 2 次错误中恢复并最终成功的追踪展示了宝贵的韧性。增加 `+0.1` 奖励，上限为 `1.0`。

### 3. 零多样性惩罚

```ts
if (uniqueTools <= 1 && steps.some(s => s.tool)) score = Math.max(0.0, score - 0.1);
```

如果追踪使用了工具但只有一种唯一工具，则施加 `-0.1` 惩罚，下限为 `0.0`。这鼓励多样化的工具使用。

:::note
单步惩罚具有优先权。如果追踪恰好只有一个 thought 步骤，分数首先被设为 `0.1`。随后的错误恢复奖励和零多样性惩罚在此基础上继续应用（如果满足条件）。
:::

## 新颖性的时间衰减

新颖性维度使用基于嵌入的相似度与本地向量缓存进行比较。随着缓存积累追踪，语义相似追踪的新颖性分数自然下降。这创造了一种隐式的时间衰减效果：

1. 空缓存中的新追踪：新颖性默认为 `0.5`。
2. 新的独特追踪：新颖性趋近 `1.0`（与现有向量的相似度低）。
3. 重复的追踪模式：新颖性趋近 `0.0`（与缓存向量的相似度高）。

向量缓存支持基于 TTL 的淘汰（第二阶段引入），因此缓存条目在可配置的时间窗口后过期。这确保在 TTL 期限后重新访问的主题能重新获得更高的新颖性分数。

```ts
import { VectorCache } from "@knowledgepulse/sdk";

const cache = new VectorCache({
  maxElements: 1000,
  dimensions: 384,
  ttlMs: 3600000, // 1 小时——条目在此之后过期
});
```

## 性能预算

评分函数设计为在典型追踪上 **100ms** 内完成。支持此约束的关键实现选择：

| 组件 | 策略 | 延迟 |
|------|------|------|
| 向量缓存 | 对 1,000 个向量进行暴力线性扫描 | < 1ms |
| 嵌入器 | 延迟加载，首次调用后缓存 | 首次 ~50ms，后续 ~5ms |
| 复合计算 | 纯算术，无 I/O | < 0.1ms |
| 规则覆盖 | 三个条件检查 | < 0.01ms |

如果未安装可选嵌入器（`@huggingface/transformers`），新颖性默认为 `0.5`，整个评估在 1ms 内完成。

## 评分接口

```ts
interface ScoringWeights {
  complexity: number;
  novelty: number;
  toolDiversity: number;
  outcomeConfidence: number;
}

function evaluateValue(trace: ReasoningTrace): Promise<number>;
```

该函数返回一个介于 `0.0` 和 `1.0` 之间的 `Promise<number>`。它在同一进程的多次调用之间是有状态的，因为本地向量缓存持久存在用于新颖性计算。

## 示例：比较领域配置

相同的追踪在不同领域下评估会产生不同的分数，这是由于权重差异造成的：

```ts
// 相同的追踪结构，不同的 task_domain 值
const domains = ["default", "finance", "code", "medical", "customer_service"];

for (const domain of domains) {
  const trace = createTrace({ task_domain: domain });
  const score = await evaluateValue(trace);
  console.log(`${domain}: ${score.toFixed(3)}`);
}

// 示例输出（因追踪内容而异）：
// default:          0.623
// finance:          0.714  （高置信度获得奖励）
// code:             0.598  （工具多样性被强调）
// medical:          0.751  （置信度主导）
// customer_service: 0.645  （均衡）
```
