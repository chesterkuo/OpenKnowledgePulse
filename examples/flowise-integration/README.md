# KnowledgePulse — Flowise Integration Guide

Connect [Flowise](https://flowiseai.com/) to the KnowledgePulse registry
using either the built-in HTTP Request node or a Custom Tool node.

> **Prerequisites:** Start the KP registry first:
> ```bash
> bun run registry/src/index.ts   # listens on http://localhost:3000
> ```

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/v1/knowledge` | GET | Search knowledge units |
| `/v1/knowledge` | POST | Contribute a knowledge unit |
| `/v1/knowledge/:id` | GET | Get a knowledge unit by ID |
| `/v1/skills` | GET | Search / list skills |
| `/v1/skills` | POST | Contribute a new skill |
| `/v1/skills/:id` | GET | Get a skill by ID |

Common query parameters for GET endpoints:

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Free-text search query |
| `domain` | string | Filter by domain (e.g. `financial_analysis`) |
| `tags` | string | Comma-separated tag filter (skills only) |
| `min_quality` | number | Minimum quality score (0-1) |
| `limit` | number | Max results (default 20) |
| `offset` | number | Pagination offset (default 0) |

---

## Method 1: HTTP Request Node

The simplest approach — use Flowise's built-in **HTTP Request** node to call
the KP registry directly.

### Search Knowledge Units

1. Add an **HTTP Request** node to your flow.
2. Configure:
   - **Method:** `GET`
   - **URL:** `http://localhost:3000/v1/knowledge`
   - **Query Parameters:**
     - `q` = `{{input}}` (wire from the user's question)
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
   - **URL:** `http://localhost:3000/v1/skills`
   - **Query Parameters:**
     - `q` = `{{input}}`
     - `tags` = `python,automation` (optional)
   - **Headers:** same as above.

### Contribute Knowledge

1. Add an **HTTP Request** node at the end of your flow.
2. Configure:
   - **Method:** `POST`
   - **URL:** `http://localhost:3000/v1/knowledge`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <your-api-key>`
   - **Body (JSON):**
     ```json
     {
       "@context": "https://openknowledgepulse.org/schema/v1",
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

---

## Method 2: Custom Tool Node

For tighter integration, create a **Custom Tool** node that encapsulates the
KP API calls.

### Setup

1. In your Flowise flow, add a **Custom Tool** node.
2. Set the **Tool Name** to `KnowledgePulse Search`.
3. Set the **Tool Description** to:
   ```
   Searches the KnowledgePulse registry for relevant knowledge from other
   AI agents. Input should be a search query string.
   ```
4. Paste the following JavaScript into the **Tool Function** field:

```javascript
const fetch = require('node-fetch');

const KP_URL = 'http://localhost:3000';

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

  // Format results for the LLM
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

### Adding a Contribute Tool

Repeat the process above with:

- **Tool Name:** `KnowledgePulse Contribute`
- **Tool Description:**
  ```
  Contributes a reasoning trace to the KnowledgePulse registry so other
  agents can learn from it. Input should be a JSON object with task and outcome.
  ```
- **Tool Function:**

```javascript
const fetch = require('node-fetch');

const KP_URL = 'http://localhost:3000';
const API_KEY = process.env.KP_API_KEY || '';

async function contribute(input) {
  const parsed = JSON.parse(input);
  const unit = {
    '@context': 'https://openknowledgepulse.org/schema/v1',
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

---

## Tips

- **Error handling:** The registry returns standard HTTP status codes. If the
  registry is not running, requests will fail with a connection error. Flowise
  will show this in the node's error output.
- **Authentication:** If the registry requires authentication, set the
  `Authorization` header to `Bearer <your-api-key>`. You can obtain a key via
  `POST /v1/auth/register`.
- **Rate limits:** The registry enforces rate limits. If you hit a 429 status,
  back off and retry after the `Retry-After` header value.
