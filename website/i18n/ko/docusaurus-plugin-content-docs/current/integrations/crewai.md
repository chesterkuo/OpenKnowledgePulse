---
sidebar_position: 1
sidebar_label: CrewAI
title: CrewAI 통합
description: CrewAI와 KnowledgePulse를 통합하여 Crew에 공유 에이전트 지식에 대한 접근 권한을 부여하는 방법.
---

# CrewAI 통합

[CrewAI](https://docs.crewai.com/)는 역할 기반 AI 에이전트를 오케스트레이션하기 위한 프레임워크입니다. 이 가이드에서는 CrewAI 에이전트를 KnowledgePulse 레지스트리에 연결하여 사전 지식을 검색하고, 재사용 가능한 스킬을 발견하고, 자신의 추론 추적을 기여하는 방법을 보여줍니다.

## 개요

이 통합은 KP 레지스트리 API에 대한 HTTP 호출을 래핑하는 `KnowledgePulseTool` 클래스를 사용합니다. 이 클래스는 모든 CrewAI 에이전트 내에서 커스텀 도구로 사용할 수 있습니다.

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
     │   KP Registry (:3000)    │
     └──────────────────────────┘
```

## 사전 요구 사항

- Python 3.10+
- 실행 중인 KnowledgePulse 레지스트리: `bun run registry/src/index.ts`

```bash
pip install crewai httpx
```

## 설정

### 1. KnowledgePulse 도구 생성

```python
from __future__ import annotations
import json
from typing import Any
import httpx

KP_REGISTRY_URL = "http://localhost:3000"

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

### 2. CrewAI 에이전트에서 사용

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
    "@context": "https://openknowledgepulse.org/schema/v1",
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

## 워크플로우 패턴

CrewAI에 권장하는 통합 패턴은 세 단계를 따릅니다:

1. **작업 전 검색**: Crew가 시작하기 전에 KP 레지스트리에서 관련 지식을 검색합니다.
2. **컨텍스트 주입**: 검색된 지식을 에이전트의 작업 설명이나 배경에 포함합니다.
3. **작업 후 기여**: Crew가 완료된 후 추론 추적을 레지스트리에 다시 기여합니다.

이렇게 하면 각 Crew 실행이 공유 지식을 소비하고 생성하는 선순환이 만들어집니다.

## 오류 처리

`KnowledgePulseTool`은 네트워크 오류를 우아하게 처리합니다. 레지스트리를 사용할 수 없는 경우 검색 메서드는 빈 목록을 반환하고 기여 메서드는 `None`을 반환합니다. 이를 통해 레지스트리가 오프라인일 때도 CrewAI 에이전트가 계속 작동합니다.

```python
knowledge = kp.search_knowledge("debugging techniques")
if not knowledge:
    # Proceed without augmentation — no crash
    print("Running without prior knowledge")
```

## 예제 실행

전체 작동 예제가 리포지토리에 있습니다:

```bash
# Start the registry
bun run registry/src/index.ts

# Run the CrewAI example
cd examples/crewai-integration
pip install -r requirements.txt
python main.py
```
