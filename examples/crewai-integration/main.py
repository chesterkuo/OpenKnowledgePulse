"""
KnowledgePulse — CrewAI Integration Example

Demonstrates a KnowledgePulseTool class that wraps HTTP calls to the
KP registry, suitable for use as a CrewAI custom tool.

Usage:
    pip install -r requirements.txt
    python examples/crewai-integration/main.py

Prerequisites:
    Start the registry: bun run registry/src/index.ts
"""

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

    # ── Search knowledge units ───────────────────────────────

    def search_knowledge(
        self,
        query: str,
        domain: str | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """
        GET /v1/knowledge — Search knowledge units by query text.

        Args:
            query:  Free-text search string.
            domain: Optional domain filter (e.g. "financial_analysis").
            limit:  Maximum number of results to return.

        Returns:
            List of KnowledgeUnit dicts, or an empty list on error.
        """
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
            body = response.json()
            return body.get("data", [])
        except httpx.ConnectError:
            print(f"[KP] Registry not available at {self.registry_url}")
            return []
        except httpx.HTTPStatusError as exc:
            print(f"[KP] HTTP {exc.response.status_code}: {exc.response.text}")
            return []

    # ── Search skills ────────────────────────────────────────

    def search_skills(
        self,
        query: str,
        tags: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """
        GET /v1/skills — Search registered skills.

        Args:
            query: Free-text search string.
            tags:  Optional list of tags to filter by.

        Returns:
            List of skill dicts, or an empty list on error.
        """
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
            body = response.json()
            return body.get("data", [])
        except httpx.ConnectError:
            print(f"[KP] Registry not available at {self.registry_url}")
            return []
        except httpx.HTTPStatusError as exc:
            print(f"[KP] HTTP {exc.response.status_code}: {exc.response.text}")
            return []

    # ── Contribute knowledge ─────────────────────────────────

    def contribute_knowledge(
        self,
        unit: dict[str, Any],
        visibility: str = "network",
    ) -> dict[str, Any] | None:
        """
        POST /v1/knowledge — Contribute a new knowledge unit.

        Args:
            unit:       A valid KnowledgeUnit dict (see KP schema).
            visibility: "private", "network", or "public".

        Returns:
            The created entry dict, or None on error.
        """
        # Ensure visibility is set in the unit metadata
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
        except httpx.ConnectError:
            print(f"[KP] Registry not available at {self.registry_url}")
            return None
        except httpx.HTTPStatusError as exc:
            print(f"[KP] HTTP {exc.response.status_code}: {exc.response.text}")
            return None


# ── Main: Demonstrate search workflows ───────────────────────


def main() -> None:
    print("KnowledgePulse + CrewAI Integration Example")
    print("=" * 50)

    kp = KnowledgePulseTool()

    # 1. Search for existing knowledge before starting a task
    print("\n1. Searching for knowledge on 'code review best practices'...")
    knowledge = kp.search_knowledge("code review best practices", domain="code_review", limit=3)
    if knowledge:
        print(f"   Found {len(knowledge)} knowledge unit(s):")
        for unit in knowledge:
            print(f"     - [{unit.get('@type', '?')}] {unit.get('id', '?')}")
    else:
        print("   No knowledge found (registry may not be running).")

    # 2. Search for reusable skills
    print("\n2. Searching for skills tagged 'python'...")
    skills = kp.search_skills("python linting", tags=["python", "linting"])
    if skills:
        print(f"   Found {len(skills)} skill(s):")
        for skill in skills:
            print(f"     - {skill.get('name', '?')}: {skill.get('description', '')[:80]}")
    else:
        print("   No skills found (registry may not be running).")

    # 3. Contribute a reasoning trace after completing a task
    print("\n3. Contributing a reasoning trace...")
    trace = {
        "@context": "https://knowledgepulse.dev/schema/v1",
        "@type": "ReasoningTrace",
        "id": "kp:trace:crewai-demo-001",
        "metadata": {
            "created_at": "2026-02-22T00:00:00Z",
            "framework": "crewai",
            "task_domain": "code_review",
            "success": True,
            "quality_score": 0.88,
            "visibility": "network",
            "privacy_level": "aggregated",
        },
        "task": {"objective": "Review Python module for security issues"},
        "steps": [
            {"step_id": 0, "type": "thought", "content": "Scanning imports for known CVEs"},
            {"step_id": 1, "type": "tool_call", "content": "Running static analysis",
             "tool": {"name": "bandit_scan"}},
            {"step_id": 2, "type": "observation", "content": "Found 2 medium-severity issues"},
        ],
        "outcome": {"result_summary": "2 issues found, patches suggested", "confidence": 0.92},
    }
    result = kp.contribute_knowledge(trace, visibility="network")
    if result:
        print(f"   Contributed: {json.dumps(result, indent=2)[:200]}...")
    else:
        print("   Could not contribute (registry may not be running or auth required).")

    print("\nDone.")


if __name__ == "__main__":
    main()
