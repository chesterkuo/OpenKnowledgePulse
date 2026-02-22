import type { Visibility } from "@knowledgepulse/sdk";

/**
 * Registry bridge — Dual-mode:
 * 1. Own in-memory store (standalone dev)
 * 2. Proxy to KP_REGISTRY_URL (production)
 */
export interface RegistryBridge {
  searchSkills(opts: {
    query: string;
    domain?: string;
    tags?: string[];
    min_quality?: number;
    limit?: number;
  }): Promise<unknown[]>;

  searchKnowledge(opts: {
    query: string;
    knowledge_types?: string[];
    domain?: string;
    min_quality?: number;
    limit?: number;
    schema_version?: string;
  }): Promise<unknown[]>;

  contributeSkill(opts: {
    skill_md_content: string;
    visibility: Visibility;
  }): Promise<{ id: string }>;

  contributeKnowledge(opts: {
    unit: Record<string, unknown>;
    visibility: Visibility;
  }): Promise<{ id: string; quality_score: number }>;

  validateUnit(opts: {
    unit_id: string;
    valid: boolean;
    feedback?: string;
  }): Promise<{ validated: boolean }>;

  getReputation(agentId: string): Promise<{ score: number; contributions: number }>;
}

export class ProxyRegistryBridge implements RegistryBridge {
  constructor(
    private baseUrl: string,
    private apiKey?: string,
  ) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  async searchSkills(opts: {
    query: string;
    domain?: string;
    tags?: string[];
    min_quality?: number;
    limit?: number;
  }): Promise<unknown[]> {
    const params = new URLSearchParams({ q: opts.query });
    if (opts.domain) params.set("domain", opts.domain);
    if (opts.tags?.length) params.set("tags", opts.tags.join(","));
    if (opts.min_quality !== undefined) params.set("min_quality", String(opts.min_quality));
    if (opts.limit) params.set("limit", String(opts.limit));

    const res = await fetch(`${this.baseUrl}/v1/skills?${params}`, {
      headers: this.headers(),
    });
    const body = (await res.json()) as { data: unknown[] };
    return body.data;
  }

  async searchKnowledge(opts: {
    query: string;
    knowledge_types?: string[];
    domain?: string;
    min_quality?: number;
    limit?: number;
    schema_version?: string;
  }): Promise<unknown[]> {
    const params = new URLSearchParams({ q: opts.query });
    if (opts.knowledge_types?.length) params.set("types", opts.knowledge_types.join(","));
    if (opts.domain) params.set("domain", opts.domain);
    if (opts.min_quality !== undefined) params.set("min_quality", String(opts.min_quality));
    if (opts.limit) params.set("limit", String(opts.limit));

    const headers = this.headers();
    if (opts.schema_version) headers["KP-Schema-Version"] = opts.schema_version;

    const res = await fetch(`${this.baseUrl}/v1/knowledge?${params}`, { headers });
    const body = (await res.json()) as { data: unknown[] };
    return body.data;
  }

  async contributeSkill(opts: {
    skill_md_content: string;
    visibility: Visibility;
  }): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/v1/skills`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(opts),
    });
    const body = (await res.json()) as { data: { id: string } };
    return body.data;
  }

  async contributeKnowledge(opts: {
    unit: Record<string, unknown>;
    visibility: Visibility;
  }): Promise<{ id: string; quality_score: number }> {
    const res = await fetch(`${this.baseUrl}/v1/knowledge`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(opts.unit),
    });
    const body = (await res.json()) as { data: { id: string }; quality_score: number };
    return { id: body.data.id, quality_score: body.quality_score };
  }

  async validateUnit(opts: {
    unit_id: string;
    valid: boolean;
    feedback?: string;
  }): Promise<{ validated: boolean }> {
    const res = await fetch(`${this.baseUrl}/v1/knowledge/${opts.unit_id}/validate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ valid: opts.valid, feedback: opts.feedback }),
    });
    const body = (await res.json()) as { data: { validated: boolean } };
    return body.data;
  }

  async getReputation(agentId: string): Promise<{ score: number; contributions: number }> {
    const res = await fetch(`${this.baseUrl}/v1/reputation/${agentId}`, {
      headers: this.headers(),
    });
    const body = (await res.json()) as { data: { score: number; contributions: number } };
    return body.data;
  }
}

export function createRegistryBridge(): RegistryBridge {
  const registryUrl = process.env.KP_REGISTRY_URL;
  const apiKey = process.env.KP_API_KEY;

  if (registryUrl) {
    return new ProxyRegistryBridge(registryUrl, apiKey);
  }

  // Standalone mode — inline import to avoid circular deps
  return new StandaloneRegistryBridge();
}

/** Standalone in-memory bridge for dev/testing */
class StandaloneRegistryBridge implements RegistryBridge {
  private skills = new Map<string, { id: string; content: string; [key: string]: unknown }>();
  private knowledge = new Map<string, { id: string; unit: Record<string, unknown> }>();

  async searchSkills(opts: { query: string; limit?: number }): Promise<unknown[]> {
    const q = opts.query.toLowerCase();
    const results = Array.from(this.skills.values()).filter((s) =>
      JSON.stringify(s).toLowerCase().includes(q),
    );
    return results.slice(0, opts.limit ?? 5);
  }

  async searchKnowledge(opts: { query: string; limit?: number }): Promise<unknown[]> {
    const q = opts.query.toLowerCase();
    const results = Array.from(this.knowledge.values()).filter((e) =>
      JSON.stringify(e.unit).toLowerCase().includes(q),
    );
    return results.slice(0, opts.limit ?? 5);
  }

  async contributeSkill(opts: {
    skill_md_content: string;
    visibility: Visibility;
  }): Promise<{ id: string }> {
    const id = `kp:skill:${crypto.randomUUID()}`;
    this.skills.set(id, { id, content: opts.skill_md_content, visibility: opts.visibility });
    return { id };
  }

  async contributeKnowledge(opts: {
    unit: Record<string, unknown>;
    visibility: Visibility;
  }): Promise<{ id: string; quality_score: number }> {
    const id = (opts.unit.id as string) ?? `kp:unit:${crypto.randomUUID()}`;
    this.knowledge.set(id, { id, unit: opts.unit });
    return {
      id,
      quality_score:
        ((opts.unit.metadata as Record<string, unknown>)?.quality_score as number) ?? 0.5,
    };
  }

  async validateUnit(opts: {
    unit_id: string;
    valid: boolean;
    feedback?: string;
  }): Promise<{ validated: boolean }> {
    return { validated: this.knowledge.has(opts.unit_id) };
  }

  async getReputation(_agentId: string): Promise<{ score: number; contributions: number }> {
    return { score: 0, contributions: 0 };
  }
}
