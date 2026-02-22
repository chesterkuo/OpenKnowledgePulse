---
sidebar_position: 1
title: Primeros Pasos
sidebar_label: Primeros Pasos
description: Inicia SOP Studio, configura tu conexión al registro y crea tu primer Procedimiento Operativo Estándar.
---

# Primeros Pasos con SOP Studio

SOP Studio es un editor visual para construir Procedimientos Operativos Estándar (SOPs) que pueden publicarse en el registro de KnowledgePulse como unidades de conocimiento `ExpertSOP`. Proporciona un lienzo de arrastrar y soltar, importación de documentos con extracción por LLM y colaboración en tiempo real.

## Requisitos Previos

- Una instancia del Registro de KnowledgePulse en ejecución (local o remota)
- Una clave API con alcance `write` (ver [Autenticación](../registry/authentication.md))

## Configuración

Establece las siguientes variables de entorno antes de iniciar SOP Studio:

```bash
export KP_REGISTRY_URL="http://localhost:8080"
export KP_API_KEY="kp_your_api_key_here"
```

Alternativamente, configúralas en el panel de configuración de SOP Studio después del inicio.

## Iniciar SOP Studio

Inicia el servidor de desarrollo de SOP Studio:

```bash
cd packages/sop-studio
bun run dev
```

El estudio se abre en `http://localhost:5173` por defecto.

## Crear Tu Primer SOP

1. **Nuevo SOP** -- Haz clic en el botón "Nuevo SOP" en la barra de herramientas superior.
2. **Configurar metadatos** -- Proporciona un nombre, dominio y descripción en el panel de propiedades a la derecha.
3. **Agregar pasos** -- Arrastra nodos de Paso desde la paleta al lienzo. Cada paso tiene un campo de instrucción y criterios opcionales.
4. **Agregar condiciones** -- Usa nodos de Condición para crear lógica de ramificación (ej. "Si la severidad es alta, escalar").
5. **Conectar nodos** -- Dibuja aristas entre nodos para definir el flujo.
6. **Guardar** -- Presiona `Ctrl+S` o haz clic en "Guardar" para persistir el SOP en el registro.

## Campos de Metadatos del SOP

| Campo | Tipo | Requerido | Descripción |
|-------|------|----------|-------------|
| `name` | string | Sí | Nombre legible del SOP |
| `domain` | string | Sí | Dominio de tarea (ej. `customer-support`) |
| `description` | string | No | Resumen breve del SOP |
| `visibility` | string | Sí | `private`, `org` o `network` |
| `tags` | string[] | No | Etiquetas de búsqueda |

## Próximos Pasos

- [Editor de Árbol de Decisión](./decision-tree-editor.md) -- Aprende sobre los tipos de nodos y el lienzo visual
- [Importación de Documentos](./document-import.md) -- Importa SOPs existentes desde DOCX o PDF
- [Colaboración](./collaboration.md) -- Invita a compañeros de equipo a editar en tiempo real
