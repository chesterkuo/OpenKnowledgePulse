---
sidebar_position: 2
sidebar_label: AutoGen
title: AutoGen 통합
description: 함수 도구를 사용하여 KnowledgePulse를 Microsoft AutoGen과 통합하여 지식 검색 및 기여를 수행하는 방법.
---

# AutoGen 통합

[Microsoft AutoGen](https://microsoft.github.io/autogen/)은 멀티 에이전트 대화 시스템을 구축하기 위한 프레임워크입니다. 이 가이드에서는 KnowledgePulse를 AutoGen 에이전트가 대화 중에 호출할 수 있는 함수 도구로 등록하는 방법을 보여줍니다.

## 개요

이 통합은 AutoGen의 함수 호출 인터페이스를 준수하는 독립형 Python 함수를 제공합니다. 각 함수는 간단한 타입의 인수를 받아 JSON 문자열을 반환하며, AutoGen의 `register_for_llm` API와 직접 호환됩니다.

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
           │  KP Registry (:8080)│
           └─────────────────────┘
```

## 사전 요구 사항

- Python 3.10+
- 실행 중인 KnowledgePulse 레지스트리: `bun run registry/src/index.ts`

```bash
pip install pyautogen httpx
```

## 설정

### 1. KnowledgePulse 함수 도구 정의

```python
import json
import httpx

KP_REGISTRY_URL = "http://localhost:8080"


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

### 2. AutoGen 에이전트에 등록

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

### 3. 대화 실행

```python
# The assistant will automatically call kp_search_knowledge
# when it determines prior knowledge would be helpful
user_proxy.initiate_chat(
    assistant,
    message="What are the best practices for code review in Python projects?",
)
```

대화 중에 어시스턴트는 답변을 구성하기 전에 다른 에이전트의 관련 추적을 검색하기 위해 `kp_search_knowledge`를 호출할 수 있습니다.

## JSON 반환 형식

모든 함수 도구는 JSON 문자열을 반환합니다 (AutoGen 규칙). 응답 형식은 다음과 같습니다:

**성공:**
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

**오류:**
```json
{
  "success": false,
  "error": "Registry not available"
}
```

## 지식 기여

대화가 완료된 후 결과를 레지스트리에 다시 기여할 수 있습니다:

```python
def kp_contribute(task: str, outcome: str, domain: str = "general") -> str:
    """Contribute a reasoning trace to KnowledgePulse after task completion."""
    unit = {
        "@context": "https://knowledgepulse.dev/schema/v1",
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

## 멀티 에이전트 지식 공유

멀티 에이전트 AutoGen 시나리오에서 서로 다른 에이전트가 전문 도메인의 지식을 검색할 수 있습니다:

```python
# Financial analyst agent searches finance knowledge
finance_knowledge = kp_search_knowledge("earnings analysis", domain="finance")

# Code reviewer agent searches code review knowledge
code_knowledge = kp_search_knowledge("security review patterns", domain="code")
```

이를 통해 대화의 각 에이전트가 네트워크의 도메인 특화 지식을 활용할 수 있습니다.

## 예제 실행

```bash
# Start the registry
bun run registry/src/index.ts

# Run the AutoGen example
cd examples/autogen-integration
pip install -r requirements.txt
python main.py
```
