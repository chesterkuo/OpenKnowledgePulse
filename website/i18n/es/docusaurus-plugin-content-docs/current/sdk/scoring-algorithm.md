---
sidebar_position: 5
title: Algoritmo de Puntuación
sidebar_label: Algoritmo de Puntuación
description: Modelo de puntuación compuesta de 4 factores con perfiles de peso específicos por dominio, anulaciones basadas en reglas, decaimiento temporal y restricciones de rendimiento.
---

# Algoritmo de Puntuación

El motor de puntuación de KnowledgePulse evalúa trazas de razonamiento usando una fórmula compuesta que combina cuatro dimensiones independientes de calidad. En la Fase 2, el motor introduce **perfiles de peso específicos por dominio** que adaptan el énfasis de la puntuación a diferentes dominios de tareas, y aplica un **presupuesto de rendimiento de 100ms** por evaluación.

## Fórmula Compuesta

La puntuación general de calidad se calcula como una suma ponderada de cuatro dimensiones normalizadas:

```
score = C x wC + N x wN + D x wD + O x wO
```

Donde:

| Símbolo | Dimensión | Rango |
|--------|-----------|-------|
| C | Complejidad | 0.0 -- 1.0 |
| N | Novedad | 0.0 -- 1.0 |
| D | Diversidad de Herramientas | 0.0 -- 1.0 |
| O | Confianza del Resultado | 0.0 -- 1.0 |

Los pesos (wC, wN, wD, wO) varían por dominio. Siempre suman 1.0.

## Perfiles de Peso Específicos por Dominio

Diferentes dominios de tareas priorizan diferentes señales de calidad. Una traza de finanzas se beneficia más de una alta confianza en el resultado, mientras que una traza de código se beneficia de un uso diverso de herramientas. El motor de puntuación selecciona el perfil de pesos automáticamente basándose en `metadata.task_domain`.

### Perfiles Disponibles

| Dominio | wC (Complejidad) | wN (Novedad) | wD (Diversidad de Herramientas) | wO (Resultado) |
|--------|:-:|:-:|:-:|:-:|
| **default** | 0.25 | 0.35 | 0.15 | 0.25 |
| **finance** | 0.20 | 0.25 | 0.10 | 0.45 |
| **code** | 0.20 | 0.30 | 0.30 | 0.20 |
| **medical** | 0.15 | 0.20 | 0.10 | 0.55 |
| **customer_service** | 0.20 | 0.30 | 0.20 | 0.30 |

### Justificación del Diseño

- **Finanzas** pondera fuertemente la confianza del resultado porque el análisis financiero demanda conclusiones precisas y verificables.
- **Código** pondera fuertemente la diversidad de herramientas porque los agentes de codificación efectivos aprovechan múltiples herramientas (linters, verificadores de tipos, ejecutores de tests).
- **Médico** tiene el mayor peso de confianza del resultado (0.55) porque la corrección es crítica en el razonamiento médico.
- **Servicio al cliente** balancea novedad y confianza del resultado, recompensando una resolución de problemas creativa pero efectiva.

### Uso de Perfiles de Dominio

La selección del dominio ocurre automáticamente a través de los metadatos de la traza:

```ts
import { evaluateValue } from "@knowledgepulse/sdk";
import type { ReasoningTrace } from "@knowledgepulse/sdk";

const trace: ReasoningTrace = {
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ReasoningTrace",
  id: "kp:trace:finance-demo-001",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "finance", // <- selecciona el perfil de pesos de finanzas
    success: true,
    quality_score: 0,
    visibility: "network",
    privacy_level: "aggregated",
  },
  task: { objective: "Analyze TSMC Q4 earnings report" },
  steps: [
    { step_id: 0, type: "thought", content: "Extracting revenue and margin data" },
    { step_id: 1, type: "tool_call", tool: { name: "financial_data_api" }, input: { ticker: "TSM" } },
    { step_id: 2, type: "observation", content: "Revenue: $26.3B, up 14.3% YoY" },
    { step_id: 3, type: "tool_call", tool: { name: "comparison_tool" }, input: { metric: "gross_margin" } },
    { step_id: 4, type: "observation", content: "Gross margin 57.9%, above industry average" },
  ],
  outcome: {
    result_summary: "Strong quarterly performance driven by AI chip demand",
    confidence: 0.92,
  },
};

const score = await evaluateValue(trace);
// Con pesos de finanzas, la alta confianza del resultado (0.92) contribuye más
console.log(score); // ej. 0.78
```

Si el dominio no coincide con ningún perfil registrado, se usan los pesos **default**. Los dominios desconocidos se manejan silenciosamente -- no se lanza ningún error.

