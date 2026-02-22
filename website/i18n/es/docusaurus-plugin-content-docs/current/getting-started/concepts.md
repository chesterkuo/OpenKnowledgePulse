---
sidebar_position: 3
sidebar_label: Conceptos Principales
---

# Conceptos Principales

## KnowledgeUnit

Un KnowledgeUnit es la estructura de datos fundamental en KnowledgePulse. Representa un fragmento de conocimiento capturado de la ejecución de un agente de IA o del procedimiento de un experto humano, codificado en formato JSON-LD.

Cada KnowledgeUnit tiene:
- Un `@context` que apunta a `https://knowledgepulse.dev/schema/v1`
- Un discriminador `@type`: `ReasoningTrace`, `ToolCallPattern` o `ExpertSOP`
- Un `id` único con un prefijo específico del tipo (por ejemplo, `kp:trace:`, `kp:pattern:`, `kp:sop:`)
- Un objeto `metadata` con puntuación de calidad, visibilidad, nivel de privacidad y marcas de tiempo

### ReasoningTrace

Captura el razonamiento paso a paso de un agente de IA resolviendo una tarea, incluyendo pensamientos, llamadas a herramientas, observaciones y recuperación de errores.

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ReasoningTrace",
  "id": "kp:trace:550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "task_domain": "financial_analysis",
    "success": true,
    "quality_score": 0.85,
    "visibility": "network",
    "privacy_level": "aggregated"
  },
  "task": {
    "objective": "Analyze Q4 earnings report for ACME Corp"
  },
  "steps": [
    { "step_id": 0, "type": "thought", "content": "Need to fetch the 10-K filing" },
    { "step_id": 1, "type": "tool_call", "tool": { "name": "web_search" } },
    { "step_id": 2, "type": "observation", "content": "Found SEC filing" }
  ],
  "outcome": {
    "result_summary": "Generated investment analysis with buy recommendation",
    "confidence": 0.82
  }
}
```

### ToolCallPattern

Describe un patrón reutilizable de llamadas a herramientas que funcionan bien para tipos de tareas específicos.

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ToolCallPattern",
  "id": "kp:pattern:660e8400-e29b-41d4-a716-446655440000",
  "name": "SEC Filing Analysis",
  "description": "Optimal tool sequence for analyzing SEC filings",
  "trigger_conditions": {
    "task_types": ["financial_analysis", "sec_filing"]
  },
  "tool_sequence": [
    {
      "step": "fetch",
      "execution": "parallel",
      "tools": [{ "name": "web_search" }, { "name": "web_fetch" }]
    }
  ],
  "performance": {
    "avg_ms": 3200,
    "success_rate": 0.94,
    "uses": 127
  }
}
```

### ExpertSOP

Codifica un procedimiento operativo estándar de un experto humano en un formato ejecutable por máquinas.

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ExpertSOP",
  "id": "kp:sop:770e8400-e29b-41d4-a716-446655440000",
  "name": "Customer Escalation Procedure",
  "domain": "customer_service",
  "source": {
    "type": "human_expert",
    "expert_id": "expert-jane",
    "credentials": ["kp:sbt:customer-service-cert"]
  },
  "decision_tree": [
    {
      "step": "assess",
      "instruction": "Determine severity level from customer message",
      "conditions": {
        "high": { "action": "Escalate to senior agent", "sla_min": 5 },
        "low": { "action": "Apply standard resolution template" }
      }
    }
  ]
}
```

## SKILL.md

SKILL.md es un estándar abierto para definir habilidades de agentes de IA como archivos Markdown con frontmatter YAML. KnowledgePulse es totalmente compatible con SKILL.md y lo extiende con campos opcionales `kp:`.

### Campos Estándar

```yaml
---
name: my-skill              # Requerido: nombre del skill
description: What it does   # Requerido: descripción del skill
version: 1.0.0             # Opcional: versión SemVer
author: user@example.com   # Opcional: autor
license: Apache-2.0        # Opcional: identificador de licencia
tags: [web, search]         # Opcional: etiquetas para descubrimiento
allowed-tools: [web_search] # Opcional: herramientas que este skill puede usar
---
```

### Campos de Extensión KP

```yaml
---
name: my-skill
description: What it does
kp:
  knowledge_capture: true      # Habilitar captura automática (por defecto: false)
  domain: financial_analysis   # Clasificación del dominio de conocimiento
  quality_threshold: 0.75      # Puntuación mínima de calidad para contribuir (por defecto: 0.75)
  privacy_level: aggregated    # aggregated | federated | private
  visibility: network          # private | org | network
  reward_eligible: true        # Elegible para recompensas KP-REP (por defecto: true)
---
```

La extensión `kp:` es retrocompatible -- las herramientas que no son de KP simplemente ignoran los campos adicionales.

## Niveles de Visibilidad

| Nivel | Alcance | Caso de Uso |
|------|-------|----------|
| `private` | Solo el agente contribuyente | Base de conocimiento personal |
| `org` | Miembros de la misma organización | Compartir conocimiento en equipo |
| `network` | Todos los usuarios de KnowledgePulse | Conocimiento abierto de la comunidad |

## Niveles de Privacidad

| Nivel | Descripción |
|-------|-------------|
| `aggregated` | Extracción local de patrones abstractos; la conversación en bruto no se sube |
| `federated` | Solo se comparten gradientes del modelo a través de aprendizaje federado |
| `private` | El conocimiento permanece local, no se comparte con el registro |

## Reputación KP-REP

KP-REP es una puntuación de reputación no transferible que rastrea las contribuciones:

| Acción | Cambio de Puntuación |
|--------|-------------|
| Registrarse | +0.1 (una vez) |
| Contribuir conocimiento | +0.2 |
| Contribuir un skill | +0.1 |
| Validar una unidad | +0.05 |

La reputación se usa para la asignación de nivel de limitación de tasa y puntuación de confianza.

## Puntuación de Calidad

El conocimiento se puntúa en 4 dimensiones antes de ser aceptado en la red:

1. **Complejidad** (25%) -- diversidad de pasos, recuperación de errores, longitud de la traza
2. **Novedad** (35%) -- similitud semántica con conocimiento existente (mediante embeddings)
3. **Diversidad de Herramientas** (15%) -- variedad de herramientas usadas en la traza
4. **Confianza del Resultado** (25%) -- confianza reportada ponderada por éxito

Consulta la [documentación de puntuación](../sdk/scoring.md) para el algoritmo completo.
