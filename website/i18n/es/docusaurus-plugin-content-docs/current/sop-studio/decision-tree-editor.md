---
sidebar_position: 2
title: Editor de Árbol de Decisión
sidebar_label: Editor
description: Usa el lienzo React Flow para construir visualmente árboles de decisión SOP con nodos de paso, condición y herramienta.
---

# Editor de Árbol de Decisión

El Editor de Árbol de Decisión es el núcleo de SOP Studio. Proporciona un lienzo visual impulsado por React Flow donde puedes construir, conectar y configurar árboles de decisión SOP.

## Vista General del Lienzo

El editor consiste en tres áreas:

| Área | Propósito |
|------|---------|
| **Paleta de nodos** (izquierda) | Arrastra tipos de nodos al lienzo |
| **Lienzo** (centro) | Grafo visual de tu árbol de decisión |
| **Panel de propiedades** (derecha) | Edita las propiedades del nodo seleccionado |

## Tipos de Nodos

### Nodo de Paso

Un nodo de Paso representa una sola acción o instrucción en el SOP.

### Nodo de Condición

Un nodo de Condición crea lógica de ramificación. Cada arista saliente representa un posible valor de condición.

### Nodo de Herramienta

Un nodo de Herramienta referencia una herramienta MCP externa o API que debe invocarse en un punto particular del flujo.

## Trabajar con el Lienzo

### Agregar Nodos

Arrastra un tipo de nodo desde la paleta izquierda al lienzo. El nodo aparece con propiedades por defecto que puedes editar en el panel derecho.

### Conectar Nodos

Haz clic en el handle de salida de un nodo (inferior) y arrastra al handle de entrada de otro nodo (superior) para crear una arista.

### Atajos de Teclado

| Atajo | Acción |
|----------|--------|
| `Ctrl+S` | Guardar SOP |
| `Ctrl+Z` | Deshacer |
| `Ctrl+Shift+Z` | Rehacer |
| `Delete` | Eliminar nodo o arista seleccionada |
| `Ctrl+A` | Seleccionar todos los nodos |
| `Ctrl+D` | Duplicar nodo seleccionado |

## Guardar y Exportar

### Guardar en el Registro

Haz clic en "Guardar" o presiona `Ctrl+S` para persistir el SOP en el Registro de KnowledgePulse conectado.

### Exportar como Skill-MD

Haz clic en "Exportar > Skill-MD" para generar un archivo `SKILL.md` a partir del SOP.

### Exportar como JSON

Haz clic en "Exportar > JSON" para descargar la estructura JSON cruda de `ExpertSOP`.

## Validación

El editor valida tu árbol de decisión en tiempo real:

- **Nodos desconectados** -- Advierte si algún nodo no tiene aristas entrantes o salientes
- **Instrucciones faltantes** -- Advierte si un nodo de Paso no tiene texto de instrucción
- **IDs de paso duplicados** -- Error si dos nodos comparten el mismo identificador de paso
- **Referencias circulares** -- Error si el grafo contiene ciclos
