---
sidebar_position: 3
---

# 核心概念

## KnowledgeUnit

KnowledgeUnit 是 KnowledgePulse 中的基本数据结构。它表示从 AI 智能体的执行过程或人类专家的操作流程中捕获的知识片段，以 JSON-LD 格式编码。

每个 KnowledgeUnit 包含：
- 一个指向 `https://openknowledgepulse.org/schema/v1` 的 `@context`
- 一个 `@type` 鉴别器：`ReasoningTrace`、`ToolCallPattern` 或 `ExpertSOP`
- 一个带有类型特定前缀的唯一 `id`（例如 `kp:trace:`、`kp:pattern:`、`kp:sop:`）
- 一个 `metadata` 对象，包含质量评分、可见性、隐私级别和时间戳

### ReasoningTrace

捕获 AI 智能体解决任务时的逐步推理过程，包括思考、工具调用、观察和错误恢复。

```json
{
  "@context": "https://openknowledgepulse.org/schema/v1",
  "@type": "ReasoningTrace",
  "id": "kp:trace:550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "task_domain": "financial_analysis",
    "success": true,
    "quality_score": 0.85,
    "visibility": "network",
    "privacy_level": "aggregated"
  },
  "task": {
    "objective": "Analyze Q4 earnings report for ACME Corp"
  },
  "steps": [
    { "step_id": 0, "type": "thought", "content": "Need to fetch the 10-K filing" },
    { "step_id": 1, "type": "tool_call", "tool": { "name": "web_search" } },
    { "step_id": 2, "type": "observation", "content": "Found SEC filing" }
  ],
  "outcome": {
    "result_summary": "Generated investment analysis with buy recommendation",
    "confidence": 0.82
  }
}
```

### ToolCallPattern

描述适用于特定任务类型的可复用工具调用模式。

```json
{
  "@context": "https://openknowledgepulse.org/schema/v1",
  "@type": "ToolCallPattern",
  "id": "kp:pattern:660e8400-e29b-41d4-a716-446655440000",
  "name": "SEC Filing Analysis",
  "description": "Optimal tool sequence for analyzing SEC filings",
  "trigger_conditions": {
    "task_types": ["financial_analysis", "sec_filing"]
  },
  "tool_sequence": [
    {
      "step": "fetch",
      "execution": "parallel",
      "tools": [{ "name": "web_search" }, { "name": "web_fetch" }]
    }
  ],
  "performance": {
    "avg_ms": 3200,
    "success_rate": 0.94,
    "uses": 127
  }
}
```

### ExpertSOP

将人类专家的标准操作流程编码为机器可执行的格式。

```json
{
  "@context": "https://openknowledgepulse.org/schema/v1",
  "@type": "ExpertSOP",
  "id": "kp:sop:770e8400-e29b-41d4-a716-446655440000",
  "name": "Customer Escalation Procedure",
  "domain": "customer_service",
  "source": {
    "type": "human_expert",
    "expert_id": "expert-jane",
    "credentials": ["kp:sbt:customer-service-cert"]
  },
  "decision_tree": [
    {
      "step": "assess",
      "instruction": "Determine severity level from customer message",
      "conditions": {
        "high": { "action": "Escalate to senior agent", "sla_min": 5 },
        "low": { "action": "Apply standard resolution template" }
      }
    }
  ]
}
```

## SKILL.md

SKILL.md 是一个开放标准，用于将 AI 智能体技能定义为带有 YAML frontmatter 的 Markdown 文件。KnowledgePulse 完全兼容 SKILL.md，并通过可选的 `kp:` 字段对其进行扩展。

### 标准字段

```yaml
---
name: my-skill              # Required: skill name
description: What it does   # Required: skill description
version: 1.0.0             # Optional: SemVer version
author: user@example.com   # Optional: author
license: Apache-2.0        # Optional: license identifier
tags: [web, search]         # Optional: tags for discovery
allowed-tools: [web_search] # Optional: tools this skill can use
---
```

### KP 扩展字段

```yaml
---
name: my-skill
description: What it does
kp:
  knowledge_capture: true      # Enable auto-capture (default: false)
  domain: financial_analysis   # Knowledge domain classification
  quality_threshold: 0.75      # Minimum quality score to contribute (default: 0.75)
  privacy_level: aggregated    # aggregated | federated | private
  visibility: network          # private | org | network
  reward_eligible: true        # Eligible for KP-REP rewards (default: true)
---
```

`kp:` 扩展是向后兼容的——非 KP 工具会直接忽略这些额外字段。

## 可见性层级

| 层级 | 范围 | 使用场景 |
|------|------|----------|
| `private` | 仅限贡献该知识的智能体 | 个人知识库 |
| `org` | 同一组织的成员 | 团队知识共享 |
| `network` | 所有 KnowledgePulse 用户 | 开放社区知识 |

## 隐私级别

| 级别 | 描述 |
|------|------|
| `aggregated` | 在本地提取抽象模式；原始对话不会上传 |
| `federated` | 仅通过联邦学习共享模型梯度 |
| `private` | 知识保留在本地，不与 Registry 共享 |

## KP-REP 声誉系统

KP-REP 是一个不可转让的声誉评分，用于追踪贡献记录：

| 操作 | 分数变化 |
|------|----------|
| 注册 | +0.1（一次性） |
| 贡献知识 | +0.2 |
| 贡献技能 | +0.1 |
| 验证一个单元 | +0.05 |

声誉用于速率限制层级分配和信任评分。

## 质量评分

知识在被接受进入网络之前，会在 4 个维度上进行评分：

1. **复杂度**（25%）——步骤多样性、错误恢复、轨迹长度
2. **新颖度**（35%）——与现有知识的语义相似度（通过嵌入向量计算）
3. **工具多样性**（15%）——轨迹中使用的工具种类
4. **结果置信度**（25%）——按成功率加权的报告置信度

详见[评分文档](../sdk/scoring.md)了解完整算法。
