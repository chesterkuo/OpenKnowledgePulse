---
sidebar_position: 1
title: MCP 服务器设置
description: 如何安装、配置和运行 KnowledgePulse MCP 服务器的独立模式或代理模式。
---

# MCP 服务器设置

KnowledgePulse MCP 服务器（`@knowledgepulse/mcp` v1.1.0）将 KnowledgePulse 协议暴露为一组 [Model Context Protocol](https://modelcontextprotocol.io/) 工具，任何兼容 MCP 的 AI 客户端均可调用。

## 传输协议

服务器使用 **Streamable HTTP** 传输协议：

| 端点 | 方法 | 描述 |
|---|---|---|
| `/mcp` | `POST` | MCP 工具调用（Streamable HTTP） |
| `/health` | `GET` | 健康检查 |

成功的健康检查返回：

```json
{
  "status": "ok",
  "name": "knowledgepulse-mcp",
  "version": "1.1.0"
}
```

## 双模式运行

MCP 服务器可以根据是否设置了 `KP_REGISTRY_URL` 环境变量在两种模式下运行。

### 独立模式（默认）

在独立模式下，服务器使用自己的内存存储。这是最简单的启动方式，非常适合本地开发和测试。

```bash
bun run packages/mcp-server/src/index.ts
```

服务器默认在端口 3001 上启动。无需外部服务。

### 代理模式

在代理模式下，服务器将所有请求转发到正在运行的 KnowledgePulse Registry 实例。设置 `KP_REGISTRY_URL` 以启用代理模式，并可选择提供 `KP_API_KEY` 用于需要认证的端点。

```bash
KP_REGISTRY_URL=http://localhost:8080 KP_API_KEY=kp_abc123 \
  bun run packages/mcp-server/src/index.ts
```

在此模式下，MCP 服务器充当一个轻量桥接层：它将 MCP 工具调用转换为 Registry REST API 请求，并将结果返回给客户端。

## 环境变量

| 变量 | 描述 | 默认值 |
|---|---|---|
| `KP_MCP_PORT` | MCP 服务器监听的端口 | `3001` |
| `KP_REGISTRY_URL` | 代理模式下的 Registry URL。未设置时服务器以独立模式运行。 | _（未设置）_ |
| `KP_API_KEY` | 代理模式下发送到 Registry 的认证请求所使用的 API 密钥。 | _（未设置）_ |

## 与 AI 框架集成

MCP 服务器通过 Streamable HTTP 传输协议与任何兼容 MCP 的客户端配合使用。示例包括：

- **Claude Desktop** -- 将服务器 URL 添加到您的 MCP 配置中。
- **LangGraph** -- 使用 MCP 工具适配器连接到服务器。
- **CrewAI** -- 将服务器注册为 MCP 工具提供者。
- **AutoGen** -- 通过 MCP 客户端 SDK 将代理连接到服务器。

将您的客户端指向 `http://localhost:3001/mcp`（或您配置的主机和端口），即可使用六个 KnowledgePulse 工具供您的代理调用。完整参考请参见 [MCP 工具](./tools.md)。
