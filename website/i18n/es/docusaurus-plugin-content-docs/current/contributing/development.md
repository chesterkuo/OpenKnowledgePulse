---
sidebar_position: 1
title: Configuración del Entorno de Desarrollo
sidebar_label: Desarrollo
description: Cómo configurar un entorno de desarrollo local para el monorepo de KnowledgePulse.
---

# Configuración del Entorno de Desarrollo

Esta guía te lleva paso a paso por la configuración de un entorno de desarrollo local para el monorepo de KnowledgePulse.

## Requisitos Previos

- **Bun** v1.0 o posterior -- [instrucciones de instalación](https://bun.sh/docs/installation)
- **Git**

## Clonar e Instalar

```bash
git clone https://github.com/nicobailon/knowledgepulse.git
cd knowledgepulse
bun install
```

`bun install` resuelve todas las dependencias del workspace a través de cada paquete en el monorepo.

## Estructura del Monorepo

```
knowledgepulse/
  packages/
    sdk/           # @knowledgepulse/sdk -- tipos, captura, recuperación, puntuación, skill-md, migraciones
    mcp-server/    # @knowledgepulse/mcp -- 6 herramientas MCP, puente de registro en modo dual
    cli/           # @knowledgepulse/cli -- buscar, instalar, validar, contribuir, autenticación, seguridad
    sop-studio/    # Placeholder (Fase 3)
  registry/        # Servidor API REST con Hono (almacenes en memoria, autenticación, limitación de tasa)
  specs/           # codegen.ts, validate-consistency.ts, skill-md-extension.md
  examples/        # basic-sdk-usage, mcp-client-example, langraph-integration
```

## Tareas Comunes

### Construir el SDK

```bash
bun run build
```

### Generar el Esquema JSON

```bash
bun run codegen
```

### Lint

```bash
bun run lint
```

### Ejecutar Tests

```bash
bun test --recursive
```

### Iniciar el Registro

```bash
bun run registry/src/index.ts
```

### Iniciar el Servidor MCP

```bash
bun run packages/mcp-server/src/index.ts
```

## Referencia Rápida

| Tarea | Comando |
|---|---|
| Instalar dependencias | `bun install` |
| Construir SDK | `bun run build` |
| Generar esquema JSON | `bun run codegen` |
| Lint | `bun run lint` |
| Ejecutar todos los tests | `bun test --recursive` |
| Iniciar registro (puerto 8080) | `bun run registry/src/index.ts` |
| Iniciar servidor MCP (puerto 3001) | `bun run packages/mcp-server/src/index.ts` |
