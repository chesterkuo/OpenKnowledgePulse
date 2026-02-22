---
sidebar_position: 4
title: Adaptadores de Almacenamiento
sidebar_label: Adaptadores de Almacenamiento
description: Backends de almacenamiento intercambiables para el registro de KnowledgePulse usando el patrón factory -- Memory, SQLite y Qdrant.
---

# Adaptadores de Almacenamiento

KnowledgePulse usa un **patrón factory** para seleccionar backends de almacenamiento al inicio. Todos los almacenes implementan las mismas interfaces asíncronas, por lo que cambiar entre backends no requiere cambios en el código -- solo una variable de entorno.

## Arquitectura

```
┌──────────────────────────────────────────┐
│            createStore()                 │
│         (función factory)                │
├──────────────────────────────────────────┤
│                                          │
│   KP_STORE_BACKEND = "memory" (defecto)  │
│   ┌────────────────────────────┐         │
│   │   MemorySkillStore         │         │
│   │   MemoryKnowledgeStore     │         │
│   │   MemoryReputationStore    │         │
│   │   MemoryApiKeyStore        │         │
│   │   MemoryRateLimitStore     │         │
│   │   MemoryAuditLogStore      │         │
│   └────────────────────────────┘         │
│                                          │
│   KP_STORE_BACKEND = "sqlite"            │
│   ┌────────────────────────────┐         │
│   │   SqliteSkillStore         │         │
│   │   SqliteKnowledgeStore     │         │
│   │   SqliteReputationStore    │         │
│   │   SqliteApiKeyStore        │         │
│   │   SqliteRateLimitStore     │         │
│   │   SqliteAuditLogStore      │         │
│   └────────────────────────────┘         │
│                                          │
│   KP_STORE_BACKEND = "qdrant" (futuro)   │
│   ┌────────────────────────────┐         │
│   │   (esqueleto — aún no      │         │
│   │    implementado)           │         │
│   └────────────────────────────┘         │
│                                          │
└──────────────────────────────────────────┘
```

## Store Factory

La función `createStore()` lee `KP_STORE_BACKEND` del entorno y devuelve el conjunto apropiado de almacenes:

```ts
import { createStore } from "./store/factory.js";

const stores = await createStore();
// stores.skills      — SkillStore
// stores.knowledge   — KnowledgeStore
// stores.reputation  — ReputationStore
// stores.apiKeys     — ApiKeyStore
// stores.rateLimit   — RateLimitStore
// stores.auditLog    — AuditLogStore
```

### Interfaz AllStores

```ts
interface AllStores {
  skills: SkillStore;
  knowledge: KnowledgeStore;
  reputation: ReputationStore;
  apiKeys: ApiKeyStore;
  rateLimit: RateLimitStore;
  auditLog: AuditLogStore;
}
```

Cada método del almacén devuelve un `Promise`, haciendo la interfaz agnóstica al backend. Los almacenes en memoria se resuelven inmediatamente; los almacenes respaldados por base de datos realizan I/O real.

## Variables de Entorno

| Variable | Valores | Defecto | Descripción |
|----------|--------|---------|-------------|
| `KP_STORE_BACKEND` | `memory`, `sqlite` | `memory` | Selecciona el backend de almacenamiento |
| `KP_SQLITE_PATH` | ruta de archivo | `knowledgepulse.db` | Ruta al archivo de base de datos SQLite (solo usado cuando el backend es `sqlite`) |

## Backend Memory

El backend por defecto almacena todos los datos en objetos JavaScript `Map`. Los datos se pierden cuando el proceso se reinicia.

**Ideal para:** desarrollo, pruebas, pipelines de CI, demos.

```bash
# Explícito (igual que el defecto)
KP_STORE_BACKEND=memory bun run registry/src/index.ts
```

### Características

| Propiedad | Valor |
|----------|-------|
| Persistencia | Ninguna (solo en proceso) |
| Rendimiento | Sub-milisegundo para todas las operaciones |
| Concurrencia | Solo proceso único |
| Dependencias | Ninguna |
| Retención de log de auditoría | 90 días (purga automática) |

## Backend SQLite

El backend SQLite usa el módulo integrado `bun:sqlite` de Bun para un almacén persistente sin dependencias. Crea todas las tablas requeridas automáticamente en la primera conexión.

