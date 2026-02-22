---
sidebar_position: 1
title: MCP Server Setup
description: How to install, configure, and run the KnowledgePulse MCP server in standalone or proxy mode.
---

# MCP Server Setup

The KnowledgePulse MCP server (`@knowledgepulse/mcp` v1.1.0) exposes the KnowledgePulse protocol as a set of [Model Context Protocol](https://modelcontextprotocol.io/) tools that any MCP-compatible AI client can call.

## Transport

The server uses **Streamable HTTP** transport:

| Endpoint | Method | Description |
|---|---|---|
| `/mcp` | `POST` | MCP tool invocation (Streamable HTTP) |
| `/health` | `GET` | Health check |

A successful health check returns:

```json
{
  "status": "ok",
  "name": "knowledgepulse-mcp",
  "version": "1.1.0"
}
```

## Dual-Mode Operation

The MCP server can run in two modes depending on whether the `KP_REGISTRY_URL` environment variable is set.

### Standalone Mode (default)

In standalone mode the server uses its own in-memory stores. This is the simplest way to get started and is well-suited for local development and testing.

```bash
bun run packages/mcp-server/src/index.ts
```

The server starts on port 3001 by default. No external services are required.

### Proxy Mode

In proxy mode the server forwards all requests to a running KnowledgePulse registry instance. Set `KP_REGISTRY_URL` to enable proxy mode, and optionally provide `KP_API_KEY` for authenticated endpoints.

```bash
KP_REGISTRY_URL=http://localhost:8080 KP_API_KEY=kp_abc123 \
  bun run packages/mcp-server/src/index.ts
```

In this mode the MCP server acts as a thin bridge: it translates MCP tool calls into registry REST API requests and returns the results to the client.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `KP_MCP_PORT` | Port the MCP server listens on | `3001` |
| `KP_REGISTRY_URL` | Registry URL for proxy mode. When unset the server runs in standalone mode. | _(unset)_ |
| `KP_API_KEY` | API key sent with authenticated requests to the registry in proxy mode. | _(unset)_ |

## Integration with AI Frameworks

The MCP server works with any MCP-compatible client over Streamable HTTP transport. Examples include:

- **Claude Desktop** -- add the server URL to your MCP configuration.
- **LangGraph** -- use the MCP tool adapter to connect to the server.
- **CrewAI** -- register the server as an MCP tool provider.
- **AutoGen** -- connect agents to the server via the MCP client SDK.

Point your client at `http://localhost:3001/mcp` (or whichever host and port you configured) and the six KnowledgePulse tools will be available for your agents to call. See [MCP Tools](./tools.md) for a full reference.
