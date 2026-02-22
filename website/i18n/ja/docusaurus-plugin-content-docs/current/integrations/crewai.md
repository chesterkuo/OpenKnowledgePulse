---
sidebar_position: 1
title: CrewAI
description: KnowledgePulse を CrewAI と統合して、クルーに共有エージェントナレッジへのアクセスを提供します。
sidebar_label: CrewAI
---

# CrewAI インテグレーション

[CrewAI](https://docs.crewai.com/) はロールプレイング AI エージェントをオーケストレーションするためのフレームワークです。このガイドでは、CrewAI エージェントを KnowledgePulse レジストリに接続して、過去のナレッジの検索、再利用可能なスキルの発見、独自の推論トレースのコントリビューションを行う方法を説明します。

## 概要

この統合は `KnowledgePulseTool` クラスを使用し、KP レジストリ API への HTTP 呼び出しをラップします。このクラスは任意の CrewAI エージェント内でカスタムツールとして使用できます。

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

## 前提条件

- Python 3.10+
- 実行中の KnowledgePulse レジストリ：`bun run registry/src/index.ts`

```bash
pip install crewai httpx
```

## セットアップ

### 1. KnowledgePulse ツールの作成

```python
from __future__ import annotations
import json
from typing import Any
import httpx

KP_REGISTRY_URL = "http://localhost:8080"

class KnowledgePulseTool:
    """CrewAI エージェントで使用するための KnowledgePulse レジストリ HTTP API ラッパー。"""

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
        """クエリにマッチするナレッジユニットをレジストリから検索します。"""
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
        """再利用可能なエージェントスキルをレジストリから検索します。"""
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
        """ナレッジユニット（推論トレース）をレジストリにコントリビュートします。"""
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

### 2. CrewAI エージェントでの使用

```python
from crewai import Agent, Task, Crew

# KP ツールを初期化
kp = KnowledgePulseTool(api_key="kp_your_api_key_here")

# KnowledgePulse を使用する CrewAI エージェントを作成
researcher = Agent(
    role="Research Analyst",
    goal="Analyze topics using prior knowledge from the network",
    backstory="You are a researcher who leverages shared agent knowledge.",
    verbose=True,
)

# タスク実行前に関連するナレッジを検索
prior_knowledge = kp.search_knowledge(
    query="financial analysis best practices",
    domain="finance",
    limit=3,
)

# 過去のナレッジからコンテキストを構築
context = ""
if prior_knowledge:
    for unit in prior_knowledge:
        context += f"- [{unit.get('@type')}] {unit.get('id')}\n"

# 拡張されたコンテキストでタスクを作成
task = Task(
    description=f"""Analyze the latest quarterly report.

Prior knowledge from the network:
{context if context else 'No prior knowledge available.'}""",
    expected_output="A detailed financial analysis report.",
    agent=researcher,
)

# クルーを実行
crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()

# タスク完了後、結果をコントリビュート
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

## ワークフローパターン

CrewAI の推奨統合パターンは3つのフェーズで構成されます：

1. **タスク前の検索**：クルーが開始する前に、KP レジストリから関連するナレッジを検索します。
2. **コンテキストの注入**：取得したナレッジをエージェントのタスク説明やバックストーリーに含めます。
3. **タスク後のコントリビューション**：クルーの完了後、推論トレースをレジストリにコントリビュートします。

これにより、各クルー実行が共有ナレッジを消費し、同時に生産する好循環が生まれます。

## エラーハンドリング

`KnowledgePulseTool` はネットワークエラーを適切に処理します。レジストリが利用できない場合、検索メソッドは空のリストを返し、コントリビュートメソッドは `None` を返します。これにより、レジストリがオフラインでも CrewAI エージェントが正常に機能し続けます。

```python
knowledge = kp.search_knowledge("debugging techniques")
if not knowledge:
    # 拡張なしで続行 -- クラッシュなし
    print("Running without prior knowledge")
```

## サンプルの実行

完全な動作サンプルがリポジトリにあります：

```bash
# レジストリを起動
bun run registry/src/index.ts

# CrewAI サンプルを実行
cd examples/crewai-integration
pip install -r requirements.txt
python main.py
```
