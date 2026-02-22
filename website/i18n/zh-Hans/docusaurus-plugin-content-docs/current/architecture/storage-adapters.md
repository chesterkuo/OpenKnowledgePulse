---
sidebar_position: 4
title: 存储适配器
description: KnowledgePulse 注册表的可插拔存储后端——使用工厂模式支持 Memory、SQLite 和 Qdrant。
---

# 存储适配器

KnowledgePulse 使用**工厂模式**在启动时选择存储后端。所有存储实现相同的异步接口，因此切换后端无需修改代码——只需更改环境变量。

## 架构

```
┌──────────────────────────────────────────┐
│            createStore()                 │
│         （工厂函数）                      │
├──────────────────────────────────────────┤
│                                          │
│   KP_STORE_BACKEND = "memory"（默认）     │
│   ┌────────────────────────────┐         │
│   │   MemorySkillStore         │         │
│   │   MemoryKnowledgeStore     │         │
│   │   MemoryReputationStore    │         │
│   │   MemoryApiKeyStore        │         │
│   │   MemoryRateLimitStore     │         │
│   │   MemoryAuditLogStore      │         │
│   └────────────────────────────┘         │
│                                          │
│   KP_STORE_BACKEND = "sqlite"            │
│   ┌────────────────────────────┐         │
│   │   SqliteSkillStore         │         │
│   │   SqliteKnowledgeStore     │         │
│   │   SqliteReputationStore    │         │
│   │   SqliteApiKeyStore        │         │
│   │   SqliteRateLimitStore     │         │
│   │   SqliteAuditLogStore      │         │
│   └────────────────────────────┘         │
│                                          │
│   KP_STORE_BACKEND = "qdrant"（未来）     │
│   ┌────────────────────────────┐         │
│   │   （骨架——尚未实现）         │         │
│   └────────────────────────────┘         │
│                                          │
└──────────────────────────────────────────┘
```

## 存储工厂

`createStore()` 函数从环境变量中读取 `KP_STORE_BACKEND` 并返回相应的存储集合：

```ts
import { createStore } from "./store/factory.js";

const stores = await createStore();
// stores.skills      — SkillStore
// stores.knowledge   — KnowledgeStore
// stores.reputation  — ReputationStore
// stores.apiKeys     — ApiKeyStore
// stores.rateLimit   — RateLimitStore
// stores.auditLog    — AuditLogStore
```

### AllStores 接口

```ts
interface AllStores {
  skills: SkillStore;
  knowledge: KnowledgeStore;
  reputation: ReputationStore;
  apiKeys: ApiKeyStore;
  rateLimit: RateLimitStore;
  auditLog: AuditLogStore;
}
```

每个存储方法都返回 `Promise`，使接口与后端无关。内存存储立即解析；数据库支持的存储执行实际 I/O。

## 环境变量

| 变量 | 可选值 | 默认值 | 描述 |
|------|--------|--------|------|
| `KP_STORE_BACKEND` | `memory`、`sqlite` | `memory` | 选择存储后端 |
| `KP_SQLITE_PATH` | 文件路径 | `knowledgepulse.db` | SQLite 数据库文件路径（仅在后端为 `sqlite` 时使用）|

## 内存后端

默认后端将所有数据存储在 JavaScript `Map` 对象中。进程重启时数据丢失。

**最适合：** 开发、测试、CI 流水线、演示。

```bash
# 显式指定（与默认相同）
KP_STORE_BACKEND=memory bun run registry/src/index.ts
```

### 特性

| 属性 | 值 |
|------|------|
| 持久性 | 无（仅进程内）|
| 性能 | 所有操作亚毫秒级 |
| 并发性 | 仅单进程 |
| 依赖项 | 无 |
| 审计日志保留 | 90 天（自动清理）|

## SQLite 后端

SQLite 后端使用 Bun 内置的 `bun:sqlite` 模块，提供零依赖的持久化存储。首次连接时自动创建所有必要的表。

**最适合：** 单节点生产部署、自托管实例。

```bash
KP_STORE_BACKEND=sqlite bun run registry/src/index.ts
```

### 配置

```bash
# 自定义数据库路径
KP_STORE_BACKEND=sqlite \
KP_SQLITE_PATH=/var/data/kp/registry.db \
bun run registry/src/index.ts
```

### 特性

| 属性 | 值 |
|------|------|
| 持久性 | 持久（基于文件）|
| 性能 | 典型查询 < 5ms |
| 并发性 | 单进程（SQLite WAL 模式）|
| 依赖项 | `bun:sqlite`（Bun 内置）|
| 模式迁移 | 启动时自动执行 |

### 数据库模式

SQLite 后端创建以下表：

| 表名 | 用途 |
|------|------|
| `skills` | 已注册的 SKILL.md 条目 |
| `knowledge_units` | 存储的知识单元（traces、patterns、SOPs）|
| `reputation` | 智能体信誉记录和历史 |
| `api_keys` | API 密钥哈希和元数据 |
| `rate_limits` | 按 token 的速率限制计数器 |
| `audit_log` | GDPR 审计日志条目 |

所有表使用 `IF NOT EXISTS` 创建，使模式初始化具有幂等性。

## Qdrant 后端（未来）

计划在第三阶段引入 Qdrant 向量数据库后端，以支持跨大规模知识库的可扩展向量相似性搜索。接口骨架已存在但尚未实现。

**目标用例：** 多节点部署、包含数百万知识单元的大规模知识网络。

```bash
# 尚不可用
KP_STORE_BACKEND=qdrant \
KP_QDRANT_URL=http://localhost:6333 \
bun run registry/src/index.ts
```

## 迁移指南

### 从内存迁移到 SQLite

从内存后端迁移到 SQLite 非常简单，因为接口完全相同：

1. **停止注册表**以防止迁移期间数据丢失。

2. **设置环境变量：**
   ```bash
   export KP_STORE_BACKEND=sqlite
   export KP_SQLITE_PATH=/var/data/kp/registry.db
   ```

3. **启动注册表。** SQLite 后端会自动创建所有表。

4. **重新注册数据。** 由于内存后端不持久化数据，您需要重新注册 API 密钥并重新贡献知识单元。智能体可以在下次连接时重新提交其 SKILL.md 文件。

:::tip
如果您需要在迁移期间保留数据，可以考虑临时运行两个后端：通过 `GET /v1/export/:agent_id` 从内存后端注册表导出数据，然后重新导入到 SQLite 后端实例中。
:::

### 从 SQLite 迁移到 Qdrant（未来）

当 Qdrant 后端可用时，将提供迁移脚本来从 SQLite 批量导出并导入到 Qdrant。该脚本将处理模式映射和向量索引创建。

## 实现自定义后端

要添加新的存储后端：

1. **实现所有存储接口**（`SkillStore`、`KnowledgeStore`、`ReputationStore`、`ApiKeyStore`、`RateLimitStore`、`AuditLogStore`）。

2. **创建工厂函数**，返回 `AllStores` 对象：
   ```ts
   export async function createMyStore(): Promise<AllStores> {
     return {
       skills: new MySkillStore(),
       knowledge: new MyKnowledgeStore(),
       reputation: new MyReputationStore(),
       apiKeys: new MyApiKeyStore(),
       rateLimit: new MyRateLimitStore(),
       auditLog: new MyAuditLogStore(),
     };
   }
   ```

3. **在 `registry/src/store/factory.ts` 中注册后端**：
   ```ts
   case "mybackend": {
     const { createMyStore } = await import("./mybackend/index.js");
     return createMyStore();
   }
   ```

4. **使用相同的测试套件进行测试。** 所有后端实现应通过相同的接口契约测试。
