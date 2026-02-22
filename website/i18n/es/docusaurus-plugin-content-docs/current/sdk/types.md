---
sidebar_position: 2
title: Tipos
sidebar_label: Tipos
description: Referencia completa para los tipos de unidades de conocimiento de KnowledgePulse, enums, interfaces, esquemas Zod y clases de error.
---

# Tipos

El SDK exporta interfaces TypeScript para cada forma de unidad de conocimiento, esquemas Zod para validación en tiempo de ejecución y un conjunto de clases de error tipadas. Todos los tipos son importables desde el punto de entrada de nivel superior `@knowledgepulse/sdk`.

## Enums

### KnowledgeUnitType

```ts
type KnowledgeUnitType = "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP";
```

Las tres categorías de conocimiento que pueden ser capturadas, almacenadas y compartidas a través del protocolo.

### PrivacyLevel

```ts
type PrivacyLevel = "aggregated" | "federated" | "private";
```

| Valor | Descripción |
|-------|-------------|
| `"aggregated"` | El conocimiento se anonimiza completamente y se fusiona en el pool público |
| `"federated"` | El conocimiento permanece dentro de un límite de federación; solo salen insights agregados |
| `"private"` | El conocimiento nunca sale del agente u organización de origen |

### Visibility

```ts
type Visibility = "private" | "org" | "network";
```

| Valor | Descripción |
|-------|-------------|
| `"private"` | Visible solo para el agente propietario |
| `"org"` | Visible para todos los agentes dentro de la misma organización |
| `"network"` | Visible para cada participante en la red KnowledgePulse |

## Interfaz Común: KnowledgeUnitMeta

Cada unidad de conocimiento lleva un campo `metadata` con esta forma:

```ts
interface KnowledgeUnitMeta {
  created_at: string;          // Fecha y hora ISO 8601
  agent_id?: string;           // kp:agent:<id>
  framework?: string;          // "langgraph" | "crewai" | "autogen" | "openclaw"
  task_domain: string;         // ej. "customer-support", "code-review"
  success: boolean;
  quality_score: number;       // 0.0 a 1.0
  visibility: Visibility;
  privacy_level: PrivacyLevel;
  validated_by?: string[];     // kp:validator:<id>[]
}
```

## Tipos de Unidad de Conocimiento

### ReasoningTrace

Un registro paso a paso del proceso de razonamiento de un agente, incluyendo llamadas a herramientas, observaciones y recuperaciones de errores.

```ts
interface ReasoningTrace {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ReasoningTrace";
  id: string;                  // kp:trace:<uuid>
  source_skill?: string;       // kp:skill:<name>:<version>
  metadata: KnowledgeUnitMeta;
  task: {
    objective: string;
    input_schema?: Record<string, unknown>;
  };
  steps: ReasoningTraceStep[];
  outcome: {
    result_summary: string;
    confidence: number;        // 0.0 a 1.0
  };
  knowledge_graph_delta?: {
    entities: Array<{ name: string; type: string }>;
    relationships: Array<{ fact: string; valid_from: string }>;
  };
}
```

#### ReasoningTraceStep

Cada paso en una traza tiene uno de cuatro tipos:

```ts
interface ReasoningTraceStep {
  step_id: number;
  type: "thought" | "tool_call" | "observation" | "error_recovery";
  content?: string;
  tool?: {
    name: string;
    mcp_server?: string;
  };
  input?: Record<string, unknown>;
  output_summary?: string;
  latency_ms?: number;
}
```

| Tipo de Paso | Descripción |
|-----------|-------------|
| `"thought"` | Paso de razonamiento o planificación interna |
| `"tool_call"` | Invocación de una herramienta o API externa |
| `"observation"` | Resultado o salida recibida de una llamada a herramienta |
| `"error_recovery"` | Acción de recuperación tomada después de un error |

### ToolCallPattern

Un patrón reutilizable que describe una secuencia de invocaciones de herramientas que logra un tipo de tarea específico.

```ts
interface ToolCallPattern {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ToolCallPattern";
  id: string;                  // kp:pattern:<uuid>
  name: string;
  description: string;
  metadata: KnowledgeUnitMeta;
  trigger_conditions: {
    task_types: string[];
    required_tools?: string[];
  };
  tool_sequence: Array<{
    step: string;
    execution: "parallel" | "sequential";
    tools: Array<{
      name: string;
      query_template?: string;
      input_template?: Record<string, unknown>;
    }>;
    condition?: string;
  }>;
  performance: {
    avg_ms: number;
    success_rate: number;      // 0.0 a 1.0
    uses: number;
  };
}
```

