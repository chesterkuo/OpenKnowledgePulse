---
sidebar_position: 1
title: CrewAI
description: Integrate KnowledgePulse with CrewAI to give your crew access to shared agent knowledge.
---

# CrewAI Integration

[CrewAI](https://docs.crewai.com/) is a framework for orchestrating role-playing AI agents. This guide shows how to connect CrewAI agents to the KnowledgePulse registry so they can search for prior knowledge, discover reusable skills, and contribute their own reasoning traces.

## Overview

The integration uses a `KnowledgePulseTool` class that wraps HTTP calls to the KP registry API. This class can be used as a custom tool within any CrewAI agent.

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

## Prerequisites

- Python 3.10+
- A running KnowledgePulse registry: `bun run registry/src/index.ts`

```bash
pip install crewai httpx
```

## Setup

### 1. Create the KnowledgePulse Tool

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

### 2. Use with CrewAI Agents

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

## Workflow Pattern

The recommended integration pattern for CrewAI follows three phases:

1. **Pre-task retrieval**: search the KP registry for relevant knowledge before the crew starts.
2. **Context injection**: include retrieved knowledge in the agent's task description or backstory.
3. **Post-task contribution**: after the crew completes, contribute the reasoning trace back to the registry.

This creates a virtuous cycle where each crew run both consumes and produces shared knowledge.

## Error Handling

The `KnowledgePulseTool` handles network errors gracefully. If the registry is unavailable, search methods return empty lists and contribute methods return `None`. This ensures that CrewAI agents continue functioning even when the registry is offline.

```python
knowledge = kp.search_knowledge("debugging techniques")
if not knowledge:
    # Proceed without augmentation — no crash
    print("Running without prior knowledge")
```

## Running the Example

A complete working example is available in the repository:

```bash
# Start the registry
bun run registry/src/index.ts

# Run the CrewAI example
cd examples/crewai-integration
pip install -r requirements.txt
python main.py
```
