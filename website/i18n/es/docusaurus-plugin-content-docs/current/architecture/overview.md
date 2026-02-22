---
sidebar_position: 1
title: Descripción General de la Arquitectura
sidebar_label: Descripción General
description: Arquitectura de doble capa, pila de protocolo y estructura del monorepo de KnowledgePulse.
---

# Descripción General de la Arquitectura

KnowledgePulse es un protocolo de intercambio de conocimiento IA construido sobre una arquitectura de doble capa. La **capa de protocolo** define cómo se estructura, descubre y gobierna el conocimiento, mientras que la **capa de infraestructura** proporciona los componentes de ejecución concretos que implementan el protocolo.

## Pila de Protocolo

El protocolo está organizado en cinco capas, cada una construida sobre la anterior:

```
┌─────────────────────────────────────────┐
│            5. Gobernanza                │
│   Licencias, atribución, pista de       │
│   auditoría                             │
├─────────────────────────────────────────┤
│            4. Privacidad                │
│   Alcance, redacción, cumplimiento GDPR │
├─────────────────────────────────────────┤
│            3. Descubrimiento            │
│   Búsqueda, puntuación, recuperación    │
│   vectorial                             │
├─────────────────────────────────────────┤
│            2. KnowledgeUnit             │
│   Esquema JSON-LD, tipos, versionado    │
├─────────────────────────────────────────┤
│            1. SKILL.md                  │
│   Formato de declaración de capacidades │
│   del agente                            │
└─────────────────────────────────────────┘
```

**Capa 1 -- SKILL.md** define un formato de archivo estándar para que los agentes declaren sus capacidades, entradas, salidas y restricciones. Es el contrato fundamental que las demás capas referencian.

**Capa 2 -- KnowledgeUnit** especifica el esquema JSON-LD para tres tipos de conocimiento (trazas, patrones y SOPs) y las reglas de versionado que gobiernan la evolución del esquema.

**Capa 3 -- Descubrimiento** cubre cómo las unidades de conocimiento se indexan, buscan, puntúan por relevancia y recuperan -- incluyendo búsqueda por similitud vectorial.

**Capa 4 -- Privacidad** maneja las reglas de alcance, redacción a nivel de campo y operaciones obligatorias por GDPR como exportación de datos y el derecho al olvido.

**Capa 5 -- Gobernanza** aborda licencias, cadenas de atribución y pistas de auditoría que rastrean cómo fluye el conocimiento entre agentes.

## Resumen de Componentes

Cuatro componentes de ejecución implementan la pila de protocolo:

| Componente | Paquete | Rol |
|-----------|---------|------|
| **SDK** | `@knowledgepulse/sdk` | Biblioteca principal -- tipos, captura, recuperación, puntuación, parseo de SKILL.md, migraciones |
| **Registro** | `registry/` | Servidor API REST con Hono -- almacena unidades de conocimiento, maneja autenticación, limitación de tasa |
| **Servidor MCP** | `@knowledgepulse/mcp` | Servidor Model Context Protocol -- expone 6 herramientas MCP, puente de registro en modo dual |
| **CLI** | `@knowledgepulse/cli` | Interfaz de línea de comandos -- buscar, instalar, validar, contribuir, autenticación, seguridad |

### SDK

El SDK (`packages/sdk`) es la biblioteca principal de la que dependen todos los demás componentes. Proporciona tipos TypeScript generados a partir de esquemas Zod, funciones para capturar y recuperar unidades de conocimiento, puntuación de relevancia, parseo y sanitización de SKILL.md, y funciones de migración encadenables para actualizaciones de versiones de esquema.

### Registro

El Registro (`registry/`) es un servidor API REST basado en Hono que actúa como almacén central para unidades de conocimiento. Maneja la autenticación mediante tokens Bearer, limitación de tasa basada en niveles, y expone endpoints CRUD para unidades de conocimiento.

### Servidor MCP

El Servidor MCP (`packages/mcp-server`) expone la funcionalidad de KnowledgePulse a través del Model Context Protocol, haciéndola accesible a cualquier cliente IA compatible con MCP. Opera en **modo dual**:

- **Modo independiente** -- se ejecuta con su propio almacén en memoria.
- **Modo proxy** -- se conecta a una instancia de registro remota a través de la variable de entorno `KP_REGISTRY_URL`.

### CLI

El CLI (`packages/cli`) proporciona una interfaz de línea de comandos para que desarrolladores y agentes interactúen con el protocolo -- buscando conocimiento, instalando archivos SKILL.md, validando esquemas, contribuyendo unidades de conocimiento y gestionando la autenticación.

## Estructura del Monorepo

```
knowledgepulse/
├── packages/
│   ├── sdk/            # @knowledgepulse/sdk — tipos, captura, recuperación, puntuación, migraciones
│   ├── mcp-server/     # @knowledgepulse/mcp — 6 herramientas MCP, puente de registro en modo dual
│   ├── cli/            # @knowledgepulse/cli — buscar, instalar, validar, contribuir, autenticación
│   └── sop-studio/     # Placeholder (Fase 3)
├── registry/           # Servidor API REST con Hono (almacenes en memoria, autenticación, limitación de tasa)
├── specs/              # codegen.ts, validate-consistency.ts, skill-md-extension.md
├── examples/           # basic-sdk-usage, mcp-client-example, langraph-integration
└── website/            # Sitio de documentación Docusaurus
```

## Modelo de Almacenamiento

La Fase 1 usa **almacenes `Map<>` en memoria** detrás de interfaces asíncronas `Promise<T>`. Este diseño es intencional: la frontera de interfaz asíncrona significa que el backend de almacenamiento puede ser reemplazado por una base de datos persistente (PostgreSQL, SQLite, etc.) sin cambiar ningún código consumidor. La caché vectorial usa un escaneo lineal por fuerza bruta en lugar de HNSW, y es igualmente intercambiable a través de su interfaz.

## Stack Tecnológico

| Tecnología | Propósito |
|------------|---------|
| **Bun** | Runtime JavaScript/TypeScript y gestor de paquetes |
| **Hono** | Framework HTTP ligero para el Registro y el Servidor MCP |
| **Zod v3** | Definición y validación de esquemas (con `zod-to-json-schema` para generación de código) |
| **tsup** | Herramienta de build para el SDK (ESM + CJS + declaraciones TypeScript) |
| **Biome** | Linter y formateador |
| **@modelcontextprotocol/sdk** | Implementación del protocolo MCP |
| **bun test** | Ejecutor de tests (319 tests en 15 archivos) |
