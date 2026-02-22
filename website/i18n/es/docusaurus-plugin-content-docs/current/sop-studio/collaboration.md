---
sidebar_position: 4
title: Colaboración
sidebar_label: Colaboración
description: Edición colaborativa en tiempo real de SOPs con conexiones WebSocket e indicadores de presencia.
---

# Colaboración

SOP Studio soporta edición colaborativa en tiempo real, permitiendo que múltiples usuarios trabajen en el mismo SOP simultáneamente. Los cambios se sincronizan vía conexiones WebSocket y los conflictos se resuelven automáticamente.

## Habilitar la Colaboración

La colaboración requiere un registro en ejecución con soporte WebSocket. Asegúrate de que tu instancia del registro se inicie con WebSocket habilitado:

```bash
export KP_WEBSOCKET_ENABLED=true
bun run registry/src/index.ts
```

## Compartir un SOP

1. Abre un SOP en el editor.
2. Haz clic en el botón "Compartir" en la barra de herramientas.
3. Copia el enlace generado o invita a colaboradores por su ID de agente.

### Niveles de Acceso

| Nivel | Permisos |
|-------|-------------|
| **Visor** | Acceso de solo lectura al SOP |
| **Editor** | Puede modificar nodos, aristas y propiedades |
| **Propietario** | Control total incluyendo compartir y eliminación |

## Edición en Tiempo Real

Cuando múltiples usuarios editan el mismo SOP:

- **Presencia de cursor** -- El cursor de cada colaborador es visible en el lienzo con un indicador de color y su ID de agente.
- **Bloqueo de nodos** -- Cuando un usuario selecciona un nodo, muestra un borde de color indicando quién lo está editando.
- **Actualizaciones en vivo** -- Adiciones de nodos, eliminaciones, cambios de aristas y ediciones de propiedades se sincronizan en milisegundos.

## Conexión WebSocket

SOP Studio mantiene una conexión WebSocket persistente al registro para actualizaciones en tiempo real.

### Reconexión

Si la conexión se cae, SOP Studio intenta reconectarse automáticamente con backoff exponencial:

| Intento | Retraso |
|---------|-------|
| 1 | 1 segundo |
| 2 | 2 segundos |
| 3 | 4 segundos |
| 4+ | 8 segundos (máximo) |

Las ediciones realizadas mientras está desconectado se encolan localmente y se reproducen al reconectarse.

## Resolución de Conflictos

SOP Studio usa una estrategia de transformación operacional (OT) para la resolución de conflictos:

- **Ediciones de propiedades** -- Último escritor gana con ordenamiento por marca de tiempo.
- **Cambios estructurales** -- Adiciones y eliminaciones de nodos son conmutativas.
- **Conflictos de aristas** -- Si un nodo se elimina mientras otro usuario crea una arista hacia él, la creación de la arista se rechaza y el usuario es notificado.

## Permisos y Seguridad

- Todas las conexiones WebSocket requieren una clave API válida vía la solicitud de actualización HTTP inicial.
- Los colaboradores deben tener al menos alcance `read`. Se requiere alcance `write` para editar.
- La configuración de visibilidad del SOP (`private`, `org`, `network`) controla quién puede acceder al enlace de compartir.
- Los mensajes WebSocket se validan contra los mismos esquemas Zod usados por la API REST.
