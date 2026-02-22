import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { KPRetrieval } from "./retrieve.js";
import { KP_CONTEXT } from "./types/knowledge-unit.js";
import type { ExpertSOP, ReasoningTrace, ToolCallPattern } from "./types/knowledge-unit.js";

// ── Fetch mock setup ──────────────────────────────────────

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof mock>;

function mockFetchWith(data: unknown) {
  fetchMock = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

beforeEach(() => {
  mockFetchWith([]);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ── Shared fixtures ────────────────────────────────────────

const validMeta = {
  created_at: "2025-06-15T10:00:00.000Z",
  task_domain: "testing",
  success: true,
  quality_score: 0.9,
  visibility: "network" as const,
  privacy_level: "aggregated" as const,
};

const sampleTrace: ReasoningTrace = {
  "@context": KP_CONTEXT,
  "@type": "ReasoningTrace",
  id: "kp:trace:test-0001",
  metadata: validMeta,
  task: { objective: "Test task" },
  steps: [
    { step_id: 0, type: "thought", content: "Analyzing the code" },
    { step_id: 1, type: "tool_call", tool: { name: "grep" }, output_summary: "Found 3 matches" },
    { step_id: 2, type: "observation", content: "Code review complete" },
  ],
  outcome: { result_summary: "Review done", confidence: 0.9 },
};

const samplePattern: ToolCallPattern = {
  "@context": KP_CONTEXT,
  "@type": "ToolCallPattern",
  id: "kp:pattern:test-0001",
  name: "search-and-summarize",
  description: "Search then summarize results",
  metadata: validMeta,
  trigger_conditions: { task_types: ["research"] },
  tool_sequence: [
    {
      step: "search",
      execution: "sequential",
      tools: [{ name: "web_search", query_template: "{{query}}" }],
    },
    {
      step: "summarize",
      execution: "sequential",
      tools: [{ name: "summarizer" }],
    },
  ],
  performance: { avg_ms: 2500, success_rate: 0.92, uses: 87 },
};

const sampleSOP: ExpertSOP = {
  "@context": KP_CONTEXT,
  "@type": "ExpertSOP",
  id: "kp:sop:test-0001",
  name: "Incident Triage",
  domain: "devops",
  metadata: validMeta,
  source: {
    type: "human_expert",
    expert_id: "expert-001",
    credentials: ["kp:sbt:sre-cert"],
  },
  decision_tree: [
    { step: "1", instruction: "Check dashboards" },
    { step: "2", instruction: "Classify severity" },
  ],
};

// ── Tests ──────────────────────────────────────────────────

describe("KPRetrieval", () => {
  describe("search() URL construction", () => {
    test("builds correct URL with default config", async () => {
      const retrieval = new KPRetrieval();
      await retrieval.search("test query");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);

      expect(parsed.origin).toBe("https://registry.knowledgepulse.dev");
      expect(parsed.pathname).toBe("/v1/knowledge");
      expect(parsed.searchParams.get("q")).toBe("test query");
      expect(parsed.searchParams.get("min_quality")).toBe("0.8");
      expect(parsed.searchParams.get("limit")).toBe("5");
    });

    test("uses custom registryUrl", async () => {
      const retrieval = new KPRetrieval({ registryUrl: "https://custom.dev" });
      await retrieval.search("q");

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toStartWith("https://custom.dev/v1/knowledge");
    });

    test("includes domain parameter when provided", async () => {
      const retrieval = new KPRetrieval();
      await retrieval.search("q", "devops");

      const [url] = fetchMock.mock.calls[0] as [string];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("domain")).toBe("devops");
    });

    test("includes types parameter when knowledgeTypes configured", async () => {
      const retrieval = new KPRetrieval({
        knowledgeTypes: ["ReasoningTrace", "ExpertSOP"],
      });
      await retrieval.search("q");

      const [url] = fetchMock.mock.calls[0] as [string];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("types")).toBe("ReasoningTrace,ExpertSOP");
    });

    test("uses custom minQuality and limit", async () => {
      const retrieval = new KPRetrieval({ minQuality: 0.5, limit: 10 });
      await retrieval.search("q");

      const [url] = fetchMock.mock.calls[0] as [string];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("min_quality")).toBe("0.5");
      expect(parsed.searchParams.get("limit")).toBe("10");
    });

    test("sends Authorization header when apiKey provided", async () => {
      const retrieval = new KPRetrieval({ apiKey: "sk-key" });
      await retrieval.search("q");

      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = opts.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer sk-key");
    });

    test("does not send Authorization header when no apiKey", async () => {
      const retrieval = new KPRetrieval();
      await retrieval.search("q");

      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = opts.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe("searchSkills() URL construction", () => {
    test("builds correct skills URL", async () => {
      const retrieval = new KPRetrieval({ registryUrl: "https://r.dev" });
      await retrieval.searchSkills("deploy helper", { domain: "devops", tags: ["k8s", "helm"] });

      const [url] = fetchMock.mock.calls[0] as [string];
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/v1/skills");
      expect(parsed.searchParams.get("q")).toBe("deploy helper");
      expect(parsed.searchParams.get("domain")).toBe("devops");
      expect(parsed.searchParams.get("tags")).toBe("k8s,helm");
    });
  });

  describe("toFewShot()", () => {
    test("formats ReasoningTrace as step-by-step text", () => {
      const retrieval = new KPRetrieval();
      const text = retrieval.toFewShot(sampleTrace);

      expect(text).toContain("[THOUGHT]");
      expect(text).toContain("Analyzing the code");
      expect(text).toContain("[TOOL_CALL]");
      expect(text).toContain("Found 3 matches");
      expect(text).toContain("[OBSERVATION]");
      expect(text).toContain("Code review complete");
    });

    test("ReasoningTrace uses content when available, falls back to output_summary", () => {
      const retrieval = new KPRetrieval();
      const text = retrieval.toFewShot(sampleTrace);

      const lines = text.split("\n");
      // step 0: has content "Analyzing the code"
      expect(lines[0]).toContain("Analyzing the code");
      // step 1: has no content, has output_summary "Found 3 matches"
      expect(lines[1]).toContain("Found 3 matches");
    });

    test("formats ToolCallPattern with pattern name and tool sequence", () => {
      const retrieval = new KPRetrieval();
      const text = retrieval.toFewShot(samplePattern);

      expect(text).toContain("Pattern: search-and-summarize");
      expect(text).toContain("Description: Search then summarize results");
      expect(text).toContain("Steps:");
      expect(text).toContain("search (sequential):");
      expect(text).toContain("- web_search: {{query}}");
      expect(text).toContain("summarize (sequential):");
      expect(text).toContain("- summarizer");
    });

    test("ToolCallPattern includes query_template when present", () => {
      const retrieval = new KPRetrieval();
      const text = retrieval.toFewShot(samplePattern);
      expect(text).toContain("web_search: {{query}}");
    });

    test("ToolCallPattern omits query_template when absent", () => {
      const retrieval = new KPRetrieval();
      const text = retrieval.toFewShot(samplePattern);
      // "summarizer" tool has no query_template, so just the name
      expect(text).toContain("- summarizer");
      // Should not have a colon after summarizer
      const summarizerLine = text.split("\n").find((l) => l.includes("summarizer"));
      expect(summarizerLine).not.toContain("summarizer:");
    });

    test("formats ExpertSOP with name, domain, and decision tree", () => {
      const retrieval = new KPRetrieval();
      const text = retrieval.toFewShot(sampleSOP);

      expect(text).toContain("SOP: Incident Triage");
      expect(text).toContain("Domain: devops");
      expect(text).toContain("Decision Tree:");
      expect(text).toContain("1: Check dashboards");
      expect(text).toContain("2: Classify severity");
    });

    test("ExpertSOP lists all decision tree steps in order", () => {
      const retrieval = new KPRetrieval();
      const text = retrieval.toFewShot(sampleSOP);
      const lines = text.split("\n");

      const treeLines = lines.filter((l) => l.trim().match(/^\d+:/));
      expect(treeLines.length).toBe(2);
      expect(treeLines[0]).toContain("Check dashboards");
      expect(treeLines[1]).toContain("Classify severity");
    });
  });

  describe("search() returns parsed data", () => {
    test("returns the data array from the response", async () => {
      mockFetchWith([sampleTrace, samplePattern]);
      const retrieval = new KPRetrieval();
      const results = await retrieval.search("test");
      expect(results).toHaveLength(2);
      expect(results[0]?.["@type"]).toBe("ReasoningTrace");
      expect(results[1]?.["@type"]).toBe("ToolCallPattern");
    });
  });
});
