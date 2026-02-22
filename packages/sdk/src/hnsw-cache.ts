/**
 * VectorCache — Brute-force linear scan for cosine similarity.
 * 1,000 x 384-dim vectors = sub-1ms scan. Interface supports future HNSW swap.
 */
export class VectorCache {
  private vectors: Float32Array[] = [];
  private readonly maxElements: number;
  private readonly dimensions: number;

  constructor(opts: { maxElements?: number; dimensions?: number } = {}) {
    this.maxElements = opts.maxElements ?? 1000;
    this.dimensions = opts.dimensions ?? 384;
  }

  get size(): number {
    return this.vectors.length;
  }

  add(vector: ArrayLike<number>): void {
    if (vector.length !== this.dimensions) {
      throw new Error(`Expected ${this.dimensions} dimensions, got ${vector.length}`);
    }
    const v = vector instanceof Float32Array ? vector : new Float32Array(vector);
    this.vectors.push(v);

    // Evict oldest if over capacity
    if (this.vectors.length > this.maxElements) {
      this.vectors.shift();
    }
  }

  maxCosineSimilarity(query: ArrayLike<number>): number {
    if (this.vectors.length === 0) return 0;

    const q = query instanceof Float32Array ? query : new Float32Array(query);
    let maxSim = -1;

    for (const vec of this.vectors) {
      const sim = cosineSimilarity(q, vec);
      if (sim > maxSim) maxSim = sim;
    }

    return maxSim;
  }

  clear(): void {
    this.vectors = [];
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
