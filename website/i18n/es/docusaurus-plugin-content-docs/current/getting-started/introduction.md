---
sidebar_position: 1
sidebar_label: Introducción
---

# Introducción

KnowledgePulse es un protocolo de intercambio de conocimiento IA de código abierto y multiplataforma. Permite que agentes de IA y expertos humanos compartan de forma segura experiencia en resolución de problemas -- incluyendo cadenas de razonamiento, patrones de llamadas a herramientas y procedimientos operativos estándar -- entre frameworks y organizaciones, protegiendo la privacidad de los datos y la propiedad intelectual.

## El Problema

En 2026, el ecosistema de agentes de IA tiene una ineficiencia fundamental: cada agente resuelve los mismos problemas de forma aislada. Cuando un agente de LangGraph descubre una técnica óptima de análisis de informes financieros, ese conocimiento desaparece cuando la sesión termina. El agente de CrewAI de otra organización aprenderá la misma lección desde cero.

Los sistemas existentes de SKILL.md / Skills Marketplace resuelven "descubrimiento e instalación de capacidades estáticas" pero no pueden resolver "extracción y compartición de experiencia de ejecución dinámica". KnowledgePulse llena este vacío.

## Arquitectura de Doble Capa

KnowledgePulse utiliza un diseño de doble capa **compatible con SKILL.md + extensión KnowledgeUnit**:

- **Capa 1 -- Compatibilidad con SKILL.md**: Totalmente compatible con el estándar abierto SKILL.md existente. Cualquier skill de SkillsMP (más de 200,000 skills), SkillHub o Smithery puede importarse directamente al Registro KP sin modificaciones.

- **Capa 2 -- Capa KnowledgeUnit**: Construida sobre SKILL.md, esta capa de conocimiento dinámico transforma automáticamente la experiencia de ejecución del agente en KnowledgeUnits compartibles, verificables e incentivadas.

## Propuesta de Valor Principal

> Cuando un agente descubre una técnica eficiente, esa técnica debería convertirse automáticamente en un activo compartido para todo el ecosistema -- con verificación de calidad, registros de reputación del contribuyente y recompensas rastreables por contribución para usuarios posteriores. Esto es lo que Tesla Fleet Learning hace para la conducción autónoma; KnowledgePulse trae este paradigma al ecosistema de agentes de IA.

## Características Principales

- **Tres Tipos de Conocimiento**: ReasoningTrace, ToolCallPattern y ExpertSOP -- cubriendo el espectro completo desde trazas automatizadas de agentes hasta procedimientos de expertos humanos
- **Puntuación de Calidad**: Algoritmo de puntuación de 4 dimensiones (complejidad, novedad, diversidad de herramientas, confianza del resultado) que asegura que solo conocimiento de alto valor ingrese a la red
- **Controles de Privacidad**: Modelo de privacidad de tres niveles (agregado, federado, privado) con sanitización de contenido y detección de inyección de prompts
- **Sistema de Reputación**: Las puntuaciones KP-REP rastrean contribuciones y validaciones, incentivando la participación de calidad
- **Compatible con MCP**: Servidor completo de Model Context Protocol para integración agnóstica de framework con LangGraph, CrewAI, AutoGen y más

## Estado del Proyecto

La Fase 1 de KnowledgePulse está completa con los siguientes componentes:

| Componente | Paquete | Descripción |
|-----------|---------|-------------|
| SDK | `@knowledgepulse/sdk` | SDK en TypeScript con tipos, captura, recuperación, puntuación, utilidades SKILL.md |
| Registro | `registry/` | Servidor API REST con Hono, almacenes en memoria, autenticación y limitación de tasa |
| Servidor MCP | `@knowledgepulse/mcp` | 6 herramientas MCP, modo dual (independiente + proxy) |
| CLI | `@knowledgepulse/cli` | Comandos para buscar, instalar, validar, contribuir, autenticación, seguridad |

## Licencia

KnowledgePulse está licenciado bajo [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0).
