---
sidebar_position: 2
title: KnowledgeUnit 协议
description: JSON-LD 模式、知识类型、版本控制策略和迁移系统。
---

# KnowledgeUnit 协议

KnowledgeUnit 协议定义了表示 AI 生成知识的规范格式。每个知识单元都是一个 JSON-LD 文档，具有明确定义的模式、类型鉴别器和版本控制契约。

## JSON-LD 格式

每个 KnowledgeUnit 都是一个包含两个必需上下文字段的 JSON-LD 文档：

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "Trace",
  "id": "kp:trace:a1b2c3d4",
  ...
}
```

- **`@context`** -- 模式命名空间 URI。所有 v1.x 文档共享上下文 `https://knowledgepulse.dev/schema/v1`。新的主版本会引入新的上下文 URI（例如 `.../v2`）。
- **`@type`** -- 类型鉴别器。取值为 `Trace`、`Pattern` 或 `SOP` 之一。

## KnowledgeUnit 类型

协议定义了三种知识单元类型，每种类型具有不同的 ID 前缀：

| 类型 | ID 前缀 | 描述 |
|------|---------|------|
| **Trace** | `kp:trace:` | 单次智能体交互的记录 -- 发生了什么、尝试了什么、结果如何。Trace 是提取 Pattern 的原始素材。 |
| **Pattern** | `kp:pattern:` | 从多个 Trace 中提炼出的反复出现的解决方案或方法。Pattern 捕获可复用的知识，例如"当 X 发生时，执行 Y"。 |
| **SOP** | `kp:sop:` | 标准操作流程 -- 由 Pattern 组装而成的经过策划的分步工作流。SOP 代表系统中最高保真度的知识。 |

从 Trace 到 Pattern 再到 SOP 的演进反映了策划程度和置信度的逐步提升：

```
Trace (raw observation)
  → Pattern (recurring solution)
    → SOP (curated workflow)
```

## 模式版本控制策略

KnowledgePulse 对其模式使用语义化版本控制，对每个版本级别有明确的规则：

### 补丁版本（例如 1.0.0 到 1.0.1）

- 字段描述的错误修复和澄清。
- `@context` URI **不变**。
- 不添加新字段，不移除字段。
- 所有现有消费者无需修改即可继续工作。

### 次版本（例如 1.0.0 到 1.1.0）

- **仅做加法** -- 可以引入新的可选字段。
- `@context` URI **不变**（仍为 `https://knowledgepulse.dev/schema/v1`）。
- 不移除现有字段，也不更改其语义。
- 现有消费者可继续工作；它们只是忽略新字段。

### 主版本（例如 v1 到 v2）

- 破坏性变更 -- 字段可能被移除、重命名或更改语义。
- **新的 `@context` URI**（例如 `https://knowledgepulse.dev/schema/v2`）。
- 需要显式迁移。

## 向后兼容性规则

两条规则管控跨版本互操作性：

1. **v1 消费者必须能解析任何 v1.x 文档**，忽略未知字段。基于 v1.0 编写的消费者必须能接受 v1.3 文档而不报错 -- 它只需丢弃不识别的字段。

2. **v2 消费者必须接受 v1 文档**并自动迁移。当 v2 消费者遇到 v1 文档时，它会应用注册的迁移函数来就地升级文档。

## 版本协商

### REST API

客户端使用 `KP-Schema-Version` 请求头声明其首选的模式版本：

```http
GET /v1/knowledge/kp:trace:abc123
KP-Schema-Version: 1.2.0
```

服务器以请求的版本（或最接近的兼容版本）返回知识单元，并回传已解析的版本：

```http
HTTP/1.1 200 OK
KP-Schema-Version: 1.2.0
Content-Type: application/ld+json
```

如果服务器无法满足请求的版本，则返回 `406 Not Acceptable`。

### MCP 工具

MCP 工具接受 `schema_version` 参数：

```json
{
  "tool": "knowledgepulse_retrieve",
  "arguments": {
    "id": "kp:trace:abc123",
    "schema_version": "1.2.0"
  }
}
```

返回的知识单元符合请求的模式版本。

## 迁移系统

迁移函数位于 `packages/sdk/src/migrations/`，且**可链式调用**。每个迁移函数将文档从版本 N 转换到版本 N+1：

```
v1 → v2 → v3
```

要将 v1 文档迁移到 v3，SDK 会自动链接 v1-to-v2 和 v2-to-v3 的迁移。这种设计意味着每个迁移只需要处理单个版本步进，保持逻辑简单且可测试。

```typescript
import { migrate } from "@knowledgepulse/sdk";

// Migrate a v1 document to the latest version
const upgraded = migrate(v1Document, { targetVersion: "3.0.0" });
```

迁移函数是纯函数 -- 它们接收一个文档并返回一个新文档，不产生副作用。

## 弃用策略

当新的主版本发布时：

1. **旧主版本在新版本发布日期后继续支持 12 个月**。
2. 在弃用窗口期内，旧版本的响应会包含 `KP-Deprecated: true` 头，以提示消费者应进行升级。
3. 12 个月窗口期过后，服务器可能停止提供旧版本服务并返回 `410 Gone`。

```http
HTTP/1.1 200 OK
KP-Schema-Version: 1.5.0
KP-Deprecated: true
Content-Type: application/ld+json
```

客户端应监控 `KP-Deprecated` 头并相应地规划迁移。
