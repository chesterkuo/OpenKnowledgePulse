---
sidebar_position: 2
title: Protocolo KnowledgeUnit
sidebar_label: Protocolo
description: Esquema JSON-LD, tipos de conocimiento, estrategia de versionado y sistema de migración.
---

# Protocolo KnowledgeUnit

El protocolo KnowledgeUnit define el formato canónico para representar conocimiento generado por IA. Cada unidad de conocimiento es un documento JSON-LD con un esquema bien definido, discriminador de tipo y contrato de versionado.

## Formato JSON-LD

Cada KnowledgeUnit es un documento JSON-LD con dos campos de contexto requeridos:

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "Trace",
  "id": "kp:trace:a1b2c3d4",
  ...
}
```

- **`@context`** -- El URI del espacio de nombres del esquema. Todos los documentos v1.x comparten el contexto `https://knowledgepulse.dev/schema/v1`. Una nueva versión mayor introduce un nuevo URI de contexto (por ejemplo, `.../v2`).
- **`@type`** -- El discriminador de tipo. Uno de `Trace`, `Pattern` o `SOP`.

## Tipos de KnowledgeUnit

El protocolo define tres tipos de unidades de conocimiento, cada uno con un prefijo de ID distinto:

| Tipo | Prefijo de ID | Descripción |
|------|-----------|-------------|
| **Trace** | `kp:trace:` | Un registro de una sola interacción de agente -- qué sucedió, qué se intentó, cuál fue el resultado. Las trazas son la materia prima de la que se extraen los patrones. |
| **Pattern** | `kp:pattern:` | Una solución o enfoque recurrente destilado de múltiples trazas. Los patrones capturan conocimiento reutilizable como "cuando ocurre X, hacer Y". |
| **SOP** | `kp:sop:` | Un Procedimiento Operativo Estándar -- un flujo de trabajo curado, paso a paso, ensamblado a partir de patrones. Los SOPs representan el conocimiento de mayor fidelidad en el sistema. |

La progresión de Trace a Pattern a SOP refleja niveles crecientes de curación y confianza:

```
Trace (observación en bruto)
  → Pattern (solución recurrente)
    → SOP (flujo de trabajo curado)
```

## Estrategia de Versionado del Esquema

KnowledgePulse usa versionado semántico para su esquema, con reglas claras para cada nivel de versión:

### Versiones Patch (por ejemplo, 1.0.0 a 1.0.1)

- Correcciones de errores y aclaraciones en descripciones de campos.
- **Sin cambio** en el URI `@context`.
- Sin campos nuevos, sin campos eliminados.
- Todos los consumidores existentes continúan funcionando sin modificaciones.

### Versiones Minor (por ejemplo, 1.0.0 a 1.1.0)

- **Solo aditivo** -- pueden introducirse nuevos campos opcionales.
- **Sin cambio** en el URI `@context` (sigue siendo `https://knowledgepulse.dev/schema/v1`).
- No se eliminan campos existentes ni se cambia su semántica.
- Los consumidores existentes continúan funcionando; simplemente ignoran los nuevos campos.

### Versiones Major (por ejemplo, v1 a v2)

- Cambios incompatibles -- los campos pueden ser eliminados, renombrados o tener su semántica cambiada.
- **Nuevo URI `@context`** (por ejemplo, `https://knowledgepulse.dev/schema/v2`).
- Requiere migración explícita.

## Reglas de Compatibilidad Retroactiva

Dos reglas gobiernan la interoperabilidad entre versiones:

1. **Los consumidores v1 deben parsear cualquier documento v1.x**, ignorando campos desconocidos. Un consumidor escrito contra v1.0 debe aceptar un documento v1.3 sin error -- simplemente descarta los campos que no reconoce.

2. **Los consumidores v2 deben aceptar documentos v1** con migración automática. Cuando un consumidor v2 encuentra un documento v1, aplica la función de migración registrada para actualizar el documento in situ.

## Negociación de Versión

### API REST

Los clientes declaran su versión de esquema preferida usando el header de solicitud `KP-Schema-Version`:

```http
GET /v1/knowledge/kp:trace:abc123
KP-Schema-Version: 1.2.0
```

El servidor responde con la unidad de conocimiento en la versión solicitada (o la versión compatible más cercana), y devuelve la versión resuelta:

```http
HTTP/1.1 200 OK
KP-Schema-Version: 1.2.0
Content-Type: application/ld+json
```

Si el servidor no puede satisfacer la versión solicitada, devuelve `406 Not Acceptable`.

### Herramientas MCP

Las herramientas MCP aceptan un parámetro `schema_version`:

```json
{
  "tool": "knowledgepulse_retrieve",
  "arguments": {
    "id": "kp:trace:abc123",
    "schema_version": "1.2.0"
  }
}
```

La unidad de conocimiento devuelta se ajusta a la versión de esquema solicitada.

## Sistema de Migración

Las funciones de migración residen en `packages/sdk/src/migrations/` y son **encadenables**. Cada función de migración transforma un documento de la versión N a la versión N+1:

```
v1 → v2 → v3
```

Para migrar un documento v1 a v3, el SDK encadena automáticamente las migraciones v1-a-v2 y v2-a-v3. Este diseño significa que cada migración solo necesita manejar un paso de versión, manteniendo la lógica simple y testeable.

```typescript
import { migrate } from "@knowledgepulse/sdk";

// Migrar un documento v1 a la última versión
const upgraded = migrate(v1Document, { targetVersion: "3.0.0" });
```

Las funciones de migración son puras -- toman un documento y devuelven un nuevo documento sin efectos secundarios.

## Política de Deprecación

Cuando se lanza una nueva versión mayor:

1. La **versión mayor anterior permanece soportada durante 12 meses** después de la fecha de lanzamiento de la nueva versión.
2. Durante la ventana de deprecación, las respuestas para la versión anterior incluyen un header `KP-Deprecated: true` para señalar que los consumidores deben actualizar.
3. Después de la ventana de 12 meses, el servidor puede dejar de servir la versión anterior y devolver `410 Gone`.

```http
HTTP/1.1 200 OK
KP-Schema-Version: 1.5.0
KP-Deprecated: true
Content-Type: application/ld+json
```

Los clientes deben monitorear el header `KP-Deprecated` y planificar su migración en consecuencia.
