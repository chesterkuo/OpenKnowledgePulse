import { VectorCache } from "./hnsw-cache.js";
import type { ReasoningTrace } from "./types/knowledge-unit.js";

export interface ScoringWeights {
  complexity: number;
  novelty: number;
  toolDiversity: number;
  outcomeConfidence: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  complexity: 0.25,
  novelty: 0.35,
  toolDiversity: 0.15,
  outcomeConfidence: 0.25,
};

const DOMAIN_WEIGHTS: Record<string, ScoringWeights> = {
  finance: { complexity: 0.2, novelty: 0.25, toolDiversity: 0.1, outcomeConfidence: 0.45 },
  code: { complexity: 0.2, novelty: 0.3, toolDiversity: 0.3, outcomeConfidence: 0.2 },
  medical: { complexity: 0.15, novelty: 0.2, toolDiversity: 0.1, outcomeConfidence: 0.55 },
  customer_service: { complexity: 0.2, novelty: 0.3, toolDiversity: 0.2, outcomeConfidence: 0.3 },
};

function getWeights(domain: string): ScoringWeights {
  return DOMAIN_WEIGHTS[domain] ?? DEFAULT_WEIGHTS;
}

const localCache = new VectorCache({ maxElements: 1000, dimensions: 384 });

// Lazy-loaded embedder (avoids 80MB import on startup)
let embedderPromise: Promise<((text: string) => Promise<Float32Array>) | null> | null = null;

async function getEmbedder(): Promise<((text: string) => Promise<Float32Array>) | null> {
  if (embedderPromise) return embedderPromise;

  embedderPromise = (async () => {
    try {
      const { pipeline } = await import("@huggingface/transformers");
      const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      return async (text: string): Promise<Float32Array> => {
        const result = await pipe(text, { pooling: "mean", normalize: true });
        return new Float32Array(result.data as ArrayLike<number>);
      };
    } catch {
      // @huggingface/transformers not available — fallback to no-embedding mode
      return null;
    }
  })();

  return embedderPromise;
}

export async function evaluateValue(trace: ReasoningTrace): Promise<number> {
  const { steps, outcome, task } = trace;

  // ── Complexity (C) ──
  const uniqueTypes = new Set(steps.map((s) => s.type)).size;
  const errorRecovery = steps.filter((s) => s.type === "error_recovery").length;
  const C = Math.min(
    1.0,
    (uniqueTypes / 4) * 0.5 + (errorRecovery > 0 ? 0.3 : 0) + (steps.length / 20) * 0.2,
  );

  // ── Novelty (N) ──
  let N = 0.5; // default when no embedder or empty cache
  const embedder = await getEmbedder();
  if (embedder) {
    const text = `${task.objective} ${steps.map((s) => s.content ?? "").join(" ")}`;
    const embedding = await embedder(text);
    N = localCache.size > 0 ? 1.0 - localCache.maxCosineSimilarity(embedding) : 0.5;
    // Update local cache for subsequent novelty calculations
    localCache.add(embedding);
  }

  // ── Tool Diversity (D) ──
  const uniqueTools = new Set(steps.filter((s) => s.tool).map((s) => s.tool?.name)).size;
  const D = Math.min(1.0, (uniqueTools / Math.max(1, steps.length)) * 3);

  // ── Outcome Confidence (O) ──
  const O = outcome.confidence * (trace.metadata.success ? 1.0 : 0.3);

  // ── Composite Score ──
  const w = getWeights(trace.metadata.task_domain);
  let score = C * w.complexity + N * w.novelty + D * w.toolDiversity + O * w.outcomeConfidence;

  // ── Rule-based Overrides ──
  if (steps.length === 1 && steps[0]?.type === "thought") score = 0.1;
  if (errorRecovery > 2 && trace.metadata.success) score = Math.min(1.0, score + 0.1);
  if (uniqueTools <= 1 && steps.some((s) => s.tool)) score = Math.max(0.0, score - 0.1);

  return score;
}

/** Expose cache for testing */
export function _getLocalCache(): VectorCache {
  return localCache;
}