### ExpertSOP

Un procedimiento operativo estándar estructurado escrito por un experto humano, incluyendo un árbol de decisión con lógica condicional.

```ts
interface ExpertSOP {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ExpertSOP";
  id: string;                  // kp:sop:<uuid>
  name: string;
  domain: string;
  metadata: KnowledgeUnitMeta;
  source: {
    type: "human_expert";
    expert_id: string;
    credentials: string[];     // kp:sbt:<cert>[]
  };
  decision_tree: Array<{
    step: string;
    instruction: string;
    criteria?: Record<string, string>;
    conditions?: Record<string, {
      action: string;
      sla_min?: number;
    }>;
    tool_suggestions?: Array<{
      name: string;
      when: string;
    }>;
  }>;
  validation?: {
    test_cases: Array<{
      input: Record<string, unknown>;
      expected_output: Record<string, unknown>;
    }>;
  };
}
```

## Tipo Unión

El tipo `KnowledgeUnit` es una unión discriminada de los tres tipos de unidad de conocimiento:

```ts
type KnowledgeUnit = ReasoningTrace | ToolCallPattern | ExpertSOP;
```

## Tipos SKILL.md

### SkillMdFrontmatter

Campos estándar del frontmatter YAML de SKILL.md:

```ts
interface SkillMdFrontmatter {
  name: string;
  description: string;
  version?: string;
  author?: string;
  license?: string;
  tags?: string[];
  "allowed-tools"?: string[];
}
```

### SkillMdKpExtension

Campos de extensión de KnowledgePulse anidados bajo la clave `kp:` en el frontmatter de SKILL.md:

```ts
interface SkillMdKpExtension {
  knowledge_capture?: boolean;
  domain?: string;
  quality_threshold?: number;    // 0.0 a 1.0
  privacy_level?: PrivacyLevel;
  visibility?: Visibility;
  reward_eligible?: boolean;
}
```

## Tipos de Importación de SOP

El SDK proporciona tipos y funciones para importar SOPs desde documentos. Estos son usados por la función de importación de documentos de SOP Studio pero también pueden usarse independientemente.

### LLMConfig

Configuración para el proveedor de LLM usado durante la extracción de documentos:

```ts
interface LLMConfig {
  provider: "openai" | "anthropic" | "ollama";
  apiKey: string;              // Tu clave API del proveedor
  model: string;               // Identificador del modelo (ej. "gpt-4o")
  baseUrl?: string;            // Endpoint personalizado (requerido para Ollama)
  temperature?: number;        // 0.0 a 1.0 (defecto: 0.2)
}
```

### ParseResult

Devuelto por `parseDocx` y `parsePdf` después de parsear un documento:

```ts
interface ParseResult {
  text: string;                // Contenido completo en texto plano
  sections: Array<{
    heading: string;
    content: string;
    level: number;             // Nivel de encabezado (1-6)
  }>;
  tables: Array<{
    headers: string[];
    rows: string[][];
  }>;
  metadata: {
    title?: string;
    author?: string;
    pageCount?: number;
  };
}
```

### ExtractionResult

Devuelto por `extractDecisionTree` después de la extracción con LLM:

```ts
interface ExtractionResult {
  name: string;                // Nombre del SOP detectado
  domain: string;              // Dominio detectado
  description: string;         // Descripción generada
  decision_tree: Array<{       // Árbol de decisión compatible con ExpertSOP
    step: string;
    instruction: string;
    criteria?: Record<string, string>;
    conditions?: Record<string, {
      action: string;
      sla_min?: number;
    }>;
    tool_suggestions?: Array<{
      name: string;
      when: string;
    }>;
  }>;
  confidence: number;          // 0.0 a 1.0
  warnings: string[];          // Problemas o ambigüedades de extracción
}
```

### Funciones de Parseo de Documentos

```ts
import { parseDocx, parsePdf, extractDecisionTree } from "@knowledgepulse/sdk";

// Parsear un archivo DOCX
const docxResult: ParseResult = await parseDocx(buffer);

// Parsear un archivo PDF
const pdfResult: ParseResult = await parsePdf(buffer);

// Extraer un árbol de decisión usando un LLM
const extraction: ExtractionResult = await extractDecisionTree(pdfResult, {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o",
  temperature: 0.2,
});
```

## Esquemas Zod

Cada tipo anterior tiene un esquema Zod correspondiente para validación en tiempo de ejecución. Los esquemas se exportan desde `@knowledgepulse/sdk` y pueden usarse directamente con `safeParse` o `parse`.

