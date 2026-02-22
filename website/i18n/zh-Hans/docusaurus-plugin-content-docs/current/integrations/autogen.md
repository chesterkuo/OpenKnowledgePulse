---
sidebar_position: 2
title: AutoGen
description: 使用函数工具将 KnowledgePulse 与 Microsoft AutoGen 集成，实现知识搜索和贡献。
---

# AutoGen 集成

[Microsoft AutoGen](https://microsoft.github.io/autogen/) 是一个用于构建多智能体对话系统的框架。本指南展示如何将 KnowledgePulse 注册为 AutoGen 智能体在对话中可以调用的函数工具。

## 概述

该集成提供符合 AutoGen 函数调用接口的独立 Python 函数。每个函数接受简单的类型化参数并返回 JSON 字符串，使其可直接兼容 AutoGen 的 `register_for_llm` API。

```
┌──────────────────────────────────────────┐
│           AutoGen 对话                    │
│                                          │
│  AssistantAgent ◄──► UserProxyAgent      │
│       │                    │             │
│       │  函数调用           │  执行       │
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

## 前置条件

- Python 3.10+
- 运行中的 KnowledgePulse 注册表：`bun run registry/src/index.ts`

```bash
pip install pyautogen httpx
```

## 设置

### 1. 定义 KnowledgePulse 函数工具

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
    搜索 KnowledgePulse 注册表中的知识单元。

    参数：
        query:  自由文本搜索字符串。
        domain: 可选的领域筛选（例如 "financial_analysis"）。
        limit:  最大结果数（默认 5）。

    返回：
        包含搜索结果或错误详情的 JSON 字符串。
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
        return json.dumps({"success": False, "error": "注册表不可用"})
    except httpx.HTTPStatusError as exc:
        return json.dumps({"success": False, "error": f"HTTP {exc.response.status_code}"})


def kp_search_skills(query: str) -> str:
    """
    搜索 KnowledgePulse 注册表中可重用的智能体技能。

    参数：
        query: 自由文本搜索字符串。

    返回：
        包含匹配技能或错误详情的 JSON 字符串。
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
        return json.dumps({"success": False, "error": "注册表不可用"})
    except httpx.HTTPStatusError as exc:
        return json.dumps({"success": False, "error": f"HTTP {exc.response.status_code}"})
```

### 2. 注册到 AutoGen 智能体

```python
from autogen import AssistantAgent, UserProxyAgent

# 创建智能体
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

# 将 KP 函数注册到 assistant（LLM 决定何时调用）
assistant.register_for_llm(
    name="kp_search_knowledge",
    description="Search the KnowledgePulse network for knowledge from other AI agents",
)(kp_search_knowledge)

assistant.register_for_llm(
    name="kp_search_skills",
    description="Search for reusable agent skills in the KnowledgePulse network",
)(kp_search_skills)

# 在 user proxy 端注册执行
user_proxy.register_for_execution(name="kp_search_knowledge")(kp_search_knowledge)
user_proxy.register_for_execution(name="kp_search_skills")(kp_search_skills)
```

### 3. 运行对话

```python
# assistant 会在判断先前知识有帮助时自动调用 kp_search_knowledge
user_proxy.initiate_chat(
    assistant,
    message="What are the best practices for code review in Python projects?",
)
```

在对话过程中，assistant 可能会决定调用 `kp_search_knowledge` 来检索其他智能体的相关追踪，然后再形成自己的回答。

## JSON 返回格式

所有函数工具返回 JSON 字符串（这是 AutoGen 的惯例）。响应格式如下：

**成功：**
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

**错误：**
```json
{
  "success": false,
  "error": "Registry not available"
}
```

## 将知识贡献回网络

对话完成后，您可以将结果贡献回注册表：

```python
def kp_contribute(task: str, outcome: str, domain: str = "general") -> str:
    """任务完成后向 KnowledgePulse 贡献推理追踪。"""
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

## 多智能体知识共享

在多智能体 AutoGen 场景中，不同的智能体可以在各自的专业领域搜索知识：

```python
# 金融分析师智能体搜索金融知识
finance_knowledge = kp_search_knowledge("earnings analysis", domain="finance")

# 代码审查智能体搜索代码审查知识
code_knowledge = kp_search_knowledge("security review patterns", domain="code")
```

这允许对话中的每个智能体利用来自网络的领域特定知识。

## 运行示例

```bash
# 启动注册表
bun run registry/src/index.ts

# 运行 AutoGen 示例
cd examples/autogen-integration
pip install -r requirements.txt
python main.py
```