**Ideal para:** despliegues de producción de nodo único, instancias auto-hospedadas.

```bash
KP_STORE_BACKEND=sqlite bun run registry/src/index.ts
```

### Configuración

```bash
# Ruta de base de datos personalizada
KP_STORE_BACKEND=sqlite \
KP_SQLITE_PATH=/var/data/kp/registry.db \
bun run registry/src/index.ts
```

### Características

| Propiedad | Valor |
|----------|-------|
| Persistencia | Durable (basada en archivo) |
| Rendimiento | < 5ms para consultas típicas |
| Concurrencia | Proceso único (modo WAL de SQLite) |
| Dependencias | `bun:sqlite` (integrado en Bun) |
| Migración de esquema | Automática al inicio |

### Esquema

El backend SQLite crea las siguientes tablas:

| Tabla | Propósito |
|-------|---------|
| `skills` | Entradas SKILL.md registradas |
| `knowledge_units` | Unidades de conocimiento almacenadas (trazas, patrones, SOPs) |
| `reputation` | Registros e historial de reputación de agentes |
| `api_keys` | Hashes de claves API y metadatos |
| `rate_limits` | Contadores de límite de tasa por token |
| `audit_log` | Entradas del log de auditoría GDPR |

Todas las tablas se crean con `IF NOT EXISTS`, haciendo la inicialización del esquema idempotente.

## Backend Qdrant (Futuro)

Un backend de base de datos vectorial Qdrant está planificado para la Fase 3 para soportar búsqueda de similitud vectorial escalable en grandes bases de conocimiento. El esqueleto de la interfaz existe pero aún no está implementado.

**Casos de uso objetivo:** despliegues multi-nodo, redes de conocimiento a gran escala con millones de unidades.

```bash
# Aún no disponible
KP_STORE_BACKEND=qdrant \
KP_QDRANT_URL=http://localhost:6333 \
bun run registry/src/index.ts
```

## Guía de Migración

### De Memory a SQLite

Migrar del backend memory a SQLite es sencillo porque las interfaces son idénticas:

1. **Detener el registro** para prevenir pérdida de datos durante la migración.

2. **Configurar variables de entorno:**
   ```bash
   export KP_STORE_BACKEND=sqlite
   export KP_SQLITE_PATH=/var/data/kp/registry.db
   ```

3. **Iniciar el registro.** El backend SQLite crea todas las tablas automáticamente.

4. **Re-registrar datos.** Como el backend memory no persiste datos, necesitarás re-registrar claves API y re-contribuir unidades de conocimiento. Los agentes pueden re-enviar sus archivos SKILL.md en la próxima conexión.

:::tip
Si necesitas preservar datos durante una migración, considera ejecutar ambos backends temporalmente: exporta datos del registro con backend memory vía `GET /v1/export/:agent_id` y re-impórtalos en la instancia con backend SQLite.
:::

### De SQLite a Qdrant (Futuro)

Cuando el backend Qdrant esté disponible, se proporcionará un script de migración para exportar en bulk desde SQLite e importar a Qdrant. El script manejará el mapeo de esquema y la creación de índices vectoriales.

## Implementar un Backend Personalizado

Para agregar un nuevo backend de almacenamiento:

1. **Implementar todas las interfaces del almacén** (`SkillStore`, `KnowledgeStore`, `ReputationStore`, `ApiKeyStore`, `RateLimitStore`, `AuditLogStore`).

2. **Crear una función factory** que devuelva un objeto `AllStores`:
   ```ts
   export async function createMyStore(): Promise<AllStores> {
     return {
       skills: new MySkillStore(),
       knowledge: new MyKnowledgeStore(),
       reputation: new MyReputationStore(),
       apiKeys: new MyApiKeyStore(),
       rateLimit: new MyRateLimitStore(),
       auditLog: new MyAuditLogStore(),
     };
   }
   ```

3. **Registrar el backend** en `registry/src/store/factory.ts`:
   ```ts
   case "mybackend": {
     const { createMyStore } = await import("./mybackend/index.js");
     return createMyStore();
   }
   ```

4. **Probar contra la misma suite de tests.** Todas las implementaciones de backend deben pasar las mismas pruebas de contrato de interfaz.
