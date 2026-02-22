/**
 * VectorCache — Brute-force linear scan for cosine similarity.
 * 1,000 x 384-dim vectors = sub-1ms scan. Interface supports future HNSW swap.
 */

/** Internal entry that pairs a vector with its insertion timestamp. */
interface CacheEntry {
  vector: Float32Array;
  addedAt: number;
}

export class VectorCache {
  private entries: CacheEntry[] = [];
  private readonly maxElements: number;
  private readonly dimensions: number;
  private readonly ttlMs: number | null;

  constructor(opts: { maxElements?: number; dimensions?: number; ttlMs?: number } = {}) {
    this.maxElements = opts.maxElements ?? 1000;
    this.dimensions = opts.dimensions ?? 384;
    this.ttlMs = opts.ttlMs ?? null;
  }

  get size(): number {
    this.evictExpired();
    return this.entries.length;
  }

  add(vector: ArrayLike<number>): void {
    if (vector.length !== this.dimensions) {
      throw new Error(`Expected ${this.dimensions} dimensions, got ${vector.length}`);
    }
    const v = vector instanceof Float32Array ? vector : new Float32Array(vector);
    this.entries.push({ vector: v, addedAt: Date.now() });

    // Evict oldest if over capacity
    if (this.entries.length > this.maxElements) {
      this.entries.shift();
    }
  }

  /** Remove entries older than `ttlMs`. No-op when TTL is not configured. */
  evictExpired(): void {
    if (this.ttlMs === null) return;
    const now = Date.now();
    const cutoff = now - this.ttlMs;
    this.entries = this.entries.filter((e) => e.addedAt > cutoff);
  }

  maxCosineSimilarity(query: ArrayLike<number>): number {
    this.evictExpired();
    if (this.entries.length === 0) return 0;

    const q = query instanceof Float32Array ? query : new Float32Array(query);
    let maxSim = -1;

    for (const entry of this.entries) {
      const sim = cosineSimilarity(q, entry.vector);
      if (sim > maxSim) maxSim = sim;
    }

    return maxSim;
  }

  clear(): void {
    this.entries = [];
  }
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
