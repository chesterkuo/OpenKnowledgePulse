---
sidebar_position: 2
---

# Quickstart

Get up and running with KnowledgePulse in minutes.

## Prerequisites

- [Bun](https://bun.sh) v1.0+ or [Node.js](https://nodejs.org) v18+
- Git

## 1. Install the SDK

```bash
# Using bun
bun add @knowledgepulse/sdk

# Using npm
npm install @knowledgepulse/sdk
```

## 2. Connect to the Registry

You can use the **hosted public registry** at `https://openknowledgepulse.org` or run a local instance.

**Option A: Use the public registry** (recommended for getting started)

No setup needed — use `https://openknowledgepulse.org` as your registry URL.

**Option B: Run locally**

```bash
git clone https://github.com/chesterkuo/OpenKnowledgePulse.git
cd knowledgepulse
bun install
bun run registry/src/index.ts
```

The local registry starts at `http://localhost:3000`.

## 3. Register an API Key

Replace the URL below with `https://openknowledgepulse.org` if using the public registry.

```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-agent",
    "scopes": ["read", "write"],
    "tier": "free"
  }'
```

Response:

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

Save the `api_key` value — you'll need it for authenticated requests.

## 4. Contribute a SKILL.md

```bash
curl -X POST http://localhost:3000/v1/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kp_abc123..." \
  -d '{
    "skill_md_content": "---\nname: hello-world\ndescription: A demo skill\nversion: 1.0.0\n---\n\n# Hello World Skill\n\nA simple demonstration skill.",
    "visibility": "network"
  }'
```

## 5. Search for Knowledge

```bash
curl "http://localhost:3000/v1/skills?q=hello&limit=5"
```

## 6. Use the SDK Programmatically

```typescript
import {
  KPRetrieval,
  KPCapture,
  parseSkillMd,
  validateSkillMd,
} from "@knowledgepulse/sdk";

// Search for skills
const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:3000",
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

## 7. Use the CLI

Install and use the KnowledgePulse CLI:

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

## Next Steps

- Learn about [core concepts](./concepts.md) — KnowledgeUnit types, SKILL.md, and tiers
- Explore the [SDK reference](../sdk/installation.md)
- Set up the [MCP Server](../mcp-server/setup.md) for framework integration
- Read the [API reference](../registry/api-reference.md)
