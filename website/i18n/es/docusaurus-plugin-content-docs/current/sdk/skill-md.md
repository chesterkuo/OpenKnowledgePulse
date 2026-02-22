---
sidebar_position: 3
title: SKILL.md
sidebar_label: SKILL.md
description: Parsear, generar y validar archivos SKILL.md con extensiones KnowledgePulse.
---

# SKILL.md

SKILL.md es un formato de archivo estándar que describe una habilidad de agente usando frontmatter YAML y un cuerpo Markdown. El SDK de KnowledgePulse agrega un bloque de extensión opcional `kp:` al frontmatter, habilitando la configuración de captura de conocimiento mientras se mantiene la total compatibilidad retroactiva con herramientas que no son de KP.

## Funciones

### `parseSkillMd(content)`

Parsea una cadena SKILL.md en sus componentes estructurados.

```ts
function parseSkillMd(content: string): ParsedSkillMd
```

**Parámetros:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `content` | `string` | El contenido bruto del archivo SKILL.md |

**Devuelve:** `ParsedSkillMd`

```ts
interface ParsedSkillMd {
  frontmatter: SkillMdFrontmatter;  // Campos YAML estándar
  kp?: SkillMdKpExtension;          // Extensión KnowledgePulse (si está presente)
  body: string;                      // Contenido Markdown después del frontmatter
  raw: string;                       // Cadena de entrada original
}
```

**Lanza:** `ValidationError` si el frontmatter falta, el YAML está malformado o los campos requeridos están ausentes.

**Ejemplo:**

```ts
import { parseSkillMd } from "@knowledgepulse/sdk";

const content = `---
name: code-reviewer
description: Reviews pull requests for code quality issues
version: "1.0.0"
author: acme-corp
tags:
  - code-review
  - quality
allowed-tools:
  - github_pr_read
  - github_pr_comment
kp:
  knowledge_capture: true
  domain: code-review
  quality_threshold: 0.8
  privacy_level: aggregated
  visibility: network
  reward_eligible: true
---

## Instructions

You are a code review assistant. Analyze the given pull request
and provide actionable feedback on code quality, security, and
best practices.
`;

const parsed = parseSkillMd(content);

console.log(parsed.frontmatter.name);       // "code-reviewer"
console.log(parsed.frontmatter.tags);        // ["code-review", "quality"]
console.log(parsed.kp?.knowledge_capture);   // true
console.log(parsed.kp?.quality_threshold);   // 0.8
console.log(parsed.body);                    // "\n## Instructions\n\nYou are a ..."
```

---

### `generateSkillMd(frontmatter, body, kp?)`

Genera una cadena SKILL.md a partir de componentes estructurados.

```ts
function generateSkillMd(
  frontmatter: SkillMdFrontmatter,
  body: string,
  kp?: SkillMdKpExtension,
): string
```

**Parámetros:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `frontmatter` | `SkillMdFrontmatter` | Campos estándar del frontmatter YAML |
| `body` | `string` | Contenido del cuerpo Markdown |
| `kp` | `SkillMdKpExtension` | _(opcional)_ Campos de extensión KnowledgePulse |

**Devuelve:** Una cadena SKILL.md completa con delimitadores de frontmatter YAML (`---`).

**Ejemplo:**

```ts
import { generateSkillMd } from "@knowledgepulse/sdk";

const skillMd = generateSkillMd(
  {
    name: "data-analyst",
    description: "Analyzes datasets and produces insights",
    version: "0.2.0",
    tags: ["analytics", "data"],
    "allowed-tools": ["sql_query", "chart_render"],
  },
  "## Instructions\n\nAnalyze the provided dataset and generate a summary report.",
  {
    knowledge_capture: true,
    domain: "data-analysis",
    quality_threshold: 0.7,
    visibility: "org",
  },
);

console.log(skillMd);
// ---
// name: data-analyst
// description: Analyzes datasets and produces insights
// ...
```

---

### `validateSkillMd(content)`

Valida una cadena SKILL.md sin lanzar excepciones. Ejecuta tanto la sanitización como la validación de esquema, recopilando todos los errores.

```ts
function validateSkillMd(content: string): {
  valid: boolean;
  errors: string[];
}
```