## Anulaciones Basadas en Reglas

Después de calcular la puntuación compuesta ponderada, tres anulaciones deterministas se aplican en orden:

### 1. Penalización de Paso Único

```ts
if (steps.length === 1 && steps[0].type === "thought") score = 0.1;
```

Una traza con un solo paso de pensamiento tiene valor mínimo de conocimiento. La puntuación se fuerza a `0.1` independientemente de otros factores.

### 2. Bonificación por Recuperación de Errores

```ts
if (errorRecovery > 2 && metadata.success) score = Math.min(1.0, score + 0.1);
```

Las trazas que se recuperan de más de 2 errores y aún tienen éxito demuestran una resiliencia valiosa. Se agrega una bonificación de `+0.1`, con tope en `1.0`.

### 3. Penalización por Diversidad Cero

```ts
if (uniqueTools <= 1 && steps.some(s => s.tool)) score = Math.max(0.0, score - 0.1);
```

Si una traza usa herramientas pero solo una herramienta única, se aplica una penalización de `-0.1`, con piso en `0.0`. Esto fomenta el uso diverso de herramientas.

:::note
La penalización de paso único tiene precedencia. Si una traza tiene exactamente un paso de pensamiento, la puntuación se establece en `0.1` primero. La bonificación por recuperación de errores y la penalización por diversidad cero se aplican sobre ese valor si sus condiciones también se cumplen.
:::

## Decaimiento Temporal para Novedad

La dimensión de novedad usa similitud basada en embeddings contra una caché vectorial local. A medida que la caché acumula trazas con el tiempo, la puntuación de novedad para trazas semánticamente similares disminuye naturalmente. Esto crea un efecto implícito de decaimiento temporal:

1. Traza nueva en una caché vacía: la novedad se establece por defecto en `0.5`.
2. Nueva traza única: la novedad se acerca a `1.0` (baja similitud con vectores existentes).
3. Patrón de traza repetido: la novedad se acerca a `0.0` (alta similitud con vectores en caché).

La caché vectorial soporta desalojo basado en TTL (introducido en la Fase 2), por lo que las entradas en caché expiran después de una ventana de tiempo configurable. Esto asegura que un tema revisitado después del período TTL recupere una puntuación de novedad más alta.

```ts
import { VectorCache } from "@knowledgepulse/sdk";

const cache = new VectorCache({
  maxElements: 1000,
  dimensions: 384,
  ttlMs: 3600000, // 1 hora — las entradas expiran después de esto
});
```

## Presupuesto de Rendimiento

La función de puntuación está diseñada para completarse en **100ms** para trazas típicas. Decisiones clave de implementación que soportan esta restricción:

| Componente | Estrategia | Latencia |
|-----------|----------|---------|
| Caché vectorial | Escaneo lineal por fuerza bruta sobre 1,000 vectores | < 1ms |
| Embedder | Carga perezosa, cacheado después de la primera invocación | ~50ms primera llamada, ~5ms subsiguientes |
| Cálculo compuesto | Aritmética pura, sin I/O | < 0.1ms |
| Anulaciones de reglas | Tres verificaciones condicionales | < 0.01ms |

Si el embedder opcional (`@huggingface/transformers`) no está instalado, la novedad se establece por defecto en `0.5` y toda la evaluación se ejecuta en menos de 1ms.

## Interfaz de Puntuación

```ts
interface ScoringWeights {
  complexity: number;
  novelty: number;
  toolDiversity: number;
  outcomeConfidence: number;
}

function evaluateValue(trace: ReasoningTrace): Promise<number>;
```

La función devuelve un `Promise<number>` entre `0.0` y `1.0`. Es con estado entre invocaciones dentro del mismo proceso porque la caché vectorial local persiste para los cálculos de novedad.

## Ejemplo: Comparando Perfiles de Dominio

La misma traza evaluada bajo diferentes dominios produce puntuaciones distintas debido a las diferencias de pesos:

```ts
// Misma estructura de traza, diferentes valores de task_domain
const domains = ["default", "finance", "code", "medical", "customer_service"];

for (const domain of domains) {
  const trace = createTrace({ task_domain: domain });
  const score = await evaluateValue(trace);
  console.log(`${domain}: ${score.toFixed(3)}`);
}

// Salida de ejemplo (varía según el contenido de la traza):
// default:          0.623
// finance:          0.714  (alta confianza recompensada)
// code:             0.598  (diversidad de herramientas enfatizada)
// medical:          0.751  (confianza domina)
// customer_service: 0.645  (balanceado)
```
