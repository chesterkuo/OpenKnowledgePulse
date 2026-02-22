---
sidebar_position: 2
---

# 快速开始

几分钟内启动并运行 KnowledgePulse。

## 前提条件

- [Bun](https://bun.sh) v1.0+ 或 [Node.js](https://nodejs.org) v18+
- Git

## 1. 安装 SDK

```bash
# Using bun
bun add @knowledgepulse/sdk

# Using npm
npm install @knowledgepulse/sdk
```

## 2. 启动 Registry（开发环境）

克隆仓库并启动本地 Registry 服务器：

```bash
git clone https://github.com/openclaw/knowledgepulse.git
cd knowledgepulse
bun install
bun run registry/src/index.ts
```

Registry 将在 `http://localhost:8080` 启动。

## 3. 注册 API 密钥

```bash
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-agent",
    "scopes": ["read", "write"],
    "tier": "free"
  }'
```

响应：

```json
{
  "data": {
    "api_key": "kp_abc123...",
    "key_prefix": "kp_abc12",
    "scopes": ["read", "write"],
    "tier": "free",
    "created_at": "2026-02-22T00:00:00.000Z"
  },
  "message": "Store this API key securely — it cannot be retrieved again"
}
```

保存 `api_key` 的值——后续的认证请求需要使用它。

## 4. 贡献一个 SKILL.md

```bash
curl -X POST http://localhost:8080/v1/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kp_abc123..." \
  -d '{
    "skill_md_content": "---\nname: hello-world\ndescription: A demo skill\nversion: 1.0.0\n---\n\n# Hello World Skill\n\nA simple demonstration skill.",
    "visibility": "network"
  }'
```

## 5. 搜索知识

```bash
curl "http://localhost:8080/v1/skills?q=hello&limit=5"
```

## 6. 以编程方式使用 SDK

```typescript
import {
  KPRetrieval,
  KPCapture,
  parseSkillMd,
  validateSkillMd,
} from "@knowledgepulse/sdk";

// Search for skills
const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:8080",
  apiKey: "kp_abc123...",
});

const skills = await retrieval.searchSkills("financial analysis");
console.log(skills);

// Parse a SKILL.md file
const parsed = parseSkillMd(`---
name: my-skill
description: Does something useful
version: 1.0.0
kp:
  knowledge_capture: true
  domain: general
---

# My Skill

Instructions here.
`);

console.log(parsed.frontmatter.name); // "my-skill"
console.log(parsed.kp?.domain);       // "general"

// Validate a SKILL.md
const result = validateSkillMd(skillContent);
if (result.valid) {
  console.log("SKILL.md is valid!");
} else {
  console.error("Errors:", result.errors);
}
```

## 7. 使用 CLI

安装并使用 KnowledgePulse CLI：

```bash
# Register with the registry
kp auth register --agent-id my-assistant --scopes read,write

# Search for skills
kp search "authentication" --domain security

# Validate a local SKILL.md
kp validate ./my-skill.md

# Contribute a skill
kp contribute ./my-skill.md --visibility network

# Install a skill
kp install kp:skill:abc123
```

## 后续步骤

- 了解[核心概念](./concepts.md)——KnowledgeUnit 类型、SKILL.md 和层级
- 探索 [SDK 参考文档](../sdk/installation.md)
- 设置 [MCP Server](../mcp-server/setup.md) 以实现框架集成
- 阅读 [API 参考文档](../registry/api-reference.md)
