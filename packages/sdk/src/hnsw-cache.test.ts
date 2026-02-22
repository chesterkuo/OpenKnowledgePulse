import { describe, expect, test } from "bun:test";
import { VectorCache } from "./hnsw-cache.js";

describe("VectorCache", () => {
  // ── Constructor defaults ────────────────────────────────

  test("initializes with size 0", () => {
    const cache = new VectorCache();
    expect(cache.size).toBe(0);
  });

  // ── add() ───────────────────────────────────────────────

  test("add() increments size", () => {
    const cache = new VectorCache({ dimensions: 3 });
    cache.add([1, 0, 0]);
    expect(cache.size).toBe(1);
    cache.add([0, 1, 0]);
    expect(cache.size).toBe(2);
  });

  test("add() accepts Float32Array", () => {
    const cache = new VectorCache({ dimensions: 3 });
    cache.add(new Float32Array([1, 0, 0]));
    expect(cache.size).toBe(1);
  });

  test("add() accepts plain number array", () => {
    const cache = new VectorCache({ dimensions: 3 });
    cache.add([0.5, 0.5, 0.5]);
    expect(cache.size).toBe(1);
  });

  test("add() throws on dimension mismatch", () => {
    const cache = new VectorCache({ dimensions: 3 });
    expect(() => cache.add([1, 0])).toThrow("Expected 3 dimensions, got 2");
    expect(() => cache.add([1, 0, 0, 0])).toThrow("Expected 3 dimensions, got 4");
  });

  test("add() throws on dimension mismatch with default dimensions", () => {
    const cache = new VectorCache(); // defaults to 384
    expect(() => cache.add([1, 2, 3])).toThrow("Expected 384 dimensions, got 3");
  });

  // ── Capacity eviction ───────────────────────────────────

  test("evicts oldest vector when exceeding maxElements", () => {
    const cache = new VectorCache({ maxElements: 3, dimensions: 2 });
    cache.add([1, 0]);
    cache.add([0, 1]);
    cache.add([1, 1]);
    expect(cache.size).toBe(3);

    // Adding a 4th should evict the first
    cache.add([0.5, 0.5]);
    expect(cache.size).toBe(3);
  });

  test("eviction removes the oldest entry (FIFO)", () => {
    const cache = new VectorCache({ maxElements: 2, dimensions: 3 });

    // Add two orthogonal vectors
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    cache.add(v1);
    cache.add(v2);

    // v1 should be present — querying v1 should yield similarity ~1
    expect(cache.maxCosineSimilarity([1, 0, 0])).toBeCloseTo(1.0, 5);

    // Now add v3, which should evict v1
    const v3 = [0, 0, 1];
    cache.add(v3);
    expect(cache.size).toBe(2);

    // v1 ([1,0,0]) should no longer be in cache
    // querying [1,0,0] against [0,1,0] and [0,0,1] yields 0
    expect(cache.maxCosineSimilarity([1, 0, 0])).toBeCloseTo(0.0, 5);
  });

  // ── maxCosineSimilarity() ───────────────────────────────

  test("returns 0 for empty cache", () => {
    const cache = new VectorCache({ dimensions: 3 });
    expect(cache.maxCosineSimilarity([1, 0, 0])).toBe(0);
  });

  test("returns 1.0 for identical vector", () => {
    const cache = new VectorCache({ dimensions: 3 });
    cache.add([0.6, 0.8, 0]);
    expect(cache.maxCosineSimilarity([0.6, 0.8, 0])).toBeCloseTo(1.0, 5);
  });

  test("returns 0 for orthogonal vectors", () => {
    const cache = new VectorCache({ dimensions: 3 });
    cache.add([1, 0, 0]);
    expect(cache.maxCosineSimilarity([0, 1, 0])).toBeCloseTo(0.0, 5);
  });

  test("returns the maximum similarity across multiple vectors", () => {
    const cache = new VectorCache({ dimensions: 3 });
    cache.add([1, 0, 0]); // orthogonal to query
    cache.add([0, 1, 0]); // orthogonal to query
    cache.add([0, 0, 1]); // identical to query
    expect(cache.maxCosineSimilarity([0, 0, 1])).toBeCloseTo(1.0, 5);
  });

  test("returns intermediate similarity for partially aligned vectors", () => {
    const cache = new VectorCache({ dimensions: 2 });
    cache.add([1, 0]);
    // cos(45 degrees) = sqrt(2)/2 ≈ 0.7071
    const sim = cache.maxCosineSimilarity([1, 1]);
    expect(sim).toBeGreaterThan(0.7);
    expect(sim).toBeLessThan(0.72);
  });

  test("handles zero vector gracefully (returns 0)", () => {
    const cache = new VectorCache({ dimensions: 3 });
    cache.add([0, 0, 0]);
    expect(cache.maxCosineSimilarity([1, 0, 0])).toBe(0);
  });

  test("accepts Float32Array as query", () => {
    const cache = new VectorCache({ dimensions: 3 });
    cache.add([1, 0, 0]);
    const sim = cache.maxCosineSimilarity(new Float32Array([1, 0, 0]));
    expect(sim).toBeCloseTo(1.0, 5);
  });

  // ── clear() ─────────────────────────────────────────────

  test("clear() empties the cache", () => {
    const cache = new VectorCache({ dimensions: 3 });
    cache.add([1, 0, 0]);
    cache.add([0, 1, 0]);
    expect(cache.size).toBe(2);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.maxCosineSimilarity([1, 0, 0])).toBe(0);
  });

  // ── Edge cases ──────────────────────────────────────────

  test("works with large dimension count", () => {
    const dims = 384;
    const cache = new VectorCache({ dimensions: dims });
    const vec = new Float32Array(dims);
    vec[0] = 1.0;
    cache.add(vec);

    const query = new Float32Array(dims);
    query[0] = 1.0;
    expect(cache.maxCosineSimilarity(query)).toBeCloseTo(1.0, 5);
  });

  test("maxElements = 1 only keeps last added vector", () => {
    const cache = new VectorCache({ maxElements: 1, dimensions: 3 });
    cache.add([1, 0, 0]);
    expect(cache.maxCosineSimilarity([1, 0, 0])).toBeCloseTo(1.0, 5);

    cache.add([0, 1, 0]);
    expect(cache.size).toBe(1);
    // First vector evicted
    expect(cache.maxCosineSimilarity([1, 0, 0])).toBeCloseTo(0.0, 5);
    expect(cache.maxCosineSimilarity([0, 1, 0])).toBeCloseTo(1.0, 5);
  });

  // ── TTL-based eviction ──────────────────────────────────

  describe("TTL-based eviction", () => {
    test("vectors expire after TTL", () => {
      const cache = new VectorCache({ maxElements: 100, dimensions: 3, ttlMs: 100 });
      cache.add([1, 0, 0]);
      expect(cache.size).toBe(1);
      Bun.sleepSync(150);
      cache.evictExpired();
      expect(cache.size).toBe(0);
    });

    test("non-expired vectors are kept", () => {
      const cache = new VectorCache({ maxElements: 100, dimensions: 3, ttlMs: 5000 });
      cache.add([1, 0, 0]);
      cache.evictExpired();
      expect(cache.size).toBe(1);
    });

    test("maxCosineSimilarity ignores expired vectors", () => {
      const cache = new VectorCache({ maxElements: 100, dimensions: 3, ttlMs: 100 });
      cache.add([1, 0, 0]);
      Bun.sleepSync(150);
      const sim = cache.maxCosineSimilarity([1, 0, 0]);
      expect(sim).toBe(0);
    });
  });
});
