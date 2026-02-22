import type {
  ExpertSOP,
  KnowledgeUnit,
  KnowledgeUnitType,
  ReasoningTrace,
  ToolCallPattern,
} from "./types/knowledge-unit.js";

export interface RetrievalConfig {
  minQuality?: number; // default 0.80
  knowledgeTypes?: KnowledgeUnitType[];
  limit?: number; // default 5
  registryUrl?: string;
  apiKey?: string;
}

export class KPRetrieval {
  private config: RetrievalConfig;

  constructor(config: RetrievalConfig = {}) {
    this.config = config;
  }

  async search(query: string, domain?: string): Promise<KnowledgeUnit[]> {
    const params = new URLSearchParams({
      q: query,
      min_quality: String(this.config.minQuality ?? 0.8),
      limit: String(this.config.limit ?? 5),
    });
    if (domain) params.set("domain", domain);
    if (this.config.knowledgeTypes) {
      params.set("types", this.config.knowledgeTypes.join(","));
    }

    const url = this.config.registryUrl ?? "https://registry.openknowledgepulse.org";
    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    const res = await fetch(`${url}/v1/knowledge?${params}`, { headers });
    const body = (await res.json()) as { data: KnowledgeUnit[] };
    return body.data;
  }

  async searchSkills(
    query: string,
    opts?: { domain?: string; tags?: string[]; limit?: number },
  ): Promise<unknown[]> {
    const params = new URLSearchParams({
      q: query,
      limit: String(opts?.limit ?? this.config.limit ?? 5),
    });
    if (opts?.domain) params.set("domain", opts.domain);
    if (opts?.tags?.length) params.set("tags", opts.tags.join(","));

    const url = this.config.registryUrl ?? "https://registry.openknowledgepulse.org";
    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    const res = await fetch(`${url}/v1/skills?${params}`, { headers });
    const body = (await res.json()) as { data: unknown[] };
    return body.data;
  }

  /** Format a KnowledgeUnit as few-shot text for LLM prompt injection */
  toFewShot(unit: KnowledgeUnit): string {
    switch (unit["@type"]) {
      case "ReasoningTrace":
        return formatReasoningTrace(unit);
      case "ToolCallPattern":
        return formatToolCallPattern(unit);
      case "ExpertSOP":
        return formatExpertSOP(unit);
    }
  }
}

function formatReasoningTrace(trace: ReasoningTrace): string {
  return trace.steps
    .map((s) => `[${s.type.toUpperCase()}] ${s.content ?? s.output_summary ?? ""}`)
    .join("\n");
}

function formatToolCallPattern(pattern: ToolCallPattern): string {
  const lines = [`Pattern: ${pattern.name}`, `Description: ${pattern.description}`, "Steps:"];
  for (const seq of pattern.tool_sequence) {
    lines.push(`  ${seq.step} (${seq.execution}):`);
    for (const tool of seq.tools) {
      lines.push(`    - ${tool.name}${tool.query_template ? `: ${tool.query_template}` : ""}`);
    }
  }
  return lines.join("\n");
}

function formatExpertSOP(sop: ExpertSOP): string {
  const lines = [`SOP: ${sop.name}`, `Domain: ${sop.domain}`, "Decision Tree:"];
  for (const node of sop.decision_tree) {
    lines.push(`  ${node.step}: ${node.instruction}`);
  }
  return lines.join("\n");
}
