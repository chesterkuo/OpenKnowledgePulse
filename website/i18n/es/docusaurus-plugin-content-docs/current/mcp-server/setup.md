---
sidebar_position: 1
title: Configuración del Servidor MCP
sidebar_label: Configuración
description: Cómo instalar, configurar y ejecutar el servidor MCP de KnowledgePulse en modo independiente o proxy.
---

# Configuración del Servidor MCP

El servidor MCP de KnowledgePulse (`@knowledgepulse/mcp` v1.1.0) expone el protocolo KnowledgePulse como un conjunto de herramientas [Model Context Protocol](https://modelcontextprotocol.io/) que cualquier cliente IA compatible con MCP puede llamar.

## Transporte

El servidor usa transporte **Streamable HTTP**:

| Endpoint | Método | Descripción |
|---|---|---|
| `/mcp` | `POST` | Invocación de herramientas MCP (Streamable HTTP) |
| `/health` | `GET` | Verificación de estado |

## Operación en Modo Dual

El servidor MCP puede ejecutarse en dos modos dependiendo de si la variable de entorno `KP_REGISTRY_URL` está configurada.

### Modo Independiente (predeterminado)

En modo independiente el servidor usa sus propios almacenes en memoria. Es la forma más sencilla de comenzar y es adecuada para desarrollo y pruebas locales.

```bash
bun run packages/mcp-server/src/index.ts
```

### Modo Proxy

En modo proxy el servidor reenvía todas las solicitudes a una instancia de registro KnowledgePulse en ejecución.

```bash
KP_REGISTRY_URL=http://localhost:8080 KP_API_KEY=kp_abc123 \
  bun run packages/mcp-server/src/index.ts
```

## Variables de Entorno

| Variable | Descripción | Defecto |
|---|---|---|
| `KP_MCP_PORT` | Puerto en el que escucha el servidor MCP | `3001` |
| `KP_REGISTRY_URL` | URL del registro para modo proxy. Cuando no está configurado, el servidor se ejecuta en modo independiente. | _(no configurado)_ |
| `KP_API_KEY` | Clave API enviada con solicitudes autenticadas al registro en modo proxy. | _(no configurado)_ |

## Integración con Frameworks de IA

El servidor MCP funciona con cualquier cliente compatible con MCP a través de transporte Streamable HTTP. Ejemplos incluyen:

- **Claude Desktop** -- agrega la URL del servidor a tu configuración MCP.
- **LangGraph** -- usa el adaptador de herramientas MCP para conectarse al servidor.
- **CrewAI** -- registra el servidor como proveedor de herramientas MCP.
- **AutoGen** -- conecta agentes al servidor a través del SDK de cliente MCP.

Apunta tu cliente a `http://localhost:3001/mcp` (o cualquier host y puerto que hayas configurado) y las seis herramientas de KnowledgePulse estarán disponibles para que tus agentes las llamen. Ver [Herramientas MCP](./tools.md) para una referencia completa.
