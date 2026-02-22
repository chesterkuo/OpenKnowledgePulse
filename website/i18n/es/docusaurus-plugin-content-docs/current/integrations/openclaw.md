---
sidebar_position: 3
title: OpenClaw SDK
description: Usa el SDK TypeScript de KnowledgePulse directamente desde OpenClaw y otros frameworks de agentes TypeScript.
---

# Integración con OpenClaw SDK

[OpenClaw](https://github.com/openclaw) y frameworks de agentes similares basados en TypeScript pueden usar `@knowledgepulse/sdk` directamente para una integración nativa. Esta guía demuestra cómo usar `KPCapture` y `KPRetrieval` para agregar captura y recuperación transparente de conocimiento a cualquier agente TypeScript.

## Descripción General

A diferencia de las integraciones Python que usan HTTP, los frameworks TypeScript se benefician del uso directo del SDK:

- **KPCapture**: envuelve funciones de agentes para capturar y puntuar automáticamente trazas de razonamiento.
- **KPRetrieval**: busca en el registro y formatea los resultados como prompts de few-shot.

```
┌──────────────────────────────────────────┐
│          TypeScript Agent                │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         KPCapture.wrap()           │  │
│  │  (transparent trace capture)       │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
│  ┌──────────────▼─────────────────────┐  │
│  │       KPRetrieval.search()         │  │
│  │  (few-shot knowledge injection)    │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
└─────────────────┼─────────────────────────┘
                  │
           ┌──────▼──────────────┐
           │  KP Registry (:3000)│
           └─────────────────────┘
```

## Requisitos Previos

- Bun o Node.js 20+
- Un registro de KnowledgePulse en ejecución: `bun run registry/src/index.ts`

```bash
bun add @knowledgepulse/sdk
```

## Captura de Conocimiento

### Envolver una Función de Agente

`KPCapture.wrap()` toma cualquier función asíncrona y devuelve una versión envuelta que captura automáticamente la traza de razonamiento cuando la función se ejecuta. Si la traza supera el umbral de calidad, se contribuye al registro.

```ts
import { KPCapture } from "@knowledgepulse/sdk";

const capture = new KPCapture({
  domain: "code_review",
  visibility: "network",
  valueThreshold: 0.75,
  registryUrl: "http://localhost:3000",
});

// Your existing agent function
async function codeReviewAgent(codeSnippet: string): Promise<string> {
  // Agent logic here...
  return `Analysis complete for: ${codeSnippet}`;
}

// Wrap it — knowledge capture happens automatically
const wrappedAgent = capture.wrap(codeReviewAgent);

// Use as normal
const result = await wrappedAgent("function processData(items) { ... }");
```

### Opciones de Configuración

| Opción | Tipo | Por Defecto | Descripción |
|--------|------|-------------|-------------|
| `domain` | string | `"general"` | Dominio de tarea para selección de pesos de puntuación |
| `visibility` | string | `"network"` | Alcance de visibilidad: `"private"`, `"org"`, `"network"` |
| `valueThreshold` | number | `0.75` | Puntuación mínima para contribuir (0.0 -- 1.0) |
| `registryUrl` | string | -- | URL del registro KP |

## Recuperación de Conocimiento

### Buscar Conocimiento Previo

`KPRetrieval` busca en el registro y devuelve las unidades de conocimiento coincidentes:

```ts
import { KPRetrieval } from "@knowledgepulse/sdk";

const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:3000",
  minQuality: 0.8,
  limit: 5,
});

// Search for relevant knowledge
const knowledge = await retrieval.search("code review patterns", "code_review");

console.log(`Found ${knowledge.length} knowledge unit(s)`);
for (const unit of knowledge) {
  console.log(`  [${unit["@type"]}] ${unit.id}`);
}
```

### Formato Few-Shot

Convierte una unidad de conocimiento en un formato de texto adecuado para prompting de LLM:

```ts
if (knowledge.length > 0) {
  const fewShot = retrieval.toFewShot(knowledge[0]);

  // Use as context in your LLM prompt
  const prompt = `Using prior knowledge:\n${fewShot}\n\nAnalyze this code:\n${code}`;
}
```

### Buscar Skills

```ts
const skills = await retrieval.searchSkills("code analysis", {
  tags: ["typescript", "linting"],
  limit: 3,
});

for (const skill of skills) {
  console.log(`${skill.name}: ${skill.description}`);
}
```

## Ejemplo de Integración Completo

Aquí hay un ejemplo completo que combina recuperación, ejecución del agente y captura:

```ts
import { KPCapture, KPRetrieval } from "@knowledgepulse/sdk";

// ── 1. Configure ──────────────────────────────────────
const capture = new KPCapture({
  domain: "code_review",
  visibility: "network",
  valueThreshold: 0.75,
  registryUrl: "http://localhost:3000",
});

const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:3000",
  minQuality: 0.8,
  limit: 5,
});

// ── 2. Agent function with knowledge augmentation ─────
async function reviewCode(codeSnippet: string): Promise<string> {
  // Search for relevant prior knowledge
  let context = "";
  try {
    const knowledge = await retrieval.search("code review patterns", "code_review");
    if (knowledge.length > 0) {
      context = retrieval.toFewShot(knowledge[0]);
      console.log(`Augmented with ${knowledge.length} knowledge unit(s)`);
    }
  } catch {
    console.log("Running without augmentation (registry offline)");
  }

  // Build the prompt (send to your LLM of choice)
  const prompt = context
    ? `Prior knowledge:\n${context}\n\nReview:\n${codeSnippet}`
    : `Review:\n${codeSnippet}`;

  // Simulate LLM response
  return `Reviewed ${codeSnippet.length} chars using ${context ? "augmented" : "base"} prompt`;
}

// ── 3. Wrap and run ───────────────────────────────────
const wrappedReview = capture.wrap(reviewCode);
const result = await wrappedReview("function add(a, b) { return a + b; }");
console.log(result);
```

## Validación de SKILL.md

Los agentes TypeScript también pueden validar sus archivos SKILL.md:

```ts
import { validateSkillMd } from "@knowledgepulse/sdk";

const skillMd = `---
name: code-review-agent
description: Reviews code for security vulnerabilities
version: 1.0.0
tags: [security, code-review]
kp:
  knowledge_capture: true
  domain: code_review
  quality_threshold: 0.7
---

# Code Review Agent

Analyzes code for security issues and best practice violations.
`;

const validation = validateSkillMd(skillMd);
console.log("Valid:", validation.valid);
if (validation.errors.length > 0) {
  console.log("Errors:", validation.errors);
}
```

## Manejo de Errores

El SDK maneja errores de red de forma elegante. Si el registro es inalcanzable, los métodos de `KPRetrieval` lanzan errores que puedes capturar, mientras que `KPCapture` omite silenciosamente la contribución:

```ts
try {
  const knowledge = await retrieval.search("query");
} catch (error) {
  if (error instanceof TypeError && String(error).includes("fetch")) {
    console.log("Registry offline — proceeding without augmentation");
  }
}
```

## Ejecutar el Ejemplo

```bash
# Start the registry
bun run registry/src/index.ts

# Run the OpenClaw example
bun run examples/openclaw-integration/index.ts
```
