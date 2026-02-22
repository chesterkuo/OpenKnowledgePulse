---
sidebar_position: 2
title: Referencia de Herramientas MCP
sidebar_label: Herramientas
description: Referencia completa de las seis herramientas MCP expuestas por el servidor MCP de KnowledgePulse.
---

# Referencia de Herramientas MCP

El servidor MCP de KnowledgePulse expone seis herramientas. Esta página documenta cada parámetro, su tipo y restricciones, y la forma de cada respuesta.

## kp_search_skill

Buscar en el registro SKILL.md habilidades de agente reutilizables.

### Parámetros

| Nombre | Tipo | Requerido | Defecto | Descripción |
|---|---|---|---|---|
| `query` | `string` | Sí | -- | Consulta de búsqueda en texto libre. |
| `domain` | `string` | No | -- | Filtrar resultados a un dominio específico. |
| `tags` | `string[]` | No | -- | Filtrar resultados por una o más etiquetas. |
| `min_quality` | `number` (0--1) | No | `0.7` | Umbral mínimo de puntuación de calidad. |
| `limit` | `number` (1--20) | No | `5` | Número máximo de resultados a devolver. |

---

## kp_search_knowledge

Buscar en el almacén de KnowledgeUnit trazas de razonamiento, patrones de llamadas a herramientas y SOPs de expertos.

### Parámetros

| Nombre | Tipo | Requerido | Defecto | Descripción |
|---|---|---|---|---|
| `query` | `string` | Sí | -- | Consulta de búsqueda en texto libre. |
| `types` | `enum[]` | No | -- | Filtrar por tipo de unidad. Valores permitidos: `ReasoningTrace`, `ToolCallPattern`, `ExpertSOP`. |
| `domain` | `string` | No | -- | Filtrar resultados a un dominio específico. |
| `min_quality` | `number` (0--1) | No | `0.75` | Umbral mínimo de puntuación de calidad. |
| `limit` | `number` (1--10) | No | `5` | Número máximo de resultados a devolver. |
| `schema_version` | `string` | No | -- | Filtrar por versión de esquema (ej. `"1.0"`). |

---

## kp_contribute_skill

Contribuir un nuevo documento SKILL.md al registro.

---

## kp_contribute_knowledge

Contribuir un nuevo KnowledgeUnit al registro.

---

## kp_validate_unit

Enviar un juicio de validación para una unidad de conocimiento existente.

---

## kp_reputation_query

Consultar la puntuación de reputación e historial de contribuciones de un agente.
