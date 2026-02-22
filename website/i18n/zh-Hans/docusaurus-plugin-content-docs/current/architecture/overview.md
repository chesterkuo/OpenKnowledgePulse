---
sidebar_position: 1
title: 架构概述
description: KnowledgePulse 的双层架构、协议栈和 monorepo 结构。
---

# 架构概述

KnowledgePulse 是一个基于双层架构构建的 AI 知识共享协议。**协议层**定义了知识的结构化、发现和治理方式，而**基础设施层**提供了实现协议的具体运行时组件。

## 协议栈

协议分为五个层次，每一层都建立在下一层的基础之上：

```
┌─────────────────────────────────────────┐
│            5. Governance                │
│   Licensing, attribution, audit trail   │
├─────────────────────────────────────────┤
│            4. Privacy                   │
│   Scoping, redaction, GDPR compliance   │
├─────────────────────────────────────────┤
│            3. Discovery                 │
│   Search, scoring, vector retrieval     │
├─────────────────────────────────────────┤
│            2. KnowledgeUnit             │
│   JSON-LD schema, types, versioning     │
├─────────────────────────────────────────┤
│            1. SKILL.md                  │
│   Agent capability declaration format   │
└─────────────────────────────────────────┘
```

**第 1 层 -- SKILL.md** 定义了一种标准文件格式，供智能体声明其能力、输入、输出和约束条件。它是其他层引用的基础契约。

**第 2 层 -- KnowledgeUnit** 规定了三种知识类型（traces、patterns 和 SOPs）的 JSON-LD 模式以及管控模式演进的版本控制规则。

**第 3 层 -- Discovery** 涵盖知识单元的索引、搜索、相关性评分和检索方式，包括基于向量的相似性搜索。

**第 4 层 -- Privacy** 处理作用域规则、字段级脱敏以及 GDPR 要求的操作（如数据导出和被遗忘权）。

**第 5 层 -- Governance** 涉及许可证管理、归因链和审计跟踪，追踪知识在智能体之间的流动方式。

## 组件概述

四个运行时组件实现了协议栈：

| 组件 | 包 | 职责 |
|------|-----|------|
| **SDK** | `@knowledgepulse/sdk` | 核心库 -- 类型、采集、检索、评分、SKILL.md 解析、迁移 |
| **Registry** | `registry/` | Hono REST API 服务器 -- 存储知识单元，处理认证和速率限制 |
| **MCP Server** | `@knowledgepulse/mcp` | Model Context Protocol 服务器 -- 暴露 6 个 MCP 工具，双模式注册中心桥接 |
| **CLI** | `@knowledgepulse/cli` | 命令行界面 -- 搜索、安装、验证、贡献、认证、安全 |

### SDK

SDK（`packages/sdk`）是所有其他组件依赖的核心库。它提供从 Zod 模式生成的 TypeScript 类型、用于采集和检索知识单元的函数、相关性评分、SKILL.md 解析和净化，以及可链式调用的模式版本升级迁移函数。

### Registry

Registry（`registry/`）是一个基于 Hono 的 REST API 服务器，作为知识单元的中央存储。它通过 Bearer 令牌处理认证、基于层级的速率限制，并暴露知识单元的 CRUD 端点。

### MCP Server

MCP Server（`packages/mcp-server`）通过 Model Context Protocol 暴露 KnowledgePulse 的功能，使其对任何兼容 MCP 的 AI 客户端可用。它以**双模式**运行：

- **独立模式** -- 使用自己的内存存储运行。
- **代理模式** -- 通过 `KP_REGISTRY_URL` 环境变量桥接到远程注册中心。

### CLI

CLI（`packages/cli`）为开发者和智能体提供命令行界面，用于与协议交互 -- 搜索知识、安装 SKILL.md 文件、验证模式、贡献知识单元以及管理认证。

## Monorepo 结构

```
knowledgepulse/
├── packages/
│   ├── sdk/            # @knowledgepulse/sdk — types, capture, retrieve, scoring, migrations
│   ├── mcp-server/     # @knowledgepulse/mcp — 6 MCP tools, dual-mode registry bridge
│   ├── cli/            # @knowledgepulse/cli — search, install, validate, contribute, auth
│   └── sop-studio/     # Placeholder (Phase 3)
├── registry/           # Hono REST API server (in-memory stores, auth, rate limiting)
├── specs/              # codegen.ts, validate-consistency.ts, skill-md-extension.md
├── examples/           # basic-sdk-usage, mcp-client-example, langraph-integration
└── website/            # Docusaurus documentation site
```

## 存储模型

第 1 阶段使用**内存 `Map<>` 存储**，底层采用异步 `Promise<T>` 接口。这是有意为之的设计：异步接口边界意味着存储后端可以切换到持久化数据库（PostgreSQL、SQLite 等）而无需更改任何消费者代码。向量缓存使用暴力线性扫描而非 HNSW，同样可通过其接口进行替换。

## 技术栈

| 技术 | 用途 |
|------|------|
| **Bun** | JavaScript/TypeScript 运行时和包管理器 |
| **Hono** | 用于 Registry 和 MCP Server 的轻量级 HTTP 框架 |
| **Zod v3** | 模式定义和验证（配合 `zod-to-json-schema` 进行代码生成） |
| **tsup** | SDK 构建工具（ESM + CJS + TypeScript 声明） |
| **Biome** | 代码检查和格式化工具 |
| **@modelcontextprotocol/sdk** | MCP 协议实现 |
| **bun test** | 测试运行器（15 个文件中共 319 个测试） |
