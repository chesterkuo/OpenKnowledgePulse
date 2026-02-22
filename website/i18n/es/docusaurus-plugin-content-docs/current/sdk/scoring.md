---
sidebar_position: 4
title: Puntuación
sidebar_label: Puntuación
description: Cómo el SDK de KnowledgePulse evalúa el valor de las trazas de razonamiento usando un algoritmo de puntuación multidimensional.
---

# Puntuación

El SDK incluye una función de puntuación de valor que evalúa cuán útil es un `ReasoningTrace` antes de que sea contribuido a la red. Esto determina si una traza cumple el umbral de calidad para ser compartida.

## `evaluateValue(trace)`

```ts
function evaluateValue(trace: ReasoningTrace): Promise<number>
```

**Parámetros:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `trace` | `ReasoningTrace` | Una traza de razonamiento completa para evaluar |

**Devuelve:** `Promise<number>` -- una puntuación de calidad entre `0.0` y `1.0`.

**Ejemplo:**

```ts
import { evaluateValue } from "@knowledgepulse/sdk";
import type { ReasoningTrace } from "@knowledgepulse/sdk";

const trace: ReasoningTrace = {
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ReasoningTrace",
  id: "kp:trace:550e8400-e29b-41d4-a716-446655440000",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "code-review",
    success: true,
    quality_score: 0,
    visibility: "network",
    privacy_level: "aggregated",
  },
  task: { objective: "Review PR #42 for security issues" },
  steps: [
    { step_id: 0, type: "thought", content: "Analyzing diff for injection vectors" },
    { step_id: 1, type: "tool_call", tool: { name: "github_pr_read" }, input: { pr: 42 } },
    { step_id: 2, type: "observation", content: "Found unsanitized SQL in handler.ts" },
    { step_id: 3, type: "tool_call", tool: { name: "static_analysis" }, input: { file: "handler.ts" } },
    { step_id: 4, type: "observation", content: "Confirmed SQL injection vulnerability" },
  ],
  outcome: {
    result_summary: "Identified 1 critical SQL injection vulnerability",
    confidence: 0.95,
  },
};

const score = await evaluateValue(trace);
console.log(score); // ej. 0.72
```

## Dimensiones de Puntuación

La puntuación compuesta es un promedio ponderado de cuatro dimensiones independientes:

| Dimensión | Peso | Rango | Descripción |
|-----------|--------|-------|-------------|
| Complejidad (C) | 25% | 0.0 - 1.0 | Cuán estructuralmente rica es la traza |
| Novedad (N) | 35% | 0.0 - 1.0 | Cuán diferente es la traza de las trazas vistas anteriormente |
| Diversidad de Herramientas (D) | 15% | 0.0 - 1.0 | Variedad de herramientas usadas relativa al conteo de pasos |
| Confianza del Resultado (O) | 25% | 0.0 - 1.0 | Confianza en el resultado, ajustada por éxito |

```
score = C * 0.25 + N * 0.35 + D * 0.15 + O * 0.25
```

### Complejidad (C)

Mide la riqueza estructural de la traza de razonamiento basándose en la variedad de tipos de pasos, recuperación de errores y longitud de la traza.

```
C = min(1.0, (uniqueTypes / 4) * 0.5 + (errorRecovery > 0 ? 0.3 : 0) + (steps.length / 20) * 0.2)
```

| Factor | Contribución | Descripción |
|--------|-------------|-------------|
| Tipos de paso únicos | hasta 0.50 | Número de tipos de paso distintos (`thought`, `tool_call`, `observation`, `error_recovery`) dividido por 4 |
| Recuperación de errores | 0.00 o 0.30 | Bonificación si la traza contiene al menos un paso `error_recovery` |
| Conteo de pasos | hasta 0.20 | Número de pasos dividido por 20 (trazas más largas puntúan más alto, con tope en 20) |

### Novedad (N)

Mide cuán diferente es una traza de las trazas previamente puntuadas usando similitud basada en embeddings.

- **Modelo de embeddings:** `Xenova/all-MiniLM-L6-v2` (384 dimensiones)
- **Texto de entrada:** objetivo de la tarea concatenado con todos los contenidos de los pasos
- **Comparación:** similitud coseno contra todos los vectores en la caché local
- **Fórmula:** `N = 1.0 - maxCosineSimilarity(embedding, cache)`

