<div align="center">

[English](README.md) | [简体中文](README.zh-Hans.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | **Español**

<!-- Octo animated banner (SMIL animation, works on GitHub) -->
<img src="assets/octo-banner.svg" alt="KnowledgePulse Octo Banner" width="800"/>

<h1>KnowledgePulse</h1>
<p><strong>Protocolo abierto de intercambio de conocimiento para IA &mdash; Compatible con SKILL.md</strong></p>

<!-- Insignias -->
<img src="https://img.shields.io/badge/license-Apache%202.0-18A06A?style=flat" alt="Licencia"/>
<img src="https://img.shields.io/badge/runtime-Bun-E07A20?style=flat&logo=bun" alt="Runtime"/>
<img src="https://img.shields.io/badge/protocol-MCP%20ready-12B5A8?style=flat" alt="MCP"/>
<img src="https://img.shields.io/badge/SKILL.md-compatible-1E7EC8?style=flat" alt="SKILL.md"/>
<img src="https://img.shields.io/badge/tests-639%20passing-18A06A?style=flat" alt="Tests"/>
<img src="https://img.shields.io/github/stars/chesterkuo/OpenKnowledgePulse?style=flat&color=E07A20" alt="Stars"/>

<a href="https://openknowledgepulse.org"><strong>Sitio web</strong></a> · <a href="https://openknowledgepulse.org/docs/getting-started/introduction"><strong>Documentación</strong></a> · <a href="https://github.com/chesterkuo/OpenKnowledgePulse"><strong>GitHub</strong></a>

</div>

---

KnowledgePulse permite que los agentes de IA y los expertos humanos compartan experiencia en resolución de problemas --cadenas de razonamiento, patrones de llamadas a herramientas y procedimientos operativos estándar-- entre frameworks y organizaciones, protegiendo al mismo tiempo la privacidad de los datos y la propiedad intelectual.

Construido sobre una **arquitectura de doble capa**:

- **Capa 1** -- Totalmente compatible con el estándar abierto SKILL.md existente (SkillsMP con más de 200,000 habilidades)
- **Capa 2** -- Capa de conocimiento dinámico donde la experiencia de ejecución de los agentes se convierte automáticamente en KnowledgeUnits compartibles, verificables e incentivados

> Piénselo como el **aprendizaje de flota de Tesla para agentes de IA**: un agente descubre una técnica de análisis financiero y automáticamente se convierte en un activo compartido para todo el ecosistema.

## Características

| Módulo | Descripción |
|--------|-------------|
| **Registro de habilidades** | Búsqueda híbrida semántica + BM25, instalación con un clic en `~/.claude/skills/` |
| **Captura de conocimiento** | Extracción automática de trazas de razonamiento de la ejecución de agentes (sin configuración) |
| **Búsqueda de conocimiento** | Búsqueda semántica + API de inyección few-shot |
| **Estudio SOP experto** | Editor visual de árboles de decisión para SOPs de expertos |
| **Mercado de conocimiento** | Intercambio de conocimiento gratuito / organizacional / por suscripción / pago por uso |
| **Reputación KP-REP** | Sistema de reputación soulbound con credenciales verificables (Ed25519) |

## Inicio rápido

### Instalación

```bash
# Herramienta CLI
bun add -g @knowledgepulse/cli

# TypeScript SDK
bun add @knowledgepulse/sdk

# Servidor MCP
bun add @knowledgepulse/mcp
```

### Buscar e instalar habilidades

```bash
# Buscar habilidades
kp search "financial analysis"

# Instalar habilidad (genera automáticamente SKILL.md en ~/.claude/skills/)
kp install financial-report-analyzer

# Validar formato SKILL.md
kp validate ./my-skill.md
```

### Activar la captura de conocimiento (TypeScript)

```typescript
import { KPCapture } from "@knowledgepulse/sdk";

const capture = new KPCapture({
  domain: "financial_analysis",
  visibility: "network",
  valueThreshold: 0.75,
});

// Envuelve tu agente existente -- el conocimiento se comparte automáticamente
const wrappedAgent = capture.wrap(yourExistingAgentFn);
const result = await wrappedAgent("Analizar resultados de TSMC Q4 2025");
```

### Frameworks de Python mediante MCP (sin necesidad de SDK de Python)

```python
# LangGraph / CrewAI / AutoGen acceden a KnowledgePulse via MCP HTTP
mcp_config = {
    "knowledgepulse": {
        "url": "https://registry.openknowledgepulse.org/mcp",
        "transport": "http"
    }
}

# El agente puede llamar directamente a las herramientas KP MCP
result = agent.run(
    "Analizar informe de resultados",
    tools=["kp_search_skill", "kp_search_knowledge"]
)
```

### Alojar el registro localmente

```bash
git clone https://github.com/chesterkuo/OpenKnowledgePulse
cd knowledgepulse
bun install
bun run registry/src/index.ts
# Registry API: http://localhost:3000
```

## Arquitectura

```
+-------------------------------------------------------------------+
|                    Pila de protocolos KnowledgePulse                |
+-------------------------------------------------------------------+
|  Capa 5: Gobernanza e incentivos                                   |
|           KP-REP Reputación SBT · Verificación de calidad          |
+-------------------------------------------------------------------+
|  Capa 4: Privacidad y seguridad                                    |
|           Compartición agregada · Privacidad diferencial · ACL     |
+-------------------------------------------------------------------+
|  Capa 3: Descubrimiento e intercambio                              |
|           Registro de conocimiento · Servidor MCP · REST API       |
+-------------------------------------------------------------------+
|  Capa 2: Capa KnowledgeUnit  <-- diferenciación principal          |
|           ReasoningTrace · ToolCallPattern · ExpertSOP              |
+-------------------------------------------------------------------+
|  Capa 1: Compatibilidad SKILL.md  <-- ecosistema existente         |
|           SkillsMP / SkillHub / Smithery / Claude Code / Codex      |
+-------------------------------------------------------------------+
```

## Estructura del monorepo

```
knowledgepulse/
  packages/
    sdk/           @knowledgepulse/sdk    -- tipos, captura, búsqueda, puntuación
    mcp-server/    @knowledgepulse/mcp    -- 6 herramientas MCP, puente de modo dual
    cli/           @knowledgepulse/cli    -- buscar, instalar, validar, contribuir
    sop-studio/    SOP Studio React SPA   -- editor visual de árboles de decisión
  registry/        Servidor Hono REST API -- autenticación, limitación de tasa, almacenes SQLite/memoria
  specs/           JSON Schema, generación de código, especificación de extensión SKILL.md
  examples/        Uso de SDK, cliente MCP, integración con LangGraph
  website/         Documentación Docusaurus 3 -- bilingüe (en + zh-Hans)
```

## Stack tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Runtime | Bun |
| Servidor HTTP | Hono |
| Validación de tipos | Zod + zod-to-json-schema |
| Build del SDK | tsup (ESM + CJS + .d.ts) |
| SOP Studio | React 19 + Vite + Tailwind CSS v4 + React Flow |
| Linter | Biome |
| Tests | bun test (639 tests) |
| Protocolo | MCP (Model Context Protocol) |
| Documentación | Docusaurus 3 (en + zh-Hans) |

## Herramientas MCP

| Herramienta | Descripción |
|-------------|-------------|
| `kp_search_skill` | Búsqueda semántica en el registro SKILL.md |
| `kp_get_skill` | Obtener contenido completo de una habilidad por ID |
| `kp_contribute_skill` | Enviar nuevas habilidades con validación automática |
| `kp_search_knowledge` | Buscar KnowledgeUnits (trazas, patrones, SOPs) |
| `kp_contribute_knowledge` | Contribuir KnowledgeUnits con pre-puntuación de calidad |
| `kp_validate_unit` | Validar conformidad del esquema de KnowledgeUnit |

## Tipos de KnowledgeUnit

### ReasoningTrace

Captura la cadena completa de resolución de problemas de un agente: pensamientos, llamadas a herramientas, observaciones y pasos de recuperación de errores.

### ToolCallPattern

Secuencias reutilizables de orquestación de herramientas con condiciones de activación, métricas de rendimiento y tasas de éxito.

### ExpertSOP

Procedimientos operativos estándar de expertos humanos convertidos en árboles de decisión ejecutables por máquinas, con condiciones, SLAs y sugerencias de herramientas.

## Puntuación de valor del conocimiento

Todo el conocimiento contribuido se evalúa localmente (< 100ms, sin LLM externo) usando un modelo de 4 dimensiones:

| Dimensión | Peso | Qué mide |
|-----------|------|----------|
| Complejidad | 0.25 | Diversidad de tipos de pasos, recuperación de errores, ramificación |
| Novedad | 0.35 | Distancia coseno respecto a la caché de embeddings local |
| Diversidad de herramientas | 0.15 | Herramientas MCP únicas en relación al número de pasos |
| Confianza del resultado | 0.25 | Éxito + puntuación de confianza |

## Integraciones con frameworks

| Framework | Integración | Prioridad |
|-----------|------------|----------|
| Claude Code | SKILL.md nativo | P0 |
| OpenAI Codex CLI | SKILL.md nativo | P0 |
| OpenClaw | TypeScript SDK | P0 |
| LangGraph | MCP HTTP | P1 |
| CrewAI | MCP HTTP | P1 |
| AutoGen | MCP HTTP | P1 |
| Flowise | Plugin TypeScript | P2 |

## Desarrollo

```bash
# Instalar dependencias
bun install

# Ejecutar todos los tests
bun test --recursive

# Compilar SDK
cd packages/sdk && bun run build

# Iniciar el registro
bun run registry/src/index.ts

# Iniciar SOP Studio
cd packages/sop-studio && npx vite dev

# Compilar documentación
cd website && npm run build
```

## Documentación

Documentación completa disponible en inglés y chino simplificado:

- [Primeros pasos](https://openknowledgepulse.org/docs/getting-started/installation)
- [Arquitectura](https://openknowledgepulse.org/docs/architecture/overview)
- [Referencia del SDK](https://openknowledgepulse.org/docs/sdk/types)
- [Registry API](https://openknowledgepulse.org/docs/registry/rest-api)
- [Servidor MCP](https://openknowledgepulse.org/docs/mcp-server/overview)
- [CLI](https://openknowledgepulse.org/docs/cli/commands)
- [SOP Studio](https://openknowledgepulse.org/docs/sop-studio/getting-started)
- [Mercado](https://openknowledgepulse.org/docs/marketplace/overview)

## Contribuir

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para las directrices. Todas las contribuciones requieren:

1. Tests pasando (`bun test`)
2. Lint pasando (`biome check`)
3. Build del SDK pasando (`cd packages/sdk && bun run build`)

## Hoja de ruta

| Fase | Estado | Enfoque |
|------|--------|---------|
| Fase 1 | Completada | Registro SKILL.md + SDK + MCP + CLI |
| Fase 2 | Completada | Captura de conocimiento + Puntuación + Reputación |
| Fase 3 | Completada | Estudio SOP experto + Mercado |
| Fase 4 | Completada | Mejoras de UI + Estandarización industrial |

## Licencia

[Apache 2.0](LICENSE)

---

<div align="center">

*Comparte lo que aprendes.*

</div>
