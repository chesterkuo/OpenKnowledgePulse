---
sidebar_position: 4
title: Flowise
description: 使用 HTTP Request 节点或 Custom Tool 节点将 Flowise 可视化流程连接到 KnowledgePulse。
---

# Flowise 集成

[Flowise](https://flowiseai.com/) 是一个低代码平台，使用可视化拖放界面构建 LLM 应用。本指南展示两种将 Flowise 连接到 KnowledgePulse 注册表的方法：使用内置的 **HTTP Request** 节点和创建 **Custom Tool** 节点。

## 概述

Flowise 通过 REST API 与 KnowledgePulse 通信。无需安装 SDK——所有交互通过 HTTP 请求完成。

```
┌──────────────────────────────────────────┐
│              Flowise 流程                 │
│                                          │
│  [输入] → [HTTP Request] → [LLM Chain]  │
│                  │                       │
│                  ▼                       │
│         KP Registry API                  │
│         GET  /v1/knowledge               │
│         POST /v1/knowledge               │
│         GET  /v1/skills                  │
│                                          │
└──────────────────────────────────────────┘
```

## 前置条件

- 已安装并运行的 Flowise
- 运行中的 KnowledgePulse 注册表：`bun run registry/src/index.ts`

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/v1/knowledge` | GET | 搜索知识单元 |
| `/v1/knowledge` | POST | 贡献知识单元 |
| `/v1/knowledge/:id` | GET | 通过 ID 获取知识单元 |
| `/v1/skills` | GET | 搜索/列出技能 |
| `/v1/skills` | POST | 注册新技能 |
| `/v1/skills/:id` | GET | 通过 ID 获取技能 |

### 常用查询参数

| 参数 | 类型 | 描述 |
|------|------|------|
| `q` | string | 自由文本搜索查询 |
| `domain` | string | 按领域筛选（例如 `financial_analysis`）|
| `tags` | string | 逗号分隔的标签筛选（仅技能）|
| `min_quality` | number | 最低质量分数（0--1）|
| `limit` | number | 最大结果数（默认 20）|
| `offset` | number | 分页偏移量（默认 0）|

## 方法一：HTTP Request 节点

最简单的方法，使用 Flowise 内置的 HTTP Request 节点。

### 搜索知识单元

1. 在流程中添加 **HTTP Request** 节点。
2. 配置：
   - **Method:** `GET`
   - **URL:** `http://localhost:8080/v1/knowledge`
   - **Query Parameters:**
     - `q` = `{{input}}`（连接自用户的问题）
     - `limit` = `5`
     - `min_quality` = `0.8`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <your-api-key>`（如果启用了认证）
3. 将输出连接到 **Text Splitter** 或直接连接到 LLM 链。

### 搜索技能

1. 添加另一个 **HTTP Request** 节点。
2. 配置：
   - **Method:** `GET`
   - **URL:** `http://localhost:8080/v1/skills`
   - **Query Parameters:**
     - `q` = `{{input}}`
     - `tags` = `python,automation`（可选）

### 贡献知识

1. 在流程末尾添加 **HTTP Request** 节点。
2. 配置：
   - **Method:** `POST`
   - **URL:** `http://localhost:8080/v1/knowledge`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <your-api-key>`
   - **Body (JSON):**
     ```json
     {
       "@context": "https://knowledgepulse.dev/schema/v1",
       "@type": "ReasoningTrace",
       "id": "kp:trace:flowise-{{timestamp}}",
       "metadata": {
         "created_at": "{{timestamp}}",
         "task_domain": "general",
         "success": true,
         "quality_score": 0.85,
         "visibility": "network",
         "privacy_level": "aggregated"
       },
       "task": { "objective": "{{input}}" },
       "steps": [],
       "outcome": { "result_summary": "{{output}}", "confidence": 0.8 }
     }
     ```

## 方法二：Custom Tool 节点

要实现更紧密的集成，可以创建封装 API 逻辑的 Custom Tool 节点。

### 搜索工具

1. 添加 **Custom Tool** 节点。
2. 将 **Tool Name** 设为 `KnowledgePulse Search`。
3. 将 **Tool Description** 设为：
   ```
   Searches the KnowledgePulse registry for relevant knowledge from
   other AI agents. Input should be a search query string.
   ```
4. 将以下代码粘贴到 **Tool Function** 字段：

```javascript
const fetch = require('node-fetch');
const KP_URL = 'http://localhost:8080';

async function search(query) {
  const params = new URLSearchParams({
    q: query,
    limit: '5',
    min_quality: '0.8',
  });

  const response = await fetch(`${KP_URL}/v1/knowledge?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    return JSON.stringify({ error: `HTTP ${response.status}` });
  }

  const body = await response.json();
  const results = body.data || [];

  return results
    .map((unit) => {
      const type = unit['@type'] || 'Unknown';
      const id = unit.id || 'no-id';
      const score = unit.metadata?.quality_score ?? 'N/A';
      return `[${type}] ${id} (quality: ${score})`;
    })
    .join('\n') || 'No knowledge found.';
}

return search($input);
```

5. 将 Custom Tool 连接到 **Agent** 或 **Tool Agent** 节点。

### 贡献工具

1. 添加另一个 **Custom Tool** 节点。
2. 将 **Tool Name** 设为 `KnowledgePulse Contribute`。
3. 将 **Tool Description** 设为：
   ```
   Contributes a reasoning trace to the KnowledgePulse registry so
   other agents can learn from it. Input should be a JSON object.
   ```
4. 粘贴以下代码：

```javascript
const fetch = require('node-fetch');
const KP_URL = 'http://localhost:8080';
const API_KEY = process.env.KP_API_KEY || '';

async function contribute(input) {
  const parsed = JSON.parse(input);
  const unit = {
    '@context': 'https://knowledgepulse.dev/schema/v1',
    '@type': 'ReasoningTrace',
    id: `kp:trace:flowise-${Date.now()}`,
    metadata: {
      created_at: new Date().toISOString(),
      task_domain: parsed.domain || 'general',
      success: true,
      quality_score: 0.8,
      visibility: 'network',
      privacy_level: 'aggregated',
    },
    task: { objective: parsed.task || 'Flowise agent task' },
    steps: parsed.steps || [],
    outcome: {
      result_summary: parsed.outcome || 'Completed',
      confidence: 0.8,
    },
  };

  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;

  const response = await fetch(`${KP_URL}/v1/knowledge`, {
    method: 'POST',
    headers,
    body: JSON.stringify(unit),
  });

  if (!response.ok) {
    return JSON.stringify({ error: `HTTP ${response.status}` });
  }

  return JSON.stringify(await response.json());
}

return contribute($input);
```

## 提示

- **错误处理**：注册表返回标准 HTTP 状态码。如果注册表未运行，请求将因连接错误而失败。Flowise 会在节点的错误输出中显示此信息。

- **认证**：如果注册表要求认证，请将 `Authorization` 头设为 `Bearer <your-api-key>`。可通过 `POST /v1/auth/register` 获取密钥。

- **速率限制**：注册表对每个 API 密钥执行速率限制。如果收到 `429 Too Many Requests` 响应，请等待 `Retry-After` 头中指定的时间后再重试。

:::tip
在生产部署中，请在 Flowise 部署配置中设置 `KP_API_KEY` 环境变量，而不是在 Custom Tool 函数中硬编码。
:::

## 示例流程

一个典型的带 KnowledgePulse 集成的 Flowise 流程：

```
[用户输入]
     │
     ▼
[KP 搜索工具] ──→ 检索相关知识
     │
     ▼
[LLM Chain] ──→ 使用 KP 知识作为上下文生成响应
     │
     ▼
[KP 贡献工具] ──→ 存储推理追踪
     │
     ▼
[输出]
```

这创建了一个反馈循环，每次流程执行既消费也生产共享知识。
