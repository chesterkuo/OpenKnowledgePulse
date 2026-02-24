import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { extractDecisionTree, getExtractionPrompt } from "./extract.js";
import type { ExtractionResult, LLMConfig, ParseResult } from "./types.js";

// ── Helpers ────────────────────────────────────────────────

const MOCK_EXTRACTION: ExtractionResult = {
  name: "Customer Escalation SOP",
  domain: "customer_service",
  confidence: 0.92,
  decision_tree: [
    {
      step: "1",
      instruction: "Identify the issue category",
      criteria: { urgency: "high" },
    },
    {
      step: "2",
      instruction: "Escalate to tier 2 support",
      conditions: {
        unresolved: { action: "escalate", sla_min: 30 },
      },
      tool_suggestions: [{ name: "ticket_system", when: "always" }],
    },
  ],
};

function makeMockParseResult(overrides: Partial<ParseResult> = {}): ParseResult {
  return {
    text: "This is a standard operating procedure for handling customer escalations.",
    sections: [
      {
        heading: "Identification",
        content: "Identify the issue category and urgency level.",
      },
      {
        heading: "Escalation",
        content: "If unresolved within SLA, escalate to tier 2 support immediately.",
      },
    ],
    metadata: { format: "docx" },
    ...overrides,
  };
}

function makeAnthropicConfig(overrides: Partial<LLMConfig> = {}): LLMConfig {
  return {
    provider: "anthropic",
    apiKey: "test-api-key-anthropic",
    ...overrides,
  };
}

function makeOpenAIConfig(overrides: Partial<LLMConfig> = {}): LLMConfig {
  return {
    provider: "openai",
    apiKey: "test-api-key-openai",
    ...overrides,
  };
}

function createMockResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Tests ──────────────────────────────────────────────────

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("getExtractionPrompt", () => {
  test("returns a string containing expected structural keywords", () => {
    const prompt = getExtractionPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt).toContain("decision tree");
    expect(prompt).toContain("decision_tree");
    expect(prompt).toContain("step");
    expect(prompt).toContain("instruction");
    expect(prompt).toContain("Document text:");
    expect(prompt).toContain("JSON");
  });

  test("prompt includes optional fields guidance", () => {
    const prompt = getExtractionPrompt();
    expect(prompt).toContain("criteria");
    expect(prompt).toContain("conditions");
    expect(prompt).toContain("tool_suggestions");
    expect(prompt).toContain("name");
    expect(prompt).toContain("domain");
    expect(prompt).toContain("confidence");
  });
});

describe("extractDecisionTree — Anthropic provider", () => {
  test("calls Anthropic API and returns parsed result", async () => {
    const calls: { url: string; body: unknown }[] = [];
    globalThis.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      calls.push({ url, body: JSON.parse(init?.body as string) });
      return createMockResponse({
        content: [{ text: JSON.stringify(MOCK_EXTRACTION) }],
      });
    };

    const result = await extractDecisionTree(makeMockParseResult(), makeAnthropicConfig());

    expect(calls.length).toBe(1);
    expect(calls[0]!.url).toContain("api.anthropic.com/v1/messages");
    expect(result.name).toBe("Customer Escalation SOP");
    expect(result.domain).toBe("customer_service");
    expect(result.confidence).toBe(0.92);
    expect(result.decision_tree).toHaveLength(2);
    expect(result.decision_tree[0]!.step).toBe("1");
  });

  test("uses default model claude-sonnet-4-20250514 when not specified", async () => {
    let capturedBody: Record<string, unknown> = {};
    globalThis.fetch = async (_input, init) => {
      capturedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
      return createMockResponse({
        content: [{ text: JSON.stringify(MOCK_EXTRACTION) }],
      });
    };

    await extractDecisionTree(makeMockParseResult(), makeAnthropicConfig());

    expect(capturedBody.model).toBe("claude-sonnet-4-20250514");
  });

  test("sends correct Anthropic headers", async () => {
    let capturedHeaders: Record<string, string> = {};
    globalThis.fetch = async (_input, init) => {
      const headers = init?.headers as Record<string, string>;
      capturedHeaders = headers;
      return createMockResponse({
        content: [{ text: JSON.stringify(MOCK_EXTRACTION) }],
      });
    };

    await extractDecisionTree(makeMockParseResult(), makeAnthropicConfig());

    expect(capturedHeaders["x-api-key"]).toBe("test-api-key-anthropic");
    expect(capturedHeaders["anthropic-version"]).toBe("2023-06-01");
    expect(capturedHeaders["Content-Type"]).toBe("application/json");
  });
});

