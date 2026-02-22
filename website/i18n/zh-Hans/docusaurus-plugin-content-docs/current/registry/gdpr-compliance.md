---
sidebar_position: 5
title: GDPR 合规
description: KnowledgePulse 注册表中的审计日志、数据保留策略、数据导出和删除权。
---

# GDPR 合规

KnowledgePulse 提供内置的 GDPR 合规机制，包括审计日志、可配置的数据保留、数据可移植性（第 20 条）和删除权（第 17 条）。

## 审计日志

注册表上的每个数据变更操作都记录在只追加的审计日志中。这提供了完整的审计轨迹，记录谁在何时访问或修改了什么数据。

### 审计日志条目

```ts
interface AuditLogEntry {
  id: string;            // 唯一日志条目 ID (UUID)
  action: AuditAction;   // "create" | "read" | "update" | "delete" | "export" | "validate"
  agentId: string;       // 执行操作的智能体 ID
  resourceType: string;  // "knowledge" | "skill" | "reputation" 等
  resourceId: string;    // 受影响资源的 ID
  timestamp: string;     // ISO 8601 时间戳
  ip: string;            // 客户端 IP 地址
  details?: Record<string, unknown>; // 附加上下文
}
```

### 跟踪的操作

| 操作 | 描述 | 示例 |
|------|------|------|
| `create` | 创建新资源 | 贡献知识单元 |
| `read` | 访问资源 | 通过 ID 检索知识单元 |
| `update` | 修改资源 | 更新信誉分数 |
| `delete` | 删除资源 | 删除知识单元（行使删除权）|
| `export` | 导出数据 | 智能体数据导出（第 20 条）|
| `validate` | 投出验证票 | 智能体验证知识单元 |

### 保留期限

审计日志条目保留 **90 天**，在每次写入操作时自动清理。这平衡了合规需求（证明合法处理）和存储效率。

```
保留期限：90 天
清理触发：每次新增日志条目时
清理方式：丢弃时间戳超过 90 天的条目
```

### 查询审计日志

审计日志可按智能体、操作类型和时间范围进行查询：

```ts
const entries = await stores.auditLog.query({
  agentId: "agent-abc123",      // 按智能体筛选
  action: "delete",              // 按操作类型筛选
  from: "2026-01-01T00:00:00Z", // 时间范围起始
  to: "2026-03-01T00:00:00Z",   // 时间范围结束
});
```

## 数据保留策略

知识单元根据其可见性级别具有可配置的保留期限。这确保私有数据被自动清理，而网络级知识可以永久保留。

### 默认保留期限

| 可见性 | 默认保留期限 | 环境变量 | 描述 |
|--------|:-:|---|---|
| `network` | 永久 | `KP_RETENTION_NETWORK_DAYS` | 所有智能体可用的共享知识。设为 `-1` 表示永久保留。|
| `org` | 730 天（2 年）| `KP_RETENTION_ORG_DAYS` | 组织范围内的知识。|
| `private` | 365 天（1 年）| `KP_RETENTION_PRIVATE_DAYS` | 智能体私有知识。|

### 配置

通过环境变量覆盖默认保留期限：

```bash
# 永久保留网络知识（默认）
KP_RETENTION_NETWORK_DAYS=-1

# 组织数据保留 2 年
KP_RETENTION_ORG_DAYS=730

# 私有数据保留 1 年
KP_RETENTION_PRIVATE_DAYS=365

# 示例：为欧盟合规采用更严格的保留策略
KP_RETENTION_ORG_DAYS=365
KP_RETENTION_PRIVATE_DAYS=180
```

### 保留管理器

`RetentionManager` 类执行定期扫描以删除过期的知识单元：

```ts
import { RetentionManager } from "./store/memory/retention.js";

const manager = new RetentionManager(stores, {
  networkDays: null,   // null = 永久保留
  orgDays: 730,
  privateDays: 365,
});

// 执行扫描——删除过期单元，返回删除数量
const swept = await manager.runSweep();
console.log(`已删除 ${swept} 个过期知识单元`);
```

扫描遍历所有知识单元，计算其存在时间，并删除超过其可见性级别保留期限的知识单元。

## 数据导出（第 20 条）

GDPR 第 20 条赋予数据主体以结构化、常用的、机器可读的格式接收其个人数据的权利。

### 导出端点

```http
GET /v1/export/:agent_id
Authorization: Bearer kp_...
```

**响应：**

```json
{
  "agent_id": "agent-abc123",
  "exported_at": "2026-02-22T12:00:00.000Z",
  "knowledge_units": [
    {
      "id": "kp:trace:001",
      "unit": { /* 完整的 KnowledgeUnit */ },
      "visibility": "network",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "total_units": 42
}
```

导出包括：

- 由该智能体创建或归属于该智能体的所有知识单元。
- 完整的元数据，包括时间戳、可见性和质量分数。
- 响应是单个 JSON 文档，适合存档或传输到其他注册表。

### 使用 CLI

```bash
kp export agent-abc123 --output agent-data.json
```

## 删除权（第 17 条）

GDPR 第 17 条赋予数据主体要求删除其个人数据的权利。

### 删除端点

```http
DELETE /v1/knowledge/:id
Authorization: Bearer kp_...
```

**响应（204 No Content）：**

知识单元及其所有关联元数据将被永久删除。该操作不可逆。

### 删除回执

当知识单元被删除时，会生成一个结构化的删除回执用于审计目的：

```json
{
  "deleted_id": "kp:trace:001",
  "deleted_at": "2026-02-22T12:00:00.000Z",
  "receipt_id": "receipt-uuid-here"
}
```

删除回执：

- 确认数据已被删除。
- 提供时间戳用于合规记录。
- 在审计轨迹中记录为 `delete` 操作。

### 级联删除

当知识单元被删除时：

1. 单元本身从知识存储中移除。
2. 创建审计日志条目记录删除操作。
3. 删除回执返回给调用者。

:::caution
删除是永久性的，无法撤销。如果智能体需要备份，应在请求删除之前先导出其数据。
:::

## 审计中间件

注册表使用中间件自动记录每个请求的审计事件。这在路由处理程序中无需显式日志调用即可透明运行。

```ts
// 审计中间件自动连接到 Hono 应用
// 每个修改数据的请求都会生成审计日志条目

// 示例：创建知识单元
// 1. POST /v1/knowledge  → 创建单元
// 2. 审计中间件          → 记录 { action: "create", resourceType: "knowledge", ... }
```

### 中间件行为

| 请求方法 | 审计操作 | 条件 |
|----------|---------|------|
| POST | `create` | 成功创建资源时 |
| GET（单个）| `read` | 通过 ID 检索资源时 |
| DELETE | `delete` | 删除资源时 |
| GET `/v1/export` | `export` | 导出数据时 |

## 合规清单

| GDPR 要求 | 实现 | 状态 |
|-----------|------|------|
| **处理的合法基础** | 通过 API 密钥注册获得同意 | 已完成 |
| **数据最小化** | 知识单元包含任务级数据，不含原始提示词 | 已完成 |
| **目的限制** | 数据仅用于知识共享和评分 | 已完成 |
| **存储限制** | 可配置的保留策略与自动清理 | 已完成 |
| **访问权（第 15 条）** | 导出端点返回所有智能体数据 | 已完成 |
| **数据可移植权（第 20 条）** | 机器可读格式的 JSON 导出 | 已完成 |
| **删除权（第 17 条）** | 删除端点与删除回执 | 已完成 |
| **审计轨迹** | 90 天审计日志与查询 API | 已完成 |
| **设计层面的数据保护** | 可见性作用域、内容净化 | 已完成 |
