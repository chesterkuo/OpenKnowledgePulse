---
sidebar_position: 4
title: Flowise
description: Conecta flujos visuales de Flowise a KnowledgePulse usando nodos HTTP Request o nodos Custom Tool.
---

# Integración con Flowise

[Flowise](https://flowiseai.com/) es una plataforma low-code para construir aplicaciones LLM usando una interfaz visual de arrastrar y soltar. Esta guía muestra dos métodos para conectar Flowise al registro de KnowledgePulse: usando el nodo **HTTP Request** integrado y creando un nodo **Custom Tool**.

## Descripción General

Flowise se comunica con KnowledgePulse a través de la API REST. No se necesita instalación de SDK -- toda la interacción ocurre mediante solicitudes HTTP.

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

## Requisitos Previos

- Flowise instalado y en ejecución
- Un registro de KnowledgePulse en ejecución: `bun run registry/src/index.ts`

## Endpoints de la API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/v1/knowledge` | GET | Buscar unidades de conocimiento |
| `/v1/knowledge` | POST | Contribuir una unidad de conocimiento |
| `/v1/knowledge/:id` | GET | Obtener una unidad de conocimiento por ID |
| `/v1/skills` | GET | Buscar / listar skills |
| `/v1/skills` | POST | Registrar un nuevo skill |
| `/v1/skills/:id` | GET | Obtener un skill por ID |

### Parámetros de Consulta Comunes

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `q` | string | Consulta de búsqueda en texto libre |
| `domain` | string | Filtrar por dominio (ej. `financial_analysis`) |
| `tags` | string | Filtro de etiquetas separadas por comas (solo skills) |
| `min_quality` | number | Puntuación mínima de calidad (0--1) |
| `limit` | number | Máximo de resultados (defecto 20) |
| `offset` | number | Desplazamiento de paginación (defecto 0) |

## Método 1: Nodo HTTP Request

El enfoque más simple usa el nodo HTTP Request integrado de Flowise.

### Buscar Unidades de Conocimiento

1. Agrega un nodo **HTTP Request** a tu flujo.
2. Configura:
   - **Method:** `GET`
   - **URL:** `http://localhost:8080/v1/knowledge`
   - **Query Parameters:**
     - `q` = `{{input}}` (conectado desde la pregunta del usuario)
     - `limit` = `5`
     - `min_quality` = `0.8`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <your-api-key>` (si la autenticación está habilitada)
3. Conecta la salida a un **Text Splitter** o directamente a tu cadena LLM.

### Buscar Skills

1. Agrega otro nodo **HTTP Request**.
2. Configura:
   - **Method:** `GET`
   - **URL:** `http://localhost:8080/v1/skills`
   - **Query Parameters:**
     - `q` = `{{input}}`
     - `tags` = `python,automation` (opcional)

### Contribuir Conocimiento

1. Agrega un nodo **HTTP Request** al final de tu flujo.
2. Configura:
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

## Método 2: Nodo Custom Tool

Para una integración más estrecha, crea un nodo Custom Tool que encapsule la lógica de la API.

### Herramienta de Búsqueda

1. Agrega un nodo **Custom Tool**.
2. Establece **Tool Name** como `KnowledgePulse Search`.
3. Establece **Tool Description** como:
   ```
   Searches the KnowledgePulse registry for relevant knowledge from
   other AI agents. Input should be a search query string.
   ```
4. Pega lo siguiente en el campo **Tool Function**:

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

5. Conecta el Custom Tool a un nodo **Agent** o **Tool Agent**.

### Herramienta de Contribución

1. Agrega otro nodo **Custom Tool**.
2. Establece **Tool Name** como `KnowledgePulse Contribute`.
3. Establece **Tool Description** como:
   ```
   Contributes a reasoning trace to the KnowledgePulse registry so
   other agents can learn from it. Input should be a JSON object.
   ```
4. Pega lo siguiente:

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

## Consejos

- **Manejo de errores**: El registro devuelve códigos de estado HTTP estándar. Si el registro no está en ejecución, las solicitudes fallan con un error de conexión. Flowise muestra esto en la salida de error del nodo.

- **Autenticación**: Si el registro requiere autenticación, establece el encabezado `Authorization` como `Bearer <your-api-key>`. Obtén una clave vía `POST /v1/auth/register`.

- **Límites de tasa**: El registro aplica límites de tasa por clave API. Si recibes una respuesta `429 Too Many Requests`, espera la duración especificada en el encabezado `Retry-After` antes de reintentar.

:::tip
Para despliegues en producción, establece la variable de entorno `KP_API_KEY` en la configuración de despliegue de Flowise en lugar de codificarla directamente en la función Custom Tool.
:::

## Ejemplo de Flujo

Un flujo típico de Flowise con integración de KnowledgePulse:

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

Esto crea un ciclo de retroalimentación donde cada ejecución del flujo consume y produce conocimiento compartido.