Si el paquete `@huggingface/transformers` no está instalado, la dimensión de novedad **recurre a `0.5`** (el punto medio). Esto asegura que la puntuación siga funcionando sin la dependencia opcional, aunque con menor discriminación en novedad.

Cuando la caché local está vacía (primera traza puntuada en una sesión), la novedad también se establece por defecto en `0.5`.

### Diversidad de Herramientas (D)

Mide la variedad de herramientas distintas usadas en la traza.

```
D = min(1.0, (uniqueTools / max(1, steps.length)) * 3)
```

El multiplicador de 3 significa que una traza donde un tercio de los pasos usan herramientas diferentes logrará la puntuación máxima. Esto recompensa trazas que aprovechan múltiples herramientas sin penalizar secuencias largas de llamadas a herramientas.

### Confianza del Resultado (O)

Refleja la confianza auto-reportada del agente, ajustada por si la tarea realmente tuvo éxito.

```
O = outcome.confidence * (metadata.success ? 1.0 : 0.3)
```

Las tareas fallidas tienen su confianza multiplicada por 0.3, reduciendo significativamente la puntuación de la dimensión de resultado.

## Anulaciones Basadas en Reglas

Después de calcular la puntuación compuesta ponderada, tres ajustes basados en reglas se aplican en orden:

| Condición | Efecto | Razón |
|-----------|--------|-----------|
| Un solo paso de pensamiento | Puntuación fijada en `0.1` | Una traza con un solo paso de pensamiento tiene valor mínimo |
| Más de 2 recuperaciones de error y `success: true` | Puntuación incrementada en `+0.1` (con tope en 1.0) | La recuperación exitosa de múltiples errores es muy valiosa |
| 1 o menos herramientas únicas (cuando se usan herramientas) | Puntuación reducida en `-0.1` (con piso en 0.0) | La baja diversidad de herramientas en trazas que usan herramientas se penaliza |

```ts
// Un solo paso de pensamiento
if (steps.length === 1 && steps[0].type === "thought") score = 0.1;

// Recuperación exitosa de múltiples errores
if (errorRecovery > 2 && metadata.success) score = min(1.0, score + 0.1);

// Baja diversidad de herramientas
if (uniqueTools <= 1 && steps.some(s => s.tool)) score = max(0.0, score - 0.1);
```

:::note
La anulación de paso único tiene precedencia: si una traza tiene exactamente un paso de pensamiento, la puntuación se fija en `0.1` independientemente de otros factores. Las anulaciones posteriores se aplican sobre ese valor si sus condiciones también se cumplen.
:::

## Caché Vectorial Interna

El módulo de puntuación mantiene una instancia interna de `VectorCache` para calcular la novedad entre invocaciones dentro del mismo proceso.

| Propiedad | Valor |
|----------|-------|
| Máximo de elementos | 1,000 |
| Dimensiones | 384 |
| Algoritmo | Escaneo lineal por fuerza bruta |
| Desalojo | Más antiguo primero cuando se excede la capacidad |

La caché está diseñada para el caso común de puntuar trazas en una sola sesión de agente. Con 1,000 vectores de 384 dimensiones cada uno, la huella de memoria es aproximadamente 1.5 MB y un escaneo completo se completa en menos de 1 ms.

La clase `VectorCache` también se exporta desde el SDK para casos de uso avanzados:

```ts
import { VectorCache } from "@knowledgepulse/sdk";

const cache = new VectorCache({ maxElements: 500, dimensions: 384 });

cache.add(new Float32Array(384));           // Agregar un vector
const sim = cache.maxCosineSimilarity(q);   // Consultar similitud máxima
console.log(cache.size);                     // Número de vectores almacenados
cache.clear();                               // Reiniciar la caché
```

## Puntuación Sin el Embedder

Si no instalas `@huggingface/transformers`, la función de puntuación sigue funcionando. La dimensión de novedad se establece por defecto en `0.5`, y la puntuación final se calcula a partir de las tres dimensiones restantes más el punto medio fijo de novedad:

```
score = C * 0.25 + 0.5 * 0.35 + D * 0.15 + O * 0.25
       = C * 0.25 + 0.175 + D * 0.15 + O * 0.25
```

Esto es adecuado para desarrollo y pruebas pero proporciona puntuaciones menos discriminantes en producción. Para mejores resultados, instala la dependencia opcional:

```bash
bun add @huggingface/transformers
```