describe("extractDecisionTree — OpenAI provider", () => {
  test("calls OpenAI API and returns parsed result", async () => {
    const calls: { url: string; body: unknown }[] = [];
    globalThis.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      calls.push({ url, body: JSON.parse(init?.body as string) });
      return createMockResponse({
        choices: [{ message: { content: JSON.stringify(MOCK_EXTRACTION) } }],
      });
    };

    const result = await extractDecisionTree(makeMockParseResult(), makeOpenAIConfig());

    expect(calls.length).toBe(1);
    expect(calls[0]!.url).toContain("api.openai.com/v1/chat/completions");
    expect(result.name).toBe("Customer Escalation SOP");
    expect(result.domain).toBe("customer_service");
    expect(result.confidence).toBe(0.92);
    expect(result.decision_tree).toHaveLength(2);
  });

  test("uses default model gpt-4o when not specified", async () => {
    let capturedBody: Record<string, unknown> = {};
    globalThis.fetch = async (_input, init) => {
      capturedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
      return createMockResponse({
        choices: [{ message: { content: JSON.stringify(MOCK_EXTRACTION) } }],
      });
    };

    await extractDecisionTree(makeMockParseResult(), makeOpenAIConfig());

    expect(capturedBody.model).toBe("gpt-4o");
  });

  test("sends Authorization Bearer header for OpenAI", async () => {
    let capturedHeaders: Record<string, string> = {};
    globalThis.fetch = async (_input, init) => {
      const headers = init?.headers as Record<string, string>;
      capturedHeaders = headers;
      return createMockResponse({
        choices: [{ message: { content: JSON.stringify(MOCK_EXTRACTION) } }],
      });
    };

    await extractDecisionTree(makeMockParseResult(), makeOpenAIConfig());

    expect(capturedHeaders.Authorization).toBe("Bearer test-api-key-openai");
  });

  test("requests json_object response format for OpenAI", async () => {
    let capturedBody: Record<string, unknown> = {};
    globalThis.fetch = async (_input, init) => {
      capturedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
      return createMockResponse({
        choices: [{ message: { content: JSON.stringify(MOCK_EXTRACTION) } }],
      });
    };

    await extractDecisionTree(makeMockParseResult(), makeOpenAIConfig());

    expect(capturedBody.response_format).toEqual({ type: "json_object" });
  });
});

describe("extractDecisionTree — markdown code block handling", () => {
  test("strips markdown json code blocks from response", async () => {
    const wrappedResponse = `\`\`\`json\n${JSON.stringify(MOCK_EXTRACTION)}\n\`\`\``;
    globalThis.fetch = async () =>
      createMockResponse({
        content: [{ text: wrappedResponse }],
      });

    const result = await extractDecisionTree(makeMockParseResult(), makeAnthropicConfig());

    expect(result.name).toBe("Customer Escalation SOP");
    expect(result.decision_tree).toHaveLength(2);
  });

  test("strips markdown code blocks without json language tag", async () => {
    const wrappedResponse = `\`\`\`\n${JSON.stringify(MOCK_EXTRACTION)}\n\`\`\``;
    globalThis.fetch = async () =>
      createMockResponse({
        content: [{ text: wrappedResponse }],
      });

    const result = await extractDecisionTree(makeMockParseResult(), makeAnthropicConfig());

    expect(result.name).toBe("Customer Escalation SOP");
    expect(result.confidence).toBe(0.92);
  });

  test("handles plain JSON response without code blocks", async () => {
    globalThis.fetch = async () =>
      createMockResponse({
        content: [{ text: JSON.stringify(MOCK_EXTRACTION) }],
      });

    const result = await extractDecisionTree(makeMockParseResult(), makeAnthropicConfig());

    expect(result.name).toBe("Customer Escalation SOP");
    expect(result.domain).toBe("customer_service");
  });
});