**Parámetros:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `content` | `string` | El contenido bruto del archivo SKILL.md |

**Devuelve:** Un objeto con `valid` (booleano) y `errors` (arreglo de cadenas legibles por humanos). Cuando `valid` es `true`, el arreglo `errors` puede aún contener advertencias no fatales (ej. "Warning: Removed HTML comments").

**Ejemplo:**

```ts
import { validateSkillMd } from "@knowledgepulse/sdk";

// Documento válido
const good = validateSkillMd(`---
name: my-skill
description: A helpful skill
---

Instructions here.
`);
console.log(good.valid);   // true
console.log(good.errors);  // []

// Documento inválido (campos requeridos faltantes)
const bad = validateSkillMd(`---
name: my-skill
---

No description field.
`);
console.log(bad.valid);    // false
console.log(bad.errors);
// [
//   "Invalid SKILL.md frontmatter",
//   "  description: Required"
// ]
```

## Formato SKILL.md

Un archivo SKILL.md consiste en dos secciones separadas por delimitadores de frontmatter YAML (`---`):

```
---
<frontmatter YAML>
---

<cuerpo Markdown>
```

### Campos Estándar del Frontmatter

| Campo | Tipo | Requerido | Descripción |
|-------|------|----------|-------------|
| `name` | `string` | Sí | Identificador único del skill |
| `description` | `string` | Sí | Descripción legible por humanos |
| `version` | `string` | No | Versión semántica |
| `author` | `string` | No | Autor u organización |
| `license` | `string` | No | Identificador de licencia SPDX |
| `tags` | `string[]` | No | Etiquetas de búsqueda |
| `allowed-tools` | `string[]` | No | Herramientas MCP que este skill puede invocar |

### Extensión KnowledgePulse (`kp:`)

El bloque `kp:` es un objeto anidado opcional dentro del frontmatter. Configura cómo el protocolo KnowledgePulse interactúa con este skill.

| Campo | Tipo | Defecto | Descripción |
|-------|------|---------|-------------|
| `knowledge_capture` | `boolean` | -- | Habilitar captura automática de conocimiento para este skill |
| `domain` | `string` | -- | Dominio de tarea usado para clasificación de conocimiento |
| `quality_threshold` | `number` | -- | Puntuación mínima de calidad (0.0-1.0) para que el conocimiento capturado sea contribuido |
| `privacy_level` | `PrivacyLevel` | -- | Nivel de privacidad para el conocimiento capturado |
| `visibility` | `Visibility` | -- | Alcance de visibilidad para el conocimiento capturado |
| `reward_eligible` | `boolean` | -- | Si las contribuciones de este skill son elegibles para recompensas de tokens |

## Compatibilidad Retroactiva

La extensión `kp:` está diseñada para ser totalmente compatible con versiones anteriores:

- Las herramientas que no entienden la clave `kp:` simplemente la ignorarán durante el parseo YAML.
- Los campos `kp:` son todos opcionales; un archivo SKILL.md funciona sin ellos.
- Los campos estándar (`name`, `description`, `tags`, etc.) permanecen sin cambios.

Esto significa que puedes agregar configuración de KnowledgePulse a cualquier archivo SKILL.md existente sin romper las herramientas que consumen el formato estándar.

## Manejo de Errores

Cuando `parseSkillMd` encuentra entrada inválida, lanza un `ValidationError` con un arreglo estructurado `issues`:

```ts
import { parseSkillMd, ValidationError } from "@knowledgepulse/sdk";

try {
  parseSkillMd(invalidContent);
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.message);
    // "Invalid SKILL.md frontmatter"

    for (const issue of err.issues) {
      console.error(`  ${issue.path}: ${issue.message}`);
      // "description: Required"
      // "kp.quality_threshold: Number must be less than or equal to 1"
    }
  }
}
```

Cada entrada en el arreglo `issues` contiene:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `path` | `string` | Ruta delimitada por puntos al campo inválido (ej. `"kp.quality_threshold"`) |
| `message` | `string` | Descripción legible por humanos de la falla de validación |

Para errores de extensión `kp:`, las rutas están prefijadas con `kp.` para distinguirlos de los errores de frontmatter estándar.
