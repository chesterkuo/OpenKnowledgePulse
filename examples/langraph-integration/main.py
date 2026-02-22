"""
KnowledgePulse — LangGraph Integration Example (Python)

Demonstrates connecting to KnowledgePulse via MCP HTTP from Python.
No TypeScript SDK needed — uses MCP protocol directly.

Usage:
    pip install httpx
    python examples/langraph-integration/main.py

Prerequisites:
    Start the MCP server: bun run packages/mcp-server/src/index.ts
"""

import json
import httpx

MCP_URL = "http://localhost:3001/mcp"


def call_kp_tool(tool_name: str, arguments: dict) -> dict | None:
    """Call a KnowledgePulse MCP tool via HTTP."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments,
        },
    }

    try:
        response = httpx.post(MCP_URL, json=payload, timeout=10)
        response.raise_for_status()
        return response.json()
    except httpx.ConnectError:
        print(f"MCP server not available at {MCP_URL}")
        print("Start it first: bun run packages/mcp-server/src/index.ts")
        return None


def main():
    print("KnowledgePulse + LangGraph Integration Example")
    print("=" * 50)

    # 1. Search for relevant skills before agent execution
    print("\n1. Searching for skills...")
    result = call_kp_tool("kp_search_skill", {
        "query": "financial report analysis",
        "domain": "finance",
        "limit": 3,
    })
    if result:
        print(f"   Found: {json.dumps(result, indent=2)}")

    # 2. Search for knowledge from other agents
    print("\n2. Searching for knowledge...")
    result = call_kp_tool("kp_search_knowledge", {
        "query": "financial analysis techniques",
        "types": ["ReasoningTrace", "ToolCallPattern"],
        "min_quality": 0.8,
        "limit": 5,
    })
    if result:
        print(f"   Found: {json.dumps(result, indent=2)}")

    # 3. After agent execution, contribute learned knowledge
    print("\n3. Contributing knowledge...")
    knowledge_unit = {
        "@context": "https://knowledgepulse.dev/schema/v1",
        "@type": "ReasoningTrace",
        "id": "kp:trace:example-from-langgraph",
        "metadata": {
            "created_at": "2026-02-22T00:00:00Z",
            "framework": "langgraph",
            "task_domain": "financial_analysis",
            "success": True,
            "quality_score": 0.85,
            "visibility": "network",
            "privacy_level": "aggregated",
        },
        "task": {"objective": "Analyze quarterly financial report"},
        "steps": [
            {"step_id": 0, "type": "thought", "content": "Extracting key metrics"},
            {"step_id": 1, "type": "tool_call", "content": "web_search for comparables",
             "tool": {"name": "web_search"}},
            {"step_id": 2, "type": "observation", "content": "Revenue up 15% YoY"},
        ],
        "outcome": {"result_summary": "Strong quarterly performance", "confidence": 0.9},
    }

    result = call_kp_tool("kp_contribute_knowledge", {
        "unit": knowledge_unit,
        "visibility": "network",
    })
    if result:
        print(f"   Contributed: {json.dumps(result, indent=2)}")


if __name__ == "__main__":
    main()