| Esquema | Valida |
|--------|-----------|
| `KnowledgeUnitSchema` | Unión discriminada sobre `@type` (los tres tipos de unidad) |
| `KnowledgeUnitTypeSchema` | `"ReasoningTrace" \| "ToolCallPattern" \| "ExpertSOP"` |
| `KnowledgeUnitMetaSchema` | El objeto `metadata` |
| `PrivacyLevelSchema` | `"aggregated" \| "federated" \| "private"` |
| `VisibilitySchema` | `"private" \| "org" \| "network"` |
| `ReasoningTraceSchema` | Objeto `ReasoningTrace` completo |
| `ReasoningTraceStepSchema` | Paso individual en una traza |
| `ToolCallPatternSchema` | Objeto `ToolCallPattern` completo |
| `ExpertSOPSchema` | Objeto `ExpertSOP` completo |
| `SkillMdFrontmatterSchema` | Campos del frontmatter SKILL.md |
| `SkillMdKpExtensionSchema` | Campos de extensión KnowledgePulse |

### Ejemplo de Validación

```ts
import { KnowledgeUnitSchema } from "@knowledgepulse/sdk";

const result = KnowledgeUnitSchema.safeParse(unknownData);

if (result.success) {
  // result.data está tipado como KnowledgeUnit
  const unit = result.data;
  console.log(unit["@type"]); // "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP"
} else {
  // result.error.issues contiene errores de validación detallados
  for (const issue of result.error.issues) {
    console.error(`${issue.path.join(".")}: ${issue.message}`);
  }
}
```

El `KnowledgeUnitSchema` es una unión discriminada de Zod basada en el campo `@type`. Esto significa que el esquema selecciona automáticamente el validador correcto (`ReasoningTraceSchema`, `ToolCallPatternSchema` o `ExpertSOPSchema`) basándose en el valor de `@type` en los datos de entrada.

### Validación Estricta con `parse`

Si prefieres excepciones en lugar de objetos de resultado, usa `parse`:

```ts
import { ReasoningTraceSchema } from "@knowledgepulse/sdk";

try {
  const trace = ReasoningTraceSchema.parse(data);
  // trace está tipado como ReasoningTrace
} catch (err) {
  // ZodError con array .issues
}
```

## Clases de Error

El SDK exporta una jerarquía de clases de error para manejo estructurado de errores.

### KPError (base)

```ts
class KPError extends Error {
  readonly code: string;
  constructor(message: string, code: string);
}
```

Todos los errores del SDK extienden `KPError`. El campo `code` proporciona un identificador de error legible por máquinas.

### ValidationError

```ts
class ValidationError extends KPError {
  readonly issues: Array<{ path: string; message: string }>;
  // code: "VALIDATION_ERROR"
}
```

Se lanza cuando los datos fallan la validación del esquema Zod o el parseo de SKILL.md. El array `issues` contiene una entrada por cada problema a nivel de campo, cada una con un `path` delimitado por puntos y un `message` legible por humanos.

### SanitizationError

```ts
class SanitizationError extends KPError {
  readonly field?: string;
  // code: "SANITIZATION_ERROR"
}
```

Se lanza cuando la sanitización de contenido detecta patrones peligrosos como caracteres Unicode invisibles o intentos de inyección de prompt.

### AuthenticationError

```ts
class AuthenticationError extends KPError {
  // code: "AUTHENTICATION_ERROR"
  // mensaje por defecto: "Authentication required"
}
```

Se lanza cuando una llamada API requiere autenticación pero no se proporcionaron credenciales válidas.

### RateLimitError

```ts
class RateLimitError extends KPError {
  readonly retryAfter: number;  // segundos
  // code: "RATE_LIMIT_ERROR"
}
```

Se lanza cuando el registro devuelve un estado 429. El campo `retryAfter` indica cuántos segundos esperar antes de reintentar.

### NotFoundError

```ts
class NotFoundError extends KPError {
  // code: "NOT_FOUND"
}
```

Se lanza cuando un recurso solicitado (unidad de conocimiento, skill, etc.) no existe en el registro.

### Ejemplo de Manejo de Errores

```ts
import {
  KPError,
  ValidationError,
  RateLimitError,
} from "@knowledgepulse/sdk";

try {
  await contributeKnowledge(unit, { apiKey: "kp_..." });
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry in ${err.retryAfter}s`);
  } else if (err instanceof ValidationError) {
    for (const issue of err.issues) {
      console.error(`  ${issue.path}: ${issue.message}`);
    }
  } else if (err instanceof KPError) {
    console.error(`KP error [${err.code}]: ${err.message}`);
  }
}
```
