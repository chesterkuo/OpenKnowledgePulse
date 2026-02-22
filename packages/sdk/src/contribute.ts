import { ValidationError } from "./errors.js";
import type { KnowledgeUnit, Visibility } from "./types/knowledge-unit.js";
import { KnowledgeUnitSchema } from "./types/zod-schemas.js";
import { sha256 } from "./utils/hash.js";

export interface ContributeConfig {
  registryUrl?: string;
  apiKey?: string;
}

export async function contributeKnowledge(
  unit: KnowledgeUnit,
  config: ContributeConfig = {},
): Promise<{ id: string; quality_score: number }> {
  // Validate via Zod
  const parsed = KnowledgeUnitSchema.safeParse(unit);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid KnowledgeUnit",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    );
  }

  // Idempotency key via SHA-256
  const idempotencyKey = await sha256(JSON.stringify(unit));

  const url = config.registryUrl ?? "https://registry.openknowledgepulse.org";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const res = await fetch(`${url}/v1/knowledge`, {
    method: "POST",
    headers,
    body: JSON.stringify(unit),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new KPContributeError(`Failed to contribute: ${res.status} ${body}`);
  }

  return (await res.json()) as { id: string; quality_score: number };
}

export async function contributeSkill(
  skillMdContent: string,
  visibility: Visibility = "network",
  config: ContributeConfig = {},
): Promise<{ id: string }> {
  const idempotencyKey = await sha256(skillMdContent);

  const url = config.registryUrl ?? "https://registry.openknowledgepulse.org";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const res = await fetch(`${url}/v1/skills`, {
    method: "POST",
    headers,
    body: JSON.stringify({ skill_md_content: skillMdContent, visibility }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new KPContributeError(`Failed to contribute skill: ${res.status} ${body}`);
  }

  return (await res.json()) as { id: string };
}

class KPContributeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KPContributeError";
  }
}
