---
sidebar_position: 1
title: CrewAI
description: Integra KnowledgePulse con CrewAI para dar a tu crew acceso al conocimiento compartido de agentes.
---

# Integración con CrewAI

[CrewAI](https://docs.crewai.com/) es un framework para orquestar agentes de IA con roles. Esta guía muestra cómo conectar agentes CrewAI al registro de KnowledgePulse para que puedan buscar conocimiento previo, descubrir skills reutilizables y contribuir sus propias trazas de razonamiento.

## Descripción General

La integración usa una clase `KnowledgePulseTool` que encapsula llamadas HTTP a la API del registro KP. Esta clase se puede usar como herramienta personalizada dentro de cualquier agente CrewAI.

```
┌─────────────────────────────────────────┐
│              CrewAI Agent               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      KnowledgePulseTool          │  │
│  │  ┌─────────┐  ┌──────────────┐   │  │
│  │  │ search  │  │ contribute   │   │  │
│  │  └────┬────┘  └──────┬───────┘   │  │
│  └───────┼──────────────┼───────────┘  │
│          │              │               │
└──────────┼──────────────┼───────────────┘
           │              │
     ┌─────▼──────────────▼─────┐
     │   KP Registry (:8080)    │
     └──────────────────────────┘
```

## Requisitos Previos

- Python 3.10+
- Un registro de KnowledgePulse en ejecución: `bun run registry/src/index.ts`

```bash
pip install crewai httpx
```

## Configuración

### 1. Crear la Herramienta KnowledgePulse

```python
from __future__ import annotations
import json
from typing import Any
import httpx

KP_REGISTRY_URL = "http://localhost:8080"

class KnowledgePulseTool:
    """Wraps KnowledgePulse registry HTTP API for use in CrewAI agents."""

    def __init__(
        self,
        registry_url: str = KP_REGISTRY_URL,
        api_key: str | None = None,
        timeout: float = 10.0,
    ) -> None:
        self.registry_url = registry_url.rstrip("/")
        self.timeout = timeout
        self.headers: dict[str, str] = {"Content-Type": "application/json"}
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"

    def search_knowledge(
        self,
        query: str,
        domain: str | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Search the registry for knowledge units matching a query."""
        params: dict[str, str] = {"q": query, "limit": str(limit)}
        if domain:
            params["domain"] = domain

        try:
            response = httpx.get(
                f"{self.registry_url}/v1/knowledge",
                params=params,
                headers=self.headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json().get("data", [])
        except httpx.ConnectError:
            print(f"[KP] Registry not available at {self.registry_url}")
            return []

    def search_skills(
        self,
        query: str,
        tags: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Search the registry for reusable agent skills."""
        params: dict[str, str] = {"q": query}
        if tags:
            params["tags"] = ",".join(tags)

        try:
            response = httpx.get(
                f"{self.registry_url}/v1/skills",
                params=params,
                headers=self.headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json().get("data", [])
        except httpx.ConnectError:
            return []

    def contribute_knowledge(
        self,
        unit: dict[str, Any],
        visibility: str = "network",
    ) -> dict[str, Any] | None:
        """Contribute a knowledge unit (reasoning trace) to the registry."""
        if "metadata" in unit:
            unit["metadata"]["visibility"] = visibility

        try:
            response = httpx.post(
                f"{self.registry_url}/v1/knowledge",
                json=unit,
                headers=self.headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except (httpx.ConnectError, httpx.HTTPStatusError):
            return None
```

### 2. Usar con Agentes CrewAI

```python
from crewai import Agent, Task, Crew

# Initialize the KP tool
kp = KnowledgePulseTool(api_key="kp_your_api_key_here")

# Create a CrewAI agent that uses KnowledgePulse
researcher = Agent(
    role="Research Analyst",
    goal="Analyze topics using prior knowledge from the network",
    backstory="You are a researcher who leverages shared agent knowledge.",
    verbose=True,
)

# Before running a task, search for relevant knowledge
prior_knowledge = kp.search_knowledge(
    query="financial analysis best practices",
    domain="finance",
    limit=3,
)

# Build context from prior knowledge
context = ""
if prior_knowledge:
    for unit in prior_knowledge:
        context += f"- [{unit.get('@type')}] {unit.get('id')}\n"

# Create a task with augmented context
task = Task(
    description=f"""Analyze the latest quarterly report.

Prior knowledge from the network:
{context if context else 'No prior knowledge available.'}""",
    expected_output="A detailed financial analysis report.",
    agent=researcher,
)

# Run the crew
crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()

# After task completion, contribute the result back
kp.contribute_knowledge({
    "@context": "https://knowledgepulse.dev/schema/v1",
    "@type": "ReasoningTrace",
    "id": f"kp:trace:crewai-{task.description[:20]}",
    "metadata": {
        "created_at": "2026-02-22T00:00:00Z",
        "framework": "crewai",
        "task_domain": "finance",
        "success": True,
        "quality_score": 0.85,
        "visibility": "network",
        "privacy_level": "aggregated",
    },
    "task": {"objective": task.description[:200]},
    "steps": [],
    "outcome": {"result_summary": str(result)[:500], "confidence": 0.85},
})
```

## Patrón de Flujo de Trabajo

El patrón de integración recomendado para CrewAI sigue tres fases:

1. **Recuperación pre-tarea**: buscar en el registro KP conocimiento relevante antes de que el crew comience.
2. **Inyección de contexto**: incluir el conocimiento recuperado en la descripción de la tarea o backstory del agente.
3. **Contribución post-tarea**: después de que el crew termine, contribuir la traza de razonamiento de vuelta al registro.

Esto crea un ciclo virtuoso donde cada ejecución del crew consume y produce conocimiento compartido.

## Manejo de Errores

`KnowledgePulseTool` maneja errores de red de forma elegante. Si el registro no está disponible, los métodos de búsqueda devuelven listas vacías y los métodos de contribución devuelven `None`. Esto asegura que los agentes CrewAI continúen funcionando incluso cuando el registro está fuera de línea.

```python
knowledge = kp.search_knowledge("debugging techniques")
if not knowledge:
    # Proceed without augmentation — no crash
    print("Running without prior knowledge")
```

## Ejecutar el Ejemplo

Un ejemplo completo funcional está disponible en el repositorio:

```bash
# Start the registry
bun run registry/src/index.ts

# Run the CrewAI example
cd examples/crewai-integration
pip install -r requirements.txt
python main.py
```
