import type { ExtractionResult, LLMConfig, ParseResult } from "./types.js";

const EXTRACTION_PROMPT = `You are an expert at converting standard operating procedures (SOPs) into structured decision trees.

Given the following document text, extract a decision tree in JSON format.

Return ONLY valid JSON with this structure:
{
  "name": "string - name of the SOP",
  "domain": "string - knowledge domain (e.g., finance, medical, customer_service)",
  "confidence": number between 0 and 1,
  "decision_tree": [
    {
      "step": "string - step identifier",
      "instruction": "string - what to do",
      "criteria": { "key": "value" } (optional),
      "conditions": { "condition_name": { "action": "string", "sla_min": number } } (optional),
      "tool_suggestions": [{ "name": "string", "when": "string" }] (optional)
    }
  ]
}

Document text:
`;

export async function extractDecisionTree(
  parseResult: ParseResult,
  config: LLMConfig,
): Promise<ExtractionResult> {
  const text =
    parseResult.sections.length > 0
      ? parseResult.sections.map((s) => `## ${s.heading}\n${s.content}`).join("\n\n")
      : parseResult.text;

  const prompt = EXTRACTION_PROMPT + text;

  let responseText: string;

  if (config.provider === "anthropic") {
    const baseUrl = config.baseUrl ?? "https://api.anthropic.com";
    const model = config.model ?? "claude-sonnet-4-20250514";
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = (await res.json()) as {
      content: Array<{ text: string }>;
    };
    responseText = data.content[0]?.text ?? "";
  } else if (config.provider === "gemini") {
    const baseUrl = config.baseUrl ?? "https://generativelanguage.googleapis.com";
    const model = config.model ?? "gemini-2.5-flash";
    const res = await fetch(
      `${baseUrl}/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      },
    );
    const data = (await res.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else {
    // OpenAI-compatible: openai, xai, kimi, glm, qwen, etc.
    const baseUrl = config.baseUrl ?? "https://api.openai.com";
    const model = config.model ?? "gpt-4o";
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    responseText = data.choices[0]?.message?.content ?? "";
  }

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, responseText];
  const parsed = JSON.parse(
    (jsonMatch[1] as string | undefined) ?? responseText,
  ) as ExtractionResult;

  return {
    decision_tree: parsed.decision_tree,
    name: parsed.name,
    domain: parsed.domain,
    confidence: parsed.confidence,
  };
}

/** Exported for testing */
export function getExtractionPrompt(): string {
  return EXTRACTION_PROMPT;
}
