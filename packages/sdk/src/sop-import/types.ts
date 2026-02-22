import type { ExpertSOP } from "../types/knowledge-unit.js";

export interface LLMConfig {
  provider: "anthropic" | "openai";
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface ParseResult {
  text: string;
  sections: Array<{ heading: string; content: string }>;
  metadata: { pages?: number; format: string };
}

export interface ExtractionResult {
  decision_tree: ExpertSOP["decision_tree"];
  name: string;
  domain: string;
  confidence: number;
}
