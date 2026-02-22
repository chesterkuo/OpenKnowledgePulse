---
sidebar_position: 1
title: Instalación
sidebar_label: Instalación
description: Instalar y configurar el SDK de KnowledgePulse para proyectos TypeScript y JavaScript.
---

# Instalación

El paquete `@knowledgepulse/sdk` proporciona tipos TypeScript/JavaScript, esquemas de validación, captura de conocimiento, recuperación, puntuación y utilidades SKILL.md para el protocolo KnowledgePulse.

- **Versión:** 0.1.0
- **Licencia:** Apache-2.0

## Instalar

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="bun" label="Bun" default>

```bash
bun add @knowledgepulse/sdk
```

</TabItem>
<TabItem value="npm" label="npm">

```bash
npm install @knowledgepulse/sdk
```

</TabItem>
<TabItem value="yarn" label="Yarn">

```bash
yarn add @knowledgepulse/sdk
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm add @knowledgepulse/sdk
```

</TabItem>
</Tabs>

## Formatos de Módulo

El SDK se distribuye como un paquete de formato dual con declaraciones TypeScript completas. Tanto ESM como CommonJS están soportados de fábrica.

### ESM (recomendado)

```ts
import {
  KPCapture,
  KPRetrieval,
  evaluateValue,
  parseSkillMd,
  KnowledgeUnitSchema,
} from "@knowledgepulse/sdk";
```

### CommonJS

```js
const {
  KPCapture,
  KPRetrieval,
  evaluateValue,
  parseSkillMd,
  KnowledgeUnitSchema,
} = require("@knowledgepulse/sdk");
```

## Mapa de Exportaciones

El paquete expone un único punto de entrada (`.`) con exportaciones condicionales:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

| Ruta | Formato | Archivo |
|------|--------|------|
| `types` | Declaraciones TypeScript | `dist/index.d.ts` |
| `import` | ESM | `dist/index.js` |
| `require` | CommonJS | `dist/index.cjs` |

## Dependencias

| Paquete | Versión | Propósito |
|---------|---------|---------|
| `zod` | ^3.23.0 | Esquemas de validación en tiempo de ejecución para todos los tipos de unidades de conocimiento |
| `yaml` | ^2.4.0 | Parseo y generación de frontmatter YAML de SKILL.md |

### Dependencia Opcional

| Paquete | Versión | Tamaño | Propósito |
|---------|---------|------|---------|
| `@huggingface/transformers` | ^3.0.0 | ~80 MB | Modelo de embeddings para puntuación de novedad (`Xenova/all-MiniLM-L6-v2`) |

El paquete `@huggingface/transformers` está listado como dependencia opcional. Solo lo usa la dimensión de novedad de la función de puntuación `evaluateValue()`. Si no está instalado, la puntuación de novedad recurre a un valor por defecto de `0.5`.

Para instalarlo explícitamente:

```bash
bun add @huggingface/transformers
```

## TypeScript

Las declaraciones de tipos completas están incluidas en el paquete en `dist/index.d.ts`. No se necesita ningún paquete `@types/*` adicional.

El SDK requiere TypeScript 5.0 o posterior y apunta a ES2020. Si usas `moduleResolution: "bundler"` o `"node16"` en tu `tsconfig.json`, el mapa de exportaciones se resolverá automáticamente.

```jsonc
// tsconfig.json (configuración recomendada)
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020",
    "strict": true
  }
}
```

## Verificar Instalación

Ejecuta una verificación rápida para confirmar que el paquete está instalado correctamente:

```ts
import { KnowledgeUnitSchema, generateTraceId } from "@knowledgepulse/sdk";

console.log(generateTraceId());
// kp:trace:550e8400-e29b-41d4-a716-446655440000

console.log(typeof KnowledgeUnitSchema.parse);
// "function"
```

## Próximos Pasos

- [Tipos](./types.md) -- Explora todos los tipos de unidades de conocimiento y esquemas Zod
- [SKILL.md](./skill-md.md) -- Parsear, generar y validar archivos SKILL.md
- [Puntuación](./scoring.md) -- Comprender el algoritmo de puntuación de valor
- [Utilidades](./utilities.md) -- Generadores de ID, hashing, sanitización, captura y recuperación
