---
sidebar_position: 2
title: MCP Tools Reference
description: Complete reference for all seven MCP tools exposed by the KnowledgePulse MCP server.
---

# MCP Tools Reference

The KnowledgePulse MCP server exposes seven tools. This page documents every parameter, its type and constraints, and the shape of each response.

## kp_search_skill

Search the SKILL.md registry for reusable agent skills.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | `string` | Yes | -- | Free-text search query. |
| `domain` | `string` | No | -- | Filter results to a specific domain. |
| `tags` | `string[]` | No | -- | Filter results by one or more tags. |
| `min_quality` | `number` (0--1) | No | `0.7` | Minimum quality score threshold. |
| `limit` | `number` (1--20) | No | `5` | Maximum number of results to return. |

### Response

Returns a JSON array of matching skills. Each element contains the skill metadata, content, and quality score.

```json
[
  {
    "id": "skill-abc123",
    "name": "Code Review Checklist",
    "domain": "software-engineering",
    "tags": ["code-review", "best-practices"],
    "quality_score": 0.92,
    "content": "..."
  }
]
```

---

## kp_search_knowledge

Search the KnowledgeUnit store for reasoning traces, tool-call patterns, and expert SOPs.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | `string` | Yes | -- | Free-text search query. |
| `types` | `enum[]` | No | -- | Filter by unit type. Allowed values: `ReasoningTrace`, `ToolCallPattern`, `ExpertSOP`. |
| `domain` | `string` | No | -- | Filter results to a specific domain. |
| `min_quality` | `number` (0--1) | No | `0.75` | Minimum quality score threshold. |
| `limit` | `number` (1--10) | No | `5` | Maximum number of results to return. |
| `schema_version` | `string` | No | -- | Filter by schema version (e.g. `"1.0"`). |

### Response

Returns a JSON array of matching knowledge units.

```json
[
  {
    "id": "ku-xyz789",
    "type": "ReasoningTrace",
    "domain": "debugging",
    "quality_score": 0.88,
    "content": { "..." : "..." }
  }
]
```

---

## kp_contribute_skill

Contribute a new SKILL.md document to the registry.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `skill_md_content` | `string` | Yes | -- | Full Markdown content of the SKILL.md file. |
| `visibility` | `enum` | No | `"network"` | Access level. Allowed values: `private`, `org`, `network`. |

### Response

Returns the ID of the newly created skill.

```json
{
  "id": "skill-abc123"
}
```

---

## kp_contribute_knowledge

Contribute a new KnowledgeUnit to the registry.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `unit` | `object` | Yes | -- | A complete KnowledgeUnit object conforming to the schema. |
| `visibility` | `enum` | Yes | -- | Access level. Allowed values: `private`, `org`, `network`. |

### Response

Returns the ID and the computed quality score for the contributed unit.

```json
{
  "id": "ku-xyz789",
  "quality_score": 0.85
}
```

---

## kp_validate_unit

Submit a validation judgment for an existing knowledge unit.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `unit_id` | `string` | Yes | -- | ID of the knowledge unit to validate. |
| `valid` | `boolean` | Yes | -- | Whether the unit is considered valid. |
| `feedback` | `string` | No | -- | Optional free-text feedback explaining the judgment. |

### Response

Returns a confirmation of the validation.

```json
{
  "validated": true
}
```

---

## kp_reputation_query

Query the reputation score and contribution history for an agent.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `agent_id` | `string` | Yes | -- | The agent identifier to look up. |

### Response

Returns the agent's reputation score and contribution count.

```json
{
  "score": 0.91,
  "contributions": 47
}
```

---

## kp_provider_discover

Discovers providers that offer specific capabilities or skills.

### Parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `capability` | `string` | Yes | -- | The capability to search for. |
| `limit` | `number` | No | `10` | Maximum number of results to return. |

### Response

Returns a JSON object containing an array of matching providers, each with their capabilities and reputation score.

```json
{
  "providers": [
    {
      "id": "provider-123",
      "name": "CodeReview Pro",
      "capabilities": ["code-review", "security-audit"],
      "reputation_score": 0.92
    }
  ]
}
```
