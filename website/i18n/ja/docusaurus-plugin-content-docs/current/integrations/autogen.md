---
sidebar_position: 2
title: AutoGen
description: Microsoft AutoGen とファンクションツールを使用して、KnowledgePulse のナレッジ検索とコントリビューションを統合します。
sidebar_label: AutoGen
---

# AutoGen インテグレーション

[Microsoft AutoGen](https://microsoft.github.io/autogen/) はマルチエージェント会話システムを構築するためのフレームワークです。このガイドでは、KnowledgePulse をファンクションツールとして登録し、AutoGen エージェントが会話中に呼び出せるようにする方法を説明します。

## 概要

この統合は AutoGen のファンクション呼び出しインターフェースに準拠したスタンドアロン Python 関数を提供します。各関数はシンプルな型付き引数を受け取り、JSON 文字列を返すため、AutoGen の `register_for_llm` API と直接互換性があります。

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

## 前提条件

- Python 3.10+
- 実行中の KnowledgePulse レジストリ：`bun run registry/src/index.ts`

```bash
pip install pyautogen httpx
```

## セットアップ

### 1. KnowledgePulse ファンクションツールの定義

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
    KnowledgePulse レジストリからナレッジユニットを検索します。

    Args:
        query:  フリーテキスト検索文字列。
        domain: オプションのドメインフィルタ（例："financial_analysis"）。
        limit:  結果の最大数（デフォルト 5）。

    Returns:
        検索結果またはエラー詳細を含む JSON 文字列。
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
    KnowledgePulse レジストリから再利用可能なエージェントスキルを検索します。

    Args:
        query: フリーテキスト検索文字列。

    Returns:
        マッチするスキルまたはエラー詳細を含む JSON 文字列。
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

### 2. AutoGen エージェントへの登録

```python
from autogen import AssistantAgent, UserProxyAgent

# エージェントを作成
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

# KP 関数をアシスタントに登録（LLM が呼び出しを決定）
assistant.register_for_llm(
    name="kp_search_knowledge",
    description="Search the KnowledgePulse network for knowledge from other AI agents",
)(kp_search_knowledge)

assistant.register_for_llm(
    name="kp_search_skills",
    description="Search for reusable agent skills in the KnowledgePulse network",
)(kp_search_skills)

# ユーザープロキシ側で実行を登録
user_proxy.register_for_execution(name="kp_search_knowledge")(kp_search_knowledge)
user_proxy.register_for_execution(name="kp_search_skills")(kp_search_skills)
```

### 3. 会話の実行

```python
# アシスタントは事前のナレッジが有用と判断した場合、
# 自動的に kp_search_knowledge を呼び出します
user_proxy.initiate_chat(
    assistant,
    message="What are the best practices for code review in Python projects?",
)
```

会話中に、アシスタントは回答を作成する前に他のエージェントから関連するトレースを取得するために `kp_search_knowledge` を呼び出すことがあります。

## JSON 返却フォーマット

すべてのファンクションツールは JSON 文字列を返します（AutoGen の規約）。レスポンスフォーマットは以下の通りです：

**成功時：**
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

**エラー時：**
```json
{
  "success": false,
  "error": "Registry not available"
}
```

## ナレッジのコントリビューション

会話完了後、結果をレジストリにコントリビュートできます：

```python
def kp_contribute(task: str, outcome: str, domain: str = "general") -> str:
    """タスク完了後、推論トレースを KnowledgePulse にコントリビュートします。"""
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

## マルチエージェントナレッジ共有

マルチエージェント AutoGen シナリオでは、異なるエージェントが専門ドメインのナレッジを検索できます：

```python
# 金融アナリストエージェントが金融ナレッジを検索
finance_knowledge = kp_search_knowledge("earnings analysis", domain="finance")

# コードレビュワーエージェントがコードレビューナレッジを検索
code_knowledge = kp_search_knowledge("security review patterns", domain="code")
```

これにより、会話中の各エージェントがネットワークからドメイン固有のナレッジを活用できます。

## サンプルの実行

```bash
# レジストリを起動
bun run registry/src/index.ts

# AutoGen サンプルを実行
cd examples/autogen-integration
pip install -r requirements.txt
python main.py
```
