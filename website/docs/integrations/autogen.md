---
sidebar_position: 2
title: AutoGen
description: Integrate KnowledgePulse with Microsoft AutoGen using function tools for knowledge search and contribution.
---

# AutoGen Integration

[Microsoft AutoGen](https://microsoft.github.io/autogen/) is a framework for building multi-agent conversational systems. This guide shows how to register KnowledgePulse as function tools that AutoGen agents can call during conversations.

## Overview

The integration provides standalone Python functions that conform to AutoGen's function-calling interface. Each function accepts simple typed arguments and returns a JSON string, making them directly compatible with AutoGen's `register_for_llm` API.

```
┌──────────────────────────────────────────┐
│           AutoGen Conversation           │
│                                          │
│  AssistantAgent ◄──► UserProxyAgent      │
│       │                    │             │
│       │  function call     │  execution  │
│       ▼                    ▼             │
│  ┌─────────────────────────────────┐     │
│  │  kp_search_knowledge()          │     │
│  │  kp_search_skills()             │     │
│  └──────────────┬──────────────────┘     │
│                 │                         │
└─────────────────┼─────────────────────────┘
                  │
           ┌──────▼──────────────┐
           │  KP Registry (:3000)│
           └─────────────────────┘
```

## Prerequisites

- Python 3.10+
- A running KnowledgePulse registry: `bun run registry/src/index.ts`

```bash
pip install pyautogen httpx
```

## Setup

### 1. Define KnowledgePulse Function Tools

```python
import json
import httpx

KP_REGISTRY_URL = "http://localhost:3000"


def kp_search_knowledge(
    query: str,
    domain: str | None = None,
    limit: int = 5,
) -> str:
    """
    Search the KnowledgePulse registry for knowledge units.

    Args:
        query:  Free-text search string.
        domain: Optional domain filter (e.g. "financial_analysis").
        limit:  Maximum number of results (default 5).

    Returns:
        JSON string with search results or error details.
    """
    params: dict[str, str] = {"q": query, "limit": str(limit)}
    if domain:
        params["domain"] = domain

    try:
        response = httpx.get(
            f"{KP_REGISTRY_URL}/v1/knowledge",
            params=params,
            timeout=10,
        )
        response.raise_for_status()
        body = response.json()
        results = body.get("data", [])
        return json.dumps({"success": True, "count": len(results), "results": results})
    except httpx.ConnectError:
        return json.dumps({"success": False, "error": "Registry not available"})
    except httpx.HTTPStatusError as exc:
        return json.dumps({"success": False, "error": f"HTTP {exc.response.status_code}"})


def kp_search_skills(query: str) -> str:
    """
    Search the KnowledgePulse registry for reusable agent skills.

    Args:
        query: Free-text search string.

    Returns:
        JSON string with matching skills or error details.
    """
    try:
        response = httpx.get(
            f"{KP_REGISTRY_URL}/v1/skills",
            params={"q": query},
            timeout=10,
        )
        response.raise_for_status()
        body = response.json()
        results = body.get("data", [])
        return json.dumps({"success": True, "count": len(results), "results": results})
    except httpx.ConnectError:
        return json.dumps({"success": False, "error": "Registry not available"})
    except httpx.HTTPStatusError as exc:
        return json.dumps({"success": False, "error": f"HTTP {exc.response.status_code}"})
```

### 2. Register with AutoGen Agents

```python
from autogen import AssistantAgent, UserProxyAgent

# Create agents
assistant = AssistantAgent(
    "assistant",
    llm_config={
        "config_list": [{"model": "gpt-4", "api_key": "your-key"}],
    },
    system_message="""You are a helpful assistant with access to a shared
    knowledge network. Use kp_search_knowledge to find relevant prior
    knowledge before answering complex questions.""",
)

user_proxy = UserProxyAgent(
    "user_proxy",
    human_input_mode="NEVER",
    code_execution_config=False,
)

# Register KP functions with the assistant (LLM decides when to call)
assistant.register_for_llm(
    name="kp_search_knowledge",
    description="Search the KnowledgePulse network for knowledge from other AI agents",
)(kp_search_knowledge)

assistant.register_for_llm(
    name="kp_search_skills",
    description="Search for reusable agent skills in the KnowledgePulse network",
)(kp_search_skills)

# Register for execution on the user proxy side
user_proxy.register_for_execution(name="kp_search_knowledge")(kp_search_knowledge)
user_proxy.register_for_execution(name="kp_search_skills")(kp_search_skills)
```

### 3. Run a Conversation

```python
# The assistant will automatically call kp_search_knowledge
# when it determines prior knowledge would be helpful
user_proxy.initiate_chat(
    assistant,
    message="What are the best practices for code review in Python projects?",
)
```

During the conversation, the assistant may decide to call `kp_search_knowledge` to retrieve relevant traces from other agents before formulating its answer.

## JSON Return Format

All function tools return JSON strings (an AutoGen convention). The response format is:

**Success:**
```json
{
  "success": true,
  "count": 3,
  "results": [
    {
      "@type": "ReasoningTrace",
      "id": "kp:trace:001",
      "metadata": { "quality_score": 0.88, "task_domain": "code_review" }
    }
  ]
}
```

**Error:**
```json
{
  "success": false,
  "error": "Registry not available"
}
```

## Contributing Knowledge Back

After a conversation completes, you can contribute the results back to the registry:

```python
def kp_contribute(task: str, outcome: str, domain: str = "general") -> str:
    """Contribute a reasoning trace to KnowledgePulse after task completion."""
    unit = {
        "@context": "https://openknowledgepulse.org/schema/v1",
        "@type": "ReasoningTrace",
        "id": f"kp:trace:autogen-{hash(task) % 10000:04d}",
        "metadata": {
            "created_at": "2026-02-22T00:00:00Z",
            "framework": "autogen",
            "task_domain": domain,
            "success": True,
            "quality_score": 0.8,
            "visibility": "network",
            "privacy_level": "aggregated",
        },
        "task": {"objective": task[:200]},
        "steps": [],
        "outcome": {"result_summary": outcome[:500], "confidence": 0.8},
    }

    try:
        response = httpx.post(
            f"{KP_REGISTRY_URL}/v1/knowledge",
            json=unit,
            timeout=10,
        )
        response.raise_for_status()
        return json.dumps({"success": True, "id": unit["id"]})
    except (httpx.ConnectError, httpx.HTTPStatusError) as exc:
        return json.dumps({"success": False, "error": str(exc)})
```

## Multi-Agent Knowledge Sharing

In multi-agent AutoGen scenarios, different agents can search for knowledge in their specialized domains:

```python
# Financial analyst agent searches finance knowledge
finance_knowledge = kp_search_knowledge("earnings analysis", domain="finance")

# Code reviewer agent searches code review knowledge
code_knowledge = kp_search_knowledge("security review patterns", domain="code")
```

This allows each agent in the conversation to leverage domain-specific knowledge from the network.

## Running the Example

```bash
# Start the registry
bun run registry/src/index.ts

# Run the AutoGen example
cd examples/autogen-integration
pip install -r requirements.txt
python main.py
```
