---
sidebar_position: 1
title: CrewAI
description: 将 KnowledgePulse 与 CrewAI 集成，让您的 crew 访问共享的智能体知识。
---

# CrewAI 集成

[CrewAI](https://docs.crewai.com/) 是一个用于编排角色扮演 AI 智能体的框架。本指南展示如何将 CrewAI 智能体连接到 KnowledgePulse 注册表，使它们能够搜索先前的知识、发现可重用的技能，并贡献自己的推理追踪。

## 概述

该集成使用 `KnowledgePulseTool` 类来封装对 KP 注册表 API 的 HTTP 调用。此类可在任何 CrewAI 智能体中作为自定义工具使用。

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

## 前置条件

- Python 3.10+
- 运行中的 KnowledgePulse 注册表：`bun run registry/src/index.ts`

```bash
pip install crewai httpx
```

## 设置

### 1. 创建 KnowledgePulse 工具

```python
from __future__ import annotations
import json
from typing import Any
import httpx

KP_REGISTRY_URL = "http://localhost:3000"

class KnowledgePulseTool:
    """封装 KnowledgePulse 注册表 HTTP API，用于 CrewAI 智能体。"""

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
        """搜索注册表中匹配查询的知识单元。"""
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
            print(f"[KP] 注册表不可用：{self.registry_url}")
            return []

    def search_skills(
        self,
        query: str,
        tags: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """搜索注册表中可重用的智能体技能。"""
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
        """向注册表贡献知识单元（推理追踪）。"""
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

### 2. 与 CrewAI 智能体配合使用

```python
from crewai import Agent, Task, Crew

# 初始化 KP 工具
kp = KnowledgePulseTool(api_key="kp_your_api_key_here")

# 创建使用 KnowledgePulse 的 CrewAI 智能体
researcher = Agent(
    role="Research Analyst",
    goal="Analyze topics using prior knowledge from the network",
    backstory="You are a researcher who leverages shared agent knowledge.",
    verbose=True,
)

# 在运行任务之前搜索相关知识
prior_knowledge = kp.search_knowledge(
    query="financial analysis best practices",
    domain="finance",
    limit=3,
)

# 从先前知识构建上下文
context = ""
if prior_knowledge:
    for unit in prior_knowledge:
        context += f"- [{unit.get('@type')}] {unit.get('id')}\n"

# 创建带有增强上下文的任务
task = Task(
    description=f"""Analyze the latest quarterly report.

Prior knowledge from the network:
{context if context else 'No prior knowledge available.'}""",
    expected_output="A detailed financial analysis report.",
    agent=researcher,
)

# 运行 crew
crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()

# 任务完成后将结果贡献回网络
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

## 工作流模式

推荐的 CrewAI 集成模式包含三个阶段：

1. **任务前检索**：在 crew 开始之前，搜索 KP 注册表获取相关知识。
2. **上下文注入**：将检索到的知识包含在智能体的任务描述或背景故事中。
3. **任务后贡献**：crew 完成后，将推理追踪贡献回注册表。

这创建了一个良性循环，每次 crew 运行既消费也生产共享知识。

## 错误处理

`KnowledgePulseTool` 优雅地处理网络错误。如果注册表不可用，搜索方法返回空列表，贡献方法返回 `None`。这确保 CrewAI 智能体即使在注册表离线时也能继续正常运行。

```python
knowledge = kp.search_knowledge("debugging techniques")
if not knowledge:
    # 无需增强即可继续——不会崩溃
    print("无先前知识可用，继续运行")
```

## 运行示例

仓库中提供了完整的工作示例：

```bash
# 启动注册表
bun run registry/src/index.ts

# 运行 CrewAI 示例
cd examples/crewai-integration
pip install -r requirements.txt
python main.py
```
