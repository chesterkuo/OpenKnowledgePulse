"""
KnowledgePulse — AutoGen Integration Example

Demonstrates standalone function tools compatible with AutoGen's function
calling interface. Each function accepts simple arguments and returns a
JSON string, making them easy to register with AutoGen agents.

Usage:
    pip install -r requirements.txt
    python examples/autogen-integration/main.py

Prerequisites:
    Start the registry: bun run registry/src/index.ts
"""

from __future__ import annotations

import json

import httpx

KP_REGISTRY_URL = "http://localhost:8080"


# ── Function tools (AutoGen-compatible) ──────────────────────
#
# Each function:
#   - Accepts simple typed parameters
#   - Returns a JSON string (AutoGen convention)
#   - Handles errors gracefully, returning error info as JSON


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
        return json.dumps({
            "success": True,
            "count": len(results),
            "results": results,
        })
    except httpx.ConnectError:
        return json.dumps({
            "success": False,
            "error": f"Registry not available at {KP_REGISTRY_URL}",
        })
    except httpx.HTTPStatusError as exc:
        return json.dumps({
            "success": False,
            "error": f"HTTP {exc.response.status_code}",
            "details": exc.response.text[:500],
        })


def kp_search_skills(query: str) -> str:
    """
    Search the KnowledgePulse registry for reusable agent skills.

    Args:
        query: Free-text search string.

    Returns:
        JSON string with matching skills or error details.
    """
    params: dict[str, str] = {"q": query}

    try:
        response = httpx.get(
            f"{KP_REGISTRY_URL}/v1/skills",
            params=params,
            timeout=10,
        )
        response.raise_for_status()
        body = response.json()
        results = body.get("data", [])
        return json.dumps({
            "success": True,
            "count": len(results),
            "results": results,
        })
    except httpx.ConnectError:
        return json.dumps({
            "success": False,
            "error": f"Registry not available at {KP_REGISTRY_URL}",
        })
    except httpx.HTTPStatusError as exc:
        return json.dumps({
            "success": False,
            "error": f"HTTP {exc.response.status_code}",
            "details": exc.response.text[:500],
        })


# ── Main: Standalone testing ─────────────────────────────────


def main() -> None:
    print("KnowledgePulse + AutoGen Integration Example")
    print("=" * 50)
    print()

    # These functions can be registered with AutoGen like this:
    #
    #   from autogen import AssistantAgent, UserProxyAgent
    #
    #   assistant = AssistantAgent("assistant", llm_config={...})
    #   user_proxy = UserProxyAgent("user_proxy")
    #
    #   assistant.register_for_llm(
    #       name="kp_search_knowledge",
    #       description="Search KnowledgePulse for knowledge units",
    #   )(kp_search_knowledge)
    #
    #   assistant.register_for_llm(
    #       name="kp_search_skills",
    #       description="Search KnowledgePulse for reusable agent skills",
    #   )(kp_search_skills)
    #
    #   user_proxy.register_for_execution(name="kp_search_knowledge")(kp_search_knowledge)
    #   user_proxy.register_for_execution(name="kp_search_skills")(kp_search_skills)

    # 1. Search for knowledge
    print("1. Searching knowledge for 'debugging techniques'...")
    result = kp_search_knowledge("debugging techniques", domain="software_engineering", limit=3)
    parsed = json.loads(result)
    if parsed["success"]:
        print(f"   Found {parsed['count']} result(s)")
        for item in parsed["results"]:
            print(f"     - [{item.get('@type', '?')}] {item.get('id', '?')}")
    else:
        print(f"   Error: {parsed['error']}")

    # 2. Search for skills
    print("\n2. Searching skills for 'data analysis'...")
    result = kp_search_skills("data analysis")
    parsed = json.loads(result)
    if parsed["success"]:
        print(f"   Found {parsed['count']} skill(s)")
        for item in parsed["results"]:
            print(f"     - {item.get('name', '?')}")
    else:
        print(f"   Error: {parsed['error']}")

    print("\nDone.")


if __name__ == "__main__":
    main()
