---
sidebar_position: 1
title: 开发环境设置
description: 如何为 KnowledgePulse 单仓库搭建本地开发环境。
---

# 开发环境设置

本指南将引导您为 KnowledgePulse 单仓库搭建本地开发环境。

## 前置条件

- **Bun** v1.0 或更高版本 -- [安装说明](https://bun.sh/docs/installation)
- **Git**

## 克隆与安装

```bash
git clone https://github.com/nicobailon/knowledgepulse.git
cd knowledgepulse
bun install
```

`bun install` 会解析单仓库中所有工作空间的依赖项。

## 单仓库结构

```
knowledgepulse/
  packages/
    sdk/           # @knowledgepulse/sdk -- 类型、捕获、检索、评分、skill-md、迁移
    mcp-server/    # @knowledgepulse/mcp -- 6 个 MCP 工具、双模式 Registry 桥接
    cli/           # @knowledgepulse/cli -- 搜索、安装、验证、贡献、认证、安全
    sop-studio/    # 占位符（第 3 阶段）
  registry/        # Hono REST API 服务器（内存存储、认证、速率限制）
  specs/           # codegen.ts、validate-consistency.ts、skill-md-extension.md
  examples/        # basic-sdk-usage、mcp-client-example、langraph-integration
```

## 常见任务

### 构建 SDK

SDK 使用 **tsup** 构建，输出 ESM、CJS 和 TypeScript 声明文件。

```bash
bun run build
```

### 生成 JSON Schema

从 SDK 中的 Zod 类型重新生成 `specs/knowledge-unit-schema.json`。

```bash
bun run codegen
```

### 代码检查

项目使用 **Biome** 进行格式化和代码检查。

```bash
bun run lint
```

### 运行测试

所有测试使用 `bun:test` 编写，以 `*.test.ts` 文件形式与源代码并置。完整测试套件包含 15 个文件中的 319 个测试。

```bash
bun test --recursive
```

### 启动 Registry

Registry 是一个使用内存存储的 Hono HTTP 服务器，默认监听端口 3000。

```bash
bun run registry/src/index.ts
```

### 启动 MCP 服务器

MCP 服务器默认监听端口 3001。有关独立模式与代理模式的详细信息，请参见 [MCP 服务器设置](../mcp-server/setup.md)指南。

```bash
bun run packages/mcp-server/src/index.ts
```

## 快速参考

| 任务 | 命令 |
|---|---|
| 安装依赖 | `bun install` |
| 构建 SDK | `bun run build` |
| 生成 JSON schema | `bun run codegen` |
| 代码检查 | `bun run lint` |
| 运行全部测试 | `bun test --recursive` |
| 启动 Registry（端口 3000） | `bun run registry/src/index.ts` |
| 启动 MCP 服务器（端口 3001） | `bun run packages/mcp-server/src/index.ts` |