describe("extractDecisionTree — custom configuration", () => {
  test("uses custom model when provided for Anthropic", async () => {
    let capturedBody: Record<string, unknown> = {};
    globalThis.fetch = async (_input, init) => {
      capturedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
      return createMockResponse({
        content: [{ text: JSON.stringify(MOCK_EXTRACTION) }],
      });
    };

    await extractDecisionTree(
      makeMockParseResult(),
      makeAnthropicConfig({ model: "claude-opus-4-20250514" }),
    );

    expect(capturedBody.model).toBe("claude-opus-4-20250514");
  });

  test("uses custom model when provided for OpenAI", async () => {
    let capturedBody: Record<string, unknown> = {};
    globalThis.fetch = async (_input, init) => {
      capturedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
      return createMockResponse({
        choices: [{ message: { content: JSON.stringify(MOCK_EXTRACTION) } }],
      });
    };

    await extractDecisionTree(makeMockParseResult(), makeOpenAIConfig({ model: "gpt-4-turbo" }));

    expect(capturedBody.model).toBe("gpt-4-turbo");
  });

  test("uses custom baseUrl when provided", async () => {
    let capturedUrl = "";
    globalThis.fetch = async (input) => {
      capturedUrl = typeof input === "string" ? input : (input as Request).url;
      return createMockResponse({
        content: [{ text: JSON.stringify(MOCK_EXTRACTION) }],
      });
    };

    await extractDecisionTree(
      makeMockParseResult(),
      makeAnthropicConfig({ baseUrl: "https://custom-proxy.example.com" }),
    );

    expect(capturedUrl).toBe("https://custom-proxy.example.com/v1/messages");
  });

  test("uses sections text when sections are present", async () => {
    let capturedBody: { messages: Array<{ content: string }> } = {
      messages: [],
    };
    globalThis.fetch = async (_input, init) => {
      capturedBody = JSON.parse(init?.body as string) as typeof capturedBody;
      return createMockResponse({
        content: [{ text: JSON.stringify(MOCK_EXTRACTION) }],
      });
    };

    const parseResult = makeMockParseResult({
      sections: [
        { heading: "Step One", content: "Do the first thing" },
        { heading: "Step Two", content: "Do the second thing" },
      ],
    });

    await extractDecisionTree(parseResult, makeAnthropicConfig());

    const messageContent = capturedBody.messages[0]?.content ?? "";
    expect(messageContent).toContain("## Step One");
    expect(messageContent).toContain("Do the first thing");
    expect(messageContent).toContain("## Step Two");
    expect(messageContent).toContain("Do the second thing");
  });

  test("falls back to raw text when no sections are present", async () => {
    let capturedBody: { messages: Array<{ content: string }> } = {
      messages: [],
    };
    globalThis.fetch = async (_input, init) => {
      capturedBody = JSON.parse(init?.body as string) as typeof capturedBody;
      return createMockResponse({
        content: [{ text: JSON.stringify(MOCK_EXTRACTION) }],
      });
    };

    const parseResult = makeMockParseResult({
      sections: [],
      text: "Raw document text content here",
    });

    await extractDecisionTree(parseResult, makeAnthropicConfig());

    const messageContent = capturedBody.messages[0]?.content ?? "";
    expect(messageContent).toContain("Raw document text content here");
  });
});

function makeGeminiConfig(overrides: Partial<LLMConfig> = {}): LLMConfig {
  return {
    provider: "gemini",
    apiKey: "test-gemini-key",
    ...overrides,
  };
}

describe("extractDecisionTree — Gemini provider", () => {
  test("calls Gemini API and returns parsed result", async () => {
    const calls: { url: string }[] = [];
    globalThis.fetch = async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      calls.push({ url });
      return createMockResponse({
        candidates: [
          { content: { parts: [{ text: JSON.stringify(MOCK_EXTRACTION) }] } },
        ],
      });
    };

    const result = await extractDecisionTree(makeMockParseResult(), makeGeminiConfig());

    expect(calls.length).toBe(1);
    expect(calls[0]!.url).toContain("generativelanguage.googleapis.com");
    expect(calls[0]!.url).toContain("key=test-gemini-key");
    expect(result.name).toBe("Customer Escalation SOP");
    expect(result.decision_tree).toHaveLength(2);
  });

  test("uses default model gemini-2.5-flash", async () => {
    let capturedUrl = "";
    globalThis.fetch = async (input) => {
      capturedUrl = typeof input === "string" ? input : (input as Request).url;
      return createMockResponse({
        candidates: [
          { content: { parts: [{ text: JSON.stringify(MOCK_EXTRACTION) }] } },
        ],
      });
    };

    await extractDecisionTree(makeMockParseResult(), makeGeminiConfig());

    expect(capturedUrl).toContain("gemini-2.5-flash");
  });

  test("uses custom model when provided", async () => {
    let capturedUrl = "";
    globalThis.fetch = async (input) => {
      capturedUrl = typeof input === "string" ? input : (input as Request).url;
      return createMockResponse({
        candidates: [
          { content: { parts: [{ text: JSON.stringify(MOCK_EXTRACTION) }] } },
        ],
      });
    };

    await extractDecisionTree(
      makeMockParseResult(),
      makeGeminiConfig({ model: "gemini-2.0-pro" }),
    );

    expect(capturedUrl).toContain("gemini-2.0-pro");
  });
});

describe("extractDecisionTree — custom OpenAI-compatible provider", () => {
  test("falls through to OpenAI path for unknown providers", async () => {
    const calls: { url: string }[] = [];
    globalThis.fetch = async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      calls.push({ url });
      return createMockResponse({
        choices: [{ message: { content: JSON.stringify(MOCK_EXTRACTION) } }],
      });
    };

    const result = await extractDecisionTree(makeMockParseResult(), {
      provider: "xai",
      apiKey: "xai-key",
      baseUrl: "https://api.x.ai",
    });

    expect(calls[0]!.url).toContain("api.x.ai/v1/chat/completions");
    expect(result.name).toBe("Customer Escalation SOP");
  });
});
