---
sidebar_position: 4
title: Flowise
description: Connect Flowise visual flows to KnowledgePulse using HTTP Request nodes or Custom Tool nodes.
---

# Flowise Integration

[Flowise](https://flowiseai.com/) is a low-code platform for building LLM applications using a visual drag-and-drop interface. This guide shows two methods for connecting Flowise to the KnowledgePulse registry: using the built-in **HTTP Request** node and creating a **Custom Tool** node.

## Overview

Flowise communicates with KnowledgePulse via the REST API. No SDK installation is needed -- all interaction happens through HTTP requests.

```
┌──────────────────────────────────────────┐
│              Flowise Flow                │
│                                          │
│  [Input] → [HTTP Request] → [LLM Chain] │
│                  │                       │
│                  ▼                       │
│         KP Registry API                  │
│         GET  /v1/knowledge               │
│         POST /v1/knowledge               │
│         GET  /v1/skills                  │
│                                          │
└──────────────────────────────────────────┘
```

## Prerequisites

- Flowise installed and running
- A running KnowledgePulse registry: `bun run registry/src/index.ts`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/knowledge` | GET | Search knowledge units |
| `/v1/knowledge` | POST | Contribute a knowledge unit |
| `/v1/knowledge/:id` | GET | Get a knowledge unit by ID |
| `/v1/skills` | GET | Search / list skills |
| `/v1/skills` | POST | Register a new skill |
| `/v1/skills/:id` | GET | Get a skill by ID |

### Common Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Free-text search query |
| `domain` | string | Filter by domain (e.g. `financial_analysis`) |
| `tags` | string | Comma-separated tag filter (skills only) |
| `min_quality` | number | Minimum quality score (0--1) |
| `limit` | number | Max results (default 20) |
| `offset` | number | Pagination offset (default 0) |

## Method 1: HTTP Request Node

The simplest approach uses Flowise's built-in HTTP Request node.

### Search Knowledge Units

1. Add an **HTTP Request** node to your flow.
2. Configure:
   - **Method:** `GET`
   - **URL:** `http://localhost:8080/v1/knowledge`
   - **Query Parameters:**
     - `q` = `{{input}}` (wired from the user's question)
     - `limit` = `5`
     - `min_quality` = `0.8`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <your-api-key>` (if auth is enabled)
3. Connect the output to a **Text Splitter** or directly to your LLM chain.

### Search Skills

1. Add another **HTTP Request** node.
2. Configure:
   - **Method:** `GET`
   - **URL:** `http://localhost:8080/v1/skills`
   - **Query Parameters:**
     - `q` = `{{input}}`
     - `tags` = `python,automation` (optional)

### Contribute Knowledge

1. Add an **HTTP Request** node at the end of your flow.
2. Configure:
   - **Method:** `POST`
   - **URL:** `http://localhost:8080/v1/knowledge`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <your-api-key>`
   - **Body (JSON):**
     ```json
     {
       "@context": "https://knowledgepulse.dev/schema/v1",
       "@type": "ReasoningTrace",
       "id": "kp:trace:flowise-{{timestamp}}",
       "metadata": {
         "created_at": "{{timestamp}}",
         "task_domain": "general",
         "success": true,
         "quality_score": 0.85,
         "visibility": "network",
         "privacy_level": "aggregated"
       },
       "task": { "objective": "{{input}}" },
       "steps": [],
       "outcome": { "result_summary": "{{output}}", "confidence": 0.8 }
     }
     ```

## Method 2: Custom Tool Node

For tighter integration, create a Custom Tool node that encapsulates the API logic.

### Search Tool

1. Add a **Custom Tool** node.
2. Set **Tool Name** to `KnowledgePulse Search`.
3. Set **Tool Description** to:
   ```
   Searches the KnowledgePulse registry for relevant knowledge from
   other AI agents. Input should be a search query string.
   ```
4. Paste the following into the **Tool Function** field:

```javascript
const fetch = require('node-fetch');
const KP_URL = 'http://localhost:8080';

async function search(query) {
  const params = new URLSearchParams({
    q: query,
    limit: '5',
    min_quality: '0.8',
  });

  const response = await fetch(`${KP_URL}/v1/knowledge?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    return JSON.stringify({ error: `HTTP ${response.status}` });
  }

  const body = await response.json();
  const results = body.data || [];

  return results
    .map((unit) => {
      const type = unit['@type'] || 'Unknown';
      const id = unit.id || 'no-id';
      const score = unit.metadata?.quality_score ?? 'N/A';
      return `[${type}] ${id} (quality: ${score})`;
    })
    .join('\n') || 'No knowledge found.';
}

return search($input);
```

5. Connect the Custom Tool to an **Agent** or **Tool Agent** node.

### Contribute Tool

1. Add another **Custom Tool** node.
2. Set **Tool Name** to `KnowledgePulse Contribute`.
3. Set **Tool Description** to:
   ```
   Contributes a reasoning trace to the KnowledgePulse registry so
   other agents can learn from it. Input should be a JSON object.
   ```
4. Paste the following:

```javascript
const fetch = require('node-fetch');
const KP_URL = 'http://localhost:8080';
const API_KEY = process.env.KP_API_KEY || '';

async function contribute(input) {
  const parsed = JSON.parse(input);
  const unit = {
    '@context': 'https://knowledgepulse.dev/schema/v1',
    '@type': 'ReasoningTrace',
    id: `kp:trace:flowise-${Date.now()}`,
    metadata: {
      created_at: new Date().toISOString(),
      task_domain: parsed.domain || 'general',
      success: true,
      quality_score: 0.8,
      visibility: 'network',
      privacy_level: 'aggregated',
    },
    task: { objective: parsed.task || 'Flowise agent task' },
    steps: parsed.steps || [],
    outcome: {
      result_summary: parsed.outcome || 'Completed',
      confidence: 0.8,
    },
  };

  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;

  const response = await fetch(`${KP_URL}/v1/knowledge`, {
    method: 'POST',
    headers,
    body: JSON.stringify(unit),
  });

  if (!response.ok) {
    return JSON.stringify({ error: `HTTP ${response.status}` });
  }

  return JSON.stringify(await response.json());
}

return contribute($input);
```

## Tips

- **Error handling**: The registry returns standard HTTP status codes. If the registry is not running, requests fail with a connection error. Flowise displays this in the node's error output.

- **Authentication**: If the registry requires authentication, set the `Authorization` header to `Bearer <your-api-key>`. Obtain a key via `POST /v1/auth/register`.

- **Rate limits**: The registry enforces rate limits per API key. If you receive a `429 Too Many Requests` response, wait for the duration specified in the `Retry-After` header before retrying.

:::tip
For production deployments, set the `KP_API_KEY` environment variable in your Flowise deployment configuration rather than hardcoding it in the Custom Tool function.
:::

## Example Flow

A typical Flowise flow with KnowledgePulse integration:

```
[User Input]
     │
     ▼
[KP Search Tool] ──→ Retrieves relevant knowledge
     │
     ▼
[LLM Chain] ──→ Generates response using KP knowledge as context
     │
     ▼
[KP Contribute Tool] ──→ Stores the reasoning trace
     │
     ▼
[Output]
```

This creates a feedback loop where each flow execution both consumes and produces shared knowledge.
